import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, no, view, whether, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { COUNTERPART } from "./counterpart.ts";
import { inputOf, textInput } from "./reusable/inputs.ts";

const { Briefing, Sessioning, Tabling } = concepts;

// Choosing

/** The published scenarios, by name, each with its recommended time limit and its roles. */
const scenarios = former("the published scenarios", (_input, { scenario, name, timeLimit, role, roleName }) =>
  each(Briefing._published({}).is({ scenario, name }))
    .where(whether(Tabling._recommendedTimeLimit({ scenario }).is({ timeLimit })))
    .form({
      scenario,
      name,
      timeLimit,
      roles: each(Briefing._roles({ scenario }).is({ role, name: roleName })).form({ role, name: roleName }),
    }),
);

/** The tables (user) has a seat at, most recently opened first, with the scenario and the role they play. */
const tablesOf = former(
  "the tables (user) has a seat at",
  ({ user }, { table, role, scenario, status, scenarioName, roleName }) =>
    each(Tabling._tablesOf({ negotiator: user }).is({ table, role, scenario, status }))
      .where(Briefing._scenario({ scenario }).is({ name: scenarioName }), Briefing._role({ role }).is({ name: roleName }))
      .form({ table, scenario, scenarioName, role, roleName, status }),
);

const ShowBakery = endpoint(
  "/bakery",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(respond({ scenarios: scenarios({}), tables: tablesOf({ user }) })),
  { validators: { input: textInput } },
);

// Starting

/** (role) belongs to (scenario), and (scenario) is published, so people can practice it. */
const playable = view("(role) of (scenario) can be practiced", ({ scenario, role }) =>
  where(Briefing._role({ role }).is({ scenario }), Briefing._scenario({ scenario }).is({ published: true })),
).holds();

const StartPractice = endpoint(
  "/practice/start",
  ({ session, scenario, role, timeLimit, user, table, other }) =>
    receive({ session, scenario, role, timeLimit })
      .where(playable({ scenario, role }))
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Tabling.open({ scenario, timeLimit }).responds({ table }))
      // A reaction in the table composition adds a seat for each role; once it has, take the chosen one.
      .afterFlowSettles()
      .then(Tabling.seat({ table, negotiator: user, role }).responds({}))
      .then(
        where(
          Tabling._seats({ table }).is({ role: other }),
          no(Tabling._seats({ table }).is({ role: other, negotiator: user })),
        ).then(Tabling.seat({ table, negotiator: COUNTERPART, role: other }).responds({})),
      )
      // Once both seats have joined the table's proposals, the table is ready.
      .afterFlowSettles()
      .then(respond({ table })),
  { validators: { input: inputOf({ timeLimit: "number" }) } },
);

const RefuseUnplayable = endpoint("/practice/start", ({ session, scenario, role, timeLimit }) =>
  receive({ session, scenario, role, timeLimit })
    .where(no(playable({ scenario, role })))
    .then(respond({ error: "NOT_FOUND" })),
);

export const composition = {
  choosing: { scenarios, tablesOf, ShowBakery },
  starting: { playable, StartPractice, RefuseUnplayable },
};
