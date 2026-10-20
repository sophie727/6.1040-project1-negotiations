import { describe, expect, test } from "bun:test";
import { PreferringConcept } from "../../src/concepts/Preferring/Preferring.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

async function setup() {
  return { preferring: new PreferringConcept<string>(await testDatabase()) };
}

describe("Preferring", () => {
  test("its principle: Nadia turns prep sheets on and then off, and Omar never has them", async () => {
    const { preferring } = await setup();
    expect(await preferring._on({ person: "nadia", feature: "prep-sheet" })).toEqual({ on: false });

    expect(await preferring.turnOn({ person: "nadia", feature: "prep-sheet" })).toEqual({});
    expect(await preferring._on({ person: "nadia", feature: "prep-sheet" })).toEqual({ on: true });
    expect(await preferring._on({ person: "omar", feature: "prep-sheet" })).toEqual({ on: false });

    expect(await preferring.turnOff({ person: "nadia", feature: "prep-sheet" })).toEqual({});
    expect(await preferring._on({ person: "nadia", feature: "prep-sheet" })).toEqual({ on: false });

    // Turning prep sheets off a second time changes nothing.
    expect(await preferring.turnOff({ person: "nadia", feature: "prep-sheet" })).toEqual({});
    expect(await preferring._on({ person: "nadia", feature: "prep-sheet" })).toEqual({ on: false });
  });

  test("turning a feature on twice, even at once, keeps one preference, so turning it off once turns it off", async () => {
    const { preferring } = await setup();
    await Promise.all([
      preferring.turnOn({ person: "nadia", feature: "prep-sheet" }),
      preferring.turnOn({ person: "nadia", feature: "prep-sheet" }),
    ]);
    await preferring.turnOn({ person: "nadia", feature: "prep-sheet" });
    expect(await preferring._on({ person: "nadia", feature: "prep-sheet" })).toEqual({ on: true });

    await preferring.turnOff({ person: "nadia", feature: "prep-sheet" });
    expect(await preferring._on({ person: "nadia", feature: "prep-sheet" })).toEqual({ on: false });
  });

  test("each person's choice for each feature is separate", async () => {
    const { preferring } = await setup();
    await preferring.turnOn({ person: "nadia", feature: "prep-sheet" });
    await preferring.turnOn({ person: "nadia", feature: "hints" });
    await preferring.turnOn({ person: "omar", feature: "prep-sheet" });

    await preferring.turnOff({ person: "nadia", feature: "hints" });
    await preferring.turnOff({ person: "omar", feature: "prep-sheet" });
    expect(await preferring._on({ person: "nadia", feature: "prep-sheet" })).toEqual({ on: true });
    expect(await preferring._on({ person: "nadia", feature: "hints" })).toEqual({ on: false });
    expect(await preferring._on({ person: "omar", feature: "prep-sheet" })).toEqual({ on: false });
  });
});
