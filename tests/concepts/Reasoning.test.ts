// Copied from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng.
import { describe, expect, test } from "bun:test";
import {
  AlreadyTaken,
  Closed,
  EmptyAnswer,
  NoReason,
  NotTaken,
  NotYours,
  NothingAsked,
  type Prompt,
  ReasoningConcept,
  UnknownPrompt,
} from "../../src/concepts/Reasoning/Reasoning.ts";
import { testDatabase } from "../support/reusable/mongo.ts";
import { expectOneWinner } from "../support/reusable/race.ts";

async function setup() {
  const database = await testDatabase();
  return { reasoning: new ReasoningConcept(database) };
}

describe("Reasoning", () => {
  test("its principle: gemini takes the prompt, extends the answer piece by piece, and concludes it; another reasoner can't answer it; whoever abandons a prompt gives a reason, and Reasoning returns it; forgetting the photo removes its questions", async () => {
    const { reasoning } = await setup();
    const { prompt } = await reasoning.prompt({ subject: "beach.jpg", ask: "Describe this photo briefly." });
    expect(await reasoning._waiting()).toEqual([{ prompt, subject: "beach.jpg", ask: "Describe this photo briefly." }]);

    expect(await reasoning.take({ prompt, reasoner: "gemini" })).toEqual({ prompt });
    await expect(reasoning.take({ prompt, reasoner: "another" })).rejects.toThrow(AlreadyTaken);
    expect(await reasoning._waiting()).toEqual([]);
    expect(await reasoning._taken({ reasoner: "gemini" })).toEqual([{ prompt, subject: "beach.jpg" }]);

    for (const text of ["Two people", " on a beach", " at sunset"]) {
      await reasoning.extend({ prompt, reasoner: "gemini", text });
    }
    await expect(reasoning.extend({ prompt, reasoner: "another", text: "!" })).rejects.toThrow(NotYours);
    expect((await reasoning._about({ subject: "beach.jpg" }))[0]).toMatchObject({
      answer: "Two people on a beach at sunset",
      stage: "FORMING",
    });
    expect(await reasoning._reasoner({ prompt })).toEqual([{ reasoner: "gemini" }]);
    expect(await reasoning.conclude({ prompt, reasoner: "gemini" })).toEqual({
      prompt,
      subject: "beach.jpg",
      ask: "Describe this photo briefly.",
    });
    expect(await reasoning._taken({ reasoner: "gemini" })).toEqual([]);

    const { prompt: later } = await reasoning.prompt({ subject: "notes.pdf", ask: "Describe this file briefly." });
    await reasoning.take({ prompt: later, reasoner: "gemini" });
    await reasoning.abandon({ prompt: later, reason: "The model could not be reached." });
    expect(await reasoning._about({ subject: "notes.pdf" })).toEqual([
      {
        prompt: later,
        ask: "Describe this file briefly.",
        answer: "",
        stage: "ABANDONED",
      },
    ]);
    expect(await reasoning._reason({ prompt: later })).toEqual([{ reason: "The model could not be reached." }]);

    expect(await reasoning.forget({ subject: "beach.jpg" })).toEqual({ subject: "beach.jpg" });
    expect(await reasoning._about({ subject: "beach.jpg" })).toEqual([]);
    expect(await reasoning._reasoner({ prompt })).toEqual([]);
    expect(await reasoning._about({ subject: "notes.pdf" })).toHaveLength(1);
  });

  test("_lines splits a concluded answer into trimmed, nonblank lines, numbered from 0", async () => {
    const { reasoning } = await setup();
    const { prompt } = await reasoning.prompt({ subject: "beach.jpg", ask: "List labels, one per line." });
    expect(await reasoning._lines({ prompt })).toEqual([]);
    await reasoning.take({ prompt, reasoner: "gemini" });
    await reasoning.extend({ prompt, reasoner: "gemini", text: "beach\n  sunset \n\nsum" });
    await reasoning.extend({ prompt, reasoner: "gemini", text: "mer\n" });
    await reasoning.conclude({ prompt, reasoner: "gemini" });
    expect(await reasoning._lines({ prompt })).toEqual([
      { line: "beach", position: 0 },
      { line: "sunset", position: 1 },
      { line: "summer", position: 2 },
    ]);
  });

  test("_taken returns a reasoner's unfinished prompts with their subjects, oldest first", async () => {
    const { reasoning } = await setup();
    const { prompt: first } = await reasoning.prompt({ subject: "s", ask: "first" });
    const { prompt: second } = await reasoning.prompt({ subject: "s", ask: "second" });
    const { prompt: third } = await reasoning.prompt({ subject: "s", ask: "third" });
    await reasoning.take({ prompt: third, reasoner: "r" });
    await reasoning.take({ prompt: first, reasoner: "r" });
    await reasoning.take({ prompt: second, reasoner: "other" });
    expect(await reasoning._taken({ reasoner: "r" })).toEqual([{ prompt: first, subject: "s" }, { prompt: third, subject: "s" }]);

    await reasoning.abandon({ prompt: first, reason: "Timed out." });
    expect(await reasoning._taken({ reasoner: "r" })).toEqual([{ prompt: third, subject: "s" }]);
    expect(await reasoning._taken({ reasoner: "nobody" })).toEqual([]);
  });

  test("of four reasoners taking one prompt at once, Reasoning accepts one and refuses the others with ALREADY_TAKEN", async () => {
    const { reasoning } = await setup();
    const { prompt } = await reasoning.prompt({ subject: "s", ask: "q" });
    await expectOneWinner(
      ["a", "b", "c", "d"].map((reasoner) => reasoning.take({ prompt, reasoner })),
      AlreadyTaken,
    );
  });

  test("Reasoning refuses an empty ask, an unknown prompt, answering before taking or by another reasoner, an empty answer or reason, and any change to a closed prompt", async () => {
    const { reasoning } = await setup();
    await expect(reasoning.prompt({ subject: "s", ask: "  " })).rejects.toThrow(NothingAsked);
    await expect(reasoning.take({ prompt: "missing" as Prompt, reasoner: "r" })).rejects.toThrow(UnknownPrompt);

    const { prompt } = await reasoning.prompt({ subject: "s", ask: "q" });
    await expect(reasoning.extend({ prompt, reasoner: "r", text: "x" })).rejects.toThrow(NotTaken);
    await expect(reasoning.conclude({ prompt, reasoner: "r" })).rejects.toThrow(NotTaken);
    await reasoning.take({ prompt, reasoner: "r" });
    await expect(reasoning.conclude({ prompt, reasoner: "other" })).rejects.toThrow(NotYours);
    await expect(reasoning.conclude({ prompt, reasoner: "r" })).rejects.toThrow(EmptyAnswer);
    await expect(reasoning.abandon({ prompt, reason: " " })).rejects.toThrow(NoReason);
    await reasoning.extend({ prompt, reasoner: "r", text: "an answer" });
    await reasoning.conclude({ prompt, reasoner: "r" });
    await expect(reasoning.extend({ prompt, reasoner: "r", text: "more" })).rejects.toThrow(Closed);
    await expect(reasoning.abandon({ prompt, reason: "late" })).rejects.toThrow(Closed);
    await expect(reasoning.take({ prompt, reasoner: "r" })).rejects.toThrow(Closed);
  });

  test("a person can abandon a prompt no reasoner has taken, for example after a crash", async () => {
    const { reasoning } = await setup();
    const { prompt } = await reasoning.prompt({ subject: "s", ask: "q" });
    await reasoning.abandon({ prompt, reason: "Nobody took it." });
    expect((await reasoning._about({ subject: "s" }))[0]).toMatchObject({ stage: "ABANDONED" });
    expect(await reasoning._reasoner({ prompt })).toEqual([]);
    expect(await reasoning._reason({ prompt })).toEqual([{ reason: "Nobody took it." }]);
  });
});
