// Copied from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng.
import { type Collection, type Db, ObjectId } from "mongodb";

export class NothingAsked extends Error {}
export class UnknownPrompt extends Error {}
export class Closed extends Error {}
export class AlreadyTaken extends Error {}
export class NotTaken extends Error {}
export class NotYours extends Error {}
export class EmptyAnswer extends Error {}
export class NoReason extends Error {}

type Stage = "WAITING" | "FORMING" | "CONCLUDED" | "ABANDONED";

export type Prompt = string & { readonly __brand: "Prompt" };

/** One `stage` field encodes Taken, Concluded, and Abandoned Prompts from the specification; a taken prompt has a reasoner. */
interface PromptDocument<Subject, Reasoner> {
  _id: Prompt;
  subject: Subject;
  ask: string;
  answer: string;
  stage: Stage;
  reasoner?: Reasoner;
  reason?: string;
}

/** Lets people ask a reasoner a question that takes time to answer, and read the answer as the reasoner writes it. */
export class ReasoningConcept<Subject extends string, Reasoner extends string> {
  private readonly prompts: Collection<PromptDocument<Subject, Reasoner>>;

  constructor(database: Db, name = "Reasoning") {
    this.prompts = database.collection(`${name.toLowerCase()}.prompts`);
  }

  async prompt({ subject, ask }: { subject: Subject; ask: string }) {
    if (ask.trim() === "") throw new NothingAsked("The question is blank.");
    const prompt = new ObjectId().toHexString() as Prompt;
    await this.prompts.insertOne({ _id: prompt, subject, ask, answer: "", stage: "WAITING" });
    return { prompt };
  }

  async take({ prompt, reasoner }: { prompt: Prompt; reasoner: Reasoner }) {
    const { matchedCount } = await this.prompts.updateOne(
      { _id: prompt, stage: "WAITING" },
      { $set: { stage: "FORMING", reasoner } },
    );
    if (matchedCount === 0) {
      const taken = new AlreadyTaken("This prompt has already been taken.");
      throw await refusalFor(this.prompts, prompt, taken);
    }
    return { prompt };
  }

  async extend({ prompt, reasoner, text }: { prompt: Prompt; reasoner: Reasoner; text: string }) {
    const { matchedCount } = await this.prompts.updateOne({ _id: prompt, stage: "FORMING", reasoner }, [
      { $set: { answer: { $concat: ["$answer", text] } } },
    ]);
    if (matchedCount === 0) {
      const waiting = new NotTaken("A reasoner has to take this prompt before answering it.");
      throw await refusalFor(this.prompts, prompt, waiting, reasoner);
    }
    return {};
  }

  async conclude({ prompt, reasoner }: { prompt: Prompt; reasoner: Reasoner }) {
    const concluded = await this.prompts.findOneAndUpdate(
      { _id: prompt, stage: "FORMING", reasoner, answer: /\S/ },
      { $set: { stage: "CONCLUDED" } },
    );
    if (concluded === null) {
      const empty = new EmptyAnswer("The answer is still empty; abandon the prompt instead.");
      throw await refusalFor(this.prompts, prompt, empty, reasoner);
    }
    return { prompt, subject: concluded.subject, ask: concluded.ask };
  }

  async abandon({ prompt, reason }: { prompt: Prompt; reason: string }) {
    if (reason.trim() === "") throw new NoReason("Say why you are abandoning the prompt.");
    const { matchedCount } = await this.prompts.updateOne(
      { _id: prompt, stage: { $in: ["WAITING", "FORMING"] } },
      { $set: { stage: "ABANDONED", reason } },
    );
    if (matchedCount === 0) {
      const closed = new Closed("This prompt is already concluded or abandoned.");
      throw await refusalFor(this.prompts, prompt, closed);
    }
    return { prompt };
  }

  async forget({ subject }: { subject: Subject }) {
    await this.prompts.deleteMany({ subject });
    return { subject };
  }

  async _waiting() {
    const waiting = await this.prompts.find({ stage: "WAITING" }).sort({ _id: 1 }).toArray();
    return waiting.map(({ _id, subject, ask }) => ({ prompt: _id, subject, ask }));
  }

  async _about({ subject }: { subject: Subject }) {
    const prompts = await this.prompts.find({ subject }).sort({ _id: 1 }).toArray();
    return prompts.map(({ _id, ask, answer, stage }) => ({ prompt: _id, ask, answer, stage }));
  }

  async _taken({ reasoner }: { reasoner: Reasoner }) {
    const taken = await this.prompts.find({ stage: "FORMING", reasoner }).sort({ _id: 1 }).toArray();
    return taken.map(({ _id, subject }) => ({ prompt: _id, subject }));
  }

  async _reasoner({ prompt }: { prompt: Prompt }) {
    const found = await this.prompts.findOne({ _id: prompt });
    return found?.reasoner === undefined ? [] : [{ reasoner: found.reasoner }];
  }

  async _reason({ prompt }: { prompt: Prompt }) {
    const found = await this.prompts.findOne({ _id: prompt });
    return found?.reason === undefined ? [] : [{ reason: found.reason }];
  }

  async _lines({ prompt }: { prompt: Prompt }) {
    const concluded = await this.prompts.findOne({ _id: prompt, stage: "CONCLUDED" });
    if (concluded === null) return [];
    return concluded.answer
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .map((line, position) => ({ line, position }));
  }
}

/**
 * Reads the prompt once after a write matched nothing, and returns the first refusal that applies, in specification order:
 * unknown, then closed, then, when a reasoner is answering, not taken or not theirs; otherwise the given refusal.
 */
async function refusalFor<Subject, Reasoner>(
  prompts: Collection<PromptDocument<Subject, Reasoner>>,
  prompt: Prompt,
  otherwise: Error,
  answering?: Reasoner,
): Promise<Error> {
  const found = await prompts.findOne({ _id: prompt });
  if (found === null) return new UnknownPrompt("There is no such prompt.");
  if (found.stage === "CONCLUDED" || found.stage === "ABANDONED") {
    return new Closed("This prompt is already concluded or abandoned.");
  }
  if (answering !== undefined && found.stage === "WAITING") {
    return new NotTaken("A reasoner has to take this prompt before answering it.");
  }
  if (answering !== undefined && found.reasoner !== answering) {
    return new NotYours("Only the reasoner that took this prompt can answer it.");
  }
  return otherwise;
}
