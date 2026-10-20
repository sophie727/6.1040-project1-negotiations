import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Rating.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import type { Table } from "../Tabling/Tabling.ts";
import { AlreadyRecorded, RatingConcept } from "./Rating.ts";

/** Each negotiation between people counts toward the ratings of everyone who sat at its table. */
class Rating extends RatingConcept<User, Table> {}

export const rating = registerConcept({
  class: Rating,
  spec,
  refusals: { ALREADY_RECORDED: AlreadyRecorded },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Rating(database, name) },
});
