import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { count, no, now, reaction, view, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { inputOf, textInput } from "./reusable/inputs.ts";
import { seatedAs } from "./table.ts";

const { Briefing, Matchmaking, Sessioning, Tabling } = concepts;

// Looking

/** (scenario) is published, so people can look for others to negotiate it with. */
const findable = view("people can look for others to negotiate (scenario) with", ({ scenario }) =>
  where(Briefing._scenario({ scenario }).is({ published: true })),
).holds();

/** How many people a negotiation of (scenario) needs: one for each of its roles. */
const groupSize = view("how many people a negotiation of (scenario) needs", ({ scenario }, { size }) =>
  where(count(Briefing._roles, { scenario }, size)),
).one();

/** The table where (user) sits with the group that (request) found, once they have their seat there. */
const seatedFor = view("the table where (user) sits with the group (request) found", ({ request, user }, { table }) =>
  where(Matchmaking._place({ request }).is({ place: table }), seatedAs({ user, table })),
).optional();

/**
 * Looks for others to negotiate (scenario) with, or, when the person is (open) to any scenario for as many people, for
 * others to negotiate anything that size with, suggesting (scenario) in case they're all open. It answers once the flow
 * has settled: right away while the person waits, and, when this request completed a group, once they are seated at
 * the group's table.
 */
const Find = endpoint(
  "/matchmaking/find",
  ({ session, scenario, open, user, size, instant, request, table }) =>
    receive({ session, scenario, open })
      .where(findable({ scenario }))
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(now(instant), groupSize({ scenario }).is({ size })).then(
          Matchmaking.seek({ seeker: user, pool: scenario, size, open, now: instant }).responds({ request }),
        ),
      )
      .afterFlowSettles()
      .then(
        where(Matchmaking._request({ request }).is({ status: "WAITING" }))
          .then(respond({ request, status: "WAITING", table: null }))
          .named("waiting"),
        where(seatedFor({ request, user }).is({ table }))
          .then(respond({ request, status: "MATCHED", table }))
          .named("matched"),
      ),
  { validators: { input: inputOf({ open: "flag" }) } },
);

const RefuseUnfindable = endpoint("/matchmaking/find", ({ session, scenario, open }) =>
  receive({ session, scenario, open })
    .where(no(findable({ scenario })))
    .then(respond({ error: "NOT_FOUND" })),
);

/**
 * What became of (request), which the page asks every few seconds while the person waits: checking in keeps a waiting
 * request counting. A request that lapsed, because the page stopped asking, says so, and the page looks again. A
 * matched request answers with the table once the person is seated there.
 */
const Wait = endpoint(
  "/matchmaking/wait",
  ({ session, request, user, instant, table }) =>
    receive({ session, request })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(
          now(instant),
          Matchmaking._request({ request }).is({ seeker: user, status: "WAITING" }),
          Matchmaking._lapsed({ request, now: instant }).is({ lapsed: false }),
        )
          .then(Matchmaking.checkIn({ request, seeker: user, now: instant }).responds({}))
          .then(respond({ status: "WAITING", table: null }))
          .named("waiting"),
        where(
          now(instant),
          Matchmaking._request({ request }).is({ seeker: user, status: "WAITING" }),
          Matchmaking._lapsed({ request, now: instant }).is({ lapsed: true }),
        )
          .then(respond({ status: "LAPSED", table: null }))
          .named("lapsed"),
        where(Matchmaking._request({ request }).is({ seeker: user, status: "MATCHED" }), seatedFor({ request, user }).is({ table }))
          .then(respond({ status: "MATCHED", table }))
          .named("seated"),
        where(Matchmaking._request({ request }).is({ seeker: user, status: "MATCHED" }), no(seatedFor({ request, user })))
          .then(respond({ status: "MATCHED", table: null }))
          .named("meeting"),
        where(Matchmaking._request({ request }).is({ seeker: user, status: "STOPPED" }))
          .then(respond({ status: "STOPPED", table: null }))
          .named("stopped"),
        where(no(Matchmaking._request({ request }).is({ seeker: user })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-yours"),
      ),
  { validators: { input: textInput } },
);

/** Stops looking. Matchmaking refuses a request that was already matched or stopped with NOT_WAITING. */
const Stop = endpoint(
  "/matchmaking/stop",
  ({ session, request, user }) =>
    receive({ session, request })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(Matchmaking._request({ request }).is({ seeker: user }))
          .then(Matchmaking.stop({ request, seeker: user }).responds({}))
          .then(respond({}))
          .named("yours"),
        where(no(Matchmaking._request({ request }).is({ seeker: user })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-yours"),
      ),
  { validators: { input: textInput } },
);

// Meeting

/**
 * When someone's search completes a group, a table opens for the scenario the group agreed on, and the group meets
 * there. Only the search that formed the group says so, so each group gets one table.
 */
const OpenTableForMatch = reaction(({ request, scenario, table }) =>
  when(Matchmaking.seek({}).responds({ request, grouped: true }))
    .where(Matchmaking._agreed({ request }).is({ pool: scenario }))
    .then(Tabling.open({ scenario }).responds({ table }))
    .then(Matchmaking.meet({ request, place: table })),
);

/**
 * Once the group's table has a seat for each role, each member sits down without choosing a role, so Tabling gives
 * each of them one of the empty seats at random.
 */
const SeatMembers = reaction(({ request, table, seeker }) =>
  when(Matchmaking.meet({ request, place: table }).responds({}))
    .afterFlowSettles()
    .where(Matchmaking._members({ request }).is({ seeker }))
    .then(Tabling.seat({ table, negotiator: seeker })),
);

export const composition = {
  looking: { findable, groupSize, seatedFor, Find, RefuseUnfindable, Wait, Stop },
  meeting: { OpenTableForMatch, SeatMembers },
};
