import { describe, expect, test } from "bun:test";
import {
  AlreadyBegun,
  AlreadySeated,
  InvalidTimeLimit,
  NoSuchSeat,
  NotAllSeated,
  NotDue,
  NotEnoughSeats,
  NotOpen,
  NotSeated,
  RoleTaken,
  SeatExists,
  type Table,
  TableFull,
  TablingConcept,
  TimeUp,
  UnknownTable,
} from "../../src/concepts/Tabling/Tabling.ts";
import { testDatabase } from "../support/reusable/mongo.ts";
import { expectOneWinner } from "../support/reusable/race.ts";

type Tabling = TablingConcept<string, string, string>;

async function setup() {
  return { tabling: new TablingConcept<string, string, string>(await testDatabase()) };
}

/** A time on the day of the principle's negotiations. */
const at = (time: string) => new Date(`2026-10-15T${time}:00.000Z`);

/** A table for The Job Offer with a seat each for Hiro and Manon, both taken. */
async function seatedTable(tabling: Tabling) {
  const { table } = await tabling.open({ scenario: "job-offer" });
  await tabling.addSeat({ table, role: "Hiro" });
  await tabling.addSeat({ table, role: "Manon" });
  await tabling.seat({ table, negotiator: "nadia", role: "Hiro" });
  await tabling.seat({ table, negotiator: "omar", role: "Manon" });
  return table;
}

async function expectRefusal(attempt: Promise<unknown>, refusal: new (message?: string) => Error, message: string) {
  await expect(attempt).rejects.toThrow(refusal);
  await expect(attempt).rejects.toThrow(message);
}

