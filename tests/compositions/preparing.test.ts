import { describe, expect, test } from "bun:test";
import { startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

const PLAN = {
  target: "$115K and a January start",
  walkaway: "anything worth at least my 1,000-point BATNA",
  priorities: "salary, then title",
};

describe("the prep sheet", () => {
  test("with prep sheets on, Nadia can't start until her plan is complete, and sees it at the table", async () => {
    const { api, practice } = await startWholePie();
    const nadia = await practice("nadia");
    const { session, table } = nadia;
    expect(ok(await api.settings.show({ session }))).toEqual({ prepSheet: false });
    expect(ok(await api.settings["prep-sheet"]({ session, on: true }))).toEqual({ prepSheet: true });
    expect(ok(await api.settings.show({ session }))).toEqual({ prepSheet: true });
    expect((await nadia.show()).plan).toEqual({ on: true, target: null, walkaway: null, priorities: null });

    // Her plan is incomplete, so suggesting a start is refused, and nothing is suggested.
    expect(await api.tables.start({ session, table, minutes: 30 })).toEqual({ error: "PLAN_FIRST" });
    ok(await api.tables.plan({ session, table, ...PLAN, priorities: "" }));
    expect(await api.tables.start({ session, table, minutes: 30 })).toEqual({ error: "PLAN_FIRST" });
    expect((await nadia.show()).start).toEqual([]);

    ok(await api.tables.plan({ session, table, ...PLAN }));
    expect(ok(await api.tables.start({ session, table, minutes: 30 })).deadline).toBe("2026-10-15T14:30:00.000Z");
    expect((await nadia.show()).plan).toEqual({ on: true, ...PLAN });
  });

  test("agreeing to start waits for a plan too, and turning prep sheets off lifts it", async () => {
    const { api, hostFriends } = await startWholePie();
    const nadia = await hostFriends("nadia");
    const omar = await nadia.join("omar");
    ok(await api.settings["prep-sheet"]({ session: omar.session, on: true }));
    const { proposal } = ok(await api.tables.start({ session: nadia.session, table: nadia.table, minutes: 30 }));
    expect(await api.tables.agree({ session: omar.session, table: nadia.table, proposal })).toEqual({ error: "PLAN_FIRST" });

    ok(await api.settings["prep-sheet"]({ session: omar.session, on: false }));
    expect(ok(await api.tables.agree({ session: omar.session, table: nadia.table, proposal })).status).toBe("ACCEPTED");
  });

  test("only someone at the table can write a plan for it, and a setting must be true or false", async () => {
    const { api, practice, register } = await startWholePie();
    const nadia = await practice("nadia");
    const { session: leo } = await register("leo");
    expect(await api.tables.plan({ session: leo, table: nadia.table, ...PLAN })).toEqual({ error: "NOT_FOUND" });
    expect(await api.tables.plan({ session: nadia.session, table: nadia.table, ...PLAN, target: "x".repeat(2001) })).toEqual({
      error: "TOO_LONG",
    });
    expect(await api.settings["prep-sheet"]({ session: nadia.session, on: "yes" as never })).toMatchObject({ error: "INVALID_INPUT" });
  });
});
