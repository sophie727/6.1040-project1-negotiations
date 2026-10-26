import type { IssueKind } from "../concepts/Briefing/Briefing.ts";
import hiro from "./briefs/hiro.md" with { type: "text" };
import manon from "./briefs/manon.md" with { type: "text" };

/** A scenario as an author writes it, with issues, options, and roles named rather than identified. */
export interface ScenarioDefinition {
  name: string;
  /** The recommended time limit, in minutes. */
  timeLimit: number;
  issues: { name: string; kind: IssueKind; unit?: string; options: { name: string; universalValue?: number }[] }[];
  /** Each role's points, by issue name and then option name, and its summary, which everyone sees before choosing a side. */
  roles: { name: string; summary: string; batna: number; brief: string; points: Record<string, Record<string, number>> }[];
}

/** The Job Offer, from design/notes/example_cases.md. */
export const theJobOffer: ScenarioDefinition = {
  name: "The Job Offer",
  timeLimit: 30,
  issues: [
    {
      name: "Start date",
      kind: "CONTINUOUS",
      unit: "days after January 1",
      // March 1 is 59 days after January 1 in a year that isn't a leap year.
      options: [
        { name: "January 1", universalValue: 0 },
        { name: "March 1", universalValue: 59 },
      ],
    },
    {
      name: "Salary",
      kind: "CONTINUOUS",
      unit: "dollars",
      options: [
        { name: "$80K", universalValue: 80000 },
        { name: "$120K", universalValue: 120000 },
      ],
    },
    {
      name: "Health Insurance",
      kind: "DISCRETE",
      options: [{ name: "Full Coverage" }, { name: "Half Coverage" }, { name: "Not included" }],
    },
    {
      name: "Bonus",
      kind: "CONTINUOUS",
      unit: "dollars",
      options: [
        { name: "$0", universalValue: 0 },
        { name: "$10K", universalValue: 10000 },
      ],
    },
    {
      name: "Position title",
      kind: "DISCRETE",
      options: [{ name: "Assistant manager" }, { name: "Senior manager" }, { name: "Director" }],
    },
  ],
  roles: [
    {
      name: "Manon",
      summary: "Head of operations at Fernwood Analytics, meeting Hiro, the top candidate to lead client operations, to settle the terms of the job offer.",
      batna: 1000,
      brief: manon,
      points: {
        "Start date": { "January 1": 800, "March 1": 0 },
        Salary: { $80K: 500, $120K: 0 },
        "Health Insurance": { "Full Coverage": 0, "Half Coverage": 0, "Not included": 0 },
        Bonus: { $0: 100, $10K: 0 },
        "Position title": { "Assistant manager": 0, "Senior manager": 100, Director: 200 },
      },
    },
    {
      name: "Hiro",
      summary: "Fernwood Analytics' top choice to lead client operations, meeting Manon, its head of operations, to settle the terms of the job offer.",
      batna: 1000,
      brief: hiro,
      points: {
        "Start date": { "January 1": 0, "March 1": 300 },
        Salary: { $80K: 0, $120K: 600 },
        "Health Insurance": { "Full Coverage": 300, "Half Coverage": 150, "Not included": 0 },
        Bonus: { $0: 0, $10K: 100 },
        "Position title": { "Assistant manager": 0, "Senior manager": 100, Director: 200 },
      },
    },
  ],
};
