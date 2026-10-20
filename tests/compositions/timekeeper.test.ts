import { describe, expect, test } from "bun:test";
import { startWholePie } from "../support/app.ts";
import { eventually, ok } from "../support/reusable/results.ts";

describe("the timekeeper", () => {
  test("expires the tables whose time is up, even with nobody watching, and the coach still writes a debrief", async () => {
    const { api, application, advance, practice } = await startWholePie();
    const nadia = await practice("nadia");
    const leo = await practice("leo");
    ok(await api.tables.start({ session: nadia.session, table: nadia.table, minutes: 10 }));
    ok(await api.tables.start({ session: leo.session, table: leo.table, minutes: 30 }));
    const { session } = ok(await application.concepts.AgentSessioning.start({ subject: "timekeeper" }));

    // Before anyone's time is up, a sweep changes nothing.
    expect(ok(await api.timekeeper.expire({ session }))).toEqual({});
    await application.whenIdle();
    expect((await nadia.show()).table.status).toBe("OPEN");

    // Both close their pages; ten minutes later, only Nadia's time is up, and the next sweep ends her table.
    advance(10);
    ok(await api.timekeeper.expire({ session }));
    await application.whenIdle();
    expect((await nadia.show()).table.status).toBe("EXPIRED");
    expect((await leo.show()).table.status).toBe("OPEN");
    await eventually(async () =>
      expect(ok(await api.tables.debrief({ session: nadia.session, table: nadia.table })).coaching).toMatchObject([{ stage: "CONCLUDED" }]),
    );

    // A sweep with nothing overdue still answers.
    expect(ok(await api.timekeeper.expire({ session }))).toEqual({});
  });

  test("only the timekeeper's agent session can ask, never a person's", async () => {
    const { api, practice } = await startWholePie({ counterpart: null, coach: null });
    const nadia = await practice("nadia");
    expect(await api.timekeeper.expire({ session: nadia.session })).toEqual({ error: "NOT_SIGNED_IN" });
  });
});
