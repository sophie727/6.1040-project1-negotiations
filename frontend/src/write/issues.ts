import { api, type DraftIssue, type ScenarioId } from "../api/client.ts";

export type IssueKind = DraftIssue["kind"];

/** What each kind of issue is called on the page, and what it means for an agreement. */
export const kinds: Record<IssueKind, { label: string; hint: string }> = {
  DISCRETE: { label: "A list of options", hint: "An agreement picks one of them, such as a job title." },
  CONTINUOUS: {
    label: "A range of values",
    hint: "An agreement can land on any value from the lowest point to the highest, such as a salary.",
  },
};

/**
 * Adds two options to `issue`, the fewest it needs: "Option 1" and "Option 2" on a list, which the author renames, and 0
 * and 100 on a range, which the author moves. Resolves to the first refusal, if any.
 */
export async function addStarterOptions(issue: DraftIssue["issue"], kind: IssueKind) {
  const starters = kind === "DISCRETE" ? [{ name: "Option 1", value: 0 }, { name: "Option 2", value: 0 }] : [{ name: "0", value: 0 }, { name: "100", value: 100 }];
  for (const { name, value } of starters) {
    const added = await api.scenarios.options.add({ issue, name, universalValue: value });
    if ("error" in added) return added;
  }
  return {};
}

/** Adds an issue named `name` to `scenario`: a list, with its two starter options. Resolves to the issue, or the first refusal. */
export async function addIssue(scenario: ScenarioId, name: string) {
  const added = await api.scenarios.issues.add({ scenario, name, kind: "DISCRETE", unit: "" });
  if ("error" in added) return added;
  const starters = await addStarterOptions(added.issue, "DISCRETE");
  return "error" in starters ? starters : added;
}
