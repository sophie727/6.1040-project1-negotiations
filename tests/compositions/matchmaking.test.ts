import { describe, expect, test } from "bun:test";
import { startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

describe("negotiating with someone new", () => {
  test("Nadia waits for someone; when Omar looks too, a table opens with each of them in one of its seats", async () => {
    const { api, application, register } = await startWholePie();
    const nadia = await register("nadia");
    const omar = await register("omar");
    const [jobOffer] = ok(await api.bakery({ session: nadia.session })).scenarios;

    // Nobody else is looking, so Nadia waits, checking in every few seconds.
    const looking = ok(await api.matchmaking.find({ session: nadia.session, scenario: jobOffer!.scenario }));
    expect(looking).toEqual({ request: expect.any(String), status: "WAITING", table: null });
    expect(ok(await api.matchmaking.wait({ session: nadia.session, request: looking.request }))).toEqual({ status: "WAITING", table: null });

    // When Omar looks too, they make a group: he goes straight to the new table, and Nadia's next check finds it.
    const found = ok(await api.matchmaking.find({ session: omar.session, scenario: jobOffer!.scenario }));
    // Read the table before asserting on the response: Bun's toMatchObject writes its matchers into the object it checks.
    const table = found.table!;
    expect(found.status).toBe("MATCHED");
    expect(typeof table).toBe("string");
    expect(ok(await api.matchmaking.wait({ session: nadia.session, request: looking.request }))).toEqual({ status: "MATCHED", table });
    await application.whenIdle();

    // Each sits in a different seat, with a role chosen at random, and nobody else sits at the table.
    const nadias = ok(await api.tables.show({ session: nadia.session, table })).table;
    const omars = ok(await api.tables.show({ session: omar.session, table })).table;
    expect(nadias.status).toBe("PREPARING");
    expect([nadias.roleName, omars.roleName].sort()).toEqual(["Hiro", "Manon"]);
    expect(nadias.seats.map(({ player }) => player).sort()).toEqual(["nadia", "omar"]);
    expect(nadias.openSeats).toEqual([]);
    expect(ok(await api.tables.show({ session: nadia.session, table })).link).toBeNull();

    // They start like any table: one suggests a length, and the other agrees.
    const { proposal } = ok(await api.tables.start({ session: nadia.session, table, minutes: 20 }));
    expect(ok(await api.tables.agree({ session: omar.session, table, proposal })).deadline).toBe("2026-10-15T14:20:00.000Z");

    // The table is in both their lists, and their searches are over.
    expect(ok(await api.bakery({ session: omar.session })).tables).toMatchObject([{ table, status: "OPEN" }]);
    expect(await api.matchmaking.stop({ session: nadia.session, request: looking.request })).toEqual({ error: "NOT_WAITING" });
  });

  test("someone whose page stopped checking in for a minute isn't matched, and is told to look again", async () => {
    const { api, advance, register } = await startWholePie();
    const pia = await register("pia");
    const quinn = await register("quinn");
    const [jobOffer] = ok(await api.bakery({ session: pia.session })).scenarios;
    const scenario = jobOffer!.scenario;

    const { request: pias } = ok(await api.matchmaking.find({ session: pia.session, scenario }));
    advance(2);
    // Quinn waits rather than being matched with Pia, who no longer counts.
    expect(ok(await api.matchmaking.find({ session: quinn.session, scenario }))).toMatchObject({ status: "WAITING", table: null });
    expect(ok(await api.matchmaking.wait({ session: pia.session, request: pias }))).toEqual({ status: "LAPSED", table: null });

    // Pia looks again, and is matched with Quinn.
    expect(ok(await api.matchmaking.find({ session: pia.session, scenario }))).toMatchObject({ status: "MATCHED" });
    expect(ok(await api.matchmaking.wait({ session: pia.session, request: pias }))).toEqual({ status: "STOPPED", table: null });
  });

  test("Leo can stop looking, and nobody but Leo can see or stop his search", async () => {
    const { api, register } = await startWholePie();
    const leo = await register("leo");
    const nadia = await register("nadia");
    const [jobOffer] = ok(await api.bakery({ session: leo.session })).scenarios;
    const { request } = ok(await api.matchmaking.find({ session: leo.session, scenario: jobOffer!.scenario }));

    expect(await api.matchmaking.wait({ session: nadia.session, request })).toEqual({ error: "NOT_FOUND" });
    expect(await api.matchmaking.stop({ session: nadia.session, request })).toEqual({ error: "NOT_FOUND" });
    expect(ok(await api.matchmaking.stop({ session: leo.session, request }))).toEqual({});
    expect(ok(await api.matchmaking.wait({ session: leo.session, request }))).toEqual({ status: "STOPPED", table: null });
    expect(await api.matchmaking.stop({ session: leo.session, request })).toEqual({ error: "NOT_WAITING" });

    // Nadia looks after Leo stopped, so she waits instead of being matched with him.
    expect(ok(await api.matchmaking.find({ session: nadia.session, scenario: jobOffer!.scenario }))).toMatchObject({ status: "WAITING" });
  });

  test("only a published scenario can be looked for", async () => {
    const { api, application, register } = await startWholePie();
    const { session } = await register("nadia");
    const { Briefing, Registering } = application.concepts;
    const author = ok(await Registering.register({ username: "author" })).user;
    const draft = ok(await Briefing.create({ author, name: "A draft" })).scenario;
    expect(await api.matchmaking.find({ session, scenario: draft })).toEqual({ error: "NOT_FOUND" });
  });
});
