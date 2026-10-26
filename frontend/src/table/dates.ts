/**
 * A range of dates is a continuous issue whose unit counts days from a first day, such as "days after January 1" in The
 * Job Offer or "days after January 1, 2027" in a scenario written on the page. Its values are whole days after that
 * day, which the page shows, and the author picks, as dates. `src/agents/wording.ts` reads these units the same way.
 */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_MS = 24 * 60 * 60 * 1000;
/** The year a first day without one falls in: one that isn't a leap year, as the built-in scenarios assume. */
const NO_YEAR = 2027;

/** The first day a unit such as "days after January 1, 2027" counts from, at midnight UTC, or null for any other unit. */
export function dayZero(unit: string | null): Date | null {
  const match = /^days after ([a-z]+) (\d{1,2})(?:, (\d{4}))?$/i.exec(unit?.trim() ?? "");
  if (match === null) return null;
  const month = MONTHS.findIndex((name) => name.toLowerCase() === match[1]!.toLowerCase());
  if (month < 0) return null;
  const date = new Date(Date.UTC(match[3] === undefined ? NO_YEAR : Number(match[3]), month, Number(match[2])));
  // A day the month doesn't have, such as February 30, isn't a first day.
  return date.getUTCMonth() === month ? date : null;
}

/** The unit that counts days from `date`, such as "days after January 1, 2027". */
export function unitFrom(date: Date): string {
  return `days after ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** The date `days` after `zero`, rounded to a whole day. */
export function dateAfter(zero: Date, days: number): Date {
  return new Date(zero.getTime() + Math.round(days) * DAY_MS);
}

/** How many days `date` is after `zero`; negative when it is before. */
export function daysBetween(zero: Date, date: Date): number {
  return Math.round((date.getTime() - zero.getTime()) / DAY_MS);
}

/** A date as people read it, such as "February 7", with its year only when it isn't the first day's year. */
export function formatDate(date: Date, zero: Date): string {
  const sameYear = date.getUTCFullYear() === zero.getUTCFullYear();
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" });
}

/** A date as a date box holds it, such as "2027-02-07". */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The date a date box holds, such as "2027-02-07", at midnight UTC, or null when it holds none. */
export function fromIsoDate(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match === null ? null : new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}
