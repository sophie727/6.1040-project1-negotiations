import { type Collection, type Db, ObjectId } from "mongodb";

export class InvalidMessage extends Error {}

export type Message = string & { readonly __brand: "Message" };

const MAX_BODY = 2_000;

interface MessageDocument<Subject, Speaker> {
  _id: Message;
  subject: Subject;
  sender: Speaker;
  body: string;
  sentAt: Date;
}

/** Keeps what people say about a subject in the order they said it, so everyone reads the same conversation. */
export class ConversingConcept<Subject extends string, Speaker extends string> {
  private readonly messages: Collection<MessageDocument<Subject, Speaker>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Conversing") {
    this.messages = database.collection(`${name.toLowerCase()}.messages`);
  }

  /** Creates the index once, so reading one conversation doesn't scan every message. If creating it fails, the next action tries again. */
  #ready() {
    this.indexes ??= this.messages.createIndex({ subject: 1, _id: 1 }).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async send({ subject, sender, body, now }: { subject: Subject; sender: Speaker; body: string; now: Date }) {
    const stored = body.trim();
    if (stored.length === 0 || stored.length > MAX_BODY) {
      throw new InvalidMessage("A message must have 1 to 2,000 characters.");
    }
    const message = new ObjectId().toHexString() as Message;
    await this.#ready();
    await this.messages.insertOne({ _id: message, subject, sender, body: stored, sentAt: new Date(now) });
    return { message };
  }

  async _messages({ subject }: { subject: Subject }) {
    // Each _id comes from an ObjectId, which starts with the time it was made, so sorting by _id keeps the order of sending.
    const messages = await this.messages.find({ subject }).sort({ _id: 1 }).toArray();
    return messages.map(({ _id, sender, body, sentAt }) => ({ message: _id, sender, body, sentAt }));
  }
}
