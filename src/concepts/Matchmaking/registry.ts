import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Matchmaking.md" with { type: "text" };
import type { Db } from "mongodb";
import type { Scenario } from "../Briefing/Briefing.ts";
import type { User } from "../Registering/Registering.ts";
import type { Table } from "../Tabling/Tabling.ts";
import { AlreadyMet, InvalidSize, Lapsed, MatchmakingConcept, NotMatched, NotWaiting } from "./Matchmaking.ts";

/** People look for others to negotiate a scenario with, and each group meets at a table. */
class Matchmaking extends MatchmakingConcept<User, Scenario, Table> {}

export const matchmaking = registerConcept({
  class: Matchmaking,
  spec,
  refusals: {
    INVALID_SIZE: InvalidSize,
    NOT_WAITING: NotWaiting,
    LAPSED: Lapsed,
    NOT_MATCHED: NotMatched,
    ALREADY_MET: AlreadyMet,
  },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Matchmaking(database, name) },
});
