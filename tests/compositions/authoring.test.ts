import { describe, expect, test } from "bun:test";
import { startWholePie } from "../support/app.ts";
import { eventually, ok } from "../support/reusable/results.ts";

type App = Awaited<ReturnType<typeof startWholePie>>;

/**
 * Sophie's draft of The Lease, written through the endpoints: who takes the big room, a discrete issue, and Ana's share
 * of the $2,000 rent, a continuous one, between Ana and Ben. Nobody has a brief or points yet.
 */
async function leaseDraft({ api, register }: App) {
  const { session } = await register("sophie");
  const { scenario } = ok(await api.scenarios.create({ session, name: "The Lease" }));
  const { issue: room } = ok(await api.scenarios.issues.add({ session, scenario, name: "Big bedroom", kind: "DISCRETE", unit: "" }));
  const { option: anaRoom } = ok(await api.scenarios.options.add({ session, issue: room, name: "Ana", universalValue: 0 }));
  const { option: benRoom } = ok(await api.scenarios.options.add({ session, issue: room, name: "Ben", universalValue: 0 }));
  const { issue: rent } = ok(await api.scenarios.issues.add({ session, scenario, name: "Ana's rent", kind: "CONTINUOUS", unit: "dollars" }));
  const { option: low } = ok(await api.scenarios.options.add({ session, issue: rent, name: "$800", universalValue: 800 }));
  const { option: high } = ok(await api.scenarios.options.add({ session, issue: rent, name: "$1,200", universalValue: 1200 }));
  const { role: ana } = ok(await api.scenarios.roles.add({ session, scenario, name: "Ana", batna: 100 }));
  const { role: ben } = ok(await api.scenarios.roles.add({ session, scenario, name: "Ben", batna: 100 }));
  const show = async () => ok(await api.scenarios.show({ session, scenario })).draft;
  return { session, scenario, room, anaRoom, benRoom, rent, low, high, ana, ben, show };
}

/** Gives Ana and Ben their briefs and points: Ana cares more about the room, and Ben about the rent. */
async function finish({ api }: App, lease: Awaited<ReturnType<typeof leaseDraft>>) {
  const { session } = lease;
  ok(await api.scenarios.roles.brief({ session, role: lease.ana, brief: "# Confidential brief: Ana\n\nYou want the big bedroom." }));
  ok(await api.scenarios.roles.brief({ session, role: lease.ben, brief: "# Confidential brief: Ben\n\nYou want to pay less." }));
  for (const [role, option, points] of [
    [lease.ana, lease.anaRoom, 300],
    [lease.ana, lease.benRoom, 0],
    [lease.ana, lease.low, 100],
    [lease.ana, lease.high, 0],
    [lease.ben, lease.anaRoom, 0],
    [lease.ben, lease.benRoom, 100],
    [lease.ben, lease.low, 0],
    [lease.ben, lease.high, 300],
  ] as const) {
    ok(await api.scenarios.payoffs.set({ session, role, option, points }));
  }
}

