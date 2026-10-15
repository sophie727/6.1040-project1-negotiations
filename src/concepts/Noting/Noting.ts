import { type Collection, type Db, MongoServerError, ObjectId } from "mongodb";

export class TooLong extends Error {}

export type Note = string & { readonly __brand: "Note" };

const MAX_BODY = 20_000;

interface NoteDocument<Author, Subject> {
  _id: Note;
  author: Author;
  subject: Subject;
  body: string;
}

/** Lets each person keep their own notes about something and come back to them later. */
export class NotingConcept<Author extends string, Subject extends string> {
  private readonly notes: Collection<NoteDocument<Author, Subject>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Noting") {
    this.notes = database.collection(`${name.toLowerCase()}.notes`);
  }

  /** Creates the unique index once. It keeps one note per author and subject, even when two saves arrive at once. If creating it fails, the next action tries again. */
  #ready() {
    this.indexes ??= this.notes.createIndex({ author: 1, subject: 1 }, { unique: true }).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async write({ author, subject, body }: { author: Author; subject: Subject; body: string }) {
    if (body.length > MAX_BODY) throw new TooLong("Notes can have at most 20,000 characters.");
    await this.#ready();
    const upsert = () =>
      this.notes.findOneAndUpdate(
        { author, subject },
        { $set: { body }, $setOnInsert: { _id: new ObjectId().toHexString() as Note } },
        { upsert: true, returnDocument: "after" },
      );
    let written: NoteDocument<Author, Subject> | null;
    try {
      written = await upsert();
    } catch (error) {
      // Another save added this author's note about the subject first; this one replaces its body instead.
      if (!isDuplicate(error)) throw error;
      written = await upsert();
    }
    return { note: written!._id };
  }

  async _note({ author, subject }: { author: Author; subject: Subject }) {
    const found = await this.notes.findOne({ author, subject });
    return found === null ? [] : [{ body: found.body }];
  }
}

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
