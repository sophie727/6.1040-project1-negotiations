import type { ActionRefusal } from "@mit-sdg/sync-engine/assembly";
import type { Db } from "mongodb";
import type { Option, Scenario } from "../concepts/Briefing/Briefing.ts";
import type { User } from "../concepts/Registering/Registering.ts";
import type { assembleApplication } from "../assembly.ts";
import { type ScenarioDefinition, theJobOffer } from "./theJobOffer.ts";
import { theLaunchRoom } from "./theLaunchRoom.ts";

type Concepts = ReturnType<typeof assembleApplication>["concepts"];

/** The scenarios The Whole Pie comes with. */
export const builtInScenarios: ScenarioDefinition[] = [theJobOffer, theLaunchRoom];

/**
 * The username that authors the built-in scenarios. It's a Registering user with no password in Authenticating,
 * so nobody can sign in as it.
 */
const CASE_BANK = "wholepie";

/**
 * Creates and posts each built-in scenario that no posted scenario is named after yet: every one on a server's first
 * start with an empty database, and only those added since on a database that has the others. A built-in scenario
 * posted before roles had summaries gets its roles' summaries, which can change after posting. It goes through the
 * concepts' actions, as an author would, so reactions see every step.
 */
export async function seed({ concepts }: { concepts: Concepts }): Promise<void> {
  const posted = new Map((await postedScenarios(concepts)).map(({ scenario, name }) => [name, scenario]));
  for (const definition of builtInScenarios) {
    const scenario = posted.get(definition.name);
    if (scenario === undefined) await publishScenario({ concepts }, definition);
    else await describeMissingRoles(concepts, scenario, definition);
  }
}

/** The posted scenarios, archived or not, with their names, in the order they were posted. */
export async function postedScenarios(concepts: Concepts): Promise<{ scenario: Scenario; name: string }[]> {
  const posted: { scenario: Scenario; name: string }[] = [];
  for (const { item: scenario } of await concepts.Posting._posts()) {
    const [found] = await concepts.Briefing._scenario({ scenario });
    if (found !== undefined) posted.push({ scenario, name: found.name });
  }
  return posted;
}

/**
 * Before Posting existed, Briefing kept which scenarios were published itself, as a `published` field on each scenario.
 * This posts every scenario marked that way, oldest first, unless Posting has it already, and then removes the field,
 * so a database from before keeps its bakery, and its scenarios still can't change. Once no scenario has the field, it
 * does nothing, so it runs on every start, before seeding.
 */
export async function postScenariosPublishedInBriefing({ database, concepts }: { database: Db; concepts: Concepts }): Promise<void> {
  const scenarios = database.collection<{ _id: Scenario; published?: boolean }>("briefing.scenarios");
  for (const { _id: scenario, published } of await scenarios.find({ published: { $exists: true } }).sort({ _id: 1 }).toArray()) {
    const { posted } = await concepts.Posting._post({ item: scenario });
    if (published === true && !posted) await must(concepts.Posting.post({ item: scenario }), `post scenario ${scenario}`);
    await scenarios.updateOne({ _id: scenario }, { $unset: { published: "" } });
  }
}

/** Gives each role of the posted `scenario` that has no summary yet the summary `definition` has for it. */
async function describeMissingRoles(concepts: Concepts, scenario: Scenario, definition: ScenarioDefinition): Promise<void> {
  for (const { role, name } of await concepts.Briefing._roles({ scenario })) {
    const summary = definition.roles.find((each) => each.name === name)?.summary;
    const [found] = await concepts.Briefing._role({ role });
    if (summary !== undefined && found !== undefined && !("summary" in found)) {
      await must(concepts.Briefing.describeRole({ role, summary }), `describe ${name} in "${definition.name}"`);
    }
  }
}

/** Creates and posts `definition`, authored by the case bank, as the built-in scenarios are. */
export async function publishScenario({ concepts }: { concepts: Concepts }, definition: ScenarioDefinition): Promise<void> {
  await create(concepts, await caseBankAuthor(concepts), definition);
}

async function caseBankAuthor(concepts: Concepts): Promise<User> {
  // A first start that stopped partway may have registered the author already.
  const [existing] = await concepts.Registering._byUsername({ username: CASE_BANK });
  if (existing !== undefined) return existing.user;
  return (await must(concepts.Registering.register({ username: CASE_BANK }), "register the case bank")).user;
}

async function create(concepts: Concepts, author: User, definition: ScenarioDefinition): Promise<void> {
  const what = `create "${definition.name}"`;
  const { scenario } = await must(concepts.Briefing.create({ author, name: definition.name }), what);
  /** Each option's identity, by issue name and then option name. */
  const options = new Map<string, Map<string, Option>>();
  for (const { name, kind, unit, options: issueOptions } of definition.issues) {
    const { issue } = await must(concepts.Briefing.addIssue({ scenario, name, kind, unit }), what);
    const byName = new Map<string, Option>();
    for (const option of issueOptions) {
      const added = await must(concepts.Briefing.addOption({ issue, ...option }), what);
      byName.set(option.name, added.option);
    }
    options.set(name, byName);
  }
  for (const { name, summary, batna, brief, points } of definition.roles) {
    const { role } = await must(concepts.Briefing.addRole({ scenario, name, batna }), what);
    await must(concepts.Briefing.setBrief({ role, brief }), what);
    await must(concepts.Briefing.describeRole({ role, summary }), what);
    for (const [issueName, byOption] of Object.entries(points)) {
      for (const [optionName, worth] of Object.entries(byOption)) {
        const option = options.get(issueName)?.get(optionName);
        if (option === undefined) throw new Error(`Couldn't ${what}: ${name} has points for "${issueName}: ${optionName}", which isn't an option.`);
        await must(concepts.Briefing.setPayoff({ role, option, points: worth }), what);
      }
    }
  }
  await must(concepts.Posting.post({ item: scenario }), what);
  await must(concepts.Tabling.recommendTimeLimit({ scenario, timeLimit: definition.timeLimit }), what);
}

/** The action's result, or an error naming what couldn't be done and the refusal that stopped it. */
async function must<T extends object>(result: Promise<T | ActionRefusal>, what: string): Promise<T> {
  const settled = await result;
  if ("error" in settled) throw new Error(`Couldn't ${what}: ${String(settled.error)} ${String(settled.detail ?? "")}`.trim());
  return settled as T;
}
