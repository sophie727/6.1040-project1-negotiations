import { describe, expect, test } from "bun:test";
import { AlreadyReviewed, InvalidStars, ReviewingConcept, SelfReview } from "../../src/concepts/Reviewing/Reviewing.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

async function setup() {
  return { reviewing: new ReviewingConcept<string, string>(await testDatabase()) };
}

async function expectRefusal(attempt: Promise<unknown>, refusal: new (message?: string) => Error, message: string) {
  await expect(attempt).rejects.toThrow(refusal);
  await expect(attempt).rejects.toThrow(message);
}

describe("Reviewing", () => {
  test("its principle: Nadia and Omar review each other once per negotiation, and Omar's standing averages his stars", async () => {
    const { reviewing } = await setup();
    expect(await reviewing._standing({ reviewee: "omar" })).toEqual({ reviews: 0 });

    const { review } = await reviewing.review({ subject: "first-table", reviewer: "nadia", reviewee: "omar", stars: 5 });
    expect(review).toEqual(expect.any(String));
    await reviewing.review({ subject: "first-table", reviewer: "omar", reviewee: "nadia", stars: 4 });
    expect(await reviewing._review({ subject: "first-table", reviewer: "nadia", reviewee: "omar" })).toEqual([{ stars: 5 }]);
    expect(await reviewing._review({ subject: "first-table", reviewer: "omar", reviewee: "nadia" })).toEqual([{ stars: 4 }]);

    // Reviewing Omar again about the same negotiation is refused, and changes nothing.
    await expectRefusal(
      reviewing.review({ subject: "first-table", reviewer: "nadia", reviewee: "omar", stars: 1 }),
      AlreadyReviewed,
      "You've already reviewed them for this.",
    );
    expect(await reviewing._review({ subject: "first-table", reviewer: "nadia", reviewee: "omar" })).toEqual([{ stars: 5 }]);

    // After their next negotiation, she reviews him again.
    await reviewing.review({ subject: "second-table", reviewer: "nadia", reviewee: "omar", stars: 3 });
    expect(await reviewing._standing({ reviewee: "omar" })).toEqual({ stars: 4, reviews: 2 });
    expect(await reviewing._standing({ reviewee: "nadia" })).toEqual({ stars: 4, reviews: 1 });

    // Nadia can't review herself.
    await expectRefusal(
      reviewing.review({ subject: "first-table", reviewer: "nadia", reviewee: "nadia", stars: 5 }),
      SelfReview,
      "You can't review yourself.",
    );
    expect(await reviewing._standing({ reviewee: "nadia" })).toEqual({ stars: 4, reviews: 1 });
  });

  test("a review gives a whole number of stars from 1 to 5, and a refused one changes nothing", async () => {
    const { reviewing } = await setup();
    for (const stars of [0, 6, 3.5]) {
      await expectRefusal(
        reviewing.review({ subject: "table", reviewer: "nadia", reviewee: "omar", stars }),
        InvalidStars,
        "A review gives 1 to 5 stars.",
      );
    }
    expect(await reviewing._review({ subject: "table", reviewer: "nadia", reviewee: "omar" })).toEqual([]);
    expect(await reviewing._standing({ reviewee: "omar" })).toEqual({ reviews: 0 });
    for (const stars of [1, 5]) {
      await reviewing.review({ subject: `table-${stars}`, reviewer: "nadia", reviewee: "omar", stars });
    }
    expect(await reviewing._standing({ reviewee: "omar" })).toEqual({ stars: 3, reviews: 2 });
  });

  test("of two reviews of one person about one negotiation at once, Reviewing keeps one", async () => {
    const { reviewing } = await setup();
    const outcomes = await Promise.allSettled([
      reviewing.review({ subject: "table", reviewer: "nadia", reviewee: "omar", stars: 5 }),
      reviewing.review({ subject: "table", reviewer: "nadia", reviewee: "omar", stars: 2 }),
    ]);
    expect(outcomes.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect((await reviewing._standing({ reviewee: "omar" })).reviews).toBe(1);
  });
});
