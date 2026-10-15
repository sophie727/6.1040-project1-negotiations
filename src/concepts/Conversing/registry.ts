import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Conversing.md" with { type: "text" };
import type { Db } from "mongodb";
import type { Role } from "../Briefing/Briefing.ts";
import type { Table } from "../Tabling/Tabling.ts";
import { ConversingConcept, InvalidMessage } from "./Conversing.ts";

/** Each conversation is a negotiation table's chat, and each message comes from a role, so the AI counterpart needs no account. */
class Conversing extends ConversingConcept<Table, Role> {}

export const conversing = registerConcept({
  class: Conversing,
  spec,
  refusals: { INVALID_MESSAGE: InvalidMessage },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Conversing(database, name) },
});
