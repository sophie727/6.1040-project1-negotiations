import type { ActionRefusal } from "@mit-sdg/sync-engine/assembly";
import type { Option } from "../concepts/Briefing/Briefing.ts";
import type { User } from "../concepts/Registering/Registering.ts";
import type { assembleApplication } from "../assembly.ts";
import { type ScenarioDefinition, theJobOffer } from "./theJobOffer.ts";

type Concepts = ReturnType<typeof assembleApplication>["concepts"];

/** The scenarios The Whole Pie comes with. */
export const builtInScenarios: ScenarioDefinition[] = [theJobOffer];

/**
 * The username that authors the built-in scenarios. It's a Registering user with no password in Authenticating,
 * so nobody can sign in as it.
 */
const CASE_BANK = "wholepie";

/**
 * Creates and publishes the built-in scenarios when no scenario is published yet, as on a server's first start with an
 * empty database. It goes through the concepts' actions, as an author would, so reactions see every step.
 */
export async function seed({ concepts }: { concepts: Concepts }): Promise<void> {
  if ((await concepts.Briefing._published()).length > 0) return;
  const author = await caseBankAuthor(concepts);
  for (const definition of builtInScenarios) await create(concepts, author, definition);
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
  for (const { name, batna, brief, points } of definition.roles) {
    const { role } = await must(concepts.Briefing.addRole({ scenario, name, batna }), what);
    await must(concepts.Briefing.setBrief({ role, brief }), what);
    for (const [issueName, byOption] of Object.entries(points)) {
      for (const [optionName, worth] of Object.entries(byOption)) {
        const option = options.get(issueName)?.get(optionName);
        if (option === undefined) throw new Error(`Couldn't ${what}: ${name} has points for "${issueName}: ${optionName}", which isn't an option.`);
        await must(concepts.Briefing.setPayoff({ role, option, points: worth }), what);
      }
    }
  }
  await must(concepts.Briefing.publish({ scenario }), what);
  await must(concepts.Tabling.recommendTimeLimit({ scenario, timeLimit: definition.timeLimit }), what);
}

/** The action's result, or an error naming what couldn't be done and the refusal that stopped it. */
async function must<T extends object>(result: Promise<T | ActionRefusal>, what: string): Promise<T> {
  const settled = await result;
  if ("error" in settled) throw new Error(`Couldn't ${what}: ${String(settled.error)} ${String(settled.detail ?? "")}`.trim());
  return settled as T;
}
