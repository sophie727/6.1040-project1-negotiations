import { describe, expect, test } from "bun:test";
import type { Session } from "../../src/concepts/Sessioning/Sessioning.ts";
import { START, startWholePie } from "../support/app.ts";
import { eventually, ok } from "../support/reusable/results.ts";

/** The whole pie of The Job Offer: a January 1 start costs Hiro less than it's worth to Manon, full coverage costs Manon nothing, and both want a director. */
const WHOLE_PIE = { "Start date": 0, Salary: 120000, "Health Insurance": "Full Coverage", Bonus: 0, "Position title": "Director" };
/** Everything Hiro wants: 1,500 points to him, but only 200 to Manon, well below her BATNA of 1,000. */
const GREEDY = { "Start date": 59, Salary: 120000, "Health Insurance": "Full Coverage", Bonus: 10000, "Position title": "Director" };

describe("the journey", () => {
  test("Nadia signs up, practices The Job Offer as Hiro against the counterpart, and sees the whole pie", async () => {
    const { api, register } = await startWholePie();
    const { session } = await register("nadia");

    // In the bakery, she picks The Job Offer and the role of Hiro, and keeps the recommended 30 minutes.
    const bakery = ok(await api.bakery({ session }));
    expect(bakery.tables).toEqual([]);
    expect(bakery.scenarios).toMatchObject([{ name: "The Job Offer", timeLimit: 30, roles: [{ name: "Manon" }, { name: "Hiro" }] }]);
    const jobOffer = bakery.scenarios[0]!;
    const hiro = jobOffer.roles.find(({ name }) => name === "Hiro")!.role;
    const { table } = ok(await api.practice.start({ session, scenario: jobOffer.scenario, role: hiro }));
    const show = async () => ok(await api.tables.show({ session, table }));

    // She reads her brief before the clock starts.
    const preparing = (await show()).table;
    expect(preparing).toMatchObject({ status: "PREPARING", scenarioName: "The Job Offer", roleName: "Hiro", batna: 1000, deadline: null });
    expect(preparing.brief).toStartWith("# Confidential brief");
    expect(preparing.seats.map(({ name }) => name)).toEqual(["Manon", "Hiro"]);
    expect(preparing.issues.map(({ name }) => name)).toEqual(["Start date", "Salary", "Health Insurance", "Bonus", "Position title"]);
    const manon = preparing.seats.find(({ name }) => name === "Manon")!.role;
    const terms = (named: Record<string, string | number>) =>
      Object.fromEntries(
        preparing.issues.map(({ issue, name, kind, options }) => {
          const agreed = named[name]!;
          return [issue, kind === "DISCRETE" ? options.find((option) => option.name === agreed)!.option : agreed];
        }),
      );

    // She begins at 2:00 pm, so time is up at 2:30 pm. The counterpart, playing Manon, waits for her to open.
    expect(ok(await api.tables.start({ session, table, minutes: 30 })).deadline).toBe("2026-10-15T14:30:00.000Z");
    expect((await show()).openQuestions).toBe(0);

    // When she says something, Manon answers.
    ok(await api.tables.send({ session, table, body: "I was hoping for $120K." }));
    await eventually(async () =>
      expect((await show()).table.messages).toMatchObject([{ sender: hiro, body: "I was hoping for $120K." }, { sender: manon }]),
    );

    // Manon rejects an offer worth less to her than her alternative.
    const { proposal: greedy } = ok(await api.tables.propose({ session, table, terms: terms(GREEDY) }));
    await eventually(async () =>
      expect((await show()).table.proposals).toMatchObject([{ proposal: greedy, proposer: hiro, status: "REJECTED", points: 1500 }]),
    );

    // She accepts the whole pie, worth 1,100 points to each of them, and the table is settled.
    const { proposal: fair } = ok(await api.tables.propose({ session, table, terms: terms(WHOLE_PIE) }));
    await eventually(async () => expect((await show()).table.status).toBe("SETTLED"));
    expect((await show()).table.proposals[1]).toMatchObject({ proposal: fair, status: "ACCEPTED", points: 1100 });

    // The debrief shows how much each of them got, and that this was the best deal possible.
    const { role, debrief } = ok(await api.tables.debrief({ session, table }));
    expect(role).toBe(hiro);
    expect(debrief).toMatchObject({
      outcome: "SETTLED",
      agreed: terms(WHOLE_PIE),
      walkedAway: null,
      best: terms(WHOLE_PIE),
      bestJointPoints: 2200,
      jointBatna: 2000,
    });
    expect(debrief.roles).toMatchObject([
      { role: manon, name: "Manon", batna: 1000, points: 1100, bestPoints: 1100 },
      { role: hiro, name: "Hiro", batna: 1000, points: 1100, bestPoints: 1100 },
    ]);
    // Now that it's over, she can see what each option was worth to each of them: health insurance was worth nothing to Manon.
    expect(debrief.issues.map(({ name }) => name)).toEqual(preparing.issues.map(({ name }) => name));
    const insurance = debrief.issues.find(({ name }) => name === "Health Insurance")!.options.map(({ option }) => option);
    const manons = debrief.roles[0]!.payoffs;
    expect(manons).toHaveLength(12);
    expect(manons.filter(({ option }) => insurance.includes(option)).map(({ points }) => points)).toEqual([0, 0, 0]);

    // The coach writes her a debrief.
    await eventually(async () =>
      expect(ok(await api.tables.debrief({ session, table })).coaching).toMatchObject([
        { stage: "CONCLUDED", answer: expect.stringContaining("nothing was left on the table") },
      ]),
    );

    // Back in the bakery, the table is among hers.
    expect(ok(await api.bakery({ session })).tables).toMatchObject([
      { table, scenarioName: "The Job Offer", roleName: "Hiro", status: "SETTLED" },
    ]);
  });
});

