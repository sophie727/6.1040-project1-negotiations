import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Proposing.md" with { type: "text" };
import type { Db } from "mongodb";
import type { Role, TermSheet } from "../Briefing/Briefing.ts";
import type { Table } from "../Tabling/Tabling.ts";
import {
  AlreadyAccepted,
  AlreadyAgreed,
  AlreadyJoined,
  NoOtherParticipants,
  NotAParticipant,
  NotPendingForYou,
  NotPendingFromYou,
  ProposalsStarted,
  ProposingConcept,
} from "./Proposing.ts";

const refusals = {
  PROPOSALS_STARTED: ProposalsStarted,
  ALREADY_JOINED: AlreadyJoined,
  NOT_A_PARTICIPANT: NotAParticipant,
  NO_OTHER_PARTICIPANTS: NoOtherParticipants,
  ALREADY_AGREED: AlreadyAgreed,
  NOT_PENDING_FOR_YOU: NotPendingForYou,
  ALREADY_ACCEPTED: AlreadyAccepted,
  NOT_PENDING_FROM_YOU: NotPendingFromYou,
};

/** The roles at a negotiation table offer each other term sheets, which Briefing scores. */
class Proposing extends ProposingConcept<Table, Role, TermSheet> {}

export const proposing = registerConcept({
  class: Proposing,
  spec,
  refusals,
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Proposing(database, name) },
});

/** Before a negotiation begins, the roles at its table agree on how long it lasts: a time limit in whole minutes. */
class TimeLimitProposing extends ProposingConcept<Table, Role, number> {}

export const timeLimitProposing = registerConcept({
  class: TimeLimitProposing,
  spec,
  refusals,
  floors: { mongo: ({ database }: { database: Db }, name: string) => new TimeLimitProposing(database, name) },
});
