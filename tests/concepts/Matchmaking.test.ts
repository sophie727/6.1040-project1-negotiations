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
    const nadia = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, open: false, now: at("14:00") });
    const nadias = nadia.request;
    expect(nadia.grouped).toBe(false);
    expect(await matchmaking._request({ request: nadias })).toEqual([
      { seeker: "nadia", pool: "job-offer", size: 2, open: false, status: "WAITING" },
    ]);
    expect(await matchmaking._members({ request: nadias })).toEqual([]);

    // She checks in every few seconds while she waits.
    expect(await matchmaking.checkIn({ request: nadias, seeker: "nadia", now: at("14:00", 5) })).toEqual({});

    const omar = await matchmaking.seek({ seeker: "omar", pool: "job-offer", size: 2, open: false, now: at("14:00", 7) });
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

  test("its principle, with open minds: Tess joins Uma's pool, and Ravi and Sam agree on what Ravi suggested", async () => {
    const { matchmaking } = await setup();
    const uma = await matchmaking.seek({ seeker: "uma", pool: "lease", size: 2, open: false, now: at("14:00") });
    expect(uma.grouped).toBe(false);
    expect(await matchmaking._agreed({ request: uma.request })).toEqual([]);

    // Tess suggests The Job Offer, but goes along with The Lease, which Uma is waiting for.
    const tess = await matchmaking.seek({ seeker: "tess", pool: "job-offer", size: 2, open: true, now: at("14:00", 5) });
    expect(tess.grouped).toBe(true);
    expect(await matchmaking._request({ request: tess.request })).toEqual([
      { seeker: "tess", pool: "job-offer", size: 2, open: true, status: "MATCHED" },
    ]);
    expect(await matchmaking._members({ request: tess.request })).toEqual([{ seeker: "uma" }, { seeker: "tess" }]);
    expect(await matchmaking._agreed({ request: tess.request })).toEqual([{ pool: "lease" }]);
    expect(await matchmaking._agreed({ request: uma.request })).toEqual([{ pool: "lease" }]);

    // When everyone in a group is open, it agrees on what the one who looked first suggested.
    const ravi = await matchmaking.seek({ seeker: "ravi", pool: "lease", size: 2, open: true, now: at("14:01") });
    const sam = await matchmaking.seek({ seeker: "sam", pool: "job-offer", size: 2, open: true, now: at("14:01", 5) });
    expect([ravi.grouped, sam.grouped]).toEqual([false, true]);
    expect(await matchmaking._agreed({ request: sam.request })).toEqual([{ pool: "lease" }]);
  });

  test("someone open joins whoever has waited longest for a group their size, in the pool that person picked", async () => {
    const { matchmaking } = await setup();
    const { request: nadias } = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, open: false, now: at("14:00") });
    const { request: omars } = await matchmaking.seek({ seeker: "omar", pool: "lease", size: 2, open: false, now: at("14:00", 1) });
    // Nadia and Omar picked different pools, so they both wait.
    expect(await statuses(matchmaking, { nadia: nadias, omar: omars })).toEqual({ nadia: "WAITING", omar: "WAITING" });

    // Someone open to groups of three doesn't join either of them.
    const { request: pias } = await matchmaking.seek({ seeker: "pia", pool: "three-way", size: 3, open: true, now: at("14:00", 2) });
    expect(await statuses(matchmaking, { nadia: nadias, omar: omars, pia: pias })).toEqual({
      nadia: "WAITING",
      omar: "WAITING",
      pia: "WAITING",
    });

    // Tess is open to groups of two, so Tess joins Nadia, who waited longest, in Nadia's pool.
    const { request: tesss } = await matchmaking.seek({ seeker: "tess", pool: "lease", size: 2, open: true, now: at("14:00", 3) });
    expect(await matchmaking._members({ request: tesss })).toEqual([{ seeker: "nadia" }, { seeker: "tess" }]);
    expect(await matchmaking._agreed({ request: tesss })).toEqual([{ pool: "job-offer" }]);
    expect(await statuses(matchmaking, { omar: omars, pia: pias })).toEqual({ omar: "WAITING", pia: "WAITING" });

    // Quinn and then Rae pick the three-way negotiation, and Pia goes along with it, so the three of them make a group.
    const { request: quinns } = await matchmaking.seek({ seeker: "quinn", pool: "three-way", size: 3, open: false, now: at("14:00", 4) });
    expect(await matchmaking._agreed({ request: quinns })).toEqual([]);
    const { request: raes } = await matchmaking.seek({ seeker: "rae", pool: "three-way", size: 3, open: false, now: at("14:00", 5) });
    expect(await matchmaking._members({ request: raes })).toEqual([{ seeker: "pia" }, { seeker: "quinn" }, { seeker: "rae" }]);
    expect(await matchmaking._agreed({ request: raes })).toEqual([{ pool: "three-way" }]);
  });

  test("someone open finds a group whenever there is one, and of several, the one whose members waited longest", async () => {
    const { matchmaking } = await setup();
    // In groups of three: Uma alone wants The Lease, and Omar and Pia both want the panel, so all three wait.
    const { request: umas } = await matchmaking.seek({ seeker: "uma", pool: "lease", size: 3, open: false, now: at("14:00") });
    const { request: omars } = await matchmaking.seek({ seeker: "omar", pool: "panel", size: 3, open: false, now: at("14:00", 1) });
    const { request: pias } = await matchmaking.seek({ seeker: "pia", pool: "panel", size: 3, open: false, now: at("14:00", 2) });
    expect(await statuses(matchmaking, { uma: umas, omar: omars, pia: pias })).toEqual({ uma: "WAITING", omar: "WAITING", pia: "WAITING" });

    // Tess can't make a group with Uma, the first to look, but can with Omar and Pia, so Tess joins them.
    const tess = await matchmaking.seek({ seeker: "tess", pool: "lease", size: 3, open: true, now: at("14:00", 3) });
    expect(tess.grouped).toBe(true);
    expect(await matchmaking._members({ request: tess.request })).toEqual([{ seeker: "omar" }, { seeker: "pia" }, { seeker: "tess" }]);
    expect(await matchmaking._agreed({ request: tess.request })).toEqual([{ pool: "panel" }]);
    expect((await matchmaking._request({ request: umas }))[0]?.status).toBe("WAITING");

    // Ravi is open too, but Ravi and Uma are only two, so they wait, and so does Vic, who wants the debate.
    await matchmaking.seek({ seeker: "ravi", pool: "panel", size: 3, open: true, now: at("14:00", 4) });
    expect((await matchmaking._request({ request: umas }))[0]?.status).toBe("WAITING");
    await matchmaking.seek({ seeker: "vic", pool: "debate", size: 3, open: false, now: at("14:00", 5) });
    // Sam could join Uma and Ravi in The Lease, or Ravi and Vic in the debate. Uma waited longest, so it's The Lease.
    const sam = await matchmaking.seek({ seeker: "sam", pool: "debate", size: 3, open: true, now: at("14:00", 6) });
    expect(await matchmaking._members({ request: sam.request })).toEqual([{ seeker: "uma" }, { seeker: "ravi" }, { seeker: "sam" }]);
    expect(await matchmaking._agreed({ request: sam.request })).toEqual([{ pool: "lease" }]);
  });

  test("a three-way negotiation waits until three people are looking", async () => {
    const { matchmaking } = await setup();
    const { request: first } = await matchmaking.seek({ seeker: "nadia", pool: "three-way", size: 3, open: false, now: at("14:00") });
    const { request: second } = await matchmaking.seek({ seeker: "omar", pool: "three-way", size: 3, open: false, now: at("14:00", 10) });
    expect(await statuses(matchmaking, { nadia: first, omar: second })).toEqual({ nadia: "WAITING", omar: "WAITING" });

    // Someone looking for a two-person negotiation is in another pool, and doesn't count.
    const { request: elsewhere } = await matchmaking.seek({ seeker: "leo", pool: "job-offer", size: 2, open: false, now: at("14:00", 15) });
    const { request: third } = await matchmaking.seek({ seeker: "pia", pool: "three-way", size: 3, open: false, now: at("14:00", 20) });
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
    const { request: nadias } = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, open: false, now: at("14:00") });
    const { request: omars } = await matchmaking.seek({ seeker: "omar", pool: "job-offer", size: 2, open: false, now: at("14:00", 1) });
    const { request: pias } = await matchmaking.seek({ seeker: "pia", pool: "job-offer", size: 2, open: false, now: at("14:00", 2) });
    const { request: quinns } = await matchmaking.seek({ seeker: "quinn", pool: "job-offer", size: 2, open: false, now: at("14:00", 3) });
    expect(await matchmaking._members({ request: omars })).toEqual([{ seeker: "nadia" }, { seeker: "omar" }]);
    expect(await matchmaking._members({ request: quinns })).toEqual([{ seeker: "pia" }, { seeker: "quinn" }]);
    expect(await statuses(matchmaking, { nadia: nadias, pia: pias })).toEqual({ nadia: "MATCHED", pia: "MATCHED" });
  });

  test("of people looking at the same moment, exactly one search forms their group", async () => {
    const { matchmaking } = await setup();
    const [nadia, omar] = await Promise.all([
      matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, open: false, now: at("14:00") }),
      matchmaking.seek({ seeker: "omar", pool: "job-offer", size: 2, open: false, now: at("14:00") }),
    ]);
    expect(await statuses(matchmaking, { nadia: nadia.request, omar: omar.request })).toEqual({ nadia: "MATCHED", omar: "MATCHED" });
    expect(await matchmaking._members({ request: nadia.request })).toHaveLength(2);
    // Exactly one of the two searches formed the group, so exactly one table will open for it.
    expect([nadia.grouped, omar.grouped].filter(Boolean)).toHaveLength(1);

    // Three people looking at once for a three-way negotiation end up in one group.
    const three = await Promise.all(
      ["pia", "quinn", "rae"].map((seeker) => matchmaking.seek({ seeker, pool: "three-way", size: 3, open: false, now: at("14:00") })),
    );
    expect(await matchmaking._members({ request: three[0]!.request })).toHaveLength(3);
    expect(three.filter(({ grouped }) => grouped)).toHaveLength(1);
  });

  test("of someone open and someone who picked a pool looking at the same moment, exactly one search forms their group", async () => {
    const { matchmaking } = await setup();
    const [nadia, tess] = await Promise.all([
      matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, open: false, now: at("14:00") }),
      matchmaking.seek({ seeker: "tess", pool: "lease", size: 2, open: true, now: at("14:00") }),
    ]);
    expect(await statuses(matchmaking, { nadia: nadia.request, tess: tess.request })).toEqual({ nadia: "MATCHED", tess: "MATCHED" });
    expect([nadia.grouped, tess.grouped].filter(Boolean)).toHaveLength(1);
    expect(await matchmaking._agreed({ request: tess.request })).toEqual([{ pool: "job-offer" }]);
  });

  test("someone who stops checking in stops counting, and has to look again", async () => {
    const { matchmaking } = await setup();
    const { request: pias } = await matchmaking.seek({ seeker: "pia", pool: "job-offer", size: 2, open: false, now: at("14:00") });
    await matchmaking.checkIn({ request: pias, seeker: "pia", now: at("14:00", 30) });
    expect(await matchmaking._lapsed({ request: pias, now: at("14:01", 30) })).toEqual({ lapsed: false });
    expect(await matchmaking._lapsed({ request: pias, now: at("14:01", 31) })).toEqual({ lapsed: true });

    // A minute after Pia last checked in, Quinn looks and waits rather than being matched with her.
    const { request: quinns } = await matchmaking.seek({ seeker: "quinn", pool: "job-offer", size: 2, open: false, now: at("14:01", 31) });
    expect(await statuses(matchmaking, { pia: pias, quinn: quinns })).toEqual({ pia: "WAITING", quinn: "WAITING" });

    // When Pia's laptop wakes up, checking in is refused and changes nothing, so she looks again and is matched with Quinn.
    await expectRefusal(
      matchmaking.checkIn({ request: pias, seeker: "pia", now: at("14:02") }),
      Lapsed,
      "You stopped checking in, so you're no longer waiting. Look again.",
    );
    expect(await matchmaking._lapsed({ request: pias, now: at("14:02") })).toEqual({ lapsed: true });
    const { request: again } = await matchmaking.seek({ seeker: "pia", pool: "job-offer", size: 2, open: false, now: at("14:02") });
    expect(await statuses(matchmaking, { lapsed: pias, again, quinn: quinns })).toEqual({ lapsed: "STOPPED", again: "MATCHED", quinn: "MATCHED" });
    expect(await matchmaking._lapsed({ request: again, now: at("15:00") })).toEqual({ lapsed: false });
  });

  test("looking again replaces the earlier search, so nobody waits twice or is matched with themselves", async () => {
    const { matchmaking } = await setup();
    const { request: first } = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, open: false, now: at("14:00") });
    const { request: second } = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, open: false, now: at("14:00", 5) });
    expect(await statuses(matchmaking, { first, second })).toEqual({ first: "STOPPED", second: "WAITING" });
    // Looking in another pool replaces it too: one search at a time.
    const { request: third } = await matchmaking.seek({ seeker: "nadia", pool: "three-way", size: 3, open: false, now: at("14:00", 10) });
    expect(await statuses(matchmaking, { second, third })).toEqual({ second: "STOPPED", third: "WAITING" });
  });

  test("Leo stops looking, so he is never matched, and stopping again is refused", async () => {
    const { matchmaking } = await setup();
    const { request: leos } = await matchmaking.seek({ seeker: "leo", pool: "job-offer", size: 2, open: false, now: at("14:00") });
    await expectRefusal(matchmaking.stop({ request: leos, seeker: "nadia" }), NotWaiting, "You aren't waiting for a match.");
    expect(await matchmaking.stop({ request: leos, seeker: "leo" })).toEqual({});
    await expect(matchmaking.stop({ request: leos, seeker: "leo" })).rejects.toThrow(NotWaiting);
    await expect(matchmaking.checkIn({ request: leos, seeker: "leo", now: at("14:00", 5) })).rejects.toThrow(NotWaiting);

    const { request: omars } = await matchmaking.seek({ seeker: "omar", pool: "job-offer", size: 2, open: false, now: at("14:00", 10) });
    expect(await statuses(matchmaking, { leo: leos, omar: omars })).toEqual({ leo: "STOPPED", omar: "WAITING" });
  });

  test("a matched request can't check in or stop, and only a matched one can meet", async () => {
    const { matchmaking } = await setup();
    const { request: nadias } = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, open: false, now: at("14:00") });
    await expectRefusal(matchmaking.meet({ request: nadias, place: "table-1" }), NotMatched, "This request hasn't been matched.");
    expect(await matchmaking._place({ request: nadias })).toEqual([]);
    await matchmaking.seek({ seeker: "omar", pool: "job-offer", size: 2, open: false, now: at("14:00", 1) });
    await expect(matchmaking.checkIn({ request: nadias, seeker: "nadia", now: at("14:00", 2) })).rejects.toThrow(NotWaiting);
    await expect(matchmaking.stop({ request: nadias, seeker: "nadia" })).rejects.toThrow(NotWaiting);
    expect((await matchmaking._request({ request: nadias }))[0]?.status).toBe("MATCHED");
    await expect(matchmaking.meet({ request: "unknown" as Request, place: "table-1" })).rejects.toThrow(NotMatched);
    expect(await matchmaking._request({ request: "unknown" as Request })).toEqual([]);
  });

  test("a group needs a whole number of people, at least two, and a refused search changes nothing", async () => {
    const { matchmaking } = await setup();
    const { request } = await matchmaking.seek({ seeker: "nadia", pool: "job-offer", size: 2, open: false, now: at("14:00") });
    for (const size of [1, 0, 2.5]) {
      await expectRefusal(
        matchmaking.seek({ seeker: "nadia", pool: "job-offer", size, open: false, now: at("14:00", 5) }),
        InvalidSize,
        "A group needs a whole number of people, at least two.",
      );
    }
    expect((await matchmaking._request({ request }))[0]?.status).toBe("WAITING");
  });
});
