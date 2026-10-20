import type { Model } from "../../src/agents/reusable/models.ts";
import { DEBRIEF_ASK, JOINT_DEBRIEF_ASK } from "../../src/compositions/debrief.ts";
import type { startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

/** A model that answers every request with `answer`, a word at a time, and keeps the requests it was given. */
export function fakeModel(answer: string) {
  const requests: { system: string; prompt: string; maxTokens: number }[] = [];
  const model: Model = {
    name: "fake",
    async reply(request, write) {
      requests.push(request);
      for (const piece of answer.match(/\S+\s*/g) ?? []) await write(piece);
    },
  };
  return { model, requests };
}

type App = Awaited<ReturnType<typeof startWholePie>>;

/** Takes the newest question about `table` that asks `ask`, as the agent named `agent`, and returns what its endpoint shows the agent. */
async function takeNewest({ api, application }: App, table: string, agent: string, ask?: string) {
  const session = ok(await application.concepts.AgentSessioning.start({ subject: agent })).session;
  const questions = await application.concepts.Reasoning._about({ subject: table as never });
  const prompt = questions.filter((question) => ask === undefined || question.ask === ask).at(-1)!.prompt;
  ok(await api.answers.take({ session, prompt }));
  return { session, prompt };
}

/** The table as each counterpart there reads it for the newest question. */
export async function counterpartTables(app: App, table: string) {
  const { session, prompt } = await takeNewest(app, table, "counterpart");
  return ok(await app.api.counterpart.table({ session, prompt })).tables;
}

/** The table as the counterpart reads it for its newest question, at a table with one counterpart. */
export async function counterpartMaterial(app: App, table: string) {
  const [material] = await counterpartTables(app, table);
  return material!;
}

/** What the coach reads for the debrief of `table`, a practice negotiation that has ended. */
export async function coachMaterial(app: App, table: string) {
  const { session, prompt } = await takeNewest(app, table, "coach", DEBRIEF_ASK);
  const read = ok(await app.api.coach.table({ session, prompt }));
  if (!("table" in read)) throw new Error("Expected the debrief of one person");
  return read;
}

/** What the coach reads for the debrief of every side of `table`, a negotiation between people that has ended. */
export async function jointCoachMaterial(app: App, table: string) {
  const { session, prompt } = await takeNewest(app, table, "coach", JOINT_DEBRIEF_ASK);
  const read = ok(await app.api.coach.table({ session, prompt }));
  if (!("sides" in read)) throw new Error("Expected the debrief of every side");
  return read;
}
