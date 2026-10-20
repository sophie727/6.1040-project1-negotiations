import { type Collection, type Db, type Filter, MongoServerError, ObjectId } from "mongodb";

export class InvalidSize extends Error {}
export class NotWaiting extends Error {}
export class Lapsed extends Error {}
export class NotMatched extends Error {}
export class AlreadyMet extends Error {}

export type Request = string & { readonly __brand: "Request" };
export type Match = string & { readonly __brand: "Match" };
export type LookingStatus = "WAITING" | "MATCHED" | "STOPPED";

/** How long a waiting request still counts after its seeker last checked in. */
const LAPSE = 60_000;

interface RequestDocument<Seeker, Pool> {
  _id: Request;
  seeker: Seeker;
  pool: Pool;
  size: number;
  status: LookingStatus;
  lastSeen: Date;
  match?: Match;
}

interface MatchDocument<Place> {
  _id: Match;
  place?: Place;
}

/** Gathers people looking for others to do the same thing with into groups of the size it needs, first come, first served. */
export class MatchmakingConcept<Seeker extends string, Pool extends string, Place extends string> {
  private readonly requests: Collection<RequestDocument<Seeker, Pool>>;
  private readonly matches: Collection<MatchDocument<Place>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Matchmaking") {
    const prefix = name.toLowerCase();
    this.requests = database.collection(`${prefix}.requests`);
    this.matches = database.collection(`${prefix}.matches`);
  }

  /**
   * Creates the unique index once. It makes MongoDB refuse a second waiting request from one seeker, even when two
   * requests arrive at once. If creating it fails, the next action tries again.
   */
  #ready() {
    this.indexes ??= this.requests
      .createIndex({ seeker: 1 }, { name: "one_waiting_per_seeker", unique: true, partialFilterExpression: { status: "WAITING" } })
      .catch((error: unknown) => {
        this.indexes = undefined;
        throw error;
      });
    return this.indexes;
  }

  async seek({ seeker, pool, size, now }: { seeker: Seeker; pool: Pool; size: number; now: Date }) {
    if (!Number.isInteger(size) || size < 2) throw new InvalidSize("A group needs a whole number of people, at least two.");
    const at = new Date(now);
    await this.#ready();
    const request = newId<Request>();
    // One search at a time: the seeker's earlier waiting request stops, and this one waits until it joins a group. It
    // waits before looking for others, so that of two searches at once, the later look always sees the other.
    for (let attempt = 1; ; attempt++) {
      await this.requests.updateMany({ seeker, status: "WAITING" }, { $set: { status: "STOPPED" } });
      try {
        await this.requests.insertOne({ _id: request, seeker, pool, size, status: "WAITING", lastSeen: at });
        break;
      } catch (error) {
        // Another search by the same seeker started waiting at the same moment; this one replaces it.
        if (!isDuplicate(error) || attempt === 3) throw error;
      }
    }
    const grouped = await this.#gather({ request, seeker, pool, size, at });
    return { request, grouped };
  }

  /**
   * Puts the request in a new match with the oldest `size - 1` other waiting requests in the pool that still count, when
   * there are enough of them, and says whether it did. Every search claims the requests of its group in the same order,
   * oldest first, and each claim changes only a request that is still waiting. So of two searches at once, the one that
   * claims the oldest request completes the group, and the other claims nothing and leaves its request to be claimed.
   */
  async #gather({ request, seeker, pool, size, at }: { request: Request; seeker: Seeker; pool: Pool; size: number; at: Date }) {
    // MongoDB's filter types can't follow `$ne` on a type parameter, so this filter states its type.
    const counting = {
      pool,
      size,
      status: "WAITING",
      seeker: { $ne: seeker },
      lastSeen: { $gte: new Date(at.getTime() - LAPSE) },
    } as Filter<RequestDocument<Seeker, Pool>>;
    const others = await this.requests.find(counting).sort({ _id: 1 }).limit(size - 1).toArray();
    if (others.length < size - 1) return false;
    const group = [...others.map(({ _id }) => _id), request].sort();
    const match = newId<Match>();
    const claimed: Request[] = [];
    for (const member of group) {
      const { matchedCount } = await this.requests.updateOne({ _id: member, status: "WAITING" }, { $set: { status: "MATCHED", match } });
      if (matchedCount === 0) break;
      claimed.push(member);
    }
    if (claimed.length < group.length) {
      // Another search claimed one of them first: the ones claimed here wait again.
      for (const member of claimed) await this.#release(member, match);
      return false;
    }
    await this.matches.insertOne({ _id: match });
    return true;
  }

  /** Puts a request claimed for an incomplete match back to waiting, or stops it if its seeker has started looking again. */
  async #release(request: Request, match: Match) {
    try {
      await this.requests.updateOne({ _id: request, match }, { $set: { status: "WAITING" }, $unset: { match: "" } });
    } catch (error) {
      if (!isDuplicate(error)) throw error;
      await this.requests.updateOne({ _id: request, match }, { $set: { status: "STOPPED" }, $unset: { match: "" } });
    }
  }

  async checkIn({ request, seeker, now }: { request: Request; seeker: Seeker; now: Date }) {
    const at = new Date(now);
    const found = await this.requests.findOne({ _id: request, seeker, status: "WAITING" });
    if (found === null) throw notWaiting();
    if (found.lastSeen.getTime() < at.getTime() - LAPSE) {
      throw new Lapsed("You stopped checking in, so you're no longer waiting. Look again.");
    }
    const { matchedCount } = await this.requests.updateOne({ _id: request, status: "WAITING" }, { $set: { lastSeen: at } });
    if (matchedCount === 0) throw notWaiting();
    return {};
  }

  async stop({ request, seeker }: { request: Request; seeker: Seeker }) {
    const { matchedCount } = await this.requests.updateOne({ _id: request, seeker, status: "WAITING" }, { $set: { status: "STOPPED" } });
    if (matchedCount === 0) throw notWaiting();
    return {};
  }

  async meet({ request, place }: { request: Request; place: Place }) {
    const found = await this.requests.findOne({ _id: request });
    if (found === null || found.status !== "MATCHED" || found.match === undefined) {
      throw new NotMatched("This request hasn't been matched.");
    }
    const { matchedCount } = await this.matches.updateOne({ _id: found.match, place: { $exists: false } }, { $set: { place } });
    if (matchedCount === 0) throw new AlreadyMet("This match already has a place to meet.");
    return {};
  }

  async _request({ request }: { request: Request }) {
    const found = await this.requests.findOne({ _id: request });
    if (found === null) return [];
    const { seeker, pool, size, status } = found;
    return [{ seeker, pool, size, status }];
  }

  async _lapsed({ request, now }: { request: Request; now: Date }) {
    const found = await this.requests.findOne({ _id: request });
    const lapsed = found !== null && found.status === "WAITING" && found.lastSeen.getTime() < new Date(now).getTime() - LAPSE;
    return { lapsed };
  }

  async _members({ request }: { request: Request }) {
    const found = await this.requests.findOne({ _id: request });
    if (found?.match === undefined) return [];
    // Each _id comes from an ObjectId, which starts with the time it was made, so sorting by _id keeps the order of asking.
    const members = await this.requests.find({ match: found.match }).sort({ _id: 1 }).toArray();
    return members.map(({ seeker }) => ({ seeker }));
  }

  async _place({ request }: { request: Request }) {
    const found = await this.requests.findOne({ _id: request });
    if (found?.match === undefined) return [];
    const match = await this.matches.findOne({ _id: found.match });
    return match?.place === undefined ? [] : [{ place: match.place }];
  }
}

const notWaiting = () => new NotWaiting("You aren't waiting for a match.");
const newId = <T extends string>() => new ObjectId().toHexString() as T;

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
