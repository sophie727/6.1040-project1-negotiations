import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createLocalClient } from "@mit-sdg/sync-engine/client";
import type { TheWholePieWire } from "../../generated/wire.ts";
import { type CoachMaterial, createCoach, scriptedDebrief } from "../../src/agents/coach.ts";
import { createCounterpart, standIn, type TableMaterial } from "../../src/agents/counterpart.ts";
import type { Reasoner } from "../../src/agents/reusable/agent.ts";
import { scriptedReasoner } from "../../src/agents/reusable/reasoners.ts";
import { assembleApplication } from "../../src/assembly.ts";
import { type Identity, MemoryProvider } from "../../src/concepts/Federating/provider.ts";
import { ensureAdmin, seed } from "../../src/seed/seed.ts";
import { testDatabase } from "./reusable/mongo.ts";
import { ok } from "./reusable/results.ts";

/**
 * Builds term sheets for a scenario with `issues`: given issue names mapped to option names on discrete issues and
 * universal values on continuous ones, it returns the term sheet keyed by issue and option identities.
 */
function termSheets(issues: readonly { issue: string; name: string; kind: string; options: readonly { option: string; name: string }[] }[]) {
  return (named: Record<string, string | number>) =>
    Object.fromEntries(
      issues.map(({ issue, name, kind, options }) => {
        const agreed = named[name]!;
        return [issue, kind === "DISCRETE" ? options.find((option) => option.name === agreed)!.option : agreed];
      }),
    );
}

/** The admin's password in every test, as `ADMIN_PASSWORD` gives it to the server. */
export const ADMIN_PASSWORD = "rolling pin";

/** 2:00 pm on the day of the tests, when every test's clock starts. */
export const START = new Date("2026-10-15T14:00:00.000Z");

/**
 * The Whole Pie on a fresh database with the built-in scenarios, called through its typed client. Its clock stands
 * still until a test moves it forward. The counterpart and the coach answer with the scripted stand-ins unless a test
 * passes another reasoner, and don't run at all when a test passes null.
 */
export async function startWholePie({
  counterpart = scriptedReasoner(standIn),
  coach = scriptedReasoner(scriptedDebrief),
}: { counterpart?: Reasoner<TableMaterial> | null; coach?: Reasoner<CoachMaterial> | null } = {}) {
  const database = await testDatabase();
  let now = START;
  /** Moves the clock forward by `minutes`. */
  const advance = (minutes: number) => {
    now = new Date(now.getTime() + minutes * 60_000);
  };
  const agents = [counterpart === null ? undefined : createCounterpart(counterpart), coach === null ? undefined : createCoach(coach)].filter(
    (agent) => agent !== undefined,
  );
  const commons = new MemoryProvider();
  const application = assembleApplication({ database, commons }, { clock: () => now, observers: agents.map(({ observer }) => observer) });
  await ensureAdmin(application, ADMIN_PASSWORD);
  await seed(application);
  const api = createLocalClient<TheWholePieWire>({ invoker: createGateway<TheWholePieWire>({ application }) });
  for (const agent of agents) void agent.start({ application, api });

  async function register(username: string) {
    return ok(await api.auth.register({ username, password: "correct horse" }));
  }

  /**
   * Signs in with Commons the way the browser does: start an attempt, approve The Whole Pie on Commons as `identity`,
   * and finish the attempt with the code and state Commons sends back.
   */
  async function signInWithCommons(identity: Identity) {
    const { attempt, address } = ok(await api.auth.commons.start({}));
    const { code, state } = commons.approve(address, identity);
    return { attempt, result: await api.auth.commons.finish({ attempt, state, code }) };
  }

  /**
   * Signs `username` up and opens a table where they practice `scenarioName`, The Job Offer unless a test says
   * otherwise, as `roleName`, with a counterpart in each other seat.
   */
  async function practice(username: string, roleName = "Hiro", scenarioName = "The Job Offer") {
    const { session } = await register(username);
    const scenario = ok(await api.bakery({ session })).scenarios.find(({ name }) => name === scenarioName)!;
    const role = scenario.roles.find(({ name }) => name === roleName)!.role;
    const { table } = ok(await api.practice.start({ session, scenario: scenario.scenario, role }));
    const { seats, issues } = ok(await api.tables.show({ session, table })).table;
    /** The role ids at the table, by role name. */
    const roles = Object.fromEntries(seats.map(({ role, name }) => [name, role]));
    const terms = termSheets(issues);
    /** The table as `username` sees it now. */
    const show = async () => ok(await api.tables.show({ session, table }));
    return { session, scenario: scenario.scenario, table, role, roles, terms, show };
  }

  /**
   * Signs `username` up and opens a table for The Job Offer where they play `roleName` and invite friends. Returns the
   * table's link code, and `join`, which signs a friend up and seats them through the link in the empty seat.
   */
  async function hostFriends(username: string, roleName = "Hiro") {
    const { session } = await register(username);
    const [jobOffer] = ok(await api.bakery({ session })).scenarios;
    const role = jobOffer!.roles.find(({ name }) => name === roleName)!.role;
    const { table } = ok(await api.friends.start({ session, scenario: jobOffer!.scenario, role }));
    const shown = ok(await api.tables.show({ session, table }));
    const code = shown.link!;
    /** The role ids at the table, by role name. */
    const roles = Object.fromEntries(shown.table.seats.map(({ role, name }) => [name, role]));
    const terms = termSheets(shown.table.issues);
    /** The table as `username` sees it now. */
    const show = async () => ok(await api.tables.show({ session, table }));
    /** Signs `friend` up and seats them in the table's first empty seat, through its link. */
    async function join(friend: string) {
      const { session: theirs } = await register(friend);
      const offered = ok(await api.friends.invitation({ session: theirs, code }));
      if (!("invitation" in offered)) throw new Error(`${friend} is already at the table`);
      const seat = offered.invitation.openSeats[0]!.role;
      ok(await api.friends.join({ session: theirs, code, role: seat }));
      return { session: theirs, role: seat, show: async () => ok(await api.tables.show({ session: theirs, table })) };
    }
    return { session, scenario: jobOffer!.scenario, table, code, role, roles, terms, show, join };
  }

  return { database, commons, application, api, advance, register, signInWithCommons, practice, hostFriends };
}
