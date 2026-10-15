import { assemble } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import { applicationConceptSet } from "./concepts.ts";

/** Builds The Whole Pie on a database; the server, the tests, and `sync-engine check` all use it. */
export function assembleApplication(resources: { database: Db }) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: applicationConceptSet.implementations("mongo", resources),
    composition: {},
  });
}
