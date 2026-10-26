import { describe, expect, test } from "bun:test";
import { TypingConcept } from "../../src/concepts/Typing/Typing.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

async function setup() {
  return { typing: new TypingConcept<string, string>(await testDatabase()) };
}

/** A moment on the day of the principle's negotiation, `seconds` after 2:04 pm. */
const at = (seconds: number) => new Date(Date.parse("2026-10-15T14:04:00.000Z") + seconds * 1000);

describe("Typing", () => {
  test("its principle: Nadia sees that Manon is typing until Omar sends his reply, or stops for a few seconds", async () => {
    const { typing } = await setup();
    expect(await typing._typing({ subject: "table", now: at(0) })).toEqual([]);

    // Omar's page keeps saying he is typing, a few seconds at a time.
    await typing.type({ subject: "table", typist: "Manon", now: at(0) });
    await typing.type({ subject: "table", typist: "Manon", now: at(3) });
    expect(await typing._typing({ subject: "table", now: at(8) })).toEqual([{ typist: "Manon" }]);
    // Sending the message stops it at once.
    await typing.stop({ subject: "table", typist: "Manon" });
    expect(await typing._typing({ subject: "table", now: at(8) })).toEqual([]);

    // Stopping without sending lets the last signal run out six seconds later.
    await typing.type({ subject: "table", typist: "Manon", now: at(10) });
    expect(await typing._typing({ subject: "table", now: at(15) })).toEqual([{ typist: "Manon" }]);
    expect(await typing._typing({ subject: "table", now: at(16) })).toEqual([]);
  });

  test("each typist has one signal per conversation, and stopping someone who isn't typing changes nothing", async () => {
    const { typing } = await setup();
    await typing.type({ subject: "table", typist: "Mandy", now: at(0) });
    await typing.type({ subject: "table", typist: "Presley", now: at(1) });
    await typing.type({ subject: "another table", typist: "Sally", now: at(1) });
    expect(await typing._typing({ subject: "table", now: at(2) })).toEqual([{ typist: "Mandy" }, { typist: "Presley" }]);
    expect(await typing.stop({ subject: "table", typist: "Sally" })).toEqual({});
    expect(await typing._typing({ subject: "another table", now: at(2) })).toEqual([{ typist: "Sally" }]);
  });
});
