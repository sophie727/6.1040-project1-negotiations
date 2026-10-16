import { assemble, type LogSink, type OperationalObserver } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import { composition as counterpart } from "./compositions/counterpart.ts";
import { composition as debrief } from "./compositions/debrief.ts";
import { composition as practice } from "./compositions/practice.ts";
import { composition as proposals } from "./compositions/proposals.ts";
import { composition as accounts } from "./compositions/reusable/accounts.ts";
import { composition as answering } from "./compositions/reusable/answering.ts";
import { composition as passwords } from "./compositions/reusable/passwords.ts";
import { composition as table } from "./compositions/table.ts";
import { applicationConceptSet } from "./concepts.ts";

/**
 * Builds The Whole Pie on a database; the server, the tests, and `sync-engine check` all use it. The tests pass a
 * `clock`, so they can move time past a table's deadline, and the server passes the counterpart's observer.
 */
export function assembleApplication(
  resources: { database: Db },
  options: { clock?: () => Date; observers?: OperationalObserver[]; logSink?: LogSink } = {},
) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: applicationConceptSet.implementations("mongo", resources),
    ...options,
    composition: {
      reusable: { accounts, passwords, answering },
      practice,
      table,
      proposals,
      counterpart,
      debrief,
    },
  });
}
