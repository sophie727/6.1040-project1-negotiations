import { type Collection, type Db, MongoServerError, ObjectId } from "mongodb";

export class AlreadyRecorded extends Error {}

interface ResultDocument<Person, Subject> {
  _id: string;
  person: Person;
  subject: Subject;
  claim?: number;
  create?: number;
  recordedAt: Date;
}

interface RecordInput<Person, Subject> {
  person: Person;
  subject: Subject;
  points: number;
  batna: number;
  jointPoints: number;
  jointBatna: number;
  bestJointPoints?: number;
  now: Date;
}

/** Keeps each person's results from every rated negotiation, so their skill at creating and claiming value shows over time. */
export class RatingConcept<Person extends string, Subject extends string> {
  private readonly results: Collection<ResultDocument<Person, Subject>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Rating") {
    this.results = database.collection(`${name.toLowerCase()}.results`);
  }

  /** Creates the unique index once, so one negotiation counts once for a person even when two records arrive at once. */
  #ready() {
    this.indexes ??= this.results.createIndex({ person: 1, subject: 1 }, { unique: true }).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async record({ person, subject, points, batna, jointPoints, jointBatna, bestJointPoints, now }: RecordInput<Person, Subject>) {
    // A request that leaves out the best deal, because none was possible, may still carry it as null.
    const best = bestJointPoints ?? undefined;
    const added = jointPoints - jointBatna;
    const result: ResultDocument<Person, Subject> = { _id: new ObjectId().toHexString(), person, subject, recordedAt: new Date(now) };
    // Create: the share of what the best deal could add over everyone's BATNAs that this deal added.
    if (best !== undefined && best > jointBatna) result.create = added / (best - jointBatna);
    // Claim: the share of what this deal added that went to the person.
    if (added > 0) result.claim = (points - batna) / added;
    await this.#ready();
    try {
      await this.results.insertOne(result);
    } catch (error) {
      if (isDuplicate(error)) throw new AlreadyRecorded("This negotiation already counts for them.");
      throw error;
    }
    return {};
  }

  async _ratings({ person }: { person: Person }) {
    const results = await this.results.find({ person }).toArray();
    // An average is left out, rather than undefined, when no result has one.
    const row: { claim?: number; create?: number; negotiations: number } = { negotiations: results.length };
    const claim = average(results.flatMap(({ claim }) => (claim === undefined ? [] : [claim])));
    const create = average(results.flatMap(({ create }) => (create === undefined ? [] : [create])));
    if (claim !== undefined) row.claim = claim;
    if (create !== undefined) row.create = create;
    return row;
  }

  async _results({ person }: { person: Person }) {
    // Each _id comes from an ObjectId, which starts with the time it was made, so sorting by _id keeps the order of recording.
    const results = await this.results.find({ person }).sort({ _id: 1 }).toArray();
    return results.map(({ subject, claim, create, recordedAt }) => {
      const row: { subject: Subject; claim?: number; create?: number; recordedAt: Date } = { subject, recordedAt };
      if (claim !== undefined) row.claim = claim;
      if (create !== undefined) row.create = create;
      return row;
    });
  }
}

const average = (values: number[]) => (values.length === 0 ? undefined : values.reduce((total, value) => total + value, 0) / values.length);

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
