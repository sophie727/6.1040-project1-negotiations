import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Posting.md" with { type: "text" };
import type { Db } from "mongodb";
import type { Scenario } from "../Briefing/Briefing.ts";
import type { User } from "../Registering/Registering.ts";
import { AlreadyArchived, AlreadyPosted, NotArchived, NotPosted, PostingConcept } from "./Posting.ts";

/** Authors post their scenarios to the bakery, and authors or the admin archive them to take them down. */
class Posting extends PostingConcept<Scenario, User> {}

export const posting = registerConcept({
  class: Posting,
  spec,
  refusals: {
    ALREADY_POSTED: AlreadyPosted,
    NOT_POSTED: NotPosted,
    ALREADY_ARCHIVED: AlreadyArchived,
    NOT_ARCHIVED: NotArchived,
  },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Posting(database, name) },
});
