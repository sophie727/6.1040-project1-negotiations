import { describe, expect, test } from "bun:test";
import { publishScenario } from "../../src/seed/seed.ts";
import { theJobOffer } from "../../src/seed/theJobOffer.ts";
import { startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

/** Starts The Whole Pie with a second scenario for two, so that a surprise can suggest a scenario nobody else picked. */
async function withTwoScenarios() {
  const app = await startWholePie();
  await publishScenario(app.application, { ...theJobOffer, name: "The Job Offer, again" });
  return app;
}

describe("negotiating with someone new", () => {
  test("Nadia waits for someone; when Omar looks too, a table opens with each of them in one of its seats", async () => {
    const { api, application, register } = await startWholePie();
    const nadia = await register("nadia");
    const omar = await register("omar");
    const [jobOffer] = ok(await api.bakery({ session: nadia.session })).scenarios;

    // Nobody else is looking, so Nadia waits, checking in every few seconds.
    const looking = ok(await api.matchmaking.find({ session: nadia.session, scenario: jobOffer!.scenario, open: false }));
    expect(looking).toEqual({ request: expect.any(String), status: "WAITING", table: null });
    expect(ok(await api.matchmaking.wait({ session: nadia.session, request: looking.request }))).toEqual({ status: "WAITING", table: null });

    // When Omar looks too, they make a group: he goes straight to the new table, and Nadia's next check finds it.
    const found = ok(await api.matchmaking.find({ session: omar.session, scenario: jobOffer!.scenario, open: false }));
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

  test("Omar picks Surprise me! for two people, so Omar joins Nadia, who is waiting for The Job Offer, at a table for it", async () => {
    const { api, application, register } = await withTwoScenarios();
    const nadia = await register("nadia");
    const omar = await register("omar");
    const scenarios = ok(await api.bakery({ session: nadia.session })).scenarios;
    const jobOffer = scenarios.find(({ name }) => name === "The Job Offer")!;
    const again = scenarios.find(({ name }) => name === "The Job Offer, again")!;

    const looking = ok(await api.matchmaking.find({ session: nadia.session, scenario: jobOffer.scenario, open: false }));
    expect(looking.status).toBe("WAITING");
    // Omar's page suggests the other scenario for two, but Omar goes along with the one Nadia picked.
    const found = ok(await api.matchmaking.find({ session: omar.session, scenario: again.scenario, open: true }));
    const table = found.table!;
    expect(found.status).toBe("MATCHED");
    expect(ok(await api.matchmaking.wait({ session: nadia.session, request: looking.request }))).toEqual({ status: "MATCHED", table });
    await application.whenIdle();
    const shown = ok(await api.tables.show({ session: omar.session, table })).table;
    expect(shown.scenarioName).toBe("The Job Offer");
    expect(shown.seats.map(({ player }) => player).sort()).toEqual(["nadia", "omar"]);
  });

  test("when both people are open, they negotiate the scenario suggested to the one who looked first", async () => {
    const { api, application, register } = await withTwoScenarios();
    const pia = await register("pia");
    const quinn = await register("quinn");
    const scenarios = ok(await api.bakery({ session: pia.session })).scenarios;
    const jobOffer = scenarios.find(({ name }) => name === "The Job Offer")!;
    const again = scenarios.find(({ name }) => name === "The Job Offer, again")!;

    const looking = ok(await api.matchmaking.find({ session: pia.session, scenario: again.scenario, open: true }));
    expect(looking.status).toBe("WAITING");
    const found = ok(await api.matchmaking.find({ session: quinn.session, scenario: jobOffer.scenario, open: true }));
    const table = found.table!;
    await application.whenIdle();
    expect(ok(await api.tables.show({ session: pia.session, table })).table.scenarioName).toBe("The Job Offer, again");
  });

  test("someone whose page stopped checking in for a minute isn't matched, and is told to look again", async () => {
    const { api, advance, register } = await startWholePie();
    const pia = await register("pia");
    const quinn = await register("quinn");
    const [jobOffer] = ok(await api.bakery({ session: pia.session })).scenarios;
    const scenario = jobOffer!.scenario;

    const { request: pias } = ok(await api.matchmaking.find({ session: pia.session, scenario, open: false }));
    advance(2);
    // Quinn waits rather than being matched with Pia, who no longer counts.
    expect(ok(await api.matchmaking.find({ session: quinn.session, scenario, open: false }))).toMatchObject({ status: "WAITING", table: null });
    expect(ok(await api.matchmaking.wait({ session: pia.session, request: pias }))).toEqual({ status: "LAPSED", table: null });

    // Pia looks again, and is matched with Quinn.
    expect(ok(await api.matchmaking.find({ session: pia.session, scenario, open: false }))).toMatchObject({ status: "MATCHED" });
    expect(ok(await api.matchmaking.wait({ session: pia.session, request: pias }))).toEqual({ status: "STOPPED", table: null });
  });

  test("Leo can stop looking, and nobody but Leo can see or stop his search", async () => {
    const { api, register } = await startWholePie();
    const leo = await register("leo");
    const nadia = await register("nadia");
    const [jobOffer] = ok(await api.bakery({ session: leo.session })).scenarios;
    const { request } = ok(await api.matchmaking.find({ session: leo.session, scenario: jobOffer!.scenario, open: false }));

    expect(await api.matchmaking.wait({ session: nadia.session, request })).toEqual({ error: "NOT_FOUND" });
    expect(await api.matchmaking.stop({ session: nadia.session, request })).toEqual({ error: "NOT_FOUND" });
    expect(ok(await api.matchmaking.stop({ session: leo.session, request }))).toEqual({});
    expect(ok(await api.matchmaking.wait({ session: leo.session, request }))).toEqual({ status: "STOPPED", table: null });
    expect(await api.matchmaking.stop({ session: leo.session, request })).toEqual({ error: "NOT_WAITING" });

    // Nadia looks after Leo stopped, so she waits instead of being matched with him.
    expect(ok(await api.matchmaking.find({ session: nadia.session, scenario: jobOffer!.scenario, open: false }))).toMatchObject({ status: "WAITING" });
  });

  test("only a published scenario can be looked for, and being open is true or false", async () => {
    const { api, application, register } = await startWholePie();
    const { session } = await register("nadia");
    const { Briefing, Registering } = application.concepts;
    const author = ok(await Registering.register({ username: "author" })).user;
    const draft = ok(await Briefing.create({ author, name: "A draft" })).scenario;
    expect(await api.matchmaking.find({ session, scenario: draft, open: false })).toEqual({ error: "NOT_FOUND" });
    expect(await api.matchmaking.find({ session, scenario: draft, open: true })).toEqual({ error: "NOT_FOUND" });
    // Whether the person is open must be true or false.
    const [jobOffer] = ok(await api.bakery({ session })).scenarios;
    expect(await api.matchmaking.find({ session, scenario: jobOffer!.scenario, open: "yes" as never })).toMatchObject({
      error: "INVALID_INPUT",
    });
  });
});
