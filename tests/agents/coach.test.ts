import { describe, expect, test } from "bun:test";
import { debriefPrompt, modelCoach, scriptedDebrief } from "../../src/agents/coach.ts";
import { DEBRIEF_ASK } from "../../src/compositions/debrief.ts";
import { START, startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";
import { coachMaterial, fakeModel } from "./support.ts";

/** Nadia, as Hiro, at a table that has begun, with neither agent running. */
async function nadiasTable() {
  const app = await startWholePie({ counterpart: null, coach: null });
  const nadia = await app.practice("nadia");
  ok(await app.api.tables.begin({ session: nadia.session, table: nadia.table }));
  return { app, nadia };
}

describe("the coach", () => {
  test("its model hears both sides' points, how it ended, the best deal, and the conversation", async () => {
    const { app, nadia } = await nadiasTable();
    ok(await app.api.tables.send({ session: nadia.session, table: nadia.table, body: "I need to start on March 1." }));
    ok(await app.api.tables.withdraw({ session: nadia.session, table: nadia.table }));
    const material = await coachMaterial(app, nadia.table);

    const prompt = debriefPrompt(material);
    expect(prompt).toContain("The student played Hiro, and the AI played Manon.");
    expect(prompt).toContain("Manon, the AI (BATNA 1,000 points):\n  Start date: January 1 = 800, March 1 = 0");
    expect(prompt).toContain("The student, as Hiro (BATNA 1,000 points):\n  Start date: January 1 = 0, March 1 = 300");
    expect(prompt).toContain("How it ended: The student walked away. With no agreement, each side got its BATNA.");
    expect(prompt).toContain(
      "The best deal possible (the whole pie): Start date: January 1; Salary: $120K; Health Insurance: Full Coverage; Bonus: $0; Position title: Director, worth 2,200 points to both together.",
    );
    expect(prompt).toContain("The student (Hiro): I need to start on March 1.");

    const { model, requests } = fakeModel("## What went well\nYou knew your priorities.");
    let written = "";
    await modelCoach(model).answer(DEBRIEF_ASK, material, async (text) => {
      written += text;
    });
    expect(written).toBe("## What went well\nYou knew your priorities.");
    expect(requests[0]!.prompt).toBe(prompt);
  });

  test("the stand-in sums up a deal just short of the whole pie, with the value created and claimed", async () => {
    const { app, nadia } = await nadiasTable();
    // $115K instead of $120K: worth 1,025 points to Hiro and 1,162.5 to Manon, 12.5 short of the whole pie.
    const terms = nadia.terms({ "Start date": 0, Salary: 115000, "Health Insurance": "Full Coverage", Bonus: 0, "Position title": "Director" });
    const { proposal } = ok(
      await app.application.concepts.Proposing.propose({ subject: nadia.table, proposer: nadia.roles.Manon!, terms, now: START }),
    );
    ok(await app.api.tables.accept({ session: nadia.session, table: nadia.table, proposal }));
    await app.application.whenIdle();
    const material = await coachMaterial(app, nadia.table);

    const debrief = scriptedDebrief(DEBRIEF_ASK, material);
    expect(debrief).toContain("You and Manon reached a deal. You got 1,025 points, and Manon got 1,163.");
    expect(debrief).toContain("Yours was worth 2,188, so 12 points were left on the table.");
    expect(debrief).toContain("The deal created 94% of the value a deal could add over walking away, and you claimed 13% of the value it created.");
    expect(debriefPrompt(material)).toContain("Where the agreement differed from the best deal:\n  Salary: agreed $115,000, best $120K");
  });
});
