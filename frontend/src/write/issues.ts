import { api, type DraftIssue, type ScenarioId } from "../api/client.ts";
import {
    dateAfter,
    dayZero,
    daysBetween,
    formatDate,
    unitFrom,
} from "../table/dates.ts";

export type IssueKind = DraftIssue["kind"];

/**
 * How the page offers an issue to its author: a list of options, a range of values, or a range of dates. Briefing knows
 * only lists and ranges, so a range of dates is a range whose unit counts days from a first day, as The Job Offer's
 * start date does.
 */
export type IssueShape = "list" | "numbers" | "dates";

/** The shape of `issue`: a list, or a range, of dates when its unit counts days and of numbers otherwise. */
export function shapeOf(issue: {
    kind: IssueKind;
    unit: string | null;
}): IssueShape {
    if (issue.kind === "DISCRETE") return "list";
    return dayZero(issue.unit) === null ? "numbers" : "dates";
}

/** What each shape of issue is called on the page, and what it means for an agreement. */
export const shapes: Record<IssueShape, { label: string; hint: string }> = {
    list: {
        label: "A list",
        hint: "An agreement picks one of the options, such as a job title.",
    },
    numbers: {
        label: "a range of values",
        hint: "An agreement can land on any value from the lowest point to the highest, such as a salary.",
    },
    dates: {
        label: "A range of dates",
        hint: "An agreement can land on any day from the earliest date to the latest, such as a start date.",
    },
};

/**
 * What an issue of `shape` starts with: its kind, its unit, and the fewest options it needs. A list gets "Option 1" and
 * "Option 2", which the author renames; a range of values 0 and 100, which the author moves; and a range of dates
 * January 1 and March 1 of next year, counted in days after that January 1.
 */
export function startOf(shape: IssueShape): {
    kind: IssueKind;
    unit: string;
    options: { name: string; value: number }[];
} {
    if (shape === "list")
        return {
            kind: "DISCRETE",
            unit: "",
            options: [
                { name: "Option 1", value: 0 },
                { name: "Option 2", value: 0 },
            ],
        };
    if (shape === "numbers")
        return {
            kind: "CONTINUOUS",
            unit: "",
            options: [
                { name: "0", value: 0 },
                { name: "100", value: 100 },
            ],
        };
    const year = new Date().getFullYear() + 1;
    const zero = new Date(Date.UTC(year, 0, 1));
    const days = daysBetween(zero, new Date(Date.UTC(year, 2, 1)));
    return {
        kind: "CONTINUOUS",
        unit: unitFrom(zero),
        options: [
            { name: formatDate(zero, zero), value: 0 },
            { name: formatDate(dateAfter(zero, days), zero), value: days },
        ],
    };
}

/** Adds `options` to `issue`, one at a time. Resolves to the first refusal, if any. */
export async function addOptions(
    issue: DraftIssue["issue"],
    options: readonly { name: string; value: number }[],
) {
    for (const { name, value } of options) {
        const added = await api.scenarios.options.add({
            issue,
            name,
            universalValue: value,
        });
        if ("error" in added) return added;
    }
    return {};
}

/** Adds an issue named `name` to `scenario`: a list, with its two starter options. Resolves to the issue, or the first refusal. */
export async function addIssue(scenario: ScenarioId, name: string) {
    const { kind, unit, options } = startOf("list");
    const added = await api.scenarios.issues.add({
        scenario,
        name,
        kind,
        unit,
    });
    if ("error" in added) return added;
    const starters = await addOptions(added.issue, options);
    return "error" in starters ? starters : added;
}
