import type { Collection, Db } from "mongodb";

/** How long a signal that someone is typing lasts, unless they signal again. */
export const SIGNAL_MS = 6_000;

interface SignalDocument<Subject, Typist> {
  _id: string;
  subject: Subject;
  typist: Typist;
  until: Date;
}

/** Lets the people in a conversation see who is writing to them, so they know a reply is coming. */
export class TypingConcept<Subject extends string, Typist extends string> {
  private readonly signals: Collection<SignalDocument<Subject, Typist>>;

  constructor(database: Db, name = "Typing") {
    this.signals = database.collection(`${name.toLowerCase()}.signals`);
  }

  /** A signal's id, from its subject and typist, so each typist has one signal per subject. */
  #id(subject: Subject, typist: Typist) {
    return JSON.stringify([subject, typist]);
  }

  async type({ subject, typist, now }: { subject: Subject; typist: Typist; now: Date }) {
    const until = new Date(new Date(now).getTime() + SIGNAL_MS);
    await this.signals.updateOne({ _id: this.#id(subject, typist) }, { $set: { subject, typist, until } }, { upsert: true });
    return {};
  }

  async stop({ subject, typist }: { subject: Subject; typist: Typist }) {
    await this.signals.deleteOne({ _id: this.#id(subject, typist) });
    return {};
  }

  async _typing({ subject, now }: { subject: Subject; now: Date }) {
    const signals = await this.signals.find({ subject, until: { $gt: new Date(now) } }).sort({ typist: 1 }).toArray();
    return signals.map(({ typist }) => ({ typist }));
  }
}
