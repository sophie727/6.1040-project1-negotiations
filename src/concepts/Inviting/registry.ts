import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Inviting.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import type { Table } from "../Tabling/Tabling.ts";
import { InvitingConcept } from "./Inviting.ts";

/** People invite friends to their negotiation tables. */
class Inviting extends InvitingConcept<Table, User> {}

export const inviting = registerConcept({
  class: Inviting,
  spec,
  refusals: {},
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Inviting(database, name) },
});
