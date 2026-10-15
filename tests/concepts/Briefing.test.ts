import { describe, expect, test } from "bun:test";
import {
  AlreadyPublished,
  BriefingConcept,
  DifferentScenarios,
  Incomplete,
  InvalidBrief,
  InvalidIssueName,
  InvalidOptionName,
  InvalidRoleName,
  InvalidScenarioName,
  IssueExists,
  type Issue,
  NameTaken,
  type Option,
  OptionExists,
  Published,
  type Role,
  RoleExists,
  type Scenario,
  UnitNotAllowed,
  UnknownIssue,
  UnknownRole,
  UnknownRoleOrOption,
  UnknownScenario,
  ValueNotAllowed,
  ValueRequired,
  ValueTaken,
} from "../../src/concepts/Briefing/Briefing.ts";
import { testDatabase } from "../support/reusable/mongo.ts";
import { expectOneWinner } from "../support/reusable/race.ts";

type Briefing = BriefingConcept<string>;

async function setup() {
  return { briefing: new BriefingConcept<string>(await testDatabase()) };
}

/**
 * The principle's version of The Job Offer: a continuous salary and a discrete health insurance, with Hiro and Manon.
 * The BATNAs are lower than the full case's, so a deal is possible on these two issues alone.
 */
async function jobOffer(briefing: Briefing, { brief = true } = {}) {
  const { scenario } = await briefing.create({ author: "sophie", name: "The Job Offer" });
  const { issue: salary } = await briefing.addIssue({ scenario, name: "Salary", kind: "CONTINUOUS", unit: "dollars" });
  const { option: low } = await briefing.addOption({ issue: salary, name: "$80K", universalValue: 80000 });
  const { option: high } = await briefing.addOption({ issue: salary, name: "$120K", universalValue: 120000 });
  const { issue: insurance } = await briefing.addIssue({ scenario, name: "Health insurance", kind: "DISCRETE" });
  const { option: none } = await briefing.addOption({ issue: insurance, name: "Not included" });
  const { option: half } = await briefing.addOption({ issue: insurance, name: "Half Coverage" });
  const { option: full } = await briefing.addOption({ issue: insurance, name: "Full Coverage" });
  const { role: hiro } = await briefing.addRole({ scenario, name: "Hiro", batna: 500 });
  const { role: manon } = await briefing.addRole({ scenario, name: "Manon", batna: 300 });
  await setPayoffs(briefing, hiro, [[low, 0], [high, 600], [none, 0], [half, 150], [full, 300]]);
  await setPayoffs(briefing, manon, [[low, 500], [high, 0], [none, 0], [half, 0], [full, 0]]);
  if (brief) {
    await briefing.setBrief({ role: hiro, brief: "You are Hiro, a candidate for a management role." });
    await briefing.setBrief({ role: manon, brief: "You are Manon, the hiring manager." });
  }
  return { scenario, salary, insurance, low, high, none, half, full, hiro, manon };
}

async function setPayoffs(briefing: Briefing, role: Role, points: [Option, number][]) {
  for (const [option, worth] of points) await briefing.setPayoff({ role, option, points: worth });
}

/** A published scenario with one discrete issue and one continuous issue that only moves points from one role to the other. */
async function lease(briefing: Briefing, batnas: { ana: number; ben: number }) {
  const { scenario } = await briefing.create({ author: "sophie", name: `Lease ${batnas.ana}-${batnas.ben}` });
  const { issue: room } = await briefing.addIssue({ scenario, name: "Room", kind: "DISCRETE" });
  const { option: big } = await briefing.addOption({ issue: room, name: "Ana takes the big room" });
  const { option: small } = await briefing.addOption({ issue: room, name: "Ben takes the big room" });
  const { issue: rent } = await briefing.addIssue({ scenario, name: "Ana's share of the rent", kind: "CONTINUOUS" });
  const { option: none } = await briefing.addOption({ issue: rent, name: "Nothing", universalValue: 0 });
  const { option: all } = await briefing.addOption({ issue: rent, name: "All of it", universalValue: 100 });
  const { role: ana } = await briefing.addRole({ scenario, name: "Ana", batna: batnas.ana });
  const { role: ben } = await briefing.addRole({ scenario, name: "Ben", batna: batnas.ben });
  await setPayoffs(briefing, ana, [[big, 100], [small, 0], [none, 100], [all, 0]]);
  await setPayoffs(briefing, ben, [[big, 0], [small, 10], [none, 0], [all, 100]]);
  await briefing.setBrief({ role: ana, brief: "You are Ana." });
  await briefing.setBrief({ role: ben, brief: "You are Ben." });
  await briefing.publish({ scenario });
  return { scenario, room, rent, big, small, ana, ben };
}

