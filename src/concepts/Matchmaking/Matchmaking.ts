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
  /** Whether the seeker goes along with any pool for a group of the size, so the pool is only what they suggest. */
  open: boolean;
  status: LookingStatus;
  lastSeen: Date;
  match?: Match;
}

interface MatchDocument<Pool, Place> {
  _id: Match;
  pool: Pool;
  place?: Place;
}

/** A request as grouping sees it: which one it is, the pool its seeker wants or suggests, and whether they're open to any. */
interface Seeking<Pool> {
  _id: Request;
  pool: Pool;
  open: boolean;
}

/** Gathers people looking for others to do the same thing with into groups of the size it needs, first come, first served. */
export class MatchmakingConcept<Seeker extends string, Pool extends string, Place extends string> {
  private readonly requests: Collection<RequestDocument<Seeker, Pool>>;
  private readonly matches: Collection<MatchDocument<Pool, Place>>;
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

  async seek({ seeker, pool, size, open, now }: { seeker: Seeker; pool: Pool; size: number; open: boolean; now: Date }) {
    if (!Number.isInteger(size) || size < 2) throw new InvalidSize("A group needs a whole number of people, at least two.");
    const at = new Date(now);
    await this.#ready();
    const request = newId<Request>();
    // One search at a time: the seeker's earlier waiting request stops, and this one waits until it joins a group. It
    // waits before looking for others, so that of two searches at once, the later look always sees the other.
    for (let attempt = 1; ; attempt++) {
      await this.requests.updateMany({ seeker, status: "WAITING" }, { $set: { status: "STOPPED" } });
      try {
        await this.requests.insertOne({ _id: request, seeker, pool, size, open, status: "WAITING", lastSeen: at });
        break;
      } catch (error) {
        // Another search by the same seeker started waiting at the same moment; this one replaces it.
        if (!isDuplicate(error) || attempt === 3) throw error;
      }
    }
    const grouped = await this.#gather({ _id: request, pool, open }, seeker, size, at);
    return { request, grouped };
  }

  /**
   * Puts the newcomer in a new match with the other waiting requests of its size that still count, when it can make a
   * group with them, and says whether it did. Every search claims the requests of its group in the same order, oldest
   * first, and each claim changes only a request that is still waiting. So of two searches at once that want the same
   * request, the one that claims it first completes its group, and the other gives back what it claimed. The other then
   * looks again, while its newcomer is still waiting, since it may yet make a group with whoever is left.
   */
  async #gather(newcomer: Seeking<Pool>, seeker: Seeker, size: number, at: Date) {
    // MongoDB's filter types can't follow `$ne` on a type parameter, so this filter states its type.
    const counting = {
      size,
      status: "WAITING",
      seeker: { $ne: seeker },
      lastSeen: { $gte: new Date(at.getTime() - LAPSE) },
    } as Filter<RequestDocument<Seeker, Pool>>;
    for (let attempt = 1; attempt <= 3; attempt++) {
      // Each _id comes from an ObjectId, which starts with the time it was made, so sorting by _id puts the oldest first.
      const waiting = await this.requests.find(counting).sort({ _id: 1 }).toArray();
      const group = groupFor(newcomer, waiting.map(({ _id, pool, open }) => ({ _id, pool, open: open === true })), size);
      if (group === undefined) return false;
      if (await this.#claim(group)) return true;
      if ((await this.requests.countDocuments({ _id: newcomer._id, status: "WAITING" })) === 0) return false;
    }
    return false;
  }

  /** Claims every member of `group` for a new match with its pool, oldest first, or none of them if another search claims one first. */
  async #claim(group: { members: Request[]; pool: Pool }) {
    const match = newId<Match>();
    await this.matches.insertOne({ _id: match, pool: group.pool });
    const claimed: Request[] = [];
    for (const member of [...group.members].sort()) {
      const { matchedCount } = await this.requests.updateOne({ _id: member, status: "WAITING" }, { $set: { status: "MATCHED", match } });
      if (matchedCount === 0) break;
      claimed.push(member);
    }
    if (claimed.length === group.members.length) return true;
    // Another search claimed one of them first: the ones claimed here wait again.
    for (const member of claimed) await this.#release(member, match);
    await this.matches.deleteOne({ _id: match });
    return false;
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
    // Requests made before anyone could be open were all for their pool alone.
    return [{ seeker, pool, size, open: found.open === true, status }];
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

  async _agreed({ request }: { request: Request }) {
    const found = await this.requests.findOne({ _id: request });
    if (found?.match === undefined) return [];
    const match = await this.matches.findOne({ _id: found.match });
    // Matches made before anyone could be open didn't record a pool.
    return match?.pool === undefined ? [] : [{ pool: match.pool }];
  }

  async _place({ request }: { request: Request }) {
    const found = await this.requests.findOne({ _id: request });
    if (found?.match === undefined) return [];
    const match = await this.matches.findOne({ _id: found.match });
    return match?.place === undefined ? [] : [{ place: match.place }];
  }
}

/**
 * The group a newcomer can make with `waiting`, which is oldest first, and the pool the group agrees on, or nothing when
 * it can make none. Every member that isn't open must want the group's pool. Of the groups the newcomer could make, it
 * is the one whose members waited longest: the one with the oldest member, or, between groups with the same oldest
 * member, the one with the oldest second member, and so on. The group's pool is the one its members who aren't open
 * want, or, when every member is open, the one its oldest member suggested.
 */
function groupFor<Pool>(newcomer: Seeking<Pool>, waiting: Seeking<Pool>[], size: number) {
  const accepts = (request: Seeking<Pool>, pool: Pool) => request.open || request.pool === pool;
  // A group agrees on the newcomer's pool, unless the newcomer is open; then on a pool that someone waiting wants, or,
  // among people who are all open, on whatever the oldest of them suggested.
  const pools = newcomer.open ? [...new Set(waiting.filter(({ open }) => !open).map(({ pool }) => pool))] : [newcomer.pool];
  const possible = pools.map((pool) => waiting.filter((request) => accepts(request, pool)).slice(0, size - 1));
  if (newcomer.open) possible.push(waiting.filter(({ open }) => open).slice(0, size - 1));
  const complete = possible.filter((others) => others.length === size - 1);
  if (complete.length === 0) return undefined;
  const others = complete.reduce((best, next) => (waitedLonger(next, best) ? next : best));
  const members = [...others, newcomer];
  const pool = members.find(({ open }) => !open)?.pool ?? members[0]!.pool;
  return { members: members.map(({ _id }) => _id), pool };
}

/** Whether the members of `these`, oldest first, waited longer than those of `those`: the first of them that differ is older. */
function waitedLonger<Pool>(these: Seeking<Pool>[], those: Seeking<Pool>[]) {
  const differ = these.findIndex((request, index) => request._id !== those[index]?._id);
  return differ !== -1 && these[differ]!._id < those[differ]!._id;
}

const notWaiting = () => new NotWaiting("You aren't waiting for a match.");
const newId = <T extends string>() => new ObjectId().toHexString() as T;

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
