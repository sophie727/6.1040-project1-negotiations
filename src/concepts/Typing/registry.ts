import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Typing.md" with { type: "text" };
import type { Db } from "mongodb";
import type { Role } from "../Briefing/Briefing.ts";
import type { Table } from "../Tabling/Tabling.ts";
import { TypingConcept } from "./Typing.ts";

/** People type in a negotiation table's chat, as the role they play there, as they send messages there. */
class Typing extends TypingConcept<Table, Role> {}

export const typing = registerConcept({
  class: Typing,
  spec,
  refusals: {},
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Typing(database, name) },
});
