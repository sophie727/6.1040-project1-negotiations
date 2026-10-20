import { describe, expect, test } from "bun:test";
import { spiceLevel } from "../../src/computations.ts";
import { publishScenario } from "../../src/seed/seed.ts";
import { type ScenarioDefinition, theJobOffer } from "../../src/seed/theJobOffer.ts";
import { startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

/** The Job Offer with both Hiro's and Manon's BATNAs set to `batna`, under a name of its own. */
function withBatnas(batna: number): ScenarioDefinition {
  return {
    ...theJobOffer,
    name: `The Job Offer, with BATNAs of ${batna}`,
    roles: theJobOffer.roles.map((role) => ({ ...role, batna })),
  };
}

/** `definition` with June 1 as a start date too, which neither side gets more from than from March 1. */
function startingAsLateAsJune(definition: ScenarioDefinition): ScenarioDefinition {
  return {
    ...definition,
    name: `${definition.name}, starting as late as June 1`,
    issues: definition.issues.map((issue) =>
      issue.name === "Start date" ? { ...issue, options: [...issue.options, { name: "June 1", universalValue: 151 }] } : issue,
    ),
    roles: definition.roles.map((role) => ({
      ...role,
      points: { ...role.points, "Start date": { ...role.points["Start date"], "June 1": role.points["Start date"]!["March 1"]! } },
    })),
  };
}

describe("how spicy a scenario is", () => {
  test("The Job Offer is hot, since a deal can add only 10% to what Hiro and Manon get by walking away", async () => {
    const { api, register } = await startWholePie();
    const { session } = await register("nadia");
    const [jobOffer] = ok(await api.bakery({ session })).scenarios;
    expect(jobOffer!.name).toBe("The Job Offer");
    expect(jobOffer!.spice).toBe(3);
    // Only the level leaves the server, not the points it comes from.
    expect(Object.keys(jobOffer!).sort()).toEqual(["name", "roles", "scenario", "spice", "timeLimit"]);
  });

  test("the more a deal can add to walking away, the milder a scenario is, and with no deal possible, it's hot", async () => {
    const { api, application, register } = await startWholePie();
    for (const batna of [700, 900, 1200]) await publishScenario(application, withBatnas(batna));
    const { session } = await register("nadia");
    const { scenarios } = ok(await api.bakery({ session }));
    expect(Object.fromEntries(scenarios.map(({ name, spice }) => [name, spice]))).toEqual({
      "The Job Offer": 3,
      // The whole pie of 2,200 points adds 57% to the 1,400 they get by walking away.
      "The Job Offer, with BATNAs of 700": 1,
      // It adds 22% to 1,800.
      "The Job Offer, with BATNAs of 900": 2,
      // No deal is worth 1,200 points to both of them.
      "The Job Offer, with BATNAs of 1200": 3,
      // Its whole pie of 3,150 points adds 31% to the 2,400 its three roles get by walking away.
      "The Launch Room": 2,
    });
  });

  test("start dates later than any deal both sides would take leave a scenario as spicy as it was", async () => {
    const { api, application, register } = await startWholePie();
    const medium = withBatnas(900);
    await publishScenario(application, medium);
    await publishScenario(application, startingAsLateAsJune(medium));
    const { session } = await register("nadia");
    const { scenarios } = ok(await api.bakery({ session }));
    const before = scenarios.find(({ name }) => name === medium.name)!;
    const after = scenarios.find(({ name }) => name === `${medium.name}, starting as late as June 1`)!;

    // The later dates add term sheets, but none worth more to the two of them, so the whole pie is the same.
    const pieOf = async (scenario: string) =>
      (await application.concepts.Briefing._wholePie({ scenario: scenario as never })).map(({ jointPoints, jointBatna }) => ({
        jointPoints,
        jointBatna,
      }));
    expect(await pieOf(after.scenario)).toEqual(await pieOf(before.scenario));
    expect([before.spice, after.spice]).toEqual([2, 2]);
  });
});

describe("spiceLevel", () => {
  test("a scenario is mild from a 40% surplus, medium from 15%, and hot below that or without a whole pie", () => {
    expect(spiceLevel({ jointPoints: 1400, jointBatna: 1000 })).toBe(1);
    expect(spiceLevel({ jointPoints: 1399, jointBatna: 1000 })).toBe(2);
    expect(spiceLevel({ jointPoints: 1150, jointBatna: 1000 })).toBe(2);
    expect(spiceLevel({ jointPoints: 1149, jointBatna: 1000 })).toBe(3);
    expect(spiceLevel({ jointPoints: 1000, jointBatna: 1000 })).toBe(3);
    expect(spiceLevel({ jointPoints: null, jointBatna: 1000 })).toBe(3);
    expect(spiceLevel({ jointBatna: 1000 })).toBe(3);
  });

  test("when walking away is worth nothing in all, any deal that adds something is mild", () => {
    expect(spiceLevel({ jointPoints: 10, jointBatna: 0 })).toBe(1);
    expect(spiceLevel({ jointPoints: 0, jointBatna: 0 })).toBe(3);
    expect(spiceLevel({ jointPoints: -50, jointBatna: -100 })).toBe(1);
  });
});
