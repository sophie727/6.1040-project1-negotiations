import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Preferring.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import { PreferringConcept } from "./Preferring.ts";

/** Each person's settings, such as whether they write a prep sheet before each negotiation. */
class Preferring extends PreferringConcept<User> {}

export const preferring = registerConcept({
  class: Preferring,
  spec,
  refusals: {},
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Preferring(database, name) },
});