describe("how a negotiation ends", () => {
  test("Nadia accepts Manon's proposal, and the table settles on it", async () => {
    const { api, application, practice } = await startWholePie({ counterpart: null });
    const { session, table, roles, terms, show } = await practice("nadia");
    ok(await api.tables.start({ session, table, minutes: 30 }));
    // The stand-in never proposes, so Manon's proposal goes straight to Proposing.
    const { proposal } = ok(
      await application.concepts.Proposing.propose({ subject: table, proposer: roles.Manon!, terms: terms(WHOLE_PIE), now: START }),
    );

    expect(ok(await api.tables.accept({ session, table, proposal }))).toEqual({ status: "ACCEPTED" });
    await application.whenIdle();
    expect((await show()).table.status).toBe("SETTLED");
    expect(ok(await api.tables.debrief({ session, table })).debrief).toMatchObject({ outcome: "SETTLED", agreed: terms(WHOLE_PIE) });
  });

  test("when time runs out, her next message is refused, the table expires, and each side gets its BATNA", async () => {
    const { api, advance, practice } = await startWholePie();
    const { session, table, terms, show } = await practice("nadia");
    ok(await api.tables.start({ session, table, minutes: 30 }));

    advance(29);
    ok(await api.tables.send({ session, table, body: "Can we meet in the middle?" }));
    advance(1);
    expect(await api.tables.send({ session, table, body: "Hello?" })).toEqual({ error: "TIME_UP" });
    expect((await show()).table.status).toBe("EXPIRED");
    expect(await api.tables.propose({ session, table, terms: terms(WHOLE_PIE) })).toEqual({ error: "NOT_OPEN" });

    const { debrief } = ok(await api.tables.debrief({ session, table }));
    expect(debrief).toMatchObject({ outcome: "EXPIRED", agreed: null, best: terms(WHOLE_PIE), bestJointPoints: 2200 });
    expect(debrief.roles.map(({ name, batna, points }) => ({ name, batna, points }))).toEqual([
      { name: "Manon", batna: 1000, points: null },
      { name: "Hiro", batna: 1000, points: null },
    ]);
  });

  test("the countdown expires the table only once time is up, and only once", async () => {
    const { api, advance, practice } = await startWholePie();
    const { session, table, show } = await practice("nadia");
    ok(await api.tables.start({ session, table, minutes: 30 }));

    expect(await api.tables.expire({ session, table })).toEqual({ error: "NOT_DUE" });
    advance(30);
    ok(await api.tables.expire({ session, table }));
    expect((await show()).table.status).toBe("EXPIRED");
    expect(await api.tables.expire({ session, table })).toEqual({ error: "NOT_OPEN" });
  });

  test("Nadia walks away, and the debrief says she did", async () => {
    const { api, practice } = await startWholePie();
    const { session, table, role, show } = await practice("nadia");
    ok(await api.tables.start({ session, table, minutes: 30 }));

    ok(await api.tables.withdraw({ session, table }));
    expect((await show()).table.status).toBe("WITHDRAWN");
    expect(await api.tables.withdraw({ session, table })).toEqual({ error: "NOT_OPEN" });
    expect(ok(await api.tables.debrief({ session, table })).debrief).toMatchObject({ outcome: "WITHDRAWN", walkedAway: role, agreed: null });
  });

  test("Nadia can leave a table before it begins, and nobody coaches a negotiation that never happened", async () => {
    const { api, application, practice } = await startWholePie();
    const { session, table, role, show } = await practice("nadia");
    ok(await api.tables.withdraw({ session, table }));
    await application.whenIdle();
    expect((await show()).table).toMatchObject({ status: "WITHDRAWN", deadline: null });
    const { debrief, coaching } = ok(await api.tables.debrief({ session, table }));
    expect(debrief).toMatchObject({ outcome: "WITHDRAWN", walkedAway: role });
    expect(coaching).toEqual([]);
    // A table that has ended can't start.
    expect(await api.tables.start({ session, table, minutes: 30 })).toEqual({ error: "NOT_OPEN" });
  });
});

