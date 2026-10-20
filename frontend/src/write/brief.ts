import type { DraftIssue, DraftRole } from "../api/client.ts";
import { inWords } from "../table/players.ts";

/**
 * The line before the part of a brief the page writes when it publishes, so the editor can find what the author wrote
 * again if publishing stops partway. Markdown shows it as nothing.
 */
const MARK = "<!-- The Whole Pie wrote the rest of this brief from the role's points. -->";

const titleOf = (roleName: string) => `# Confidential brief: ${roleName}`;

/** What the author wrote of `brief`: all of it, unless the page added a title and the points to it when publishing. */
export function narrativeOf(brief: string | null, roleName: string): string {
  if (brief === null) return "";
  const at = brief.indexOf(MARK);
  if (at === -1) return brief;
  const written = brief.slice(0, at).trim();
  const title = titleOf(roleName);
  return written.startsWith(title) ? written.slice(title.length).trim() : written;
}

/** Points as the brief shows them: whole numbers with commas, and up to two decimals when an author used them. */
const shown = (points: number) => points.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** `text` in a cell of a Markdown table, where a bar would end the cell and a line break would end the row. */
const cell = (text: string) => text.replaceAll("|", "\\|").replace(/\s+/g, " ");

/**
 * The brief a negotiator playing `role` reads: a title, what the author wrote, and then a table of the role's points
 * for every option and its BATNA, as in the built-in briefs. An option the role has no points for is worth nothing.
 */
export function briefFor(role: DraftRole, narrative: string, issues: readonly DraftIssue[]): string {
  const points = new Map(role.payoffs.map(({ option, points }) => [option, points]));
  const ranges = issues.filter(({ kind }) => kind === "CONTINUOUS").map(({ name }) => name);
  const between = ranges.length === 0 ? "" : ` On ${inWords(ranges)}, a value between two options earns points between theirs.`;
  const rows = issues.flatMap((issue) =>
    issue.options.map(({ option, name }, index) => `| ${index === 0 ? cell(issue.name) : ""} | ${cell(name)} | ${shown(points.get(option) ?? 0)} |`),
  );
  return [
    titleOf(role.name),
    narrative.trim(),
    MARK,
    "## Your points",
    `Your score is the total points of the agreement you reach.${between}`,
    ["| Issue | Option | Your points |", "| --- | --- | --- |", ...rows].join("\n"),
    `Your BATNA, your best alternative to a negotiated agreement, is worth ${shown(role.batna)} points to you. ` +
      "Don't accept any agreement worth less than that: you'd be better off walking away.",
  ].join("\n\n");
}
