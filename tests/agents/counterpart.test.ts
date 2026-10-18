import { describe, expect, test } from "bun:test";
import { modelCounterpart, readDecision, type TableMaterial } from "../../src/agents/counterpart.ts";
import { DECISION_ASK, REPLY_ASK } from "../../src/compositions/counterpart.ts";
import hirosBrief from "../../src/seed/briefs/hiro.md" with { type: "text" };
import manonsBrief from "../../src/seed/briefs/manon.md" with { type: "text" };
import { startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";
import { counterpartMaterial, fakeModel } from "./support.ts";

const WHOLE_PIE = { "Start date": 0, Salary: 120000, "Health Insurance": "Full Coverage", Bonus: 0, "Position title": "Director" };
const GREEDY = { "Start date": 59, Salary: 120000, "Health Insurance": "Full Coverage", Bonus: 10000, "Position title": "Director" };

/** What the counterpart, played by a model that answers `answer`, writes for `ask` about `table`, and the requests it made. */
async function answered(answer: string, ask: string, table: TableMaterial) {
  const { model, requests } = fakeModel(answer);
  let written = "";
  await modelCounterpart(model).answer(ask, table, async (text) => {
    written += text;
  });
  return { written, requests };
}

/** Nadia, as Hiro, at a table that has begun, with the counterpart not running, so a test can answer as it. */
async function nadiasTable() {
  const app = await startWholePie({ counterpart: null, coach: null });
  const nadia = await app.practice("nadia");
  ok(await app.api.tables.begin({ session: nadia.session, table: nadia.table }));
  return { app, nadia };
}

describe("the counterpart, played by a model", () => {
  test("it replies in character, from its own brief and the conversation, without the other side's brief", async () => {
    const { app, nadia } = await nadiasTable();
    ok(await app.api.tables.send({ session: nadia.session, table: nadia.table, body: "I was hoping for $120K." }));
    const table = await counterpartMaterial(app, nadia.table);

    const { written, requests } = await answered("That's above our budget. What else matters to you?", REPLY_ASK, table);
    expect(written).toBe("That's above our budget. What else matters to you?");
    const [{ system, prompt }] = requests as [(typeof requests)[number]];
    expect(system).toStartWith('You are Manon in a negotiation called "The Job Offer".');
    expect(system).toContain(manonsBrief);
    expect(system).not.toContain(hirosBrief.slice(0, 300));
    expect(prompt).toContain("Hiro: I was hoping for $120K.");
    expect(prompt).toContain("at most three sentences");
  });

  test("its decision accepts a proposal only when both the model and its BATNA allow it", async () => {
    const { app, nadia } = await nadiasTable();
    const { proposal: greedy } = ok(await app.api.tables.propose({ session: nadia.session, table: nadia.table, terms: nadia.terms(GREEDY) }));
    const below = await counterpartMaterial(app, nadia.table);

    const overruled = await answered("ACCEPT\nDeal!", DECISION_ASK, below);
    expect(overruled.written).toBe(`REJECT\n${greedy}\nI can't agree to that.`);
    expect(overruled.requests[0]!.prompt).toContain("It is worth 200 points to you, and your alternative is worth 1,000.");
    expect(overruled.requests[0]!.prompt).toContain("so you must reject it");

    const { proposal: fair } = ok(await app.api.tables.propose({ session: nadia.session, table: nadia.table, terms: nadia.terms(WHOLE_PIE) }));
    const above = await counterpartMaterial(app, nadia.table);
    expect((await answered("ACCEPT\nThat works for me.", DECISION_ASK, above)).written).toBe(`ACCEPT\n${fair}\nThat works for me.`);
    expect((await answered("REJECT\nCan you do better on the start date?", DECISION_ASK, above)).written).toBe(
      `REJECT\n${fair}\nCan you do better on the start date?`,
    );
  });

  test("it gives the model room to think, and cuts a reply that runs past what a message can hold", async () => {
    const { app, nadia } = await nadiasTable();
    ok(await app.api.tables.send({ session: nadia.session, table: nadia.table, body: "Tell me everything." }));
    const table = await counterpartMaterial(app, nadia.table);
    const { written, requests } = await answered("word ".repeat(600), REPLY_ASK, table);
    expect(written).toHaveLength(2000);
    expect(requests[0]!.maxTokens).toBe(4096);
  });

  test("it reads a decision however the model formats it, and rejects anything unclear", () => {
    expect(readDecision("**ACCEPT**\nSure, let's do it.")).toEqual({ accept: true, remark: "Sure, let's do it." });
    expect(readDecision("Line 1: ACCEPT\nLine 2: Great.")).toEqual({ accept: true, remark: "Great." });
    expect(readDecision("Reject.\n\nNot at that salary.")).toEqual({ accept: false, remark: "Not at that salary." });
    expect(readDecision("I think we're close.")).toEqual({ accept: false, remark: "" });
  });
});