describe("rules at the table", () => {
  test("nothing is said or proposed before the negotiation begins, and there's no debrief until it ends", async () => {
    const { api, practice } = await startWholePie();
    const { session, table, terms } = await practice("nadia");
    expect(await api.tables.send({ session, table, body: "Hi!" })).toEqual({ error: "NOT_OPEN" });
    expect(await api.tables.propose({ session, table, terms: terms(WHOLE_PIE) })).toEqual({ error: "NOT_OPEN" });
    expect(await api.tables.debrief({ session, table })).toEqual({ error: "NOT_OVER" });
    ok(await api.tables.start({ session, table, minutes: 30 }));
    expect(await api.tables.start({ session, table, minutes: 30 })).toEqual({ error: "ALREADY_AGREED" });
    expect(await api.tables.debrief({ session, table })).toEqual({ error: "NOT_OVER" });
  });

  test("a proposal must agree on every issue, within its range or on one of its options", async () => {
    const { api, practice } = await startWholePie({ counterpart: null });
    const { session, table, terms, show } = await practice("nadia");
    ok(await api.tables.start({ session, table, minutes: 30 }));
    const tooRich = { ...terms(WHOLE_PIE) };
    tooRich[Object.keys(tooRich)[1]!] = 130000;
    expect(await api.tables.propose({ session, table, terms: tooRich })).toEqual({ error: "INVALID_TERMS" });
    const { [Object.keys(tooRich)[0]!]: _startDate, ...missing } = terms(WHOLE_PIE);
    expect(await api.tables.propose({ session, table, terms: missing })).toEqual({ error: "INVALID_TERMS" });
    expect((await show()).table.proposals).toEqual([]);
  });

  test("Nadia can retract her own proposal, but not accept it", async () => {
    const { api, practice } = await startWholePie({ counterpart: null });
    const { session, table, terms, show } = await practice("nadia");
    ok(await api.tables.start({ session, table, minutes: 30 }));
    const { proposal } = ok(await api.tables.propose({ session, table, terms: terms(GREEDY) }));
    expect(await api.tables.accept({ session, table, proposal })).toMatchObject({ error: "NOT_PENDING_FOR_YOU" });
    ok(await api.tables.retract({ session, table, proposal }));
    expect((await show()).table.proposals).toMatchObject([{ proposal, status: "RETRACTED" }]);
  });

  test("Nadia's notes are her own, and she can change them at any time", async () => {
    const { api, practice } = await startWholePie({ counterpart: null });
    const { session, table, show } = await practice("nadia");
    expect((await show()).notes).toEqual({ body: null });
    ok(await api.tables.notes({ session, table, body: "Manon keeps mentioning the start date." }));
    ok(await api.tables.notes({ session, table, body: "Manon keeps mentioning the start date. Possibly her priority?" }));
    expect((await show()).notes).toEqual({ body: "Manon keeps mentioning the start date. Possibly her priority?" });
    expect(await api.tables.notes({ session, table, body: "x".repeat(20_001) })).toEqual({ error: "TOO_LONG" });
  });

  test("a practice table needs a role of a published scenario, and starts with a time limit from 1 to 180 minutes", async () => {
    const { api, application, practice } = await startWholePie();
    const { session, scenario, role, table, show } = await practice("nadia");
    const { Briefing, Registering } = application.concepts;
    const author = ok(await Registering.register({ username: "author" })).user;
    const draft = ok(await Briefing.create({ author, name: "A draft" })).scenario;
    const drafted = ok(await Briefing.addRole({ scenario: draft, name: "Buyer", batna: 0 })).role;

    expect(await api.practice.start({ session, scenario: draft, role: drafted })).toEqual({ error: "NOT_FOUND" });
    expect(await api.practice.start({ session, scenario: draft, role })).toEqual({ error: "NOT_FOUND" });
    expect(await api.practice.start({ session: "not-a-session" as Session, scenario, role })).toEqual({ error: "NOT_SIGNED_IN" });

    // The page suggests the recommended 30 minutes; a time limit outside 1 to 180 minutes is refused, and changes nothing.
    expect((await show()).table).toMatchObject({ status: "PREPARING", recommendedTimeLimit: 30, timeLimit: null });
    for (const minutes of [0, 181, 2.5]) {
      expect(await api.tables.start({ session, table, minutes })).toEqual({ error: "INVALID_TIME_LIMIT" });
    }
    expect((await show()).start).toEqual([]);
    expect(ok(await api.tables.start({ session, table, minutes: 45 })).deadline).toBe("2026-10-15T14:45:00.000Z");
    expect((await show()).table).toMatchObject({ status: "OPEN", timeLimit: 45 });
  });
});
