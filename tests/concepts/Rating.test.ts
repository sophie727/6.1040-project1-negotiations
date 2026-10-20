import { describe, expect, test } from "bun:test";
import { AlreadyRecorded, RatingConcept } from "../../src/concepts/Rating/Rating.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

async function setup() {
  return { rating: new RatingConcept<string, string>(await testDatabase()) };
}

const at = (time: string) => new Date(`2026-10-15T${time}:00.000Z`);

describe("Rating", () => {
  test("its principle: Nadia's ratings average how much value her deals created and how much she claimed", async () => {
    const { rating } = await setup();
    expect(await rating._ratings({ person: "nadia" })).toEqual({ negotiations: 0 });

    // The best deal possible: 2,200 points together, where walking away was worth 2,000; she gets 1,100 to her BATNA's 1,000.
    await rating.record({ person: "nadia", subject: "first", points: 1100, batna: 1000, jointPoints: 2200, jointBatna: 2000, bestJointPoints: 2200, now: at("14:30") });
    expect(await rating._ratings({ person: "nadia" })).toEqual({ create: 1, claim: 0.5, negotiations: 1 });

    // A deal that adds 120 of a possible 200 points, 84 of them to her.
    await rating.record({ person: "nadia", subject: "second", points: 1084, batna: 1000, jointPoints: 2120, jointBatna: 2000, bestJointPoints: 2200, now: at("15:30") });
    const second = await rating._ratings({ person: "nadia" });
    expect(second.create).toBeCloseTo(0.8);
    expect(second.claim).toBeCloseTo(0.6);
    expect(second.negotiations).toBe(2);

    // Time runs out: no deal creates nothing and leaves nothing to claim.
    await rating.record({ person: "nadia", subject: "third", points: 1000, batna: 1000, jointPoints: 2000, jointBatna: 2000, bestJointPoints: 2200, now: at("16:30") });
    const third = await rating._ratings({ person: "nadia" });
    expect(third.create).toBeCloseTo(1.6 / 3);
    expect(third.claim).toBeCloseTo(0.6);
    expect(third.negotiations).toBe(3);

    expect(await rating._results({ person: "nadia" })).toEqual([
      { subject: "first", create: 1, claim: 0.5, recordedAt: at("14:30") },
      { subject: "second", create: expect.closeTo(0.6), claim: expect.closeTo(0.7), recordedAt: at("15:30") },
      { subject: "third", create: 0, recordedAt: at("16:30") },
    ]);
  });

  test("a negotiation counts once for each person, and recording it again changes nothing", async () => {
    const { rating } = await setup();
    const result = { subject: "table", points: 1100, batna: 1000, jointPoints: 2200, jointBatna: 2000, bestJointPoints: 2200, now: at("14:30") };
    await rating.record({ person: "nadia", ...result });
    await rating.record({ person: "omar", ...result });
    const again = rating.record({ person: "nadia", ...result, points: 1200 });
    await expect(again).rejects.toThrow(AlreadyRecorded);
    await expect(again).rejects.toThrow("This negotiation already counts for them.");
    expect(await rating._ratings({ person: "nadia" })).toEqual({ create: 1, claim: 0.5, negotiations: 1 });
    expect(await rating._ratings({ person: "omar" })).toEqual({ create: 1, claim: 0.5, negotiations: 1 });
  });

  test("when no deal could beat everyone's BATNAs, there was nothing to create, and walking away doesn't count against anyone", async () => {
    const { rating } = await setup();
    await rating.record({ person: "nadia", subject: "no-zopa", points: 1000, batna: 1000, jointPoints: 2000, jointBatna: 2000, now: at("14:30") });
    expect(await rating._ratings({ person: "nadia" })).toEqual({ negotiations: 1 });
    expect(await rating._results({ person: "nadia" })).toEqual([{ subject: "no-zopa", recordedAt: at("14:30") }]);
  });

  test("a deal can create less than walking away would have, and someone can claim more than all of it", async () => {
    const { rating } = await setup();
    // Together they did 100 worse than their BATNAs, so the deal created a negative share and left nothing to claim.
    await rating.record({ person: "nadia", subject: "worse", points: 1050, batna: 1000, jointPoints: 1900, jointBatna: 2000, bestJointPoints: 2200, now: at("14:30") });
    // Nadia got 150 of a deal that added only 100, because Omar accepted less than his BATNA.
    await rating.record({ person: "nadia", subject: "lopsided", points: 1150, batna: 1000, jointPoints: 2100, jointBatna: 2000, bestJointPoints: 2200, now: at("15:30") });
    expect(await rating._results({ person: "nadia" })).toEqual([
      { subject: "worse", create: -0.5, recordedAt: at("14:30") },
      { subject: "lopsided", create: 0.5, claim: 1.5, recordedAt: at("15:30") },
    ]);
  });
});