describe("writing a scenario", () => {
  test("Sophie writes The Lease, publishes it once it's complete, and Nadia practices it", async () => {
    const app = await startWholePie({ coach: null });
    const { api, practice } = app;
    const lease = await leaseDraft(app);

    // Until every role has a brief and every payoff, the draft can't be published.
    expect(await api.scenarios.publish({ session: lease.session, scenario: lease.scenario })).toEqual({ error: "INCOMPLETE" });
    await finish(app, lease);
    ok(await api.scenarios.limit({ session: lease.session, scenario: lease.scenario, minutes: 20 }));

    const draft = await lease.show();
    expect(draft).toMatchObject({ name: "The Lease", published: false, timeLimit: 20 });
    expect(draft.issues).toMatchObject([
      { name: "Big bedroom", kind: "DISCRETE", unit: null, options: [{ name: "Ana", universalValue: null }, { name: "Ben" }] },
      { name: "Ana's rent", kind: "CONTINUOUS", unit: "dollars", options: [{ universalValue: 800 }, { universalValue: 1200 }] },
    ]);
    expect(draft.roles).toMatchObject([
      { name: "Ana", batna: 100, brief: expect.stringContaining("big bedroom") },
      { name: "Ben", batna: 100, brief: expect.stringContaining("pay less") },
    ]);
    expect(draft.roles[0]!.payoffs).toHaveLength(4);

    expect(ok(await api.scenarios.publish({ session: lease.session, scenario: lease.scenario })).scenario).toBe(lease.scenario);
    expect(ok(await api.scenarios.mine({ session: lease.session })).scenarios).toEqual([
      { scenario: lease.scenario, name: "The Lease", published: true },
    ]);

    // It's in everyone's bakery now, with the time limit Sophie recommended, and Nadia practices it as Ana.
    const nadia = await practice("nadia", "Ana", "The Lease");
    const { scenarios } = ok(await api.bakery({ session: nadia.session }));
    expect(scenarios.find(({ name }) => name === "The Lease")).toMatchObject({ timeLimit: 20, roles: [{ name: "Ana" }, { name: "Ben" }] });
    ok(await api.tables.start({ session: nadia.session, table: nadia.table, minutes: 20 }));
    ok(await api.tables.send({ session: nadia.session, table: nadia.table, body: "Hi Ben!" }));
    await eventually(async () => expect((await nadia.show()).table.messages).toHaveLength(2));
    // Ana gets the room and pays $800: 400 points to her and 0 to Ben, below his BATNA, so he turns it down.
    ok(await api.tables.propose({ session: nadia.session, table: nadia.table, terms: nadia.terms({ "Big bedroom": "Ana", "Ana's rent": 800 }) }));
    await eventually(async () => expect((await nadia.show()).table.proposals).toMatchObject([{ status: "REJECTED", points: 400 }]));
    // At $1,200, Ben gets 300 points, and Ana 300 for the room: both beat their BATNAs.
    ok(await api.tables.propose({ session: nadia.session, table: nadia.table, terms: nadia.terms({ "Big bedroom": "Ana", "Ana's rent": 1200 }) }));
    await eventually(async () => expect((await nadia.show()).table.status).toBe("SETTLED"));
  });

  test("only Sophie sees or changes her draft: Omar is refused as if it weren't there", async () => {
    const app = await startWholePie({ counterpart: null, coach: null });
    const { api, register } = app;
    const lease = await leaseDraft(app);
    const { session } = await register("omar");

    expect(ok(await api.scenarios.mine({ session })).scenarios).toEqual([]);
    for (const refused of [
      api.scenarios.show({ session, scenario: lease.scenario }),
      api.scenarios.rename({ session, scenario: lease.scenario, name: "Omar's Lease" }),
      api.scenarios.limit({ session, scenario: lease.scenario, minutes: 30 }),
      api.scenarios.discard({ session, scenario: lease.scenario }),
      api.scenarios.publish({ session, scenario: lease.scenario }),
      api.scenarios.issues.add({ session, scenario: lease.scenario, name: "Parking", kind: "DISCRETE", unit: "" }),
      api.scenarios.issues.update({ session, issue: lease.room, name: "Room", kind: "DISCRETE", unit: "" }),
      api.scenarios.issues.remove({ session, issue: lease.room }),
      api.scenarios.options.add({ session, issue: lease.room, name: "Nobody", universalValue: 0 }),
      api.scenarios.options.update({ session, option: lease.low, name: "$700", universalValue: 700 }),
      api.scenarios.options.remove({ session, option: lease.low }),
      api.scenarios.roles.add({ session, scenario: lease.scenario, name: "Landlord", batna: 0 }),
      api.scenarios.roles.update({ session, role: lease.ana, name: "Anna", batna: 0 }),
      api.scenarios.roles.remove({ session, role: lease.ana }),
      api.scenarios.roles.brief({ session, role: lease.ana, brief: "You want everything." }),
      api.scenarios.payoffs.set({ session, role: lease.ana, option: lease.low, points: 1000 }),
      api.scenarios.show({ session, scenario: "nowhere" as never }),
    ]) {
      expect(await refused).toEqual({ error: "NOT_FOUND" });
    }
    expect(await lease.show()).toMatchObject({ name: "The Lease", roles: [{ name: "Ana", batna: 100, brief: null }, { name: "Ben" }] });

    // Omar can't give his own role points for one of Sophie's options either.
    const { scenario } = ok(await api.scenarios.create({ session, name: "Omar's Lease" }));
    const { role } = ok(await api.scenarios.roles.add({ session, scenario, name: "Tenant", batna: 0 }));
    expect(await api.scenarios.payoffs.set({ session, role, option: lease.low, points: 5 })).toEqual({ error: "DIFFERENT_SCENARIOS" });
  });

  test("Sophie renames, changes, and removes parts of her draft, and Briefing's rules still hold", async () => {
    const app = await startWholePie({ counterpart: null, coach: null });
    const { api } = app;
    const lease = await leaseDraft(app);
    const { session } = lease;

    expect(await api.scenarios.rename({ session, scenario: lease.scenario, name: "The Job Offer" })).toEqual({ error: "NAME_TAKEN" });
    ok(await api.scenarios.rename({ session, scenario: lease.scenario, name: "Our Lease" }));
    expect(await api.scenarios.issues.add({ session, scenario: lease.scenario, name: "Pets", kind: "MAYBE" as never, unit: "" })).toEqual({
      error: "INVALID_KIND",
    });
    expect(await api.scenarios.issues.add({ session, scenario: lease.scenario, name: "Pets", kind: "DISCRETE", unit: "cats" })).toEqual({
      error: "UNIT_NOT_ALLOWED",
    });
    expect(await api.scenarios.limit({ session, scenario: lease.scenario, minutes: 0 })).toEqual({ error: "INVALID_TIME_LIMIT" });

    // A discrete option takes no universal value, whatever the page sends; a continuous one moves to the value it's sent.
    ok(await api.scenarios.options.update({ session, option: lease.anaRoom, name: "Ana takes it", universalValue: 42 }));
    ok(await api.scenarios.options.update({ session, option: lease.high, name: "$1,500", universalValue: 1500 }));
    expect(await api.scenarios.options.update({ session, option: lease.low, name: "$800", universalValue: 1500 })).toEqual({
      error: "VALUE_TAKEN",
    });

    // Turning the room into a range removes its options and their points.
    ok(await api.scenarios.payoffs.set({ session, role: lease.ana, option: lease.anaRoom, points: 300 }));
    ok(await api.scenarios.issues.update({ session, issue: lease.room, name: "Bedroom size", kind: "CONTINUOUS", unit: "square feet" }));
    ok(await api.scenarios.options.remove({ session, option: lease.low }));
    ok(await api.scenarios.roles.update({ session, role: lease.ben, name: "Benjamin", batna: 250 }));
    ok(await api.scenarios.roles.remove({ session, role: lease.ana }));

    const draft = await lease.show();
    expect(draft).toMatchObject({ name: "Our Lease", timeLimit: null });
    expect(draft.issues).toMatchObject([
      { name: "Bedroom size", kind: "CONTINUOUS", unit: "square feet", options: [] },
      { name: "Ana's rent", options: [{ name: "$1,500", universalValue: 1500 }] },
    ]);
    expect(draft.roles).toEqual([{ role: lease.ben, name: "Benjamin", batna: 250, brief: null, payoffs: [] }]);

    ok(await api.scenarios.discard({ session, scenario: lease.scenario }));
    expect(await api.scenarios.show({ session, scenario: lease.scenario })).toEqual({ error: "NOT_FOUND" });
    expect(ok(await api.scenarios.mine({ session })).scenarios).toEqual([]);
  });

  test("once The Lease is published, nothing about it changes, not even its time limit", async () => {
    const app = await startWholePie({ counterpart: null, coach: null });
    const { api } = app;
    const lease = await leaseDraft(app);
    const { session } = lease;
    await finish(app, lease);
    ok(await api.scenarios.publish({ session, scenario: lease.scenario }));

    expect(await api.scenarios.publish({ session, scenario: lease.scenario })).toEqual({ error: "ALREADY_PUBLISHED" });
    for (const refused of [
      api.scenarios.rename({ session, scenario: lease.scenario, name: "Another Lease" }),
      api.scenarios.discard({ session, scenario: lease.scenario }),
      api.scenarios.limit({ session, scenario: lease.scenario, minutes: 15 }),
      api.scenarios.issues.add({ session, scenario: lease.scenario, name: "Parking", kind: "DISCRETE", unit: "" }),
      api.scenarios.options.update({ session, option: lease.low, name: "$700", universalValue: 700 }),
      api.scenarios.roles.update({ session, role: lease.ana, name: "Ana", batna: 0 }),
      api.scenarios.roles.brief({ session, role: lease.ana, brief: "Changed." }),
      api.scenarios.payoffs.set({ session, role: lease.ana, option: lease.low, points: 1 }),
    ]) {
      expect(await refused).toEqual({ error: "PUBLISHED" });
    }
    // The author can still read it.
    expect(await lease.show()).toMatchObject({ name: "The Lease", published: true });
  });
});
