import { type Collection, type Db, MongoServerError, ObjectId } from "mongodb";

export class TooLong extends Error {}

export type Plan = string & { readonly __brand: "Plan" };

/** The most characters each part of a plan can have. */
const MAX_PART = 2000;

interface PlannerDocument<Author> {
  _id: Author;
}

interface PlanDocument<Author, Subject> {
  _id: Plan;
  author: Author;
  subject: Subject;
  target: string;
  walkaway: string;
  priorities: string;
}

/** Helps people who choose to prepare deliberately write down their target, walkaway, and priorities before they start. */
export class PreparingConcept<Author extends string, Subject extends string> {
  private readonly planners: Collection<PlannerDocument<Author>>;
  private readonly plans: Collection<PlanDocument<Author, Subject>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Preparing") {
    const prefix = name.toLowerCase();
    this.planners = database.collection(`${prefix}.planners`);
    this.plans = database.collection(`${prefix}.plans`);
  }

  /** Creates the unique index once, so each person has one plan for each subject, even when two saves arrive at once. */
  #ready() {
    this.indexes ??= this.plans.createIndex({ author: 1, subject: 1 }, { unique: true }).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async turnOn({ author }: { author: Author }) {
    await this.planners.updateOne({ _id: author }, { $setOnInsert: { _id: author } }, { upsert: true }).catch((error: unknown) => {
      // Two requests turning prep sheets on at once both succeed: the second finds the first's.
      if (!isDuplicate(error)) throw error;
    });
    return {};
  }

  async turnOff({ author }: { author: Author }) {
    await this.planners.deleteOne({ _id: author });
    return {};
  }

  async plan({ author, subject, target, walkaway, priorities }: { author: Author; subject: Subject; target: string; walkaway: string; priorities: string }) {
    if ([target, walkaway, priorities].some((part) => part.length > MAX_PART)) {
      throw new TooLong("Each part of a plan can have at most 2,000 characters.");
    }
    await this.#ready();
    const upsert = () =>
      this.plans.findOneAndUpdate(
        { author, subject },
        { $set: { target, walkaway, priorities }, $setOnInsert: { _id: new ObjectId().toHexString() as Plan } },
        { upsert: true, returnDocument: "after" },
      );
    let written: PlanDocument<Author, Subject> | null;
    try {
      written = await upsert();
    } catch (error) {
      // Another save added this person's plan first; this one replaces its parts instead.
      if (!isDuplicate(error)) throw error;
      written = await upsert();
    }
    return { plan: written!._id };
  }

  async _planner({ author }: { author: Author }) {
    return { on: (await this.planners.findOne({ _id: author })) !== null };
  }

  async _plan({ author, subject }: { author: Author; subject: Subject }) {
    const found = await this.plans.findOne({ author, subject });
    return found === null ? [] : [{ target: found.target, walkaway: found.walkaway, priorities: found.priorities }];
  }

  async _complete({ author, subject }: { author: Author; subject: Subject }) {
    const found = await this.plans.findOne({ author, subject });
    const complete = found !== null && [found.target, found.walkaway, found.priorities].every((part) => part.trim() !== "");
    return { complete };
  }
}

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
