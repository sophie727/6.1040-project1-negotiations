import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Preparing.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import type { Table } from "../Tabling/Tabling.ts";
import { PreparingConcept, TooLong } from "./Preparing.ts";

/** People who turn on prep sheets write a plan for each negotiation before it starts. */
class Preparing extends PreparingConcept<User, Table> {}

export const preparing = registerConcept({
  class: Preparing,
  spec,
  refusals: { TOO_LONG: TooLong },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Preparing(database, name) },
});
