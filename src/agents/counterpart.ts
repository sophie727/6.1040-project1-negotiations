/** The counterpart, the agent here: it plays the other side at each practice table, replying to messages and answering proposals. */
import { DECISION_ASK, REPLY_ASK } from "../compositions/counterpart.ts";
import { createAgent, type Reasoner, ReasonerFailure } from "./reusable/agent.ts";

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