describe("Tabling", () => {
  test("its principle: Nadia's table starts once every seat is taken, runs as long as chosen, and ends once", async () => {
    const { tabling } = await setup();
    expect(await tabling.recommendTimeLimit({ scenario: "job-offer", timeLimit: 30 })).toEqual({});
    expect(await tabling._recommendedTimeLimit({ scenario: "job-offer" })).toEqual([{ timeLimit: 30 }]);

    const { table } = await tabling.open({ scenario: "job-offer" });
    await tabling.addSeat({ table, role: "Hiro" });
    await tabling.addSeat({ table, role: "Manon" });
    expect(await tabling.seat({ table, negotiator: "nadia", role: "Hiro" })).toEqual({ table, role: "Hiro" });
    await expectRefusal(
      tabling.seat({ table, negotiator: "lee", role: "Hiro" }),
      RoleTaken,
      "Someone already has that role at this table.",
    );
    await expectRefusal(
      tabling.begin({ table, timeLimit: 30, now: at("13:55") }),
      NotAllSeated,
      "Not every role has a negotiator yet.",
    );

    // Omar sits down without choosing a role, so he gets the only empty seat; after that, the table is full.
    expect(await tabling.seat({ table, negotiator: "omar" })).toEqual({ table, role: "Manon" });
    await expectRefusal(tabling.seat({ table, negotiator: "pia" }), TableFull, "Every seat at this table is taken.");
    expect(await tabling._seats({ table })).toEqual([
      { role: "Hiro", negotiator: "nadia" },
      { role: "Manon", negotiator: "omar" },
    ]);

    // The clock doesn't run while they read their briefs: the table has no time limit or deadline yet.
    expect(await tabling._table({ table })).toEqual([
      { scenario: "job-offer", status: "PREPARING" },
    ]);
    expect(await tabling.begin({ table, timeLimit: 30, now: at("14:00") })).toEqual({ table, deadline: at("14:30") });
    expect(await tabling.settle({ table, now: at("14:20") })).toEqual({ table });
    expect(await tabling._table({ table })).toEqual([
      { scenario: "job-offer", status: "SETTLED", timeLimit: 30, deadline: at("14:30") },
    ]);

    // Friends at another table who want more time begin with 45 minutes, and nobody agrees in time.
    const late = await seatedTable(tabling);
    expect(await tabling.begin({ table: late, timeLimit: 45, now: at("14:01") })).toEqual({ table: late, deadline: at("14:46") });
    await expectRefusal(tabling.settle({ table: late, now: at("14:46") }), TimeUp, "Time is up for this negotiation.");
    expect(await tabling.expire({ table: late, now: at("14:46") })).toEqual({ table: late });
    expect((await tabling._table({ table: late }))[0]).toMatchObject({ status: "EXPIRED", timeLimit: 45 });

    // At a third, Nadia walks away.
    const third = await seatedTable(tabling);
    await tabling.begin({ table: third, timeLimit: 30, now: at("15:00") });
    expect(await tabling.withdraw({ table: third, negotiator: "nadia", now: at("15:10") })).toEqual({ table: third });
    expect((await tabling._table({ table: third }))[0]).toMatchObject({ status: "WITHDRAWN", withdrawnBy: "nadia" });

    // At a fourth, the person Nadia waited for never sits down, so she leaves before it begins.
    const { table: fourth } = await tabling.open({ scenario: "job-offer" });
    await tabling.addSeat({ table: fourth, role: "Hiro" });
    await tabling.addSeat({ table: fourth, role: "Manon" });
    await tabling.seat({ table: fourth, negotiator: "nadia", role: "Hiro" });
    expect(await tabling.withdraw({ table: fourth, negotiator: "nadia", now: at("16:00") })).toEqual({ table: fourth });
    expect(await tabling._table({ table: fourth })).toEqual([
      { scenario: "job-offer", status: "WITHDRAWN", withdrawnBy: "nadia" },
    ]);
    await expect(tabling.seat({ table: fourth, negotiator: "omar" })).rejects.toThrow(AlreadyBegun);
  });

  test("a time limit is a whole number of minutes from 1 to 180, chosen when the negotiation begins", async () => {
    const { tabling } = await setup();
    const table = await seatedTable(tabling);
    for (const timeLimit of [0, 181, 2.5]) {
      expect(await tabling._acceptableTimeLimit({ timeLimit })).toEqual({ acceptable: false });
      await expectRefusal(
        tabling.recommendTimeLimit({ scenario: "job-offer", timeLimit }),
        InvalidTimeLimit,
        "The time limit must be a whole number of minutes from 1 to 180.",
      );
      await expect(tabling.begin({ table, timeLimit, now: at("14:00") })).rejects.toThrow(InvalidTimeLimit);
    }
    // Refused attempts change nothing: no recommendation, and the table is still preparing.
    expect(await tabling._recommendedTimeLimit({ scenario: "job-offer" })).toEqual([]);
    expect(await tabling._table({ table })).toEqual([{ scenario: "job-offer", status: "PREPARING" }]);
    for (const timeLimit of [1, 30, 180]) expect(await tabling._acceptableTimeLimit({ timeLimit })).toEqual({ acceptable: true });

    // Recommending again replaces the recommendation.
    await tabling.recommendTimeLimit({ scenario: "job-offer", timeLimit: 30 });
    await tabling.recommendTimeLimit({ scenario: "job-offer", timeLimit: 40 });
    expect(await tabling._recommendedTimeLimit({ scenario: "job-offer" })).toEqual([{ timeLimit: 40 }]);
  });

  test("a seat exists for each role before anyone takes it, and nobody takes two seats at one table", async () => {
    const { tabling } = await setup();
    const { table } = await tabling.open({ scenario: "job-offer" });
    await tabling.addSeat({ table, role: "Hiro" });
    await expectRefusal(tabling.addSeat({ table, role: "Hiro" }), SeatExists, "This table already has a seat for that role.");
    await expectRefusal(
      tabling.seat({ table, negotiator: "nadia", role: "Recruiter" }),
      NoSuchSeat,
      "This table has no seat for that role.",
    );
    await tabling.addSeat({ table, role: "Manon" });
    await tabling.seat({ table, negotiator: "nadia", role: "Hiro" });
    await expectRefusal(
      tabling.seat({ table, negotiator: "nadia", role: "Manon" }),
      AlreadySeated,
      "You already have a seat at this table.",
    );
    await expect(tabling.seat({ table, negotiator: "nadia" })).rejects.toThrow(AlreadySeated);
    expect(await tabling._seats({ table })).toEqual([
      { role: "Hiro", negotiator: "nadia" },
      { role: "Manon" },
    ]);
    await expectRefusal(tabling.addSeat({ table: "nowhere" as Table, role: "Hiro" }), UnknownTable, "There is no such negotiation.");
    await expect(tabling.seat({ table: "nowhere" as Table, negotiator: "nadia" })).rejects.toThrow(UnknownTable);
  });

  test("someone who sits down without choosing a role gets one of the empty seats", async () => {
    const { tabling } = await setup();
    const { table } = await tabling.open({ scenario: "three-way" });
    for (const role of ["Buyer", "Seller", "Broker"]) await tabling.addSeat({ table, role });
    await tabling.seat({ table, negotiator: "nadia", role: "Broker" });

    const { role: omars } = await tabling.seat({ table, negotiator: "omar" });
    const { role: pias } = await tabling.seat({ table, negotiator: "pia" });
    expect([omars, pias].sort()).toEqual(["Buyer", "Seller"]);
    await expect(tabling.seat({ table, negotiator: "quinn" })).rejects.toThrow(TableFull);
    expect((await tabling._seats({ table })).every(({ negotiator }) => negotiator !== undefined)).toBe(true);
  });

  test("two people sitting down at once without choosing a role get different seats", async () => {
    const { tabling } = await setup();
    const { table } = await tabling.open({ scenario: "job-offer" });
    await tabling.addSeat({ table, role: "Hiro" });
    await tabling.addSeat({ table, role: "Manon" });
    const seated = await Promise.all([tabling.seat({ table, negotiator: "nadia" }), tabling.seat({ table, negotiator: "omar" })]);
    expect(seated.map(({ role }) => role).sort()).toEqual(["Hiro", "Manon"]);
  });

  test("a negotiation begins once it has at least two seats, all taken, and nobody can sit down after that", async () => {
    const { tabling } = await setup();
    const { table } = await tabling.open({ scenario: "job-offer" });
    await expectRefusal(
      tabling.begin({ table, timeLimit: 30, now: at("14:00") }),
      NotEnoughSeats,
      "A negotiation needs seats for at least two roles.",
    );
    await tabling.addSeat({ table, role: "Hiro" });
    await tabling.seat({ table, negotiator: "nadia", role: "Hiro" });
    await expect(tabling.begin({ table, timeLimit: 30, now: at("14:00") })).rejects.toThrow(NotEnoughSeats);

    const ready = await seatedTable(tabling);
    await tabling.begin({ table: ready, timeLimit: 30, now: at("14:00") });
    await expectRefusal(
      tabling.begin({ table: ready, timeLimit: 45, now: at("14:01") }),
      AlreadyBegun,
      "This negotiation has already started.",
    );
    expect((await tabling._table({ table: ready }))[0]).toMatchObject({ timeLimit: 30, deadline: at("14:30") });
    await expect(tabling.addSeat({ table: ready, role: "Recruiter" })).rejects.toThrow(AlreadyBegun);
    await expect(tabling.seat({ table: ready, negotiator: "lee", role: "Hiro" })).rejects.toThrow(AlreadyBegun);
    await expect(tabling.begin({ table: "nowhere" as Table, timeLimit: 30, now: at("14:00") })).rejects.toThrow(UnknownTable);
  });

  test("a negotiation ends only once, and only by walking away before it begins", async () => {
    const { tabling } = await setup();
    const table = await seatedTable(tabling);
    // Before it begins, it can't be settled or expire.
    await expectRefusal(tabling.settle({ table, now: at("14:00") }), NotOpen, "This negotiation isn't under way.");
    await expect(tabling.expire({ table, now: at("14:00") })).rejects.toThrow(NotOpen);

    await tabling.begin({ table, timeLimit: 30, now: at("14:00") });
    await expectRefusal(tabling.expire({ table, now: at("14:29") }), NotDue, "Time isn't up for this negotiation yet.");
    await expectRefusal(
      tabling.withdraw({ table, negotiator: "lee", now: at("14:10") }),
      NotSeated,
      "You don't have a seat at this table.",
    );
    await expectRefusal(tabling.withdraw({ table, negotiator: "nadia", now: at("14:30") }), TimeUp, "Time is up for this negotiation.");
    expect((await tabling._table({ table }))[0]?.status).toBe("OPEN");

    await tabling.settle({ table, now: at("14:10") });
    await expect(tabling.withdraw({ table, negotiator: "nadia", now: at("14:11") })).rejects.toThrow(NotOpen);
    await expect(tabling.expire({ table, now: at("14:40") })).rejects.toThrow(NotOpen);
    expect(await tabling._table({ table })).toEqual([{ scenario: "job-offer", status: "SETTLED", timeLimit: 30, deadline: at("14:30") }]);
    await expect(tabling.settle({ table: "nowhere" as Table, now: at("14:00") })).rejects.toThrow(UnknownTable);
    await expect(tabling.expire({ table: "nowhere" as Table, now: at("14:00") })).rejects.toThrow(UnknownTable);
    await expect(tabling.withdraw({ table: "nowhere" as Table, negotiator: "nadia", now: at("14:00") })).rejects.toThrow(UnknownTable);
  });

  test("_overdue lists the open tables whose time is up, the earliest deadline first", async () => {
    const { tabling } = await setup();
    const early = await seatedTable(tabling);
    const later = await seatedTable(tabling);
    const settled = await seatedTable(tabling);
    await seatedTable(tabling);
    await tabling.begin({ table: later, timeLimit: 30, now: at("14:00") });
    await tabling.begin({ table: early, timeLimit: 10, now: at("14:00") });
    await tabling.begin({ table: settled, timeLimit: 5, now: at("14:00") });
    await tabling.settle({ table: settled, now: at("14:01") });

    expect(await tabling._overdue({ now: at("14:09") })).toEqual([]);
    expect(await tabling._overdue({ now: at("14:10") })).toEqual([{ table: early }]);
    expect(await tabling._overdue({ now: at("15:00") })).toEqual([{ table: early }, { table: later }]);
    await tabling.expire({ table: early, now: at("15:00") });
    expect(await tabling._overdue({ now: at("15:00") })).toEqual([{ table: later }]);
  });

  test("_tablesOf lists a negotiator's tables, the most recently opened first", async () => {
    const { tabling } = await setup();
    const first = await seatedTable(tabling);
    const second = await seatedTable(tabling);
    expect(await tabling._tablesOf({ negotiator: "nadia" })).toEqual([
      { table: second, role: "Hiro", scenario: "job-offer", status: "PREPARING" },
      { table: first, role: "Hiro", scenario: "job-offer", status: "PREPARING" },
    ]);
    expect(await tabling._tablesOf({ negotiator: "lee" })).toEqual([]);
  });

  test("of two negotiators taking one seat at once, Tabling seats one and refuses the other with ROLE_TAKEN", async () => {
    const { tabling } = await setup();
    const { table } = await tabling.open({ scenario: "job-offer" });
    await tabling.addSeat({ table, role: "Hiro" });
    await expectOneWinner(
      [
        tabling.seat({ table, negotiator: "nadia", role: "Hiro" }),
        tabling.seat({ table, negotiator: "lee", role: "Hiro" }),
      ],
      RoleTaken,
    );
  });

  test("of a settlement and a walkout at once, Tabling accepts one and refuses the other with NOT_OPEN", async () => {
    const { tabling } = await setup();
    const table = await seatedTable(tabling);
    await tabling.begin({ table, timeLimit: 30, now: at("14:00") });
    await expectOneWinner(
      [tabling.settle({ table, now: at("14:20") }), tabling.withdraw({ table, negotiator: "nadia", now: at("14:20") })],
      NotOpen,
    );
  });
});
