import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Reviewing.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import type { Table } from "../Tabling/Tabling.ts";
import { AlreadyReviewed, InvalidStars, ReviewingConcept, SelfReview } from "./Reviewing.ts";

/** After negotiating with each other, people review how it was to deal with each other. */
class Reviewing extends ReviewingConcept<Table, User> {}

export const reviewing = registerConcept({
  class: Reviewing,
  spec,
  refusals: { SELF_REVIEW: SelfReview, INVALID_STARS: InvalidStars, ALREADY_REVIEWED: AlreadyReviewed },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Reviewing(database, name) },
});
