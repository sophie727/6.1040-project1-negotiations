/** How the agents put a table into words for a language model: terms, the conversation and proposals, and the time left. */
import type { TableMaterial } from "./counterpart.ts";

type Issue = TableMaterial["issues"][number];
type Terms = Readonly<Record<string, string | number>>;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The date `days` after the first day a unit such as "days after January 1, 2027" counts from, such as "February 7" for
 * 37, with its year only when it isn't the first day's; or null for any other unit. A first day without a year falls in
 * 2027, a year that isn't a leap year. The page reads these units the same way, in `frontend/src/table/dates.ts`.
 */
function dateFor(days: number, unit: string | null): string | null {
  const match = /^days after ([a-z]+) (\d{1,2})(?:, (\d{4}))?$/i.exec(unit?.trim() ?? "");
  const month = MONTHS.findIndex((name) => name.toLowerCase() === match?.[1]?.toLowerCase());
  if (match === null || month < 0) return null;
  const zero = new Date(Date.UTC(match[3] === undefined ? 2027 : Number(match[3]), month, Number(match[2])));
  if (zero.getUTCMonth() !== month) return null;
  const date = new Date(zero.getTime() + Math.round(days) * DAY_MS);
  const sameYear = date.getUTCFullYear() === zero.getUTCFullYear();
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" });
}

/** A number with an issue's unit: dollars as money, percent with a percent sign, days after a first day as a date, and anything else with its unit after it. */
function amount(value: number, unit: string | null): string {
  const date = dateFor(value, unit);
  if (date !== null) return date;
  const shown = (Math.round(value * 100) / 100).toLocaleString("en-US");
  if (unit === "dollars") return `$${shown}`;
  if (unit === "percent") return `${shown}%`;
  return unit === null ? shown : `${shown} ${unit}`;
}

/** What a term sheet agrees on `issue`: an option's name, or, on a continuous issue, the option at that value or the amount. */
export function agreedOn(issue: Issue, agreed: string | number | undefined): string {
  if (agreed === undefined) return "nothing";
  if (issue.kind === "DISCRETE") return issue.options.find(({ option }) => option === agreed)?.name ?? "an unknown option";
  const named = issue.options.find(({ universalValue }) => universalValue === agreed);
  return named?.name ?? amount(Number(agreed), issue.unit);
}

/** A term sheet, issue by issue. */
export function describeTerms(issues: readonly Issue[], terms: Terms): string {
  return issues.map((issue) => `${issue.name}: ${agreedOn(issue, terms[issue.issue])}`).join("; ");
}

/** The name of the role (`role`) at `table`. */
export function nameOf(table: TableMaterial, role: string): string {
  return table.seats.find((seat) => seat.role === role)?.name ?? "someone";
}

/** `names` in a sentence: "Presley", "Presley and Sally", or "Mandy, Presley, and Sally", or empty when there are none. */
export function list(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

/** The names of every role at `table` except the reader's. */
export function otherNames(table: TableMaterial): string {
  return list(table.seats.filter(({ role }) => role !== table.role).map(({ name }) => name)) || "the other side";
}

const outcomes: Record<string, string> = {
  PENDING: "is still waiting for an answer",
  ACCEPTED: "was accepted",
  REJECTED: "was rejected",
  RETRACTED: "was taken back",
  SUPERSEDED: "was replaced by a newer proposal",
};

/**
 * What has happened at `table`, oldest first: each message, and each proposal with its terms, its worth to the role
 * whose view `table` is, and what became of it. `call` says how to refer to each role at the start of a line, such as
 * "You" for the reader, and `reader` how to refer to the reader within a sentence.
 */
export function transcript(table: TableMaterial, call: (role: string) => string, reader = "you"): string {
  const entries = [
    ...table.messages.map(({ sentAt, sender, body }) => ({ at: sentAt, line: `${call(sender)}: ${body}` })),
    ...table.proposals.map(({ proposedAt, proposer, terms, points, status }) => ({
      at: proposedAt,
      line:
        `${call(proposer)} proposed: ${describeTerms(table.issues, terms)}. ` +
        `It is worth ${points === null ? "an unknown number of" : Math.round(points).toLocaleString("en-US")} points to ${reader}, ` +
        `and ${outcomes[status] ?? status.toLowerCase()}.`,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return entries.length === 0 ? "(Nothing has been said or proposed yet.)" : entries.map(({ line }) => line).join("\n");
}

/** The whole minutes left before `deadline`, or null when the clock hasn't started. */
export function minutesLeft(deadline: string | null, now = Date.now()): number | null {
  return deadline === null ? null : Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 60_000));
}
