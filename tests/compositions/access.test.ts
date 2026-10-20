import { describe, expect, test } from "bun:test";
import type { Session } from "../../src/concepts/Sessioning/Sessioning.ts";
import manonsBrief from "../../src/seed/briefs/manon.md" with { type: "text" };
import { startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

const WHOLE_PIE = { "Start date": 0, Salary: 120000, "Health Insurance": "Full Coverage", Bonus: 0, "Position title": "Director" };

describe("access", () => {
  test("Sam can't see, act at, or read the debrief of Nadia's table, as if it didn't exist", async () => {
    const { api, practice, register } = await startWholePie({ counterpart: null });
    const nadia = await practice("nadia");
    const sam = await register("sam");
    ok(await api.tables.start({ session: nadia.session, table: nadia.table, minutes: 30 }));
    const { proposal } = ok(await api.tables.propose({ session: nadia.session, table: nadia.table, terms: nadia.terms(WHOLE_PIE) }));

    const session = sam.session;
    const table = nadia.table;
    const refused = { error: "NOT_FOUND" } as const;
    expect(await api.tables.show({ session, table })).toEqual(refused);
    expect(await api.tables.start({ session, table, minutes: 30 })).toEqual(refused);
    expect(await api.tables.send({ session, table, body: "Hi Nadia" })).toEqual(refused);
    expect(await api.tables.propose({ session, table, terms: nadia.terms(WHOLE_PIE) })).toEqual(refused);
    expect(await api.tables.accept({ session, table, proposal })).toEqual(refused);
    expect(await api.tables.reject({ session, table, proposal })).toEqual(refused);
    expect(await api.tables.retract({ session, table, proposal })).toEqual(refused);
    expect(await api.tables.notes({ session, table, body: "Nadia's table" })).toEqual(refused);
    expect(await api.tables.withdraw({ session, table })).toEqual(refused);
    expect(await api.tables.expire({ session, table })).toEqual(refused);
    expect(await api.tables.debrief({ session, table })).toEqual(refused);
    expect(ok(await api.bakery({ session })).tables).toEqual([]);
    expect((await nadia.show()).table.proposals).toMatchObject([{ proposal, status: "PENDING" }]);
  });

  test("Nadia reads only her own brief, sees what each proposal is worth only to her, and can't answer a proposal from another table", async () => {
    const { api, practice } = await startWholePie({ counterpart: null });
    const nadia = await practice("nadia");
    const leo = await practice("leo");
    ok(await api.tables.start({ session: nadia.session, table: nadia.table, minutes: 30 }));
    ok(await api.tables.start({ session: leo.session, table: leo.table, minutes: 30 }));
    const { proposal } = ok(await api.tables.propose({ session: leo.session, table: leo.table, terms: leo.terms(WHOLE_PIE) }));

    const seen = await nadia.show();
    expect(seen.table.roleName).toBe("Hiro");
    expect(JSON.stringify(seen)).not.toContain(manonsBrief.slice(0, 200));
    expect(await api.tables.accept({ session: nadia.session, table: nadia.table, proposal })).toEqual({ error: "NOT_FOUND" });
    expect(await api.tables.reject({ session: nadia.session, table: nadia.table, proposal })).toEqual({ error: "NOT_FOUND" });
  });

  test("every person's endpoint needs a session, and the counterpart's session is refused at each of them", async () => {
    const { api, application, practice } = await startWholePie({ counterpart: null });
    const nadia = await practice("nadia");
    const agent = ok(await application.concepts.AgentSessioning.start({ subject: "counterpart" })).session;
    for (const session of ["not-a-session" as Session, agent]) {
      expect(await api.bakery({ session })).toEqual({ error: "NOT_SIGNED_IN" });
      expect(await api.tables.show({ session, table: nadia.table })).toEqual({ error: "NOT_SIGNED_IN" });
      expect(await api.tables.send({ session, table: nadia.table, body: "Hi" })).toEqual({ error: "NOT_SIGNED_IN" });
    }
  });
});

describe("the counterpart's endpoints", () => {
  test("only the agent's session reads a table, and only the table of a prompt the agent took", async () => {
    const { api, application, practice } = await startWholePie({ counterpart: null });
    const nadia = await practice("nadia");
    ok(await api.tables.start({ session: nadia.session, table: nadia.table, minutes: 30 }));
    ok(await api.tables.send({ session: nadia.session, table: nadia.table, body: "Hello, Manon." }));
    const [question] = await application.concepts.Reasoning._about({ subject: nadia.table });
    const prompt = question!.prompt;

    expect(await api.counterpart.table({ session: nadia.session, prompt })).toEqual({ error: "NOT_SIGNED_IN" });
    expect(await api.answers.take({ session: nadia.session, prompt })).toEqual({ error: "NOT_SIGNED_IN" });
    const session = ok(await application.concepts.AgentSessioning.start({ subject: "counterpart" })).session;
    expect(await api.counterpart.table({ session, prompt })).toEqual({ error: "NOT_TAKEN" });
    ok(await api.answers.take({ session, prompt }));

    const { tables } = ok(await api.counterpart.table({ session, prompt }));
    expect(tables).toHaveLength(1);
    expect(tables[0]).toMatchObject({ table: nadia.table, roleName: "Manon", batna: 1000 });
    expect(tables[0]!.brief).toBe(manonsBrief);
  });
});