async function expectRefusal(attempt: Promise<unknown>, refusal: new (message?: string) => Error, message: string) {
  await expect(attempt).rejects.toThrow(refusal);
  await expect(attempt).rejects.toThrow(message);
}

describe("Briefing", () => {
  test("its principle: Sophie publishes The Job Offer once every role has a brief, and Briefing scores term sheets and finds the whole pie", async () => {
    const { briefing } = await setup();
    const offer = await jobOffer(briefing, { brief: false });
    await briefing.setBrief({ role: offer.manon, brief: "You are Manon, the hiring manager." });

    // Hiro has no brief yet, so Sophie can't publish.
    await expectRefusal(
      briefing.publish({ scenario: offer.scenario }),
      Incomplete,
      "A scenario needs an issue, at least two roles, at least two options for every issue, and every payoff and brief before it can be published.",
    );
    await briefing.setBrief({ role: offer.hiro, brief: "You are Hiro, a candidate for a management role." });
    expect(await briefing.publish({ scenario: offer.scenario })).toEqual({ scenario: offer.scenario });
    await expectRefusal(
      briefing.addIssue({ scenario: offer.scenario, name: "Bonus", kind: "CONTINUOUS" }),
      Published,
      "A published scenario can't be changed.",
    );

    // A salary of 100000 is halfway between $80K and $120K, so it's worth 300 to Hiro; Full Coverage is worth 300 more.
    const terms = { [offer.salary]: 100000, [offer.insurance]: offer.full };
    expect(await briefing._dealPayoff({ role: offer.hiro, terms })).toEqual([{ points: 600 }]);
    expect(await briefing._dealPayoff({ role: offer.manon, terms })).toEqual([{ points: 250 }]);
    expect(await briefing._dealJointPayoff({ scenario: offer.scenario, terms })).toEqual([{ jointPoints: 850 }]);

    // Health insurance is discrete, so nothing between Half Coverage and Full Coverage can be agreed on.
    const between = { [offer.salary]: 100000, [offer.insurance]: 1.5 };
    expect(await briefing._dealValidity({ scenario: offer.scenario, terms: between })).toEqual([
      { issue: "Health insurance", problem: "This issue has no such option." },
    ]);
    expect(await briefing._dealPayoff({ role: offer.hiro, terms: between })).toEqual([]);

    // $120K with Full Coverage has the most joint points (900), but leaves Manon with 0, below her BATNA of 300.
    // The whole pie is the most joint points that still give everyone their BATNA: a salary of $96K and Full Coverage.
    expect(await briefing._wholePie({ scenario: offer.scenario })).toEqual([
      { terms: { [offer.salary]: 96000, [offer.insurance]: offer.full }, jointPoints: 840, jointBatna: 800 },
    ]);
  });

  test("Briefing stores names trimmed and refuses a blank or overlong one", async () => {
    const { briefing } = await setup();
    const { scenario } = await briefing.create({ author: "sophie", name: "  The Job Offer  " });
    expect(await briefing._scenario({ scenario })).toEqual([{ name: "The Job Offer", author: "sophie", published: false }]);
    await expectRefusal(
      briefing.create({ author: "lee", name: " The Job Offer" }),
      NameTaken,
      "A scenario with that name already exists.",
    );
    await expectRefusal(briefing.create({ author: "sophie", name: "   " }), InvalidScenarioName, "A scenario name must have 1 to 100 characters.");
    await expect(briefing.create({ author: "sophie", name: "x".repeat(101) })).rejects.toThrow(InvalidScenarioName);
    await briefing.create({ author: "sophie", name: ` ${"x".repeat(100)} ` });

    await expectRefusal(briefing.addIssue({ scenario, name: "", kind: "DISCRETE" }), InvalidIssueName, "An issue name must have 1 to 100 characters.");
    const { issue } = await briefing.addIssue({ scenario, name: " Salary ", kind: "CONTINUOUS", unit: "  dollars " });
    expect(await briefing._issues({ scenario })).toEqual([{ issue, name: "Salary", kind: "CONTINUOUS", unit: "dollars" }]);
    await expectRefusal(briefing.addOption({ issue, name: " ", universalValue: 1 }), InvalidOptionName, "An option name must have 1 to 100 characters.");
    await expectRefusal(briefing.addRole({ scenario, name: "", batna: 0 }), InvalidRoleName, "A role name must have 1 to 100 characters.");
  });

  test("only a continuous issue has a unit, and an issue's name is unique in its scenario", async () => {
    const { briefing } = await setup();
    const { scenario } = await briefing.create({ author: "sophie", name: "The Job Offer" });
    await expectRefusal(
      briefing.addIssue({ scenario, name: "Title", kind: "DISCRETE", unit: "levels" }),
      UnitNotAllowed,
      "Only a continuous issue has a unit.",
    );
    // A blank unit counts as no unit.
    const { issue } = await briefing.addIssue({ scenario, name: "Title", kind: "DISCRETE", unit: "  " });
    expect(await briefing._issues({ scenario })).toEqual([{ issue, name: "Title", kind: "DISCRETE", unit: undefined }]);
    // A duplicate name is reported before a unit problem.
    await expectRefusal(
      briefing.addIssue({ scenario, name: "Title", kind: "DISCRETE", unit: "levels" }),
      IssueExists,
      "This scenario already has an issue with that name.",
    );
    await expectRefusal(
      briefing.addIssue({ scenario: "nowhere" as Scenario, name: "Title", kind: "DISCRETE" }),
      UnknownScenario,
      "There is no such scenario.",
    );
  });

  test("an option has a universal value exactly when its issue is continuous, and no two options of one issue share a name or value", async () => {
    const { briefing } = await setup();
    const { scenario } = await briefing.create({ author: "sophie", name: "The Job Offer" });
    const { issue: salary } = await briefing.addIssue({ scenario, name: "Salary", kind: "CONTINUOUS" });
    const { issue: title } = await briefing.addIssue({ scenario, name: "Title", kind: "DISCRETE" });

    await expectRefusal(briefing.addOption({ issue: salary, name: "$80K" }), ValueRequired, "An option of a continuous issue needs a universal value.");
    await expectRefusal(
      briefing.addOption({ issue: title, name: "Director", universalValue: 3 }),
      ValueNotAllowed,
      "An option of a discrete issue has no universal value.",
    );
    const { option: high } = await briefing.addOption({ issue: salary, name: "$120K", universalValue: 120000 });
    const { option: low } = await briefing.addOption({ issue: salary, name: "$80K", universalValue: 80000 });
    await expectRefusal(
      briefing.addOption({ issue: salary, name: "Eighty thousand", universalValue: 80000 }),
      ValueTaken,
      "This issue already has an option at that universal value.",
    );
    await expectRefusal(
      briefing.addOption({ issue: salary, name: "$80K", universalValue: 85000 }),
      OptionExists,
      "This issue already has an option with that name.",
    );
    await expectRefusal(briefing.addOption({ issue: "nothing" as Issue, name: "$80K" }), UnknownIssue, "There is no such issue.");

    const { option: senior } = await briefing.addOption({ issue: title, name: "Senior manager" });
    const { option: assistant } = await briefing.addOption({ issue: title, name: "Assistant manager" });
    // A continuous issue's options come lowest value first; a discrete issue's in the order they were added.
    expect(await briefing._options({ issue: salary })).toEqual([
      { option: low, name: "$80K", universalValue: 80000 },
      { option: high, name: "$120K", universalValue: 120000 },
    ]);
    expect(await briefing._options({ issue: title })).toEqual([
      { option: senior, name: "Senior manager", universalValue: undefined },
      { option: assistant, name: "Assistant manager", universalValue: undefined },
    ]);
  });

  test("a payoff belongs to a role and an option of the same scenario, and setting it again replaces it", async () => {
    const { briefing } = await setup();
    const offer = await jobOffer(briefing);
    const { scenario: other } = await briefing.create({ author: "sophie", name: "Another case" });
    const { role: stranger } = await briefing.addRole({ scenario: other, name: "Stranger", batna: 0 });

    await expectRefusal(
      briefing.setPayoff({ role: stranger, option: offer.full, points: 10 }),
      DifferentScenarios,
      "The role and the option belong to different scenarios.",
    );
    await expectRefusal(
      briefing.setPayoff({ role: "nobody" as Role, option: offer.full, points: 10 }),
      UnknownRoleOrOption,
      "There is no such role or option.",
    );
    expect(await briefing.setPayoff({ role: offer.hiro, option: offer.half, points: 175 })).toEqual({});
    expect(await briefing._payoffs({ role: offer.hiro })).toEqual([
      { issue: offer.salary, option: offer.low, points: 0 },
      { issue: offer.salary, option: offer.high, points: 600 },
      { issue: offer.insurance, option: offer.none, points: 0 },
      { issue: offer.insurance, option: offer.half, points: 175 },
      { issue: offer.insurance, option: offer.full, points: 300 },
    ]);
    await expectRefusal(briefing.addRole({ scenario: offer.scenario, name: "Hiro", batna: 1 }), RoleExists, "This scenario already has a role with that name.");
    expect(await briefing._roles({ scenario: offer.scenario })).toEqual([
      { role: offer.hiro, name: "Hiro" },
      { role: offer.manon, name: "Manon" },
    ]);
  });

  test("a brief must have 1 to 20,000 characters", async () => {
    const { briefing } = await setup();
    const offer = await jobOffer(briefing, { brief: false });
    await expectRefusal(briefing.setBrief({ role: offer.hiro, brief: "  \n " }), InvalidBrief, "A brief must have 1 to 20,000 characters.");
    await expect(briefing.setBrief({ role: offer.hiro, brief: "x".repeat(20001) })).rejects.toThrow(InvalidBrief);
    await expectRefusal(briefing.setBrief({ role: "nobody" as Role, brief: "Hi" }), UnknownRole, "There is no such role.");
    expect(await briefing.setBrief({ role: offer.hiro, brief: "x".repeat(20000) })).toEqual({});
    expect(await briefing._role({ role: offer.hiro })).toEqual([
      { scenario: offer.scenario, name: "Hiro", batna: 500, brief: "x".repeat(20000) },
    ]);
    expect(await briefing._role({ role: offer.manon })).toEqual([
      { scenario: offer.scenario, name: "Manon", batna: 300, brief: undefined },
    ]);
  });

  test("publishing needs every payoff, and nothing about a published scenario can change", async () => {
    const { briefing } = await setup();
    const offer = await jobOffer(briefing);
    const { option: lunch } = await briefing.addOption({ issue: offer.insurance, name: "Dental only" });
    // Nobody has points for the new option yet.
    await expect(briefing.publish({ scenario: offer.scenario })).rejects.toThrow(Incomplete);
    await briefing.setPayoff({ role: offer.hiro, option: lunch, points: 50 });
    await briefing.setPayoff({ role: offer.manon, option: lunch, points: 0 });
    await briefing.publish({ scenario: offer.scenario });
    expect(await briefing._published()).toEqual([{ scenario: offer.scenario, name: "The Job Offer" }]);

    await expectRefusal(briefing.publish({ scenario: offer.scenario }), AlreadyPublished, "This scenario is already published.");
    await expectRefusal(briefing.publish({ scenario: "nowhere" as Scenario }), UnknownScenario, "There is no such scenario.");
    for (const change of [
      () => briefing.addOption({ issue: offer.insurance, name: "Vision only" }),
      () => briefing.addRole({ scenario: offer.scenario, name: "Recruiter", batna: 0 }),
      () => briefing.setPayoff({ role: offer.hiro, option: offer.full, points: 1 }),
      () => briefing.setBrief({ role: offer.hiro, brief: "Changed" }),
    ]) {
      await expectRefusal(change(), Published, "A published scenario can't be changed.");
    }
  });

  test("_dealValidity reports every problem with a term sheet, issue by issue", async () => {
    const { briefing } = await setup();
    const offer = await jobOffer(briefing);
    expect(await briefing._dealValidity({ scenario: offer.scenario, terms: {} })).toEqual([
      { problem: "This scenario doesn't exist or isn't published." },
    ]);
    await briefing.publish({ scenario: offer.scenario });

    expect(await briefing._dealValidity({ scenario: offer.scenario, terms: { [offer.salary]: 80000, [offer.insurance]: offer.none } })).toEqual([]);
    expect(
      await briefing._dealValidity({ scenario: offer.scenario, terms: { vacation: 3, [offer.salary]: 130000, [offer.insurance]: offer.low } }),
    ).toEqual([
      { issue: "Salary", problem: "The value must be a number from 80000 to 120000." },
      { issue: "Health insurance", problem: "This issue has no such option." },
      { issue: "vacation", problem: "This scenario has no such issue." },
    ]);
    expect(await briefing._dealValidity({ scenario: offer.scenario, terms: { [offer.salary]: "lots" } })).toEqual([
      { issue: "Salary", problem: "The value must be a number from 80000 to 120000." },
      { issue: "Health insurance", problem: "Nothing is agreed on this issue." },
    ]);
    // An invalid term sheet has no payoff at all.
    expect(await briefing._dealPayoff({ role: offer.hiro, terms: { [offer.salary]: 90000 } })).toEqual([]);
    expect(await briefing._dealJointPayoff({ scenario: offer.scenario, terms: { [offer.salary]: 90000 } })).toEqual([]);
    expect(await briefing._dealPayoff({ role: "nobody" as Role, terms: {} })).toEqual([]);
  });

  test("the whole pie may need a continuous issue to move points from one role to the other", async () => {
    const { briefing } = await setup();
    // Ana taking the big room is worth 100 to her and costs Ben nothing, so it's in the whole pie. With rent all hers,
    // Ben gets 0, below his BATNA of 90, so the whole pie gives him at least 90 of the rent while keeping the joint 200.
    const { scenario, room, rent, big, ana, ben } = await lease(briefing, { ana: 50, ben: 90 });
    const [pie] = await briefing._wholePie({ scenario });
    expect(pie?.jointPoints).toBe(200);
    expect(pie?.jointBatna).toBe(140);
    expect(pie?.terms[room]).toBe(big);
    const [anaPoints] = await briefing._dealPayoff({ role: ana, terms: pie!.terms });
    const [benPoints] = await briefing._dealPayoff({ role: ben, terms: pie!.terms });
    expect(anaPoints!.points).toBeGreaterThanOrEqual(50);
    expect(benPoints!.points).toBeGreaterThanOrEqual(90);
    // Asking again gives the same term sheet.
    expect(await briefing._wholePie({ scenario })).toEqual([pie!]);
    expect(pie?.terms[rent]).toBeNumber();
  });

  test("the whole pie is empty when no term sheet is worth at least its BATNA to everyone, or the scenario isn't published", async () => {
    const { briefing } = await setup();
    const { scenario } = await lease(briefing, { ana: 150, ben: 150 });
    expect(await briefing._wholePie({ scenario })).toEqual([]);
    const offer = await jobOffer(briefing);
    expect(await briefing._wholePie({ scenario: offer.scenario })).toEqual([]);
  });

  test("of two scenarios with one name at once, Briefing creates one and refuses the other with NAME_TAKEN", async () => {
    const { briefing } = await setup();
    await expectOneWinner(
      [briefing.create({ author: "sophie", name: "The Job Offer" }), briefing.create({ author: "lee", name: "The Job Offer " })],
      NameTaken,
    );
  });

  test("of two options at one universal value at once, Briefing adds one and refuses the other", async () => {
    const { briefing } = await setup();
    const { scenario } = await briefing.create({ author: "sophie", name: "The Job Offer" });
    const { issue } = await briefing.addIssue({ scenario, name: "Salary", kind: "CONTINUOUS" });
    await expectOneWinner(
      [
        briefing.addOption({ issue, name: "$80K", universalValue: 80000 }),
        briefing.addOption({ issue, name: "Eighty thousand", universalValue: 80000 }),
      ],
      ValueTaken,
    );
    expect(await briefing._options({ issue })).toHaveLength(1);
  });
});
