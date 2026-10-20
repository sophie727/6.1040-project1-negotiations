import type { Message, Proposal, Table } from "../api/client.ts";

/** One thing said or proposed at a table, with when. */
export type Entry = { kind: "message"; at: string; message: Message } | { kind: "proposal"; at: string; proposal: Proposal };

/** What a proposal was worth to another side, and that side's BATNA, once the debrief has revealed them. */
export interface Worth {
  name: string;
  points: number | null;
  batna: number;
}

/** Everything said and proposed at `table`, messages and proposals together, oldest first. */
export function conversationAt(table: Table): Entry[] {
  return [
    ...table.messages.map((message): Entry => ({ kind: "message", at: message.sentAt, message })),
    ...table.proposals.map((proposal): Entry => ({ kind: "proposal", at: proposal.proposedAt, proposal })),
  ].sort((a, b) => a.at.localeCompare(b.at));
}
