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

/**
 * The three parts of a person's prep sheet for a negotiation, each kept the way notes are: what they aim for, the least
 * they'd accept, and what matters most. Each is its own instance, so each part is one note per person per table.
 */
class TargetNoting extends NotingConcept<User, Table> {}
class WalkawayNoting extends NotingConcept<User, Table> {}
class PrioritiesNoting extends NotingConcept<User, Table> {}

export const targetNoting = registerConcept({
  class: TargetNoting,
  spec,
  refusals: { TOO_LONG: TooLong },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new TargetNoting(database, name) },
});

export const walkawayNoting = registerConcept({
  class: WalkawayNoting,
  spec,
  refusals: { TOO_LONG: TooLong },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new WalkawayNoting(database, name) },
});

export const prioritiesNoting = registerConcept({
  class: PrioritiesNoting,
  spec,
  refusals: { TOO_LONG: TooLong },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new PrioritiesNoting(database, name) },
});
