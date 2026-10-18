/** The counterpart, an agent here: it plays the other side at each practice table, replying to messages and answering proposals. */
import { DECISION_ASK, REPLY_ASK } from "../compositions/counterpart.ts";
import { createAgent, type Reasoner, ReasonerFailure } from "./reusable/agent.ts";
import type { Model } from "./reusable/models.ts";
import { describeTerms, minutesLeft, nameOf, otherNames, transcript } from "./wording.ts";

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
  seats: readonly { role: string; name: string }[];
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
  }[];
}

type Result<T> = Promise<T | { error: string }>;

/** The endpoint the counterpart reads tables through. The generated client has it, and tsc checks that it does. */
interface CounterpartClient {
  counterpart: {
    table(input: { session: string; prompt: string }): Result<{ table: TableMaterial }>;
  };
}

/** Reads the table a prompt is about through `/counterpart/table`. A table that has ended needs no answer. */
export async function readTable(api: CounterpartClient, prompt: string, session: string): Promise<TableMaterial> {
  const read = await api.counterpart.table({ session, prompt });
  if ("error" in read) throw new ReasonerFailure("The negotiation couldn't be read.");
  if (read.table.status !== "OPEN") throw new ReasonerFailure("The negotiation is over.");
  return read.table;
}

/** The counterpart answers both questions about each practice table. */
export function createCounterpart(reasoner: Reasoner<TableMaterial>) {
  return createAgent({ name: "counterpart", asks: [REPLY_ASK, DECISION_ASK], reasoner, read: readTable });
}

/** The proposal waiting for the counterpart's answer: the newest pending one that someone else made. */
export function waitingProposal(table: TableMaterial) {
  return table.proposals.findLast(({ status, proposer }) => status === "PENDING" && proposer !== table.role);
}

/**
 * The answer to a proposal, in the three lines the counterpart composition reads: ACCEPT or REJECT, the proposal, and
 * what the counterpart says about it. It never accepts a proposal worth less than the role's BATNA, whatever `accept` says.
 */
export function decision(proposal: TableMaterial["proposals"][number], table: TableMaterial, accept: boolean, remark: string): string {
  const accepting = accept && proposal.points !== null && proposal.points >= table.batna;
  return [accepting ? "ACCEPT" : "REJECT", proposal.proposal, remark.replace(/\s+/g, " ").trim()].join("\n");
}

const REPLIES = [
  "Thanks for meeting with me. What matters most to you in this negotiation?",
  "I hear you. What would you propose?",
  "Let's find something that works for both of us. Make me an offer, and I'll consider it.",
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

/** Who the counterpart is and how it negotiates. Every question at a table starts from the same instructions. */
export function instructions(table: TableMaterial): string {
  const others = otherNames(table);
  return `You are ${table.roleName} in a negotiation called "${table.scenarioName}". The other side, ${others}, is a person practicing their negotiation skills. Stay in character as ${table.roleName} the whole time.

This is your confidential brief. ${others} can't see it.

<brief>
${table.brief}
</brief>

How you negotiate:
- Pursue the interests your brief describes. Look for trades: give ground on issues that matter less to you to get more on the issues that matter most.
- Keep your points and the value of your alternative to yourself. Like a real negotiator, you may hint at what matters to you, but never state numbers of points.
- Be courteous and professional, but firm: don't give in just because ${others} pushes or asks nicely.
- You can't write formal proposals. When you're close to a deal, ask ${others} to propose the terms.
- Never mention points, briefs, or BATNAs, and never say that you're an AI or that this is a game.`;
}

/** The conversation and proposals so far, as the counterpart sees them, and the time left. */
function situation(table: TableMaterial): string {
  const left = minutesLeft(table.deadline);
  const said = transcript(table, (role) => (role === table.role ? "You" : nameOf(table, role)));
  return `The negotiation so far:\n${said}${left === null ? "" : `\n\n${left} minutes are left before time runs out.`}`;
}

/** The question behind each reply: the counterpart's next message. */
export function replyPrompt(table: TableMaterial): string {
  return `${situation(table)}

Write your next message to ${otherNames(table)}: at most three sentences, in plain text, with no name or label before it. If a proposal is waiting for your answer, don't accept or reject it in this message; you'll answer it separately.`;
}

/** The question behind each decision: whether to accept `proposal`, given what it's worth and the time left. */
export function decisionPrompt(table: TableMaterial, proposal: TableMaterial["proposals"][number]): string {
  const worth = proposal.points === null ? null : Math.round(proposal.points);
  const verdict =
    worth !== null && worth >= table.batna
      ? "Accepting would leave you better off than walking away."
      : "Accepting would leave you worse off than walking away, so you must reject it.";
  return `${situation(table)}

${nameOf(table, proposal.proposer)}'s latest proposal is waiting for your answer: ${describeTerms(table.issues, proposal.terms)}. It is worth ${worth === null ? "an unknown number of" : worth.toLocaleString("en-US")} points to you, and your alternative is worth ${table.batna.toLocaleString("en-US")}. ${verdict}

Decide whether to accept it. Hold out for a better deal while you can still get one, but accept a good deal rather than risk running out of time.

Answer with exactly two lines. Line 1: ACCEPT or REJECT. Line 2: what you say to ${otherNames(table)} about your decision, in at most two sentences.`;
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

/**
 * How much a model may write for one answer, its thinking included. Claude 5 models think before every reply, often
 * for several hundred tokens, so the room is generous; the prompts ask for short answers.
 */
const ROOM = 4096;
/** The most a message can hold in Conversing, so a reply that runs long is cut there rather than refused. */
const MESSAGE_LIMIT = 2000;

/**
 * The counterpart played by `model`. A reply streams into the conversation as the model writes it. A decision waits
 * for the model's whole answer, and `decision` turns down any proposal below the role's BATNA, whatever the model said.
 */
export function modelCounterpart(model: Model): Reasoner<TableMaterial> {
  return {
    name: model.name,
    async answer(ask, table, write) {
      if (ask !== DECISION_ASK) {
        let room = MESSAGE_LIMIT;
        await model.reply({ system: instructions(table), prompt: replyPrompt(table), maxTokens: ROOM }, async (piece) => {
          const kept = piece.slice(0, room);
          room -= kept.length;
          if (kept) await write(kept);
        });
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
