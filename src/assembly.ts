import { assemble, type LogSink, type OperationalObserver } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import { composition as authoring } from "./compositions/authoring.ts";
import { composition as counterpart } from "./compositions/counterpart.ts";
import { composition as debrief } from "./compositions/debrief.ts";
import { composition as friends } from "./compositions/friends.ts";
import { composition as matchmaking } from "./compositions/matchmaking.ts";
import { composition as practice } from "./compositions/practice.ts";
import { composition as preparing } from "./compositions/preparing.ts";
import { composition as proposals } from "./compositions/proposals.ts";
import { composition as ratings } from "./compositions/ratings.ts";
import { composition as accounts } from "./compositions/reusable/accounts.ts";
import { composition as answering } from "./compositions/reusable/answering.ts";
import { composition as commons } from "./compositions/reusable/commons.ts";
import { composition as passwords } from "./compositions/reusable/passwords.ts";
import { composition as table } from "./compositions/table.ts";
import { applicationConceptSet } from "./concepts.ts";
import type { Provider } from "./concepts/Federating/provider.ts";

/**
 * Builds The Whole Pie on a database and Commons, which people can sign in with; the server, the tests, and
 * `sync-engine check` all use it. The tests pass a `clock`, so they can move time past a table's deadline, and the
 * server passes the counterpart's observer.
 */
export function assembleApplication(
  resources: { database: Db; commons: Provider },
  options: { clock?: () => Date; observers?: OperationalObserver[]; logSink?: LogSink } = {},
) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: applicationConceptSet.implementations("mongo", resources),
    // A Commons sign-in attempt works like a password until it is spent, so it and the values sent with it are redacted from logs.
    redaction: { fields: ["attempt", "nonce", "state", "code"] },
    ...options,
    composition: {
      reusable: { accounts, passwords, commons, answering },
      practice,
      friends,
      matchmaking,
      table,
      proposals,
      counterpart,
      debrief,
      ratings,
      preparing,
      authoring,
    },
  });
}
