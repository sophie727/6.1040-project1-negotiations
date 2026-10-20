/**
 * The counterpart, an agent here: it plays every seat the person doesn't at each practice table, replying to messages
 * and answering proposals, one role at a time.
 */
import { COUNTERPART_ASKS } from "../compositions/asks.ts";
import { DECISION_ASK, FOLLOW_UP_ASK } from "../compositions/counterpart.ts";
import { createAgent, type Reasoner, ReasonerFailure } from "./reusable/agent.ts";
import type { Model } from "./reusable/models.ts";
import { describeTerms, list, minutesLeft, nameOf, otherNames, transcript } from "./wording.ts";

/** A table, as the counterpart reads it: what the role it plays there can see, and nothing from the other briefs. */
export interface TableMaterial {
  table: string;
  scenarioName: string;
  status: string;
  deadline: string | null;
  role: string;
  roleName: string;
  batna: number;
  brief: string;
  /** Every seat's role, and the username of the person in it, or null for a counterpart. */
  seats: readonly { role: string; name: string; player: string | null }[];
  issues: readonly {
    issue: string;
    name: string;
    kind: string;
    unit: string | null;
    options: readonly { option: string; name: string; universalValue: number | null }[];
  }[];
  /** The role's own points for each option. */
  payoffs: readonly { option: string; points: number }[];
  messages: readonly { message: string; sender: string; body: string; sentAt: string }[];
  proposals: readonly {
    proposal: string;
    proposer: string;
    terms: Readonly<Record<string, string | number>>;
    status: string;
    proposedAt: string;
    /** What the proposal is worth to the counterpart's role. */
    points: number | null;
    /** The roles that have accepted the proposal so far. */
    acceptedBy: readonly string[];
  }[];
}

type Result<T> = Promise<T | { error: string }>;

/** The endpoint the counterpart reads tables through. The generated client has it, and tsc checks that it does. */
interface CounterpartClient {
  counterpart: {
    table(input: { session: string; prompt: string }): Result<{ tables: TableMaterial[] }>;
  };
}

/**
 * Reads the table a prompt is about through `/counterpart/table`, as each counterpart there sees it. A table that has
 * ended needs no answer.
 */
export async function readTables(api: CounterpartClient, prompt: string, session: string): Promise<readonly TableMaterial[]> {
  const read = await api.counterpart.table({ session, prompt });
  if ("error" in read) throw new ReasonerFailure("The negotiation couldn't be read.");
  if (read.tables.some(({ status }) => status !== "OPEN")) throw new ReasonerFailure("The negotiation is over.");
  return read.tables;
}

/** The counterpart answers its three questions about each practice table, each as one of the roles it plays there. */
export function createCounterpart(reasoner: Reasoner<TableMaterial>) {
  return createAgent({ name: "counterpart", asks: COUNTERPART_ASKS, reasoner: seated(reasoner), read: readTables });
}

/** The answer when no counterpart adds anything to a round: it names no role, so the counterpart composition sends nothing. */
export const PASS = "PASS";

/**
 * Plays `reasoner` in the seat of the counterpart that answers `ask`, and starts the answer with that counterpart's role,
 * so the counterpart composition knows whose answer it is. It answers PASS when no counterpart has anything to add, and
 * when the one chosen to add something passes.
 */
export function seated(reasoner: Reasoner<TableMaterial>): Reasoner<readonly TableMaterial[]> {
  return {
    name: reasoner.name,
    async answer(ask, tables, write) {
      const table = answerer(ask, tables);
      if (table === undefined) {
        if (ask === DECISION_ASK) throw new ReasonerFailure("No proposal was waiting for an answer.");
        await write(PASS);
        return;
      }
      let text = "";
      await reasoner.answer(ask, table, async (piece) => {
        text += piece;
      });
      await write(text.trim() === PASS ? PASS : `${table.role}\n${text}`);
    },
  };
}

/** Whether a person, rather than a counterpart, sits in `role`'s seat at `table`. */
function isPerson(table: TableMaterial, role: string): boolean {
  return table.seats.some((seat) => seat.role === role && seat.player !== null);
}

