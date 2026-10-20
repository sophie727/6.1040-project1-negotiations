import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { compute, each, former, no, reaction, view, when, whether, where } from "@mit-sdg/sync-engine/language";
import { computations, concepts } from "../concepts.ts";
import { COUNTERPART } from "./counterpart.ts";
import { textInput } from "./reusable/inputs.ts";
import { openSeats, ratingsOf, seatedAs } from "./table.ts";

const { Briefing, Registering, Sessioning, Tabling } = concepts;
const { counterpartFor, spiceLevel } = computations;

// Choosing

/**
 * How spicy (scenario) is, from 1 (mild) to 3 (hot): how much its whole pie adds to what its roles get together by
 * walking away. A scenario where no deal is possible has no whole pie, and is hot.
 */
export const spiceOf = view("how spicy (scenario) is", ({ scenario }, { spice }, { jointPoints, jointBatna }) =>
  where(
    whether(Briefing._wholePie({ scenario }).is({ jointPoints })),
    Briefing._jointBatna({ scenario }).is({ jointBatna }),
    compute(spiceLevel, { jointPoints, jointBatna }, spice),
  ),
).optional();

/**
 * The published scenarios, by name, each with its recommended time limit, its roles, and how spicy it is. Only the
 * spice level leaves the server: the whole pie's points would tell the roles what the others get by walking away.
 */
const scenarios = former("the published scenarios", (_input, { scenario, name, timeLimit, role, roleName, spice }) =>
  each(Briefing._published({}).is({ scenario, name }))
    .where(whether(Tabling._recommendedTimeLimit({ scenario }).is({ timeLimit })), spiceOf({ scenario }).is({ spice }))
    .form({
      scenario,
      name,
      timeLimit,
      spice,
      roles: each(Briefing._roles({ scenario }).is({ role, name: roleName })).form({ role, name: roleName }),
    }),
);

/**
 * The tables (user) has a seat at, most recently opened first, with the scenario, the role they play, and the usernames
 * of the other people at the table. The counterpart has no username, so a practice table lists nobody.
 */
const tablesOf = former(
  "the tables (user) has a seat at",
  ({ user }, { table, role, scenario, status, scenarioName, roleName, seat, other, username }) =>
    each(Tabling._tablesOf({ negotiator: user }).is({ table, role, scenario, status }))
      .where(Briefing._scenario({ scenario }).is({ name: scenarioName }), Briefing._role({ role }).is({ name: roleName }))
      .form({
        table,
        scenario,
        scenarioName,
        role,
        roleName,
        status,
        opponents: each(Tabling._seats({ table }).is({ role: seat, negotiator: other }))
          .where(no(seatedAs({ user, table }).is({ role: seat })), Registering._username({ user: other }).is({ username }))
          .distinct(username),
      }),
);

const ShowBakery = endpoint(
  "/bakery",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(respond({ scenarios: scenarios({}), tables: tablesOf({ user }), ratings: ratingsOf({ user }) })),
  { validators: { input: textInput } },
);

// Starting

/** (role) belongs to (scenario), and (scenario) is published, so people can practice it. */
export const playable = view("(role) of (scenario) can be practiced", ({ scenario, role }) =>
  where(Briefing._role({ role }).is({ scenario }), Briefing._scenario({ scenario }).is({ published: true })),
).holds();

const StartPractice = endpoint(
  "/practice/start",
  ({ session, scenario, role, user, table }) =>
    receive({ session, scenario, role })
      .where(playable({ scenario, role }))
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Tabling.open({ scenario }).responds({ table }))
      // A reaction in the table composition adds a seat for each role; once it has, take the chosen one.
      .afterFlowSettles()
      .then(Tabling.seat({ table, negotiator: user, role }).responds({}))
      // The counterpart takes one of the other seats, and `SeatMoreCounterparts` fills any left.
      .then(Tabling.seat({ table, negotiator: COUNTERPART }).responds({}))
      // Once every seat has joined the table's proposals, the table is ready.
      .afterFlowSettles()
      .then(respond({ table })),
  { validators: { input: textInput } },
);

/**
 * When the counterpart takes a seat, another counterpart takes each seat still empty, as at a scenario with three
 * roles. Tabling seats each player only once at a table, so each is its own player, named for the role it plays.
 */
const SeatMoreCounterparts = reaction(({ table, other, player }) =>
  when(Tabling.seat({ table, negotiator: COUNTERPART }).responds({}))
    .where(openSeats({ table }).is({ role: other }), compute(counterpartFor, { role: other }, player))
    .then(Tabling.seat({ table, negotiator: player, role: other })),
);

const RefuseUnplayable = endpoint("/practice/start", ({ session, scenario, role }) =>
  receive({ session, scenario, role })
    .where(no(playable({ scenario, role })))
    .then(respond({ error: "NOT_FOUND" })),
);

export const composition = {
  choosing: { spiceOf, scenarios, tablesOf, ShowBakery },
  starting: { playable, StartPractice, SeatMoreCounterparts, RefuseUnplayable },
};
