import { ref } from "vue";
import { api, type Draft, type DraftIssue, type DraftRole, type ScenarioId } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import { narrativeOf } from "./brief.ts";

/** Sends one change to the endpoint at `path`, then loads the draft again. Resolves to the sentence to show if it was refused, or null. */
export type Save = (path: string, call: Promise<object>) => Promise<string | null>;

/**
 * A scenario its author is writing, loaded from `/scenarios/show`, and `save`, which sends one change and loads the draft
 * again, so the page always shows what the server has.
 */
export function useDraft(scenario: ScenarioId) {
  const draft = ref<Draft | null>(null);
  /** Why the draft couldn't be loaded, such as when it isn't the person's. */
  const trouble = ref<string | null>(null);
  /** How many changes are on their way to the server. */
  const saving = ref(0);
  /** Whether a change has been saved since the page opened. */
  const saved = ref(false);
  let loads = 0;

  async function load() {
    const mine = ++loads;
    const result = await api.scenarios.show({ scenario });
    // A later load is on its way, with newer changes, so this one's answer would only show older ones.
    if (mine !== loads) return;
    if ("error" in result) {
      if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
      trouble.value = messageFor("/scenarios/show", result.error);
      return;
    }
    trouble.value = null;
    draft.value = result.draft;
  }

  const save: Save = async (path, call) => {
    saving.value += 1;
    const result = await call;
    saving.value -= 1;
    let problem: string | null = null;
    if ("error" in result && typeof result.error === "string") {
      if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
      problem = messageFor(path, result.error);
    } else {
      saved.value = true;
    }
    await load();
    return problem;
  };

  return { draft, trouble, saving, saved, load, save };
}

/** A name for something new, such as "Role 3", that nothing in `taken` has yet. */
export function nextName(prefix: string, taken: readonly string[]): string {
  for (let number = taken.length + 1; ; number++) {
    const name = `${prefix} ${number}`;
    if (!taken.includes(name)) return name;
  }
}

/** What still keeps the draft from being published, as sentences to check off. */
export function stillMissing(draft: Draft): string[] {
  const missing: string[] = [];
  if (draft.issues.length === 0) missing.push("Add an issue.");
  for (const issue of draft.issues) {
    if (issue.options.length < 2) missing.push(`Give ${issue.name} at least two options.`);
  }
  if (draft.roles.length < 2) missing.push("Add a second role.");
  for (const role of draft.roles) {
    if (narrativeOf(role.brief, role.name).trim() === "") missing.push(`Write ${role.name}'s brief.`);
  }
  return missing;
}

/** Each option's points for `role`, by option. An option it has no points for yet is missing, and counts as 0. */
export function pointsOf(role: DraftRole): Map<string, number> {
  return new Map(role.payoffs.map(({ option, points }) => [option, points]));
}

/** The most points `role` can get on `issue`: the points of its best option, or 0. */
export function bestOn(issue: DraftIssue, points: Map<string, number>): number {
  return Math.max(0, ...issue.options.map(({ option }) => points.get(option) ?? 0));
}

/** The smallest number at least `value` that is one of `steps` times a power of ten. */
function roundUp(value: number, steps: readonly number[]): number {
  if (value <= 0) return 0;
  const power = 10 ** Math.floor(Math.log10(value));
  return (steps.find((step) => step * power >= value) ?? 10) * power;
}

/** The points a role's charts span: from its lowest points, or 0, to a round number with room above its highest to drag higher. */
export function scaleOf(values: readonly number[]): { bottom: number; top: number } {
  const ends = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const lowest = Math.min(0, ...values);
  return {
    top: roundUp(Math.max(100, ...values) * 1.25, ends),
    bottom: lowest < 0 ? -roundUp(-lowest * 1.25, ends) : 0,
  };
}

/** How finely dragging a bar sets points: a round step, about a fortieth of the scale. */
export function stepOf({ bottom, top }: { bottom: number; top: number }): number {
  return Math.max(1, roundUp((top - bottom) / 40, [1, 2, 2.5, 5, 10]));
}
