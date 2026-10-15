import { describe, expect, test } from "bun:test";
import { assembleApplication } from "../src/assembly.ts";
import type { TermSheet } from "../src/concepts/Briefing/Briefing.ts";
import { seed } from "../src/seed/seed.ts";
import { testDatabase } from "./support/reusable/mongo.ts";

/** Seeds an empty database, and returns The Job Offer with ways to write and read its term sheets by name. */
async function seeded() {
  const application = assembleApplication({ database: await testDatabase() });
  await seed(application);
  const { Briefing } = application.concepts;
  const published = await Briefing._published();
  const scenario = published[0]!.scenario;
  const issues = await Briefing._issues({ scenario });
  const options = new Map(await Promise.all(issues.map(async ({ issue }) => [issue, await Briefing._options({ issue })] as const)));
  const roles = Object.fromEntries((await Briefing._roles({ scenario })).map(({ role, name }) => [name, role]));

  /** A term sheet from issue names to option names on discrete issues, and universal values on continuous ones. */
  const terms = (named: Record<string, string | number>): TermSheet =>
    Object.fromEntries(
      issues.map(({ issue, name, kind }) => {
        const agreed = named[name]!;
        return [issue, kind === "DISCRETE" ? options.get(issue)!.find((option) => option.name === agreed)!.option : agreed];
      }),
    );
  /** The opposite: a term sheet by issue and option names. */
  const named = (sheet: TermSheet) =>
    Object.fromEntries(
      issues.map(({ issue, name, kind }) => {
        const agreed = sheet[issue]!;
        return [name, kind === "DISCRETE" ? options.get(issue)!.find(({ option }) => option === agreed)!.name : agreed];
      }),
    );
  const points = async (role: string, named: Record<string, string | number>) =>
    (await Briefing._dealPayoff({ role: roles[role]!, terms: terms(named) }))[0]?.points;
  return { application, published, scenario, roles, named, points };
}

describe("seeding", () => {
  test("an empty database gets The Job Offer, published with a 30-minute time limit and a 2,200-point whole pie", async () => {
    const { application, published, scenario, roles, named } = await seeded();
    const { Briefing, Tabling } = application.concepts;
    expect(published.map(({ name }) => name)).toEqual(["The Job Offer"]);
    expect(await Tabling._recommendedTimeLimit({ scenario })).toEqual([{ timeLimit: 30 }]);
    expect(Object.keys(roles)).toEqual(["Manon", "Hiro"]);
    for (const role of Object.values(roles)) expect((await Briefing._role({ role }))[0]?.brief).toStartWith("# Confidential brief");

    const [pie] = await Briefing._wholePie({ scenario });
    expect(pie?.jointPoints).toBe(2200);
    expect(pie?.jointBatna).toBe(2000);
    // A January 1 start costs Hiro less than it's worth to Manon, full coverage costs Manon nothing, and both want a director.
    expect(named(pie!.terms)).toEqual({
      "Start date": 0,
      Salary: 120000,
      "Health Insurance": "Full Coverage",
      Bonus: 0,
      "Position title": "Director",
    });
    expect(await Briefing._dealPayoff({ role: roles.Manon!, terms: pie!.terms })).toEqual([{ points: 1100 }]);
    expect(await Briefing._dealPayoff({ role: roles.Hiro!, terms: pie!.terms })).toEqual([{ points: 1100 }]);
  });

  test("each brief's alternative is worth exactly its role's BATNA, and its examples match the points", async () => {
    const { points } = await seeded();
    // Hiro's offer from Granite & Co.: $100K, full coverage, no bonus, senior manager, starting March 1.
    expect(
      await points("Hiro", { "Start date": 59, Salary: 100000, "Health Insurance": "Full Coverage", Bonus: 0, "Position title": "Senior manager" }),
    ).toBe(1000);
    // Manon's second-choice candidate: a January 1 start as senior manager, at $120K and no bonus.
    expect(
      await points("Manon", { "Start date": 0, Salary: 120000, "Health Insurance": "Not included", Bonus: 0, "Position title": "Senior manager" }),
    ).toBe(1000);

    // Each brief says a February 1 start (31 days after January 1) is worth about 158 points to Hiro and 380 to Manon.
    const rest = { Salary: 80000, "Health Insurance": "Not included", Bonus: 0, "Position title": "Assistant manager" };
    expect(Math.round((await points("Hiro", { "Start date": 31, ...rest }))!)).toBe(158);
    expect(Math.round((await points("Manon", { "Start date": 31, ...rest }))! - 500 - 100)).toBe(380);
  });

  test("seeding a database that already has a published scenario changes nothing", async () => {
    const { application, published } = await seeded();
    await seed(application);
    expect(await application.concepts.Briefing._published()).toEqual(published);
    expect(await application.concepts.Registering._byUsername({ username: "wholepie" })).toHaveLength(1);
  });
});
