import { describe, expect, test } from "bun:test";
import {
  AlreadyMet,
  InvalidSize,
  Lapsed,
  MatchmakingConcept,
  NotMatched,
  NotWaiting,
  type Request,
} from "../../src/concepts/Matchmaking/Matchmaking.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

type Matchmaking = MatchmakingConcept<string, string, string>;

async function setup() {
  return { matchmaking: new MatchmakingConcept<string, string, string>(await testDatabase()) };
}

/** A time on the day of the principle, plus some seconds. */
const at = (time: string, seconds = 0) => new Date(new Date(`2026-10-15T${time}:00.000Z`).getTime() + seconds * 1000);

async function expectRefusal(attempt: Promise<unknown>, refusal: new (message?: string) => Error, message: string) {
  await expect(attempt).rejects.toThrow(refusal);
  await expect(attempt).rejects.toThrow(message);
}

/** Each request's status, by seeker, in the order given. */
async function statuses(matchmaking: Matchmaking, requests: Record<string, Request>) {
  const entries = await Promise.all(
    Object.entries(requests).map(async ([seeker, request]) => [seeker, (await matchmaking._request({ request }))[0]?.status]),
  );
  return Object.fromEntries(entries);
}

describe("Matchmaking", () => {
  test("its principle: Nadia waits until Omar looks too, and then both are matched and find their table", async () => {
    const { matchmaking } = await setup();
    const nadia = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, now: at("14:00") });
    const nadias = nadia.request;
    expect(nadia.grouped).toBe(false);
    expect(await matchmaking._request({ request: nadias })).toEqual([{ seeker: "nadia", pool: "job-offer", size: 2, status: "WAITING" }]);
    expect(await matchmaking._members({ request: nadias })).toEqual([]);

    // She checks in every few seconds while she waits.
    expect(await matchmaking.checkIn({ request: nadias, seeker: "nadia", now: at("14:00", 5) })).toEqual({});

    const omar = await matchmaking.seek({ seeker: "omar", pool: "job-offer", size: 2, now: at("14:00", 7) });
    const omars = omar.request;
    expect(omar.grouped).toBe(true);
    expect(await statuses(matchmaking, { nadia: nadias, omar: omars })).toEqual({ nadia: "MATCHED", omar: "MATCHED" });
    expect(await matchmaking._members({ request: omars })).toEqual([{ seeker: "nadia" }, { seeker: "omar" }]);
    expect(await matchmaking._members({ request: nadias })).toEqual([{ seeker: "nadia" }, { seeker: "omar" }]);

    // Once the match has a place to meet, each of them can find it.
    expect(await matchmaking._place({ request: nadias })).toEqual([]);
    expect(await matchmaking.meet({ request: omars, place: "table-1" })).toEqual({});
    expect(await matchmaking._place({ request: nadias })).toEqual([{ place: "table-1" }]);
    expect(await matchmaking._place({ request: omars })).toEqual([{ place: "table-1" }]);
    await expectRefusal(matchmaking.meet({ request: nadias, place: "table-2" }), AlreadyMet, "This match already has a place to meet.");
    expect(await matchmaking._place({ request: nadias })).toEqual([{ place: "table-1" }]);
  });

  test("a three-way negotiation waits until three people are looking", async () => {
    const { matchmaking } = await setup();
    const { request: first } = await matchmaking.seek({ seeker: "nadia", pool: "three-way", size: 3, now: at("14:00") });
    const { request: second } = await matchmaking.seek({ seeker: "omar", pool: "three-way", size: 3, now: at("14:00", 10) });
    expect(await statuses(matchmaking, { nadia: first, omar: second })).toEqual({ nadia: "WAITING", omar: "WAITING" });

    // Someone looking for a two-person negotiation is in another pool, and doesn't count.
    const { request: elsewhere } = await matchmaking.seek({ seeker: "leo", pool: "job-offer", size: 2, now: at("14:00", 15) });
    const { request: third } = await matchmaking.seek({ seeker: "pia", pool: "three-way", size: 3, now: at("14:00", 20) });
    expect(await statuses(matchmaking, { nadia: first, omar: second, pia: third, leo: elsewhere })).toEqual({
      nadia: "MATCHED",
      omar: "MATCHED",
      pia: "MATCHED",
      leo: "WAITING",
    });
    expect(await matchmaking._members({ request: third })).toEqual([{ seeker: "nadia" }, { seeker: "omar" }, { seeker: "pia" }]);
  });

  test("the people who waited longest are matched first, and nobody is matched twice", async () => {
    const { matchmaking } = await setup();
    const { request: nadias } = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, now: at("14:00") });
    const { request: omars } = await matchmaking.seek({ seeker: "omar", pool: "job-offer", size: 2, now: at("14:00", 1) });
    const { request: pias } = await matchmaking.seek({ seeker: "pia", pool: "job-offer", size: 2, now: at("14:00", 2) });
    const { request: quinns } = await matchmaking.seek({ seeker: "quinn", pool: "job-offer", size: 2, now: at("14:00", 3) });
    expect(await matchmaking._members({ request: omars })).toEqual([{ seeker: "nadia" }, { seeker: "omar" }]);
    expect(await matchmaking._members({ request: quinns })).toEqual([{ seeker: "pia" }, { seeker: "quinn" }]);
    expect(await statuses(matchmaking, { nadia: nadias, pia: pias })).toEqual({ nadia: "MATCHED", pia: "MATCHED" });
  });

  test("of people looking at the same moment, exactly one search forms their group", async () => {
    const { matchmaking } = await setup();
    const [nadia, omar] = await Promise.all([
      matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, now: at("14:00") }),
      matchmaking.seek({ seeker: "omar", pool: "job-offer", size: 2, now: at("14:00") }),
    ]);
    expect(await statuses(matchmaking, { nadia: nadia.request, omar: omar.request })).toEqual({ nadia: "MATCHED", omar: "MATCHED" });
    expect(await matchmaking._members({ request: nadia.request })).toHaveLength(2);
    // Exactly one of the two searches formed the group, so exactly one table will open for it.
    expect([nadia.grouped, omar.grouped].filter(Boolean)).toHaveLength(1);

    // Three people looking at once for a three-way negotiation end up in one group.
    const three = await Promise.all(
      ["pia", "quinn", "rae"].map((seeker) => matchmaking.seek({ seeker, pool: "three-way", size: 3, now: at("14:00") })),
    );
    expect(await matchmaking._members({ request: three[0]!.request })).toHaveLength(3);
    expect(three.filter(({ grouped }) => grouped)).toHaveLength(1);
  });

  test("someone who stops checking in stops counting, and has to look again", async () => {
    const { matchmaking } = await setup();
    const { request: pias } = await matchmaking.seek({ seeker: "pia", pool: "job-offer", size: 2, now: at("14:00") });
    await matchmaking.checkIn({ request: pias, seeker: "pia", now: at("14:00", 30) });
    expect(await matchmaking._lapsed({ request: pias, now: at("14:01", 30) })).toEqual({ lapsed: false });
    expect(await matchmaking._lapsed({ request: pias, now: at("14:01", 31) })).toEqual({ lapsed: true });

    // A minute after Pia last checked in, Quinn looks and waits rather than being matched with her.
    const { request: quinns } = await matchmaking.seek({ seeker: "quinn", pool: "job-offer", size: 2, now: at("14:01", 31) });
    expect(await statuses(matchmaking, { pia: pias, quinn: quinns })).toEqual({ pia: "WAITING", quinn: "WAITING" });

    // When Pia's laptop wakes up, checking in is refused and changes nothing, so she looks again and is matched with Quinn.
    await expectRefusal(
      matchmaking.checkIn({ request: pias, seeker: "pia", now: at("14:02") }),
      Lapsed,
      "You stopped checking in, so you're no longer waiting. Look again.",
    );
    expect(await matchmaking._lapsed({ request: pias, now: at("14:02") })).toEqual({ lapsed: true });
    const { request: again } = await matchmaking.seek({ seeker: "pia", pool: "job-offer", size: 2, now: at("14:02") });
    expect(await statuses(matchmaking, { lapsed: pias, again, quinn: quinns })).toEqual({ lapsed: "STOPPED", again: "MATCHED", quinn: "MATCHED" });
    expect(await matchmaking._lapsed({ request: again, now: at("15:00") })).toEqual({ lapsed: false });
  });

  test("looking again replaces the earlier search, so nobody waits twice or is matched with themselves", async () => {
    const { matchmaking } = await setup();
    const { request: first } = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, now: at("14:00") });
    const { request: second } = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, now: at("14:00", 5) });
    expect(await statuses(matchmaking, { first, second })).toEqual({ first: "STOPPED", second: "WAITING" });
    // Looking in another pool replaces it too: one search at a time.
    const { request: third } = await matchmaking.seek({ seeker: "nadia", pool: "three-way", size: 3, now: at("14:00", 10) });
    expect(await statuses(matchmaking, { second, third })).toEqual({ second: "STOPPED", third: "WAITING" });
  });

  test("Leo stops looking, so he is never matched, and stopping again is refused", async () => {
    const { matchmaking } = await setup();
    const { request: leos } = await matchmaking.seek({ seeker: "leo", pool: "job-offer", size: 2, now: at("14:00") });
    await expectRefusal(matchmaking.stop({ request: leos, seeker: "nadia" }), NotWaiting, "You aren't waiting for a match.");
    expect(await matchmaking.stop({ request: leos, seeker: "leo" })).toEqual({});
    await expect(matchmaking.stop({ request: leos, seeker: "leo" })).rejects.toThrow(NotWaiting);
    await expect(matchmaking.checkIn({ request: leos, seeker: "leo", now: at("14:00", 5) })).rejects.toThrow(NotWaiting);

    const { request: omars } = await matchmaking.seek({ seeker: "omar", pool: "job-offer", size: 2, now: at("14:00", 10) });
    expect(await statuses(matchmaking, { leo: leos, omar: omars })).toEqual({ leo: "STOPPED", omar: "WAITING" });
  });

  test("a matched request can't check in or stop, and only a matched one can meet", async () => {
    const { matchmaking } = await setup();
    const { request: nadias } = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, now: at("14:00") });
    await expectRefusal(matchmaking.meet({ request: nadias, place: "table-1" }), NotMatched, "This request hasn't been matched.");
    expect(await matchmaking._place({ request: nadias })).toEqual([]);
    await matchmaking.seek({ seeker: "omar", pool: "job-offer", size: 2, now: at("14:00", 1) });
    await expect(matchmaking.checkIn({ request: nadias, seeker: "nadia", now: at("14:00", 2) })).rejects.toThrow(NotWaiting);
    await expect(matchmaking.stop({ request: nadias, seeker: "nadia" })).rejects.toThrow(NotWaiting);
    expect((await matchmaking._request({ request: nadias }))[0]?.status).toBe("MATCHED");
    await expect(matchmaking.meet({ request: "unknown" as Request, place: "table-1" })).rejects.toThrow(NotMatched);
    expect(await matchmaking._request({ request: "unknown" as Request })).toEqual([]);
  });

  test("a group needs a whole number of people, at least two, and a refused search changes nothing", async () => {
    const { matchmaking } = await setup();
    const { request } = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, now: at("14:00") });
    for (const size of [1, 0, 2.5]) {
      await expectRefusal(
        matchmaking.seek({ seeker: "nadia", pool: "job-offer", size, now: at("14:00", 5) }),
        InvalidSize,
        "A group needs a whole number of people, at least two.",
      );
    }
    expect((await matchmaking._request({ request }))[0]?.status).toBe("WAITING");
  });
});
