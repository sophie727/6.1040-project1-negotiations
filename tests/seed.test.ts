import { describe, expect, test } from "bun:test";
import { assembleApplication } from "../src/assembly.ts";
import { MemoryProvider } from "../src/concepts/Federating/provider.ts";
import type { TermSheet } from "../src/concepts/Briefing/Briefing.ts";
import { publishScenario, seed } from "../src/seed/seed.ts";
import { theJobOffer } from "../src/seed/theJobOffer.ts";
import { ok } from "./support/reusable/results.ts";
import { testDatabase } from "./support/reusable/mongo.ts";

/** Seeds an empty database, and returns the scenario named `name` with ways to write and read its term sheets by name. */
async function seeded(name = "The Job Offer") {
  const application = assembleApplication({ database: await testDatabase(), commons: new MemoryProvider() });
  await seed(application);
  const { Briefing } = application.concepts;
  const published = await Briefing._published();
  const scenario = published.find((row) => row.name === name)!.scenario;
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
    expect(published.map(({ name }) => name)).toEqual(["The Job Offer", "The Launch Room"]);
    expect(await Tabling._recommendedTimeLimit({ scenario })).toEqual([{ timeLimit: 30 }]);
    expect(Object.keys(roles)).toEqual(["Manon", "Hiro"]);
    for (const role of Object.values(roles)) expect((await Briefing._role({ role }))[0]?.brief).toStartWith("# Confidential brief");
    expect((await Briefing._role({ role: roles.Hiro! }))[0]?.summary).toBe(theJobOffer.roles.find(({ name }) => name === "Hiro")!.summary);

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

  test("seeding a database that already has every built-in scenario changes nothing", async () => {
    const { application, published } = await seeded();
    await seed(application);
    expect(await application.concepts.Briefing._published()).toEqual(published);
    expect(await application.concepts.Registering._byUsername({ username: "wholepie" })).toHaveLength(1);
  });

  test("a database seeded before The Launch Room existed gets it, and keeps its own Job Offer", async () => {
    const application = assembleApplication({ database: await testDatabase(), commons: new MemoryProvider() });
    await publishScenario(application, theJobOffer);
    const [jobOffer] = await application.concepts.Briefing._published();
    await seed(application);
    const published = await application.concepts.Briefing._published();
    expect(published.map(({ name }) => name)).toEqual(["The Job Offer", "The Launch Room"]);
    expect(published[0]).toEqual(jobOffer!);
  });

  test("a Job Offer published before roles had summaries gets them, and an author's own summary stays", async () => {
    const application = assembleApplication({ database: await testDatabase(), commons: new MemoryProvider() });
    const { Briefing } = application.concepts;
    await publishScenario(application, { ...theJobOffer, roles: theJobOffer.roles.map((role) => ({ ...role, summary: "" })) });
    const scenario = (await Briefing._published())[0]!.scenario;
    const roles = new Map((await Briefing._roles({ scenario })).map(({ role, name }) => [name, role]));
    const [hiro, manon] = [roles.get("Hiro")!, roles.get("Manon")!];
    ok(await Briefing.describeRole({ role: hiro, summary: "Hiro, as the author put it." }));

    await seed(application);
    expect((await Briefing._role({ role: hiro }))[0]?.summary).toBe("Hiro, as the author put it.");
    expect((await Briefing._role({ role: manon }))[0]?.summary).toBe(theJobOffer.roles.find(({ name }) => name === "Manon")!.summary);
  });
});

/** The whole pie of The Launch Room: Mandy's keynote, the integration soon after launch, and a high price with a deep discount. */
const LAUNCH_PIE = {
  "Launch date": 45,
  "Halvorsen integration": "Within 60 days of launch",
  "List price": 60,
  "Halvorsen's discount": 40,
  "Early access": "Exclusive for Halvorsen",
  "Design authority": "Product decides alone",
};

describe("The Launch Room", () => {
  test("it has three roles, a 45-minute time limit, and a 3,150-point whole pie that clears each BATNA by 250 points", async () => {
    const { application, scenario, roles, named, points } = await seeded("The Launch Room");
    const { Briefing, Tabling } = application.concepts;
    expect(await Tabling._recommendedTimeLimit({ scenario })).toEqual([{ timeLimit: 45 }]);
    expect(Object.keys(roles)).toEqual(["Mandy", "Presley", "Sally"]);
    for (const role of Object.values(roles)) expect((await Briefing._role({ role }))[0]?.brief).toStartWith("# Confidential brief");

    const [pie] = await Briefing._wholePie({ scenario });
    expect(pie).toMatchObject({ jointPoints: 3150, jointBatna: 2400 });
    expect(named(pie!.terms)).toEqual(LAUNCH_PIE);
    expect(await points("Mandy", LAUNCH_PIE)).toBe(1000);
    expect(await points("Presley", LAUNCH_PIE)).toBe(1050);
    expect(await points("Sally", LAUNCH_PIE)).toBe(1100);

    // Splitting the difference on everything clears every BATNA, but adds only 325 of the 750 points a deal could.
    const middle = {
      "Launch date": 45,
      "Halvorsen integration": "Within 60 days of launch",
      "List price": 45,
      "Halvorsen's discount": 20,
      "Early access": "Open beta",
      "Design authority": "Shared sign-off",
    };
    const each = await Promise.all(["Mandy", "Presley", "Sally"].map((role) => points(role, middle)));
    expect(each).toEqual([950, 850, 925]);
  });

  test("each brief's guess at the CEO's plan is worth exactly its role's BATNA, and its examples match the points", async () => {
    const { points } = await seeded("The Launch Room");
    // Mandy expects June 1, no integration, $60, 20% off, no early access, and product deciding alone.
    expect(
      await points("Mandy", {
        "Launch date": 92,
        "Halvorsen integration": "Not planned",
        "List price": 60,
        "Halvorsen's discount": 20,
        "Early access": "None before launch",
        "Design authority": "Product decides alone",
      }),
    ).toBe(750);
    // Presley expects June 1, the integration within 60 days, $45, 20% off, early access for Halvorsen, and a veto for everyone.
    expect(
      await points("Presley", {
        "Launch date": 92,
        "Halvorsen integration": "Within 60 days of launch",
        "List price": 45,
        "Halvorsen's discount": 20,
        "Early access": "Exclusive for Halvorsen",
        "Design authority": "Anyone can veto",
      }),
    ).toBe(800);
    // Sally expects June 1, the integration at launch, $60, no discount, early access for Halvorsen, and shared sign-off.
    expect(
      await points("Sally", {
        "Launch date": 92,
        "Halvorsen integration": "Ready at launch",
        "List price": 60,
        "Halvorsen's discount": 0,
        "Early access": "Exclusive for Halvorsen",
        "Design authority": "Shared sign-off",
      }),
    ).toBe(850);

    // What one value of one issue is worth to a role: the points it adds to the whole pie's terms over the option worth
    // nothing to that role. April 23 is 53 days after March 1, and April 1 is 31.
    const worth = async (role: string, issue: string, value: number, zero: number) =>
      (await points(role, { ...LAUNCH_PIE, [issue]: value }))! - (await points(role, { ...LAUNCH_PIE, [issue]: zero }))!;
    expect(await worth("Mandy", "Launch date", 53, 61)).toBe(250);
    expect(await worth("Mandy", "List price", 45, 30)).toBe(200);
    expect(Math.round(await worth("Presley", "Launch date", 53, 0))).toBe(193);
    expect(Math.round(await worth("Sally", "Launch date", 31, 92))).toBe(231);
    expect(await worth("Sally", "Halvorsen's discount", 20, 0)).toBe(175);
  });
});
