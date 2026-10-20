import { describe, expect, test } from "bun:test";
import { PreparingConcept, TooLong } from "../../src/concepts/Preparing/Preparing.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

async function setup() {
  return { preparing: new PreparingConcept<string, string>(await testDatabase()) };
}

describe("Preparing", () => {
  test("its principle: Nadia turns on prep sheets, and her plan is complete only once every part is written", async () => {
    const { preparing } = await setup();
    expect(await preparing._planner({ author: "nadia" })).toEqual({ on: false });
    expect(await preparing.turnOn({ author: "nadia" })).toEqual({});
    expect(await preparing._planner({ author: "nadia" })).toEqual({ on: true });

    expect(await preparing._complete({ author: "nadia", subject: "job-offer" })).toEqual({ complete: false });
    const { plan } = await preparing.plan({
      author: "nadia",
      subject: "job-offer",
      target: "$115K and a January start",
      walkaway: "anything worth at least my 1,000-point BATNA",
      priorities: "   ",
    });
    expect(await preparing._complete({ author: "nadia", subject: "job-offer" })).toEqual({ complete: false });

    // Adding her priorities completes it, and rewriting replaces the plan rather than adding another.
    const again = await preparing.plan({
      author: "nadia",
      subject: "job-offer",
      target: "$115K and a January start",
      walkaway: "anything worth at least my 1,000-point BATNA",
      priorities: "salary, then title",
    });
    expect(again.plan).toBe(plan);
    expect(await preparing._complete({ author: "nadia", subject: "job-offer" })).toEqual({ complete: true });
    expect(await preparing._plan({ author: "nadia", subject: "job-offer" })).toEqual([
      { target: "$115K and a January start", walkaway: "anything worth at least my 1,000-point BATNA", priorities: "salary, then title" },
    ]);

    // Omar never turned prep sheets on, and has no plan; Nadia's plans are her own.
    expect(await preparing._planner({ author: "omar" })).toEqual({ on: false });
    expect(await preparing._plan({ author: "omar", subject: "job-offer" })).toEqual([]);
    expect(await preparing._plan({ author: "nadia", subject: "another" })).toEqual([]);

    // Turning prep sheets off, or on again, keeps her plans.
    expect(await preparing.turnOff({ author: "nadia" })).toEqual({});
    expect(await preparing._planner({ author: "nadia" })).toEqual({ on: false });
    await preparing.turnOn({ author: "nadia" });
    await preparing.turnOn({ author: "nadia" });
    expect(await preparing._planner({ author: "nadia" })).toEqual({ on: true });
    expect(await preparing._complete({ author: "nadia", subject: "job-offer" })).toEqual({ complete: true });
    await preparing.turnOff({ author: "nadia" });
    await preparing.turnOff({ author: "nadia" });
    expect(await preparing._planner({ author: "nadia" })).toEqual({ on: false });
  });

  test("each part of a plan has at most 2,000 characters, and a refused plan changes nothing", async () => {
    const { preparing } = await setup();
    await preparing.plan({ author: "nadia", subject: "job-offer", target: "a", walkaway: "b", priorities: "c" });
    const attempt = preparing.plan({ author: "nadia", subject: "job-offer", target: "x".repeat(2001), walkaway: "b", priorities: "c" });
    await expect(attempt).rejects.toThrow(TooLong);
    await expect(attempt).rejects.toThrow("Each part of a plan can have at most 2,000 characters.");
    expect(await preparing._plan({ author: "nadia", subject: "job-offer" })).toEqual([{ target: "a", walkaway: "b", priorities: "c" }]);
    await preparing.plan({ author: "nadia", subject: "job-offer", target: "x".repeat(2000), walkaway: "b", priorities: "c" });
  });

  test("two saves of one plan at once leave one plan", async () => {
    const { preparing } = await setup();
    const [first, second] = await Promise.all([
      preparing.plan({ author: "nadia", subject: "job-offer", target: "a", walkaway: "b", priorities: "c" }),
      preparing.plan({ author: "nadia", subject: "job-offer", target: "d", walkaway: "e", priorities: "f" }),
    ]);
    expect(first.plan).toBe(second.plan);
    expect(await preparing._plan({ author: "nadia", subject: "job-offer" })).toHaveLength(1);
  });
});
