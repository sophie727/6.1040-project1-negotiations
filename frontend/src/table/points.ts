import type { Issue } from "../api/client.ts";
import { dayZero } from "./dates.ts";

/** A role's points for each option, as the table view and the debrief return them. */
export type Payoffs = readonly { option: string; points: number }[];

/** A term sheet: an option on each discrete issue, and a universal value on each continuous one, by issue. */
export type TermSheet = Readonly<Record<string, string | number>>;

/**
 * What agreeing on `agreed` for `issue` is worth with `payoffs`: on a discrete issue, the agreed option's points; on a
 * continuous one, the points of the option at that value, or the straight-line blend of the points of the options on
 * either side of it. `Briefing._dealPayoff` scores deals the same way. Null when `agreed` isn't a value the issue allows.
 */
export function issuePoints(issue: Issue, agreed: string | number | undefined, payoffs: Payoffs): number | null {
  const pointsOf = (option: string) => payoffs.find((payoff) => payoff.option === option)?.points ?? null;
  if (issue.kind === "DISCRETE") return typeof agreed === "string" ? pointsOf(agreed) : null;
  if (typeof agreed !== "number") return null;
  const stops = issue.options
    .flatMap(({ option, universalValue }) => (universalValue === null ? [] : [{ option, value: universalValue }]))
    .sort((a, b) => a.value - b.value);
  for (const [index, low] of stops.entries()) {
    if (agreed === low.value) return pointsOf(low.option);
    const high = stops[index + 1];
    if (high !== undefined && agreed > low.value && agreed < high.value) {
      const [from, to] = [pointsOf(low.option), pointsOf(high.option)];
      if (from === null || to === null) return null;
      return from + ((agreed - low.value) / (high.value - low.value)) * (to - from);
    }
  }
  return null;
}

/** What `terms` are worth with `payoffs`, or null when they don't agree on every issue with a value it allows. */
export function dealPoints(issues: readonly Issue[], terms: TermSheet, payoffs: Payoffs): number | null {
  let total = 0;
  for (const issue of issues) {
    const points = issuePoints(issue, terms[issue.issue], payoffs);
    if (points === null) return null;
    total += points;
  }
  return total;
}

/**
 * The lowest and highest universal values of a continuous issue, and a step that moves through its range in about a
 * hundred notches, or a day at a time through a range of dates.
 */
export function rangeOf(issue: Issue): { min: number; max: number; step: number } {
  const values = issue.options.flatMap(({ universalValue }) => (universalValue === null ? [] : [universalValue]));
  const [min, max] = [Math.min(...values), Math.max(...values)];
  const step = dayZero(issue.unit) !== null ? 1 : 10 ** Math.max(0, Math.floor(Math.log10(Math.max(max - min, 1))) - 1);
  return { min, max, step };
}
