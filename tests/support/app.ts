import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createLocalClient } from "@mit-sdg/sync-engine/client";
import type { TheWholePieWire } from "../../generated/wire.ts";
import { createCoach, type DebriefMaterial, scriptedDebrief } from "../../src/agents/coach.ts";
import { createCounterpart, standIn, type TableMaterial } from "../../src/agents/counterpart.ts";
import type { Reasoner } from "../../src/agents/reusable/agent.ts";
import { scriptedReasoner } from "../../src/agents/reusable/reasoners.ts";
import { assembleApplication } from "../../src/assembly.ts";
import { seed } from "../../src/seed/seed.ts";
import { testDatabase } from "./reusable/mongo.ts";
import { ok } from "./reusable/results.ts";

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
}: { counterpart?: Reasoner<TableMaterial> | null; coach?: Reasoner<DebriefMaterial> | null } = {}) {
  const database = await testDatabase();
  let now = START;
  /** Moves the clock forward by `minutes`. */
  const advance = (minutes: number) => {
    now = new Date(now.getTime() + minutes * 60_000);
  };
  const agents = [counterpart === null ? undefined : createCounterpart(counterpart), coach === null ? undefined : createCoach(coach)].filter(
    (agent) => agent !== undefined,
  );
  const application = assembleApplication({ database }, { clock: () => now, observers: agents.map(({ observer }) => observer) });
  await seed(application);
  const api = createLocalClient<TheWholePieWire>({ invoker: createGateway<TheWholePieWire>({ application }) });
  for (const agent of agents) void agent.start({ application, api });

  async function register(username: string) {
    return ok(await api.auth.register({ username, password: "correct horse" }));
  }

  /** Signs `username` up and opens a table where they practice The Job Offer as `roleName`, with the counterpart in the other seat. */
  async function practice(username: string, roleName = "Hiro") {
    const { session } = await register(username);
    const [jobOffer] = ok(await api.bakery({ session })).scenarios;
    const role = jobOffer!.roles.find(({ name }) => name === roleName)!.role;
    const { table } = ok(await api.practice.start({ session, scenario: jobOffer!.scenario, role, timeLimit: 30 }));
    const { seats, issues } = ok(await api.tables.show({ session, table })).table;
    /** The role ids at the table, by role name. */
    const roles = Object.fromEntries(seats.map(({ role, name }) => [name, role]));
    /** A term sheet for The Job Offer, from issue names to option names on discrete issues and universal values on continuous ones. */
    const terms = (named: Record<string, string | number>) =>
      Object.fromEntries(
        issues.map(({ issue, name, kind, options }) => {
          const agreed = named[name]!;
          return [issue, kind === "DISCRETE" ? options.find((option) => option.name === agreed)!.option : agreed];
        }),
      );
    /** The table as `username` sees it now. */
    const show = async () => ok(await api.tables.show({ session, table }));
    return { session, scenario: jobOffer!.scenario, table, role, roles, terms, show };
  }

  return { database, application, api, advance, register, practice };
}
