import { describe, expect, test } from "bun:test";
import hirosBrief from "../../src/seed/briefs/hiro.md" with { type: "text" };
import { DEBRIEF_ASK, JOINT_DEBRIEF_ASK } from "../../src/compositions/debrief.ts";
import { START, startWholePie } from "../support/app.ts";
import { eventually, ok } from "../support/reusable/results.ts";

const WHOLE_PIE = { "Start date": 0, Salary: 120000, "Health Insurance": "Full Coverage", Bonus: 0, "Position title": "Director" };

describe("coaching", () => {
  test("when Nadia walks away, the coach writes her a debrief, and the debrief endpoint returns it", async () => {
    const { api, practice } = await startWholePie({ counterpart: null });
    const { session, table } = await practice("nadia");
    ok(await api.tables.start({ session, table, minutes: 30 }));
    ok(await api.tables.withdraw({ session, table }));

    const [debrief] = await eventually(async () => {
      const { coaching } = ok(await api.tables.debrief({ session, table }));
      expect(coaching).toMatchObject([{ stage: "CONCLUDED", reason: null }]);
      return coaching;
    });
    expect(debrief!.answer).toContain("You walked away.");
    expect(debrief!.answer).toContain("200 points were left on the table");
  });

  test("each way a negotiation ends asks the coach for exactly one debrief", async () => {
    const { api, application, advance, practice } = await startWholePie({ counterpart: null, coach: null });
    const settled = await practice("nadia");
    const expired = await practice("leo");
    const withdrawn = await practice("ada");
    for (const { session, table } of [settled, expired, withdrawn]) ok(await api.tables.start({ session, table, minutes: 30 }));

    const { proposal } = ok(
      await application.concepts.Proposing.propose({
        subject: settled.table,
        proposer: settled.roles.Manon!,
        terms: settled.terms(WHOLE_PIE),
        now: START,
      }),
    );
    ok(await api.tables.accept({ session: settled.session, table: settled.table, proposal }));
    ok(await api.tables.withdraw({ session: withdrawn.session, table: withdrawn.table }));
    advance(30);
    ok(await api.tables.expire({ session: expired.session, table: expired.table }));
    await application.whenIdle();

    for (const { table } of [settled, expired, withdrawn]) {
      const questions = await application.concepts.Reasoning._about({ subject: table });
      expect(questions.filter(({ ask }) => ask === DEBRIEF_ASK)).toMatchObject([{ stage: "WAITING" }]);
    }
  });

  test("the coach reads a table only through a debrief it took, after the negotiation ends", async () => {
    const { api, application, practice } = await startWholePie({ counterpart: null, coach: null });
    const nadia = await practice("nadia");
    ok(await api.tables.start({ session: nadia.session, table: nadia.table, minutes: 30 }));
    ok(await api.tables.send({ session: nadia.session, table: nadia.table, body: "Hello, Manon." }));
    const session = ok(await application.concepts.AgentSessioning.start({ subject: "coach" })).session;

    // A question for the counterpart, even one the coach took, doesn't open the whole pie while Nadia negotiates.
    const [reply] = await application.concepts.Reasoning._about({ subject: nadia.table });
    ok(await api.answers.take({ session, prompt: reply!.prompt }));
    expect(await api.coach.table({ session, prompt: reply!.prompt })).toEqual({ error: "NOT_TAKEN" });

    ok(await api.tables.withdraw({ session: nadia.session, table: nadia.table }));
    const debrief = (await application.concepts.Reasoning._about({ subject: nadia.table })).find(({ ask }) => ask === DEBRIEF_ASK)!;
    expect(await api.coach.table({ session: nadia.session, prompt: debrief.prompt })).toEqual({ error: "NOT_SIGNED_IN" });
    expect(await api.coach.table({ session, prompt: debrief.prompt })).toEqual({ error: "NOT_TAKEN" });
    ok(await api.answers.take({ session, prompt: debrief.prompt }));

    const read = ok(await api.coach.table({ session, prompt: debrief.prompt }));
    if (!("table" in read)) throw new Error("Expected the debrief of one person");
    expect(read.table).toMatchObject({ roleName: "Hiro", brief: hirosBrief, messages: [{ body: "Hello, Manon." }] });
    expect(read.debrief).toMatchObject({ outcome: "WITHDRAWN", walkedAway: nadia.role, bestJointPoints: 2200 });
    expect(read.debrief.roles.map(({ payoffs }) => payoffs.length)).toEqual([12, 12]);
  });

  test("when Nadia and Omar's negotiation ends, the coach writes one debrief of both sides, which both of them read", async () => {
    const { api, application, hostFriends } = await startWholePie({ counterpart: null });
    const nadia = await hostFriends("nadia", "Hiro");
    const omar = await nadia.join("omar");
    const { proposal } = ok(await api.tables.start({ session: nadia.session, table: nadia.table, minutes: 30 }));
    ok(await api.tables.agree({ session: omar.session, table: nadia.table, proposal }));
    ok(await api.tables.withdraw({ session: omar.session, table: nadia.table }));
    await application.whenIdle();

    const questions = await application.concepts.Reasoning._about({ subject: nadia.table });
    expect(questions.map(({ ask }) => ask)).toEqual([JOINT_DEBRIEF_ASK]);
    for (const session of [nadia.session, omar.session]) {
      await eventually(async () =>
        expect(ok(await api.tables.debrief({ session, table: nadia.table })).coaching).toMatchObject([
          { stage: "CONCLUDED", answer: expect.stringContaining("Manon walked away.") },
        ]),
      );
    }
  });
});
