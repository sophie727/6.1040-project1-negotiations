import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Noting.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import type { Table } from "../Tabling/Tabling.ts";
import { NotingConcept, TooLong } from "./Noting.ts";

/** People keep their own notes about each negotiation table. */
class Noting extends NotingConcept<User, Table> {}

export const noting = registerConcept({
  class: Noting,
  spec,
  refusals: { TOO_LONG: TooLong },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Noting(database, name) },
});
