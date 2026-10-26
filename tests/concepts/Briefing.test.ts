import { describe, expect, test } from "bun:test";
import {
  AlreadyPublished,
  BriefingConcept,
  DifferentScenarios,
  Incomplete,
  InvalidBrief,
  InvalidSummary,
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
  UnknownOption,
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
    // Without a brief yet, the row leaves the brief out.
    expect(await briefing._role({ role: offer.manon })).toStrictEqual([{ scenario: offer.scenario, name: "Manon", batna: 300 }]);
  });

  test("a role's summary has at most 300 characters, a blank one clears it, and it can change after publishing", async () => {
    const { briefing } = await setup();
    const offer = await jobOffer(briefing);
    await expectRefusal(
      briefing.describeRole({ role: offer.hiro, summary: "x".repeat(301) }),
      InvalidSummary,
      "A role's summary must have at most 300 characters.",
    );
    await expectRefusal(briefing.describeRole({ role: "nobody" as Role, summary: "Hi" }), UnknownRole, "There is no such role.");
    expect(await briefing.describeRole({ role: offer.hiro, summary: "  The candidate.  " })).toEqual({});
    expect((await briefing._role({ role: offer.hiro }))[0]?.summary).toBe("The candidate.");

    // A summary changes nothing a deal is worth, so it can change once the scenario is published.
    await briefing.publish({ scenario: offer.scenario });
    await briefing.describeRole({ role: offer.hiro, summary: "Fernwood's top choice for the role." });
    expect((await briefing._role({ role: offer.hiro }))[0]?.summary).toBe("Fernwood's top choice for the role.");
    await briefing.describeRole({ role: offer.hiro, summary: " " });
    expect((await briefing._role({ role: offer.hiro }))[0]).not.toHaveProperty("summary");
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
    // Even with no deal possible, everyone gets their BATNA when nobody agrees: 150 each, 300 together.
    expect(await briefing._jointBatna({ scenario })).toEqual([{ jointBatna: 300 }]);
    expect(await briefing._jointBatna({ scenario: "nowhere" as Scenario })).toEqual([]);
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

describe("Briefing drafts", () => {
  test("its principle: while The Job Offer is a draft, Sophie renames an issue, removes an option, changes a kind, and raises a BATNA", async () => {
    const { briefing } = await setup();
    const offer = await jobOffer(briefing);
    const { issue: bonus } = await briefing.addIssue({ scenario: offer.scenario, name: "Signing bonus", kind: "DISCRETE" });
    await briefing.updateIssue({ issue: bonus, name: " Bonus ", kind: "DISCRETE" });
    expect(await briefing._issue({ issue: bonus })).toEqual([{ scenario: offer.scenario, name: "Bonus", kind: "DISCRETE" }]);

    // Removing an option removes every role's points for it, too.
    await briefing.removeOption({ option: offer.half });
    expect((await briefing._options({ issue: offer.insurance })).map(({ name }) => name)).toEqual(["Not included", "Full Coverage"]);
    expect((await briefing._payoffs({ role: offer.hiro })).map(({ option }) => option)).not.toContain(offer.half);

    // A range's options have universal values that a list's can't, so changing the kind removes them and their points.
    await briefing.updateIssue({ issue: offer.salary, name: "Salary", kind: "DISCRETE" });
    expect(await briefing._options({ issue: offer.salary })).toEqual([]);
    expect(await briefing._issue({ issue: offer.salary })).toEqual([{ scenario: offer.scenario, name: "Salary", kind: "DISCRETE" }]);
    expect((await briefing._payoffs({ role: offer.manon })).map(({ issue }) => issue)).not.toContain(offer.salary);
    // Changing only the name or unit keeps them.
    const { option: low } = await briefing.addOption({ issue: offer.salary, name: "$80K" });
    await briefing.updateIssue({ issue: offer.salary, name: "Base salary", kind: "DISCRETE" });
    expect(await briefing._options({ issue: offer.salary })).toEqual([{ option: low, name: "$80K", universalValue: undefined }]);

    await briefing.updateOption({ option: offer.full, name: "Full coverage" });
    expect(await briefing._option({ option: offer.full })).toEqual([
      { scenario: offer.scenario, issue: offer.insurance, name: "Full coverage" },
    ]);
    await briefing.updateRole({ role: offer.manon, name: "Manon", batna: 900 });
    expect(await briefing._role({ role: offer.manon })).toMatchObject([{ name: "Manon", batna: 900 }]);
    await briefing.rename({ scenario: offer.scenario, name: "The Offer" });
    expect(await briefing._scenario({ scenario: offer.scenario })).toEqual([{ name: "The Offer", author: "sophie", published: false }]);
  });

  test("a continuous option moves to another universal value, and keeps the order of its range", async () => {
    const { briefing } = await setup();
    const offer = await jobOffer(briefing);
    const { option: mid } = await briefing.addOption({ issue: offer.salary, name: "$100K", universalValue: 100000 });
    await briefing.updateOption({ option: mid, name: "$130K", universalValue: 130000 });
    expect((await briefing._options({ issue: offer.salary })).map(({ name, universalValue }) => [name, universalValue])).toEqual([
      ["$80K", 80000],
      ["$120K", 120000],
      ["$130K", 130000],
    ]);
    await briefing.updateIssue({ issue: offer.salary, name: "Salary", kind: "CONTINUOUS", unit: "  " });
    expect(await briefing._issue({ issue: offer.salary })).toEqual([{ scenario: offer.scenario, name: "Salary", kind: "CONTINUOUS" }]);
  });

  test("editing a draft refuses what adding it would, and a name another issue, option, role, or scenario already has", async () => {
    const { briefing } = await setup();
    const offer = await jobOffer(briefing);
    await briefing.create({ author: "omar", name: "The Lease" });

    await expectRefusal(briefing.rename({ scenario: offer.scenario, name: " " }), InvalidScenarioName, "1 to 100 characters");
    await expectRefusal(briefing.rename({ scenario: offer.scenario, name: "The Lease" }), NameTaken, "already exists");
    await briefing.rename({ scenario: offer.scenario, name: "The Job Offer" });

    await expectRefusal(briefing.updateIssue({ issue: offer.salary, name: "", kind: "CONTINUOUS" }), InvalidIssueName, "1 to 100");
    await expectRefusal(
      briefing.updateIssue({ issue: offer.salary, name: "Health insurance", kind: "CONTINUOUS" }),
      IssueExists,
      "already has an issue with that name",
    );
    await expectRefusal(
      briefing.updateIssue({ issue: offer.insurance, name: "Health insurance", kind: "DISCRETE", unit: "plans" }),
      UnitNotAllowed,
      "Only a continuous issue has a unit.",
    );

    await expectRefusal(briefing.updateOption({ option: offer.low, name: "$120K", universalValue: 1 }), OptionExists, "already has an option");
    await expectRefusal(briefing.updateOption({ option: offer.low, name: "$80K" }), ValueRequired, "needs a universal value");
    await expectRefusal(briefing.updateOption({ option: offer.none, name: "None", universalValue: 0 }), ValueNotAllowed, "no universal value");
    await expectRefusal(briefing.updateOption({ option: offer.low, name: "$80K", universalValue: 120000 }), ValueTaken, "at that universal value");
    await expectRefusal(briefing.updateOption({ option: offer.low, name: " ", universalValue: 1 }), InvalidOptionName, "1 to 100");

    await expectRefusal(briefing.updateRole({ role: offer.hiro, name: "Manon", batna: 0 }), RoleExists, "already has a role");
    await expectRefusal(briefing.updateRole({ role: offer.hiro, name: "", batna: 0 }), InvalidRoleName, "1 to 100");

    await expectRefusal(briefing.updateIssue({ issue: "nowhere" as Issue, name: "x", kind: "DISCRETE" }), UnknownIssue, "no such issue");
    await expectRefusal(briefing.removeIssue({ issue: "nowhere" as Issue }), UnknownIssue, "no such issue");
    await expectRefusal(briefing.updateOption({ option: "nowhere" as Option, name: "x" }), UnknownOption, "There is no such option.");
    await expectRefusal(briefing.removeOption({ option: "nowhere" as Option }), UnknownOption, "There is no such option.");
    await expectRefusal(briefing.updateRole({ role: "nowhere" as Role, name: "x", batna: 0 }), UnknownRole, "no such role");
    await expectRefusal(briefing.removeRole({ role: "nowhere" as Role }), UnknownRole, "no such role");
    await expectRefusal(briefing.rename({ scenario: "nowhere" as Scenario, name: "x" }), UnknownScenario, "no such scenario");
    await expectRefusal(briefing.discard({ scenario: "nowhere" as Scenario }), UnknownScenario, "no such scenario");
  });

  test("removing a role or an issue takes its payoffs with it, so publishing waits only for what is left", async () => {
    const { briefing } = await setup();
    const offer = await jobOffer(briefing);
    const { role: recruiter } = await briefing.addRole({ scenario: offer.scenario, name: "Recruiter", batna: 0 });
    const { issue: perks } = await briefing.addIssue({ scenario: offer.scenario, name: "Perks", kind: "DISCRETE" });
    await briefing.addOption({ issue: perks, name: "Gym" });
    await briefing.setPayoff({ role: recruiter, option: offer.low, points: 10 });
    await expect(briefing.publish({ scenario: offer.scenario })).rejects.toThrow(Incomplete);

    await briefing.removeRole({ role: recruiter });
    await briefing.removeIssue({ issue: perks });
    expect(await briefing._roles({ scenario: offer.scenario })).toEqual([
      { role: offer.hiro, name: "Hiro" },
      { role: offer.manon, name: "Manon" },
    ]);
    expect((await briefing._issues({ scenario: offer.scenario })).map(({ name }) => name)).toEqual(["Salary", "Health insurance"]);
    expect(await briefing._payoffs({ role: recruiter })).toEqual([]);
    await briefing.publish({ scenario: offer.scenario });
  });

  test("discarding a draft removes it with everything in it and frees its name, and nothing about a published scenario changes", async () => {
    const { briefing } = await setup();
    const draft = await jobOffer(briefing);
    await briefing.discard({ scenario: draft.scenario });
    expect(await briefing._scenario({ scenario: draft.scenario })).toEqual([]);
    expect(await briefing._issues({ scenario: draft.scenario })).toEqual([]);
    expect(await briefing._roles({ scenario: draft.scenario })).toEqual([]);
    expect(await briefing._role({ role: draft.hiro })).toEqual([]);
    expect(await briefing._option({ option: draft.full })).toEqual([]);
    expect(await briefing._authoredBy({ author: "sophie" })).toEqual([]);

    const offer = await jobOffer(briefing);
    await briefing.publish({ scenario: offer.scenario });
    for (const change of [
      () => briefing.rename({ scenario: offer.scenario, name: "Another" }),
      () => briefing.discard({ scenario: offer.scenario }),
      () => briefing.updateIssue({ issue: offer.salary, name: "Pay", kind: "CONTINUOUS" }),
      () => briefing.removeIssue({ issue: offer.insurance }),
      () => briefing.updateOption({ option: offer.full, name: "All of it" }),
      () => briefing.removeOption({ option: offer.half }),
      () => briefing.updateRole({ role: offer.hiro, name: "Hiro", batna: 0 }),
      () => briefing.removeRole({ role: offer.manon }),
    ]) {
      await expectRefusal(change(), Published, "A published scenario can't be changed.");
    }
  });

  test("_authoredBy lists the scenarios an author created, drafts and published ones alike, newest first", async () => {
    const { briefing } = await setup();
    const offer = await jobOffer(briefing);
    await briefing.publish({ scenario: offer.scenario });
    const { scenario: draft } = await briefing.create({ author: "sophie", name: "The Lease" });
    await briefing.create({ author: "omar", name: "The Car" });
    expect(await briefing._authoredBy({ author: "sophie" })).toEqual([
      { scenario: draft, name: "The Lease", published: false },
      { scenario: offer.scenario, name: "The Job Offer", published: true },
    ]);
    expect(await briefing._authoredBy({ author: "nadia" })).toEqual([]);
  });
});
