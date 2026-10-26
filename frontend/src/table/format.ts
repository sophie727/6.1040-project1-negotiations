import type { Issue } from "../api/client.ts";
import { dateAfter, dayZero, formatDate } from "./dates.ts";

/**
 * A number with an issue's unit: dollars as money, percent with a percent sign, days after a first day as a date, such
 * as "February 7" for 37 days after January 1, and anything else with its unit after it.
 */
export function formatAmount(value: number, unit: string | null): string {
  const zero = dayZero(unit);
  if (zero !== null) return formatDate(dateAfter(zero, value), zero);
  const amount = (Math.round(value * 100) / 100).toLocaleString("en-US");
  if (unit === "dollars") return `$${amount}`;
  if (unit === "percent") return `${amount}%`;
  return unit === null ? amount : `${amount} ${unit}`;
}

/** What a term sheet agrees on `issue`: an option's name, or, on a continuous issue, the option at that value or the amount. */
export function formatAgreed(issue: Issue, agreed: string | number | undefined): string {
  if (agreed === undefined) return "—";
  if (issue.kind === "DISCRETE") return issue.options.find(({ option }) => option === agreed)?.name ?? "—";
  const named = issue.options.find(({ universalValue }) => universalValue === agreed);
  return named?.name ?? formatAmount(Number(agreed), issue.unit);
}

export function formatPoints(points: number): string {
  return Math.round(points).toLocaleString("en-US");
}

export function formatTime(instant: string): string {
  return new Date(instant).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Whether a table's negotiation has ended, in any of the three ways. */
export function hasEnded(status: string): boolean {
  return status === "SETTLED" || status === "WITHDRAWN" || status === "EXPIRED";
}