/**
 * Which counterpart answers `ask`, from the table as each counterpart there sees it. A reply comes from the counterpart
 * that the person's newest message asks a question of, or else the one it names first, or, when it names none, the one
 * that has gone longest without speaking. Something to add comes from the same order, among the counterparts that
 * haven't spoken since that message. A decision comes from the first counterpart that has yet to answer the waiting
 * proposal. Undefined when none is left.
 */
export function answerer(ask: string, tables: readonly TableMaterial[]): TableMaterial | undefined {
  if (ask === DECISION_ASK) return tables.find((table) => waitingProposal(table) !== undefined);
  const [table] = tables;
  if (table === undefined) return undefined;
  const newest = table.messages.findLastIndex(({ sender }) => isPerson(table, sender));
  const said = newest === -1 ? "" : table.messages[newest]!.body;
  const spoken = new Set(table.messages.slice(newest + 1).map(({ sender }) => sender));
  const candidates = ask === FOLLOW_UP_ASK ? tables.filter(({ role }) => !spoken.has(role)) : tables;
  const turn = (candidate: TableMaterial): [tier: number, place: number] => {
    const name = new RegExp(`\\b${escaped(candidate.roleName)}\\b`, "i");
    // A question that names the counterpart, such as "Sally, what does Halvorsen need?", comes before a greeting.
    for (const question of said.matchAll(/[^.!?]*\?/g)) {
      const at = question[0].search(name);
      if (at !== -1) return [0, question.index + at];
    }
    const at = said.search(name);
    if (at !== -1) return [1, at];
    return [2, table.messages.findLastIndex(({ sender }) => sender === candidate.role)];
  };
  return candidates.toSorted((a, b) => {
    const [[tierA, placeA], [tierB, placeB]] = [turn(a), turn(b)];
    return tierA - tierB || placeA - placeB;
  })[0];
}

/** `text`, matched literally inside a regular expression. */
function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The proposal waiting for the counterpart's answer: the newest pending one that someone else made, and it hasn't accepted. */
export function waitingProposal(table: TableMaterial) {
  return table.proposals.findLast(
    ({ status, proposer, acceptedBy }) => status === "PENDING" && proposer !== table.role && !acceptedBy.includes(table.role),
  );
}

/** The most a message can hold in Conversing. */
const MESSAGE_LIMIT = 2000;

/**
 * What the counterpart says, as the messages it sends: one line each, which the counterpart composition sends in
 * order. Each paragraph is its own message, and a paragraph longer than a message can hold is cut after its last
 * sentence that fits, or, where no sentence ends in time, between words, so nothing the counterpart says is lost.
 */
export function asMessages(text: string, limit = MESSAGE_LIMIT): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "")
    .flatMap((paragraph) => cut(paragraph, limit));
}

