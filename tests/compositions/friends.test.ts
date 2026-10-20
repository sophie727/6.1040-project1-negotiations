import { describe, expect, test } from "bun:test";
import type { Session } from "../../src/concepts/Sessioning/Sessioning.ts";
import { startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

/** The whole pie of The Job Offer, worth 1,100 points to each side. */
const WHOLE_PIE = { "Start date": 0, Salary: 120000, "Health Insurance": "Full Coverage", Bonus: 0, "Position title": "Director" };

describe("negotiating with friends", () => {
  test("Nadia shares a link, Omar joins, they agree on 45 minutes, reach a deal, and both see the whole pie", async () => {
    const { api, application, hostFriends } = await startWholePie();
    const nadia = await hostFriends("nadia", "Hiro");
    const { Hiro: hiro, Manon: manon } = nadia.roles;

    // Nadia's table waits for someone to play Manon, and shows her the link to share.
    const waiting = await nadia.show();
    expect(waiting.table.seats).toEqual([
      { role: manon, name: "Manon", player: null, ratings: { create: null, claim: null, negotiations: null, stars: null, reviews: null } },
      { role: hiro, name: "Hiro", player: "nadia", ratings: { create: null, claim: null, negotiations: 0, stars: null, reviews: 0 } },
    ]);
    expect(waiting.table.openSeats).toEqual([manon]);
    expect(nadia.code).toMatch(/^[A-Za-z0-9_-]{22}$/);

    // She's ready before Omar arrives: her suggestion waits for him.
    expect(ok(await api.tables.start({ session: nadia.session, table: nadia.table, minutes: 30 })).deadline).toBeNull();

    // Omar can't see the table by its address, but the link shows him the invitation, and he joins.
    const omar = await (async () => {
      const { session } = ok(await api.auth.register({ username: "omar", password: "correct horse" }));
      expect(await api.tables.show({ session, table: nadia.table })).toEqual({ error: "NOT_FOUND" });
      expect(ok(await api.friends.invitation({ session, code: nadia.code }))).toEqual({
        invitation: { scenarioName: "The Job Offer", inviter: "nadia", recommendedTimeLimit: 30, openSeats: [{ role: manon, name: "Manon" }] },
      });
      expect(ok(await api.friends.join({ session, code: nadia.code, role: manon }))).toEqual({ table: nadia.table });
      return { session, show: async () => ok(await api.tables.show({ session, table: nadia.table })) };
    })();
    expect((await omar.show()).table).toMatchObject({ roleName: "Manon", status: "PREPARING", openSeats: [] });
    expect((await omar.show()).table.seats.map(({ player }) => player)).toEqual(["omar", "nadia"]);

    // Omar sees Nadia's suggestion, but would rather have 45 minutes, which replaces hers.
    expect((await omar.show()).start).toMatchObject([{ proposer: hiro, minutes: 30, agreed: [] }]);
    const { proposal } = ok(await api.tables.start({ session: omar.session, table: nadia.table, minutes: 45 }));
    expect((await nadia.show()).start).toEqual([{ proposal, proposer: manon, minutes: 45, agreed: [] }]);
    expect(await api.tables.agree({ session: omar.session, table: nadia.table, proposal })).toMatchObject({
      error: "NOT_PENDING_FOR_YOU",
    });

    // Nadia agrees, which starts the clock with 45 minutes.
    expect(ok(await api.tables.agree({ session: nadia.session, table: nadia.table, proposal }))).toEqual({
      status: "ACCEPTED",
      deadline: "2026-10-15T14:45:00.000Z",
    });
    expect((await omar.show()).table).toMatchObject({ status: "OPEN", timeLimit: 45, deadline: "2026-10-15T14:45:00.000Z" });
    expect((await omar.show()).start).toEqual([]);

    // They talk, and Omar accepts Nadia's offer of the whole pie.
    ok(await api.tables.send({ session: omar.session, table: nadia.table, body: "Welcome aboard, Hiro!" }));
    const { proposal: deal } = ok(await api.tables.propose({ session: nadia.session, table: nadia.table, terms: nadia.terms(WHOLE_PIE) }));
    expect((await omar.show()).table.proposals).toMatchObject([{ proposal: deal, proposer: hiro, status: "PENDING", points: 1100 }]);
    expect(ok(await api.tables.accept({ session: omar.session, table: nadia.table, proposal: deal }))).toEqual({ status: "ACCEPTED" });
    await application.whenIdle();

    // Nobody asked the counterpart anything: there is none at this table.
    const settled = await nadia.show();
    expect(settled.table.status).toBe("SETTLED");
    expect(settled.table.messages).toMatchObject([{ sender: manon, body: "Welcome aboard, Hiro!" }]);
    expect(settled.openQuestions).toBe(0);
    expect(settled.questions).toEqual([]);

    // Each of them sees the whole pie from their own side.
    for (const [session, role] of [
      [nadia.session, hiro],
      [omar.session, manon],
    ] as const) {
      const { role: theirs, debrief } = ok(await api.tables.debrief({ session, table: nadia.table }));
      expect(theirs).toBe(role);
      expect(debrief).toMatchObject({ outcome: "SETTLED", agreed: nadia.terms(WHOLE_PIE), bestJointPoints: 2200 });
      expect(debrief.roles.map(({ points }) => points)).toEqual([1100, 1100]);
    }
    // The table is in both their lists.
    expect(ok(await api.bakery({ session: omar.session })).tables).toMatchObject([
      { table: nadia.table, roleName: "Manon", status: "SETTLED" },
    ]);
  });

  test("a link lets in only as many people as the table has empty seats, and only before it begins", async () => {
    const { api, register, hostFriends } = await startWholePie();
    const nadia = await hostFriends("nadia", "Hiro");
    const { Manon: manon } = nadia.roles;
    const omar = await nadia.join("omar");
    expect(omar.role).toBe(manon);

    // Pia follows the same link, but the only other seat is taken.
    const { session: pia } = await register("pia");
    expect(await api.friends.invitation({ session: pia, code: nadia.code })).toEqual({ error: "TABLE_FULL" });
    expect(await api.friends.join({ session: pia, code: nadia.code, role: manon })).toEqual({ error: "ROLE_TAKEN" });
    expect(await api.tables.show({ session: pia, table: nadia.table })).toEqual({ error: "NOT_FOUND" });

    // Whoever is already at the table is sent to it, including Nadia following her own link, and can't sit down again.
    expect(ok(await api.friends.invitation({ session: nadia.session, code: nadia.code }))).toEqual({ table: nadia.table });
    expect(await api.friends.join({ session: omar.session, code: nadia.code, role: manon })).toEqual({ error: "ROLE_TAKEN" });
    expect(await api.friends.join({ session: nadia.session, code: nadia.code, role: manon })).toEqual({ error: "ROLE_TAKEN" });

    // A made-up code leads nowhere, and every request needs a session.
    expect(await api.friends.invitation({ session: pia, code: "not-a-real-code" })).toEqual({ error: "NOT_FOUND" });
    expect(await api.friends.join({ session: pia, code: "not-a-real-code", role: manon })).toEqual({ error: "NOT_FOUND" });
    expect(await api.friends.invitation({ session: "not-a-session" as Session, code: nadia.code })).toEqual({ error: "NOT_SIGNED_IN" });

    // Once the negotiation begins, nobody else can join.
    const { proposal } = ok(await api.tables.start({ session: nadia.session, table: nadia.table, minutes: 30 }));
    ok(await api.tables.agree({ session: omar.session, table: nadia.table, proposal }));
    expect(await api.friends.join({ session: pia, code: nadia.code, role: manon })).toEqual({ error: "ALREADY_BEGUN" });
    expect(await api.friends.invitation({ session: pia, code: nadia.code })).toEqual({ error: "TABLE_FULL" });
  });

  test("only someone seated can suggest or agree to a start, and only before it begins", async () => {
    const { api, register, hostFriends } = await startWholePie();
    const nadia = await hostFriends("nadia");
    const omar = await nadia.join("omar");
    const { session: pia } = await register("pia");
    const { proposal } = ok(await api.tables.start({ session: nadia.session, table: nadia.table, minutes: 30 }));

    expect(await api.tables.start({ session: pia, table: nadia.table, minutes: 30 })).toEqual({ error: "NOT_FOUND" });
    expect(await api.tables.agree({ session: pia, table: nadia.table, proposal })).toEqual({ error: "NOT_FOUND" });
    expect(await api.tables.start({ session: omar.session, table: nadia.table, minutes: 0 })).toEqual({ error: "INVALID_TIME_LIMIT" });
    // A suggestion from another table isn't one Omar can agree to here.
    const leo = await hostFriends("leo");
    const { proposal: leos } = ok(await api.tables.start({ session: leo.session, table: leo.table, minutes: 20 }));
    expect(await api.tables.agree({ session: omar.session, table: nadia.table, proposal: leos })).toEqual({ error: "NOT_FOUND" });
    expect((await nadia.show()).start).toMatchObject([{ proposal, minutes: 30, agreed: [] }]);

    ok(await api.tables.agree({ session: omar.session, table: nadia.table, proposal }));
    expect(await api.tables.start({ session: omar.session, table: nadia.table, minutes: 60 })).toEqual({ error: "ALREADY_AGREED" });
    expect(await api.tables.agree({ session: omar.session, table: nadia.table, proposal })).toEqual({ error: "NOT_PENDING_FOR_YOU" });
    expect((await nadia.show()).table).toMatchObject({ status: "OPEN", timeLimit: 30 });
  });

  test("a friends table needs a role of a published scenario", async () => {
    const { api, application, register } = await startWholePie();
    const { session } = await register("nadia");
    const { Briefing, Registering } = application.concepts;
    const author = ok(await Registering.register({ username: "author" })).user;
    const draft = ok(await Briefing.create({ author, name: "A draft" })).scenario;
    const drafted = ok(await Briefing.addRole({ scenario: draft, name: "Buyer", batna: 0 })).role;
    expect(await api.friends.start({ session, scenario: draft, role: drafted })).toEqual({ error: "NOT_FOUND" });
    expect(ok(await api.bakery({ session })).tables).toEqual([]);
  });
});
