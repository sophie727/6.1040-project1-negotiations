import { describe, expect, test } from "bun:test";
import {
  answerer,
  asMessages,
  instructions,
  modelCounterpart,
  passes,
  readDecision,
  replyPrompt,
  seated,
  type TableMaterial,
} from "../../src/agents/counterpart.ts";
import { DECISION_ASK, FOLLOW_UP_ASK, REPLY_ASK } from "../../src/compositions/counterpart.ts";
import hirosBrief from "../../src/seed/briefs/hiro.md" with { type: "text" };
import mandysBrief from "../../src/seed/briefs/mandy.md" with { type: "text" };
import manonsBrief from "../../src/seed/briefs/manon.md" with { type: "text" };
import presleysBrief from "../../src/seed/briefs/presley.md" with { type: "text" };
import sallysBrief from "../../src/seed/briefs/sally.md" with { type: "text" };
import { startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";
import { counterpartMaterial, counterpartTables, fakeModel } from "./support.ts";

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
  ok(await app.api.tables.start({ session: nadia.session, table: nadia.table, minutes: 30 }));
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

  test("it gives the model room to think, and splits a reply too long for one message into parts", async () => {
    const { app, nadia } = await nadiasTable();
    ok(await app.api.tables.send({ session: nadia.session, table: nadia.table, body: "Tell me everything." }));
    const table = await counterpartMaterial(app, nadia.table);
    const long = Array.from({ length: 40 }, (_, i) => `Point ${i} is about why a January start matters so much to the team.`).join(" ");
    const { written, requests } = await answered(long, REPLY_ASK, table);
    const parts = written.split("\n");
    expect(parts.length).toBe(2);
    expect(parts.every((part) => part.length <= 2000 && part.endsWith("team."))).toBe(true);
    expect(parts.join(" ")).toBe(long);
    expect(requests[0]!.maxTokens).toBe(4096);
  });

  test("its messages keep a reply's words as written: a message per paragraph, and a long paragraph cut between sentences, or between words", () => {
    expect(asMessages("I can do $95.5K, e.g. with a January start.  Deal?")).toEqual(["I can do $95.5K, e.g. with a January start. Deal?"]);
    expect(asMessages("Thanks for coming in.\n\nNow, about salary.\n")).toEqual(["Thanks for coming in.", "Now, about salary."]);
    // With room for 30 characters, each message holds as many whole sentences as fit.
    expect(asMessages("“That works.” Agreed? " + "Yes. ".repeat(10), 30)).toEqual([
      "“That works.” Agreed? Yes.",
      "Yes. Yes. Yes. Yes. Yes. Yes.",
      "Yes. Yes. Yes.",
    ]);
    expect(asMessages("a".repeat(4500)).map((part) => part.length)).toEqual([2000, 2000, 500]);
    expect(asMessages("   \n  ")).toEqual([]);
  });

  test("it reads a decision however the model formats it, and rejects anything unclear", () => {
    expect(readDecision("**ACCEPT**\nSure, let's do it.")).toEqual({ accept: true, remark: "Sure, let's do it." });
    expect(readDecision("Line 1: ACCEPT\nLine 2: Great.")).toEqual({ accept: true, remark: "Great." });
    expect(readDecision("Reject.\n\nNot at that salary.")).toEqual({ accept: false, remark: "Not at that salary." });
    expect(readDecision("I think we're close.")).toEqual({ accept: false, remark: "" });
  });
});

describe("the counterparts at a table of three", () => {
  /** Mandy at The Launch Room, which has begun, with the counterpart not running, after she asks Presley something. */
  async function mandysTable() {
    const app = await startWholePie({ counterpart: null, coach: null });
    const mandy = await app.practice("mandy", "Mandy", "The Launch Room");
    ok(await app.api.tables.start({ session: mandy.session, table: mandy.table, minutes: 45 }));
    ok(await app.api.tables.send({ session: mandy.session, table: mandy.table, body: "Presley, how much time does your team need?" }));
    const tables: readonly TableMaterial[] = await counterpartTables(app, mandy.table);
    return { tables, presley: tables[0]!, sally: tables[1]! };
  }

  test("each reads the table from its own seat, with its own brief, and speaks to the table", async () => {
    const { tables, presley } = await mandysTable();
    expect(tables.map(({ roleName }) => roleName)).toEqual(["Presley", "Sally"]);
    expect(presley.seats.map(({ player }) => player)).toEqual(["mandy", null, null]);

    const system = instructions(presley);
    expect(system).toStartWith('You are Presley in a negotiation called "The Launch Room", with Mandy and Sally. Mandy is a person practicing');
    expect(system).toContain(presleysBrief);
    for (const theirs of [mandysBrief, sallysBrief]) expect(system).not.toContain(theirs.slice(0, 300));
    expect(system).toContain("ask Mandy to propose the terms");
    expect(replyPrompt(presley)).toContain("Write your next message to the table");
    expect(replyPrompt(presley, FOLLOW_UP_ASK)).toContain("answer with just the word PASS");
  });

  test("the counterpart a message names replies, and a counterpart with nothing to add passes", async () => {
    const { tables, presley, sally } = await mandysTable();
    expect(answerer(REPLY_ASK, tables)).toBe(presley);
    expect(answerer(FOLLOW_UP_ASK, tables)).toBe(presley);
    // A question goes first to whoever it asks, even after a greeting that names someone else first.
    const saying = (body: string) => tables.map((table) => ({ ...table, messages: [{ ...table.messages[0]!, body }] }));
    expect(answerer(REPLY_ASK, saying("Hi Presley, hi Sally. Sally, what does Halvorsen need?"))?.roleName).toBe("Sally");
    expect(answerer(REPLY_ASK, saying("Presley and Sally, thanks for coming."))?.roleName).toBe("Presley");
    // Once Presley has replied, only Sally is left to add something, and after her, nobody is.
    const replied = (table: TableMaterial, ...senders: string[]) => ({
      ...table,
      messages: [
        ...table.messages,
        ...senders.map((sender, i) => ({ message: `m${i}`, sender, body: "Six weeks.", sentAt: table.messages[0]!.sentAt })),
      ],
    });
    expect(answerer(FOLLOW_UP_ASK, [replied(presley, presley.role), replied(sally, presley.role)])?.roleName).toBe("Sally");
    expect(answerer(FOLLOW_UP_ASK, [replied(presley, presley.role, sally.role), replied(sally, presley.role, sally.role)])).toBe(undefined);

    const write = (text: string[]) => async (piece: string) => {
      text.push(piece);
    };
    const reply: string[] = [];
    await seated(modelCounterpart(fakeModel("Six weeks would do it.").model)).answer(REPLY_ASK, tables, write(reply));
    expect(reply.join("")).toBe(`${presley.role}\nSix weeks would do it.`);
    const pass: string[] = [];
    await seated(modelCounterpart(fakeModel("Pass.").model)).answer(FOLLOW_UP_ASK, tables, write(pass));
    expect(pass.join("")).toBe("PASS");
    expect([passes("PASS"), passes("**Pass.**"), passes("Pass on the price, but not the date.")]).toEqual([true, true, false]);
  });
});
