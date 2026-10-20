import { describe, expect, test } from "bun:test";
import { startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

/** The whole pie of The Job Offer, worth 1,100 points to each side, where their BATNAs are 1,000 each. */
const WHOLE_PIE = { "Start date": 0, Salary: 120000, "Health Insurance": "Full Coverage", Bonus: 0, "Position title": "Director" };

/** Nadia hosts The Job Offer as Hiro, Omar joins as Manon, and they agree to start with 30 minutes. */
async function friendsAtTheTable() {
  const app = await startWholePie();
  const nadia = await app.hostFriends("nadia", "Hiro");
  const omar = await nadia.join("omar");
  const { proposal } = ok(await app.api.tables.start({ session: nadia.session, table: nadia.table, minutes: 30 }));
  ok(await app.api.tables.agree({ session: omar.session, table: nadia.table, proposal }));
  return { ...app, nadia, omar };
}

describe("ratings", () => {
  test("a deal between people counts for both: it created all the value a deal could, and each claimed half", async () => {
    const { api, application, nadia, omar } = await friendsAtTheTable();
    const { proposal } = ok(await api.tables.propose({ session: nadia.session, table: nadia.table, terms: nadia.terms(WHOLE_PIE) }));
    ok(await api.tables.accept({ session: omar.session, table: nadia.table, proposal }));
    await application.whenIdle();

    for (const session of [nadia.session, omar.session]) {
      expect(ok(await api.bakery({ session })).ratings).toEqual({ create: 1, claim: 0.5, negotiations: 1, stars: null, reviews: 0 });
    }
  });

  test("walking away, or running out of time, creates nothing and leaves nothing to claim", async () => {
    const walkout = await friendsAtTheTable();
    ok(await walkout.api.tables.withdraw({ session: walkout.omar.session, table: walkout.nadia.table }));
    await walkout.application.whenIdle();
    expect(ok(await walkout.api.bakery({ session: walkout.nadia.session })).ratings).toEqual({
      create: 0,
      claim: null,
      negotiations: 1,
      stars: null,
      reviews: 0,
    });

    const timeout = await friendsAtTheTable();
    timeout.advance(30);
    ok(await timeout.api.tables.expire({ session: timeout.omar.session, table: timeout.nadia.table }));
    await timeout.application.whenIdle();
    expect(ok(await timeout.api.bakery({ session: timeout.omar.session })).ratings).toMatchObject({ create: 0, negotiations: 1 });
  });

  test("practicing with the AI counterpart never changes anyone's ratings", async () => {
    const { api, application, practice } = await startWholePie();
    const nadia = await practice("nadia");
    ok(await api.tables.start({ session: nadia.session, table: nadia.table, minutes: 30 }));
    ok(await api.tables.withdraw({ session: nadia.session, table: nadia.table }));
    await application.whenIdle();
    expect(ok(await api.bakery({ session: nadia.session })).ratings).toEqual({
      create: null,
      claim: null,
      negotiations: 0,
      stars: null,
      reviews: 0,
    });
    // There is nobody to review at a practice table.
    expect(ok(await api.tables.debrief({ session: nadia.session, table: nadia.table })).reviews).toEqual([]);
    expect(await api.tables.review({ session: nadia.session, table: nadia.table, role: nadia.roles.Manon!, stars: 5 })).toEqual({
      error: "NOT_FOUND",
    });
  });

  test("after their negotiation, Nadia and Omar review each other once, and see each other's ratings at their next table", async () => {
    const { api, application, register, nadia, omar } = await friendsAtTheTable();
    const { Hiro: hiro, Manon: manon } = nadia.roles;

    // Reviews wait until the negotiation is over, so they can't be part of the negotiating.
    expect(await api.tables.review({ session: nadia.session, table: nadia.table, role: manon!, stars: 5 })).toEqual({ error: "NOT_OVER" });
    const { proposal } = ok(await api.tables.propose({ session: omar.session, table: nadia.table, terms: nadia.terms(WHOLE_PIE) }));
    ok(await api.tables.accept({ session: nadia.session, table: nadia.table, proposal }));
    await application.whenIdle();

    // Each sees the other as someone to review.
    expect(ok(await api.tables.debrief({ session: nadia.session, table: nadia.table })).reviews).toEqual([
      { role: manon, player: "omar", stars: null },
    ]);
    ok(await api.tables.review({ session: nadia.session, table: nadia.table, role: manon!, stars: 5 }));
    ok(await api.tables.review({ session: omar.session, table: nadia.table, role: hiro!, stars: 4 }));
    expect(ok(await api.tables.debrief({ session: nadia.session, table: nadia.table })).reviews).toEqual([
      { role: manon, player: "omar", stars: 5 },
    ]);

    // A second review of the same person, a review of yourself, or stars off the scale are refused.
    expect(await api.tables.review({ session: nadia.session, table: nadia.table, role: manon!, stars: 1 })).toEqual({
      error: "ALREADY_REVIEWED",
    });
    expect(await api.tables.review({ session: nadia.session, table: nadia.table, role: hiro!, stars: 5 })).toEqual({ error: "SELF_REVIEW" });
    expect(await api.tables.review({ session: omar.session, table: nadia.table, role: hiro!, stars: 6 })).toEqual({ error: "INVALID_STARS" });
    // Someone who wasn't at the table can't review anyone there.
    const { session: pia } = await register("pia");
    expect(await api.tables.review({ session: pia, table: nadia.table, role: hiro!, stars: 1 })).toEqual({ error: "NOT_FOUND" });

    expect(ok(await api.bakery({ session: omar.session })).ratings).toEqual({ create: 1, claim: 0.5, negotiations: 1, stars: 5, reviews: 1 });

    // At their next table, each sees the other's ratings beside their name.
    const leo = await (async () => {
      const { table } = ok(
        await api.friends.start({ session: omar.session, scenario: (await nadia.show()).table.scenario, role: hiro! }),
      );
      const { link } = ok(await api.tables.show({ session: omar.session, table }));
      ok(await api.friends.join({ session: nadia.session, code: link!, role: manon! }));
      return table;
    })();
    const seats = ok(await api.tables.show({ session: nadia.session, table: leo })).table.seats;
    expect(seats.find(({ player }) => player === "omar")?.ratings).toEqual({ create: 1, claim: 0.5, negotiations: 1, stars: 5, reviews: 1 });
  });

  test("a table someone left before it began isn't rated, and its empty seat has nobody to review", async () => {
    const { api, application, hostFriends } = await startWholePie();
    const nadia = await hostFriends("nadia", "Hiro");
    ok(await api.tables.withdraw({ session: nadia.session, table: nadia.table }));
    await application.whenIdle();
    expect(ok(await api.bakery({ session: nadia.session })).ratings).toMatchObject({ negotiations: 0 });
    expect(await api.tables.review({ session: nadia.session, table: nadia.table, role: nadia.roles.Manon!, stars: 5 })).toEqual({
      error: "NOT_FOUND",
    });
  });
});
