import { describe, expect, test } from "bun:test";
import { NotingConcept, TooLong } from "../../src/concepts/Noting/Noting.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

async function setup() {
  return { noting: new NotingConcept<string, string>(await testDatabase()) };
}

describe("Noting", () => {
  test("its principle: Nadia's later notes replace her earlier ones, and other notes stay separate", async () => {
    const { noting } = await setup();
    const { note } = await noting.write({ author: "nadia", subject: "table", body: "Manon keeps mentioning the start date" });
    const again = await noting.write({
      author: "nadia",
      subject: "table",
      body: "Manon keeps mentioning the start date. Ask about remote days?",
    });
    expect(again).toEqual({ note });
    expect(await noting._note({ author: "nadia", subject: "table" })).toEqual([
      { body: "Manon keeps mentioning the start date. Ask about remote days?" },
    ]);
    expect(await noting._note({ author: "nadia", subject: "next-table" })).toEqual([]);
    expect(await noting._note({ author: "hiro", subject: "table" })).toEqual([]);
  });

  test("notes can be empty, and can have at most 20,000 characters", async () => {
    const { noting } = await setup();
    const refusal = noting.write({ author: "nadia", subject: "table", body: "x".repeat(20001) });
    await expect(refusal).rejects.toThrow(TooLong);
    await expect(refusal).rejects.toThrow("Notes can have at most 20,000 characters.");
    await noting.write({ author: "nadia", subject: "table", body: "x".repeat(20000) });
    await noting.write({ author: "nadia", subject: "table", body: "" });
    expect(await noting._note({ author: "nadia", subject: "table" })).toEqual([{ body: "" }]);
  });

  test("two saves of one note at once leave a single note", async () => {
    const { noting } = await setup();
    const [first, second] = await Promise.all([
      noting.write({ author: "nadia", subject: "table", body: "one" }),
      noting.write({ author: "nadia", subject: "table", body: "two" }),
    ]);
    expect(first.note).toBe(second.note);
    const [saved] = await noting._note({ author: "nadia", subject: "table" });
    expect(["one", "two"]).toContain(saved!.body);
  });
});
