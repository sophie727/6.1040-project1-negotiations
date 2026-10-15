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
  NoTimeLimit,
  RoleTaken,
  SeatExists,
  type Table,
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
async function seatedTable(tabling: Tabling, timeLimit = 30) {
  const { table } = await tabling.open({ scenario: "job-offer", timeLimit });
  await tabling.addSeat({ table, role: "Hiro" });
  await tabling.addSeat({ table, role: "Manon" });
  await tabling.seat({ table, negotiator: "nadia", role: "Hiro" });
  await tabling.seat({ table, negotiator: "bot:obstinate", role: "Manon" });
  return table;
}

async function expectRefusal(attempt: Promise<unknown>, refusal: new (message?: string) => Error, message: string) {
  await expect(attempt).rejects.toThrow(refusal);
  await expect(attempt).rejects.toThrow(message);
}

describe("Tabling", () => {
  test("its principle: Nadia's table starts only once Manon's seat is taken, and ends once, by agreement, time, or walking away", async () => {
    const { tabling } = await setup();
    expect(await tabling.recommendTimeLimit({ scenario: "job-offer", timeLimit: 30 })).toEqual({});

    // Nadia keeps the recommended limit; a friend who wants more time chooses 45 minutes.
    const { table } = await tabling.open({ scenario: "job-offer" });
    const { table: friends } = await tabling.open({ scenario: "job-offer", timeLimit: 45 });
    expect((await tabling._table({ table: friends }))[0]?.timeLimit).toBe(45);

    await tabling.addSeat({ table, role: "Hiro" });
    await tabling.addSeat({ table, role: "Manon" });
    expect(await tabling.seat({ table, negotiator: "nadia", role: "Hiro" })).toEqual({ table });
    await expectRefusal(
      tabling.seat({ table, negotiator: "lee", role: "Hiro" }),
      RoleTaken,
      "Someone already has that role at this table.",
    );
    await expectRefusal(tabling.begin({ table, now: at("13:55") }), NotAllSeated, "Not every role has a negotiator yet.");
    await tabling.seat({ table, negotiator: "bot:obstinate", role: "Manon" });
    expect(await tabling._seats({ table })).toEqual([
      { role: "Hiro", negotiator: "nadia" },
      { role: "Manon", negotiator: "bot:obstinate" },
    ]);

    expect(await tabling.begin({ table, now: at("14:00") })).toEqual({ table, deadline: at("14:30") });
    expect(await tabling.settle({ table, now: at("14:20") })).toEqual({ table });
    expect(await tabling._table({ table })).toEqual([
      { scenario: "job-offer", status: "SETTLED", timeLimit: 30, deadline: at("14:30"), withdrawnBy: undefined },
    ]);

    // At another table, nobody agrees in time.
    const late = await seatedTable(tabling);
    await tabling.begin({ table: late, now: at("14:01") });
    await expectRefusal(tabling.settle({ table: late, now: at("14:31") }), TimeUp, "Time is up for this negotiation.");
    expect(await tabling.expire({ table: late, now: at("14:31") })).toEqual({ table: late });
    expect((await tabling._table({ table: late }))[0]?.status).toBe("EXPIRED");

    // At a third, Nadia walks away.
    const third = await seatedTable(tabling);
    await tabling.begin({ table: third, now: at("15:00") });
    expect(await tabling.withdraw({ table: third, negotiator: "nadia", now: at("15:10") })).toEqual({ table: third });
    expect((await tabling._table({ table: third }))[0]).toMatchObject({ status: "WITHDRAWN", withdrawnBy: "nadia" });
  });

  test("a time limit is a whole number of minutes from 1 to 180, and a table needs one", async () => {
    const { tabling } = await setup();
    for (const timeLimit of [0, 181, 2.5]) {
      await expectRefusal(
        tabling.recommendTimeLimit({ scenario: "job-offer", timeLimit }),
        InvalidTimeLimit,
        "The time limit must be a whole number of minutes from 1 to 180.",
      );
      await expect(tabling.open({ scenario: "job-offer", timeLimit })).rejects.toThrow(InvalidTimeLimit);
    }
    await expectRefusal(
      tabling.open({ scenario: "job-offer" }),
      NoTimeLimit,
      "This scenario has no recommended time limit, so choose one.",
    );
    expect(await tabling._recommendedTimeLimit({ scenario: "job-offer" })).toEqual([]);
    await tabling.recommendTimeLimit({ scenario: "job-offer", timeLimit: 30 });
    await tabling.recommendTimeLimit({ scenario: "job-offer", timeLimit: 40 });
    expect(await tabling._recommendedTimeLimit({ scenario: "job-offer" })).toEqual([{ timeLimit: 40 }]);
    const { table } = await tabling.open({ scenario: "job-offer" });
    expect((await tabling._table({ table }))[0]).toMatchObject({ status: "PREPARING", timeLimit: 40, deadline: undefined });
  });

  test("a seat exists for each role before anyone takes it, and nobody takes two seats at one table", async () => {
    const { tabling } = await setup();
    const { table } = await tabling.open({ scenario: "job-offer", timeLimit: 30 });
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
    expect(await tabling._seats({ table })).toEqual([
      { role: "Hiro", negotiator: "nadia" },
      { role: "Manon", negotiator: undefined },
    ]);
    await expectRefusal(tabling.addSeat({ table: "nowhere" as Table, role: "Hiro" }), UnknownTable, "There is no such negotiation.");
  });

  test("a negotiation begins once it has at least two seats, all taken, and nobody can sit down after that", async () => {
    const { tabling } = await setup();
    const { table } = await tabling.open({ scenario: "job-offer", timeLimit: 30 });
    await expectRefusal(tabling.begin({ table, now: at("14:00") }), NotEnoughSeats, "A negotiation needs seats for at least two roles.");
    await tabling.addSeat({ table, role: "Hiro" });
    await tabling.seat({ table, negotiator: "nadia", role: "Hiro" });
    await expect(tabling.begin({ table, now: at("14:00") })).rejects.toThrow(NotEnoughSeats);

    const ready = await seatedTable(tabling);
    await tabling.begin({ table: ready, now: at("14:00") });
    await expectRefusal(tabling.begin({ table: ready, now: at("14:01") }), AlreadyBegun, "This negotiation has already started.");
    await expect(tabling.addSeat({ table: ready, role: "Recruiter" })).rejects.toThrow(AlreadyBegun);
    await expect(tabling.seat({ table: ready, negotiator: "lee", role: "Hiro" })).rejects.toThrow(AlreadyBegun);
    await expect(tabling.begin({ table: "nowhere" as Table, now: at("14:00") })).rejects.toThrow(UnknownTable);
  });

  test("a negotiation ends only while it is under way, and only once", async () => {
    const { tabling } = await setup();
    const table = await seatedTable(tabling);
    // Before it begins, nothing can end it.
    await expectRefusal(tabling.settle({ table, now: at("14:00") }), NotOpen, "This negotiation isn't under way.");
    await expect(tabling.expire({ table, now: at("14:00") })).rejects.toThrow(NotOpen);
    await expect(tabling.withdraw({ table, negotiator: "nadia", now: at("14:00") })).rejects.toThrow(NotOpen);

    await tabling.begin({ table, now: at("14:00") });
    await expectRefusal(tabling.expire({ table, now: at("14:29") }), NotDue, "Time isn't up for this negotiation yet.");
    await expectRefusal(
      tabling.withdraw({ table, negotiator: "lee", now: at("14:10") }),
      NotSeated,
      "You don't have a seat at this table.",
    );
    await expectRefusal(tabling.withdraw({ table, negotiator: "nadia", now: at("14:30") }), TimeUp, "Time is up for this negotiation.");

    await tabling.settle({ table, now: at("14:10") });
    await expect(tabling.withdraw({ table, negotiator: "nadia", now: at("14:11") })).rejects.toThrow(NotOpen);
    await expect(tabling.expire({ table, now: at("14:40") })).rejects.toThrow(NotOpen);
    await expect(tabling.settle({ table: "nowhere" as Table, now: at("14:00") })).rejects.toThrow(UnknownTable);
    await expect(tabling.expire({ table: "nowhere" as Table, now: at("14:00") })).rejects.toThrow(UnknownTable);
    await expect(tabling.withdraw({ table: "nowhere" as Table, negotiator: "nadia", now: at("14:00") })).rejects.toThrow(UnknownTable);
  });

  test("_tablesOf lists a negotiator's tables, the most recently opened first", async () => {
    const { tabling } = await setup();
    const first = await seatedTable(tabling);
    const second = await seatedTable(tabling, 45);
    expect(await tabling._tablesOf({ negotiator: "nadia" })).toEqual([
      { table: second, role: "Hiro", scenario: "job-offer", status: "PREPARING" },
      { table: first, role: "Hiro", scenario: "job-offer", status: "PREPARING" },
    ]);
    expect(await tabling._tablesOf({ negotiator: "lee" })).toEqual([]);
  });

  test("of two negotiators taking one seat at once, Tabling seats one and refuses the other with ROLE_TAKEN", async () => {
    const { tabling } = await setup();
    const { table } = await tabling.open({ scenario: "job-offer", timeLimit: 30 });
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
    await tabling.begin({ table, now: at("14:00") });
    await expectOneWinner(
      [tabling.settle({ table, now: at("14:20") }), tabling.withdraw({ table, negotiator: "nadia", now: at("14:20") })],
      NotOpen,
    );
  });
});
