import { describe, expect, test } from "bun:test";
import { formatAmount } from "../../frontend/src/table/format.ts";
import { agreedOn } from "../../src/agents/wording.ts";

/** A continuous issue in `unit` whose options are at 0 and 59, named so that neither matches the amounts below. */
const rangeIn = (unit: string | null) => ({
  issue: "issue",
  name: "Issue",
  kind: "CONTINUOUS",
  unit,
  options: [
    { option: "low", name: "Low", universalValue: 0 },
    { option: "high", name: "High", universalValue: 59 },
  ],
});

describe("putting an amount into words", () => {
  test("a value between a range of dates' points reads as a date, with its year only when the year changes", () => {
    expect(agreedOn(rangeIn("days after January 1"), 37)).toBe("February 7");
    // The first day without a year falls in a year that isn't a leap year, so March 1 is 59 days after January 1.
    expect(agreedOn(rangeIn("days after January 1"), 59)).toBe("High");
    expect(agreedOn(rangeIn("days after January 1"), 58)).toBe("February 28");
    expect(agreedOn(rangeIn("days after January 1, 2028"), 59)).toBe("High");
    expect(agreedOn(rangeIn("days after January 1, 2028"), 58)).toBe("February 28");
    expect(agreedOn(rangeIn("days after January 1, 2028"), 59.4)).toBe("February 29");
    expect(agreedOn(rangeIn("days after December 1, 2026"), 40)).toBe("January 10, 2027");
    expect(agreedOn(rangeIn("days after March 1"), -1)).toBe("February 28");
  });

  test("dollars read as money, percent with a percent sign, and any other unit after the number", () => {
    expect(agreedOn(rangeIn("dollars"), 95000)).toBe("$95,000");
    expect(agreedOn(rangeIn("percent"), 37.5)).toBe("37.5%");
    expect(agreedOn(rangeIn("hours"), 12)).toBe("12 hours");
    expect(agreedOn(rangeIn(null), 12)).toBe("12");
    // A unit that only looks like days, such as one naming a day no month has, is a unit like any other.
    expect(agreedOn(rangeIn("days after February 30"), 3)).toBe("3 days after February 30");
  });

  test("the page puts amounts into the same words as the agents", () => {
    const cases: [string | null, number][] = [
      ["days after January 1", 37],
      ["days after January 1, 2028", 58],
      ["days after December 1, 2026", 40],
      ["dollars", 95000],
      ["percent", 37.5],
      ["hours", 12],
      [null, 12],
    ];
    for (const [unit, value] of cases) expect(formatAmount(value, unit)).toBe(agreedOn(rangeIn(unit), value));
  });
});