/** `paragraph` in pieces of at most `limit` characters, each cut after a sentence where one ends in time. */
function cut(paragraph: string, limit: number): string[] {
  const pieces: string[] = [];
  let rest = paragraph;
  while (rest.length > limit) {
    const window = rest.slice(0, limit + 1);
    let at = -1;
    // A sentence ends at a period, question mark, or exclamation point, and any closing quotes, before a space.
    for (const end of window.matchAll(/[.!?]+["'’”)\]]*(?= )/g)) at = end.index + end[0].length;
    if (at <= 0) at = window.lastIndexOf(" ");
    if (at <= 0) at = limit;
    pieces.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest !== "") pieces.push(rest);
  return pieces;
}

/**
 * The answer to a proposal, in the lines the counterpart composition reads after the role, which `seated` puts first:
 * ACCEPT or REJECT, the proposal, and then what the counterpart says about it, as one or more messages. It never
 * accepts a proposal worth less than the role's BATNA, whatever `accept` says.
 */
export function decision(proposal: TableMaterial["proposals"][number], table: TableMaterial, accept: boolean, remark: string): string {
  const accepting = accept && proposal.points !== null && proposal.points >= table.batna;
  return [accepting ? "ACCEPT" : "REJECT", proposal.proposal, ...asMessages(remark)].join("\n");
}

const REPLIES = [
  "Thanks for meeting with me. What matters most to you in this negotiation?",
  "I hear you. What would you propose?",
  "Let's find something that works for everyone. Make an offer, and I'll consider it.",
];

/**
 * The stand-in for the language model, for tests and for working offline: canned replies, and an answer to each
 * proposal that accepts it exactly when it is worth at least the role's BATNA.
 */
export function standIn(ask: string, table: TableMaterial): string {
  if (ask === DECISION_ASK) {
    const proposal = waitingProposal(table);
    if (proposal === undefined) throw new ReasonerFailure("No proposal was waiting for an answer.");
    const accept = proposal.points !== null && proposal.points >= table.batna;
    return decision(proposal, table, accept, accept ? "That works for me. We have a deal." : "I can't agree to that. Can you do better?");
  }
  const said = table.messages.filter(({ sender }) => sender === table.role).length;
  return REPLIES[Math.min(said, REPLIES.length - 1)]!;
}

// Played by a language model

/** The names of the people at `table`, rather than counterparts: whoever is practicing. */
function peopleAt(table: TableMaterial): string {
  return list(table.seats.filter(({ player }) => player !== null).map(({ name }) => name)) || "the other side";
}

/** Whether `table` seats more than two roles, so each one negotiates with several others. */
function isGroup(table: TableMaterial): boolean {
  return table.seats.length > 2;
}

/** Who the counterpart is and how it negotiates. Every question at a table starts from the same instructions. */
export function instructions(table: TableMaterial): string {
  const others = otherNames(table);
  const people = peopleAt(table);
  const setting = isGroup(table)
    ? `You are ${table.roleName} in a negotiation called "${table.scenarioName}", with ${others}. ${people} is a person practicing their negotiation skills. A deal needs everyone at the table to accept it.`
    : `You are ${table.roleName} in a negotiation called "${table.scenarioName}". The other side, ${others}, is a person practicing their negotiation skills.`;
  const rules = [
    "Pursue the interests your brief describes. Look for trades: give ground on issues that matter less to you to get more on the issues that matter most.",
    ...(isGroup(table)
      ? ["The others at the table have confidential briefs of their own. Work with them where your interests line up, but look after your own."]
      : []),
    "Keep your points and the value of your alternative to yourself. Like a real negotiator, you may hint at what matters to you, but never state numbers of points.",
    "Be courteous and professional, but firm: don't give in just because someone pushes or asks nicely.",
    `You can't write formal proposals. When you're close to a deal, ask ${people} to propose the terms.`,
    "Never mention points, briefs, or BATNAs, and never say that you're an AI or that this is a game.",
  ];
  return `${setting} Stay in character as ${table.roleName} the whole time.

This is your confidential brief. ${others} can't see it.

<brief>
${table.brief}
</brief>

How you negotiate:
${rules.map((rule) => `- ${rule}`).join("\n")}`;
}

/** The conversation and proposals so far, as the counterpart sees them, and the time left. */
function situation(table: TableMaterial): string {
  const left = minutesLeft(table.deadline);
  const said = transcript(table, (role) => (role === table.role ? "You" : nameOf(table, role)));
  return `The negotiation so far:\n${said}${left === null ? "" : `\n\n${left} minutes are left before time runs out.`}`;
}

/** Whom the counterpart addresses: the other side, or, in a group, everyone at the table. */
function audience(table: TableMaterial): string {
  return isGroup(table) ? "the table" : otherNames(table);
}

/**
 * The question behind each reply: the counterpart's next message. When it would add to another counterpart's reply,
 * as `ask` says, it may pass instead.
 */
export function replyPrompt(table: TableMaterial, ask = ""): string {
  const adding =
    ask === FOLLOW_UP_ASK
      ? `\n\nSomeone else has already answered ${peopleAt(table)}'s latest message. Only add something if it matters to you; otherwise, answer with just the word ${PASS}.`
      : "";
  return `${situation(table)}

Write your next message to ${audience(table)}: at most three sentences, in plain text, with no name or label before it. If a proposal is waiting for your answer, don't accept or reject it in this message; you'll answer it separately.${adding}`;
}

/** The question behind each decision: whether to accept `proposal`, given what it's worth and the time left. */
export function decisionPrompt(table: TableMaterial, proposal: TableMaterial["proposals"][number]): string {
  const worth = proposal.points === null ? null : Math.round(proposal.points);
  const verdict =
    worth !== null && worth >= table.batna
      ? "Accepting would leave you better off than walking away."
      : "Accepting would leave you worse off than walking away, so you must reject it.";
  const accepted = list(proposal.acceptedBy.filter((role) => role !== proposal.proposer).map((role) => nameOf(table, role)));
  const waiting = accepted === "" ? "" : ` ${accepted} already accepted it.`;
  return `${situation(table)}

${nameOf(table, proposal.proposer)}'s latest proposal is waiting for your answer: ${describeTerms(table.issues, proposal.terms)}.${waiting} It is worth ${worth === null ? "an unknown number of" : worth.toLocaleString("en-US")} points to you, and your alternative is worth ${table.batna.toLocaleString("en-US")}. ${verdict}

Decide whether to accept it. Hold out for a better deal while you can still get one, but accept a good deal rather than risk running out of time.

Answer with exactly two lines. Line 1: ACCEPT or REJECT. Line 2: what you say to ${audience(table)} about your decision, in at most two sentences.`;
}

/** Reads a decision a model wrote: ACCEPT or REJECT on the first line, and what to say after it. Anything but a clear ACCEPT rejects. */
export function readDecision(text: string): { accept: boolean; remark: string } {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  const verdict = /\b(ACCEPT|REJECT)\b/i.exec(lines[0] ?? "")?.[1]?.toUpperCase();
  const remark = lines
    .slice(1)
    .join(" ")
    .replace(/^line 2:\s*/i, "");
  return { accept: verdict === "ACCEPT", remark };
}

/** Whether a model's reply passes, however it writes the word: "PASS", "Pass.", or "**PASS**". */
export function passes(text: string): boolean {
  return /^\W*pass\W*$/i.test(text.trim());
}

/**
 * How much a model may write for one answer, its thinking included. Claude 5 models think before every reply, often
 * for several hundred tokens, so the room is generous; the prompts ask for short answers.
 */
const ROOM = 4096;

/**
 * The counterpart played by `model`. A reply waits for the model's whole answer, so it can be split into messages a
 * message can hold, or, when the model had nothing to add, so it passes. A decision waits too, and `decision` turns
 * down any proposal below the role's BATNA, whatever the model said.
 */
export function modelCounterpart(model: Model): Reasoner<TableMaterial> {
  return {
    name: model.name,
    async answer(ask, table, write) {
      if (ask !== DECISION_ASK) {
        let text = "";
        await model.reply({ system: instructions(table), prompt: replyPrompt(table, ask), maxTokens: ROOM }, async (piece) => {
          text += piece;
        });
        if (ask === FOLLOW_UP_ASK && passes(text)) return write(PASS);
        const messages = asMessages(text);
        if (messages.length === 0) throw new ReasonerFailure("The model's reply was empty.");
        await write(messages.join("\n"));
        return;
      }
      const proposal = waitingProposal(table);
      if (proposal === undefined) throw new ReasonerFailure("No proposal was waiting for an answer.");
      let text = "";
      await model.reply({ system: instructions(table), prompt: decisionPrompt(table, proposal), maxTokens: ROOM }, async (piece) => {
        text += piece;
      });
      const { accept, remark } = readDecision(text);
      const allowed = proposal.points !== null && proposal.points >= table.batna;
      // A model that agrees to less than the BATNA is overruled, and its agreeing words aren't said either.
      const said = accept && !allowed ? "I can't agree to that." : remark || (accept ? "That works for me." : "I can't agree to that.");
      await write(decision(proposal, table, accept, said));
    },
  };
}
