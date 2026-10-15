import { describe, expect, test } from "bun:test";
import { ConversingConcept, InvalidMessage } from "../../src/concepts/Conversing/Conversing.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

async function setup() {
  return { conversing: new ConversingConcept<string, string>(await testDatabase()) };
}

/** A time on the day of the principle's negotiation. */
const at = (time: string) => new Date(`2026-10-15T${time}:00.000Z`);

describe("Conversing", () => {
  test("its principle: everyone reads Hiro's message, then Manon's reply, and a message of only spaces is refused", async () => {
    const { conversing } = await setup();
    const { message: ask } = await conversing.send({ subject: "table", sender: "Hiro", body: "I was hoping for $120K", now: at("14:03") });
    const { message: reply } = await conversing.send({
      subject: "table",
      sender: "Manon",
      body: "That's well above our budget",
      now: at("14:04"),
    });
    expect(await conversing._messages({ subject: "table" })).toEqual([
      { message: ask, sender: "Hiro", body: "I was hoping for $120K", sentAt: at("14:03") },
      { message: reply, sender: "Manon", body: "That's well above our budget", sentAt: at("14:04") },
    ]);

    const refusal = conversing.send({ subject: "table", sender: "Hiro", body: "   ", now: at("14:05") });
    await expect(refusal).rejects.toThrow(InvalidMessage);
    await expect(refusal).rejects.toThrow("A message must have 1 to 2,000 characters.");
    expect(await conversing._messages({ subject: "table" })).toHaveLength(2);
  });

  test("a message is stored trimmed and must have 1 to 2,000 characters once trimmed", async () => {
    const { conversing } = await setup();
    await expect(conversing.send({ subject: "table", sender: "Hiro", body: "x".repeat(2001), now: at("14:00") })).rejects.toThrow(
      InvalidMessage,
    );
    await conversing.send({ subject: "table", sender: "Hiro", body: `  ${"x".repeat(2000)}\n`, now: at("14:00") });
    expect((await conversing._messages({ subject: "table" }))[0]?.body).toBe("x".repeat(2000));
  });

  test("each subject has its own conversation", async () => {
    const { conversing } = await setup();
    await conversing.send({ subject: "first", sender: "Hiro", body: "Hello", now: at("14:00") });
    await conversing.send({ subject: "second", sender: "Hiro", body: "Hi again", now: at("14:01") });
    expect((await conversing._messages({ subject: "first" })).map(({ body }) => body)).toEqual(["Hello"]);
    expect(await conversing._messages({ subject: "nowhere" })).toEqual([]);
  });
});
