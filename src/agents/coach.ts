/** The coach, the other agent here: when a practice negotiation ends, it writes the person a debrief. */
import { DEBRIEF_ASK } from "../compositions/debrief.ts";
import type { TableMaterial } from "./counterpart.ts";
import { createAgent, type Reasoner, ReasonerFailure } from "./reusable/agent.ts";
import type { Model } from "./reusable/models.ts";
import { agreedOn, describeTerms, nameOf, otherNames, transcript } from "./wording.ts";

type Terms = Readonly<Record<string, string | number>>;

/** What the coach reads: the table as the person saw it, and the whole pie, which reveals the other side's points. */
export interface DebriefMaterial {
  table: TableMaterial;
  debrief: {
    outcome: string;
    agreed: Terms | null;
    walkedAway: string | null;
    best: Terms | null;
    bestJointPoints: number | null;
    jointBatna: number | null;
    roles: readonly {
      role: string;
      name: string;
      batna: number;
      points: number | null;
      bestPoints: number | null;
      payoffs: readonly { option: string; points: number }[];
    }[];
  };
}

type Result<T> = Promise<T | { error: string }>;

/** The endpoint the coach reads debriefs through. The generated client has it, and tsc checks that it does. */
interface CoachClient {
  coach: {
    table(input: { session: string; prompt: string }): Result<DebriefMaterial>;
  };
}

/** Reads what a debrief prompt is about through `/coach/table`. */
export async function readDebrief(api: CoachClient, prompt: string, session: string): Promise<DebriefMaterial> {
  const read = await api.coach.table({ session, prompt });
  if ("error" in read) throw new ReasonerFailure("The negotiation couldn't be read.");
  return read;
}

/** The coach answers the debrief question about each practice table once it ends. */
export function createCoach(reasoner: Reasoner<DebriefMaterial>) {
  return createAgent({ name: "coach", asks: [DEBRIEF_ASK], reasoner, read: readDebrief });
}

/**
 * What each side ended up with, and the two scores: how much of what a deal could add over walking away this one
 * added, and how much of what it added went to the person. A score is null when there was nothing to divide.
 */
export function results({ table, debrief }: DebriefMaterial) {
  const got = ({ points, batna }: { points: number | null; batna: number }) => points ?? batna;
  const you = debrief.roles.find(({ role }) => role === table.role);
  const others = debrief.roles.filter(({ role }) => role !== table.role);
  const yours = you === undefined ? 0 : got(you);
  const theirs = others.reduce((sum, role) => sum + got(role), 0);
  const joint = yours + theirs;
  const { bestJointPoints: best, jointBatna: noDeal } = debrief;
  const created = best !== null && noDeal !== null && best > noDeal ? (joint - noDeal) / (best - noDeal) : null;
  const claimed = noDeal !== null && you !== undefined && joint > noDeal ? (yours - you.batna) / (joint - noDeal) : null;
  return { yours, theirs, joint, created, claimed };
}

const percent = (share: number) => `${Math.round(share * 100)}%`;
const points = (value: number) => Math.round(value).toLocaleString("en-US");

/**
 * How much value the deal created and how much of it the person claimed, in a sentence about `person`. A deal can do
 * worse than walking away, for both sides together or for the person alone, and then the sentence says so in words.
 */
function valueInWords(material: DebriefMaterial, person: "you" | "the student"): string {
  const { created, claimed } = results(material);
  if (created === null || material.debrief.agreed === null) return "";
  const { them, their } = person === "you" ? { them: "you", their: "your" } : { them: "them", their: "their" };
  if (created < 0) return `Together, ${person} and the other side did worse than walking away: the deal was worth less to both of ${them} than ${their} BATNAs.`;
  const createdWords = `The deal created ${percent(created)} of the value a deal could add over walking away`;
  if (claimed === null) return `${createdWords}.`;
  if (claimed < 0) return `${createdWords}, but ${person} got less than ${their} own BATNA, so walking away would have been better for ${them}.`;
  return `${createdWords}, and ${person} claimed ${percent(claimed)} of the value it created.`;
}

/** How the negotiation ended, with the person called `person`. */
function ending({ table, debrief }: DebriefMaterial, person: "You" | "The student"): string {
  const others = otherNames(table);
  if (debrief.outcome === "SETTLED") return `${person} and ${others} reached a deal.`;
  if (debrief.outcome === "WITHDRAWN") return debrief.walkedAway === table.role ? `${person} walked away.` : `${others} walked away.`;
  return `Time ran out before ${person === "You" ? "you" : "they"} reached a deal.`;
}

/** The stand-in coach, for tests and for working offline: the outcome and the scores, in a few sentences. */
export function scriptedDebrief(_ask: string, material: DebriefMaterial): string {
  const { debrief } = material;
  const { yours, theirs, joint } = results(material);
  const others = otherNames(material.table);
  const lines = [`**How it ended.** ${ending(material, "You")} You got ${points(yours)} points, and ${others} got ${points(theirs)}.`];
  if (debrief.bestJointPoints === null) {
    lines.push("**The whole pie.** No deal could have beaten both of your BATNAs, so walking away was the right call.");
  } else {
    const left = Math.max(0, Math.round(debrief.bestJointPoints) - Math.round(joint));
    lines.push(
      `**The whole pie.** The best deal possible was worth ${points(debrief.bestJointPoints)} points to the two of you together. ` +
        (left === 0 ? "Yours was just as big: nothing was left on the table." : `Yours was worth ${points(joint)}, so ${points(left)} points were left on the table.`),
    );
  }
  const value = valueInWords(material, "you");
  if (value) lines.push(`**Value.** ${value}`);
  lines.push("“What you could've done” shows, issue by issue, how your deal differs from the best one.");
  return lines.join("\n\n");
}

const COACH = `You are a negotiation coach. A student has just finished a practice negotiation against an AI counterpart, and you write them a short debrief: specific, honest, and encouraging, addressed to them as "you". Base every claim on the facts you're given; don't invent moments that didn't happen.`;

/** Everything the coach knows about a negotiation, for the model. */
export function debriefPrompt(material: DebriefMaterial): string {
  const { table, debrief } = material;
  const others = otherNames(table);
  const call = (role: string) => (role === table.role ? `The student (${table.roleName})` : `${nameOf(table, role)} (the AI)`);
  const valued = debrief.roles
    .map(({ role, name, batna, payoffs }) => {
      const worth = (option: string) => payoffs.find((payoff) => payoff.option === option)?.points ?? 0;
      const issues = table.issues.map(
        (issue) => `  ${issue.name}: ${issue.options.map(({ option, name: optionName }) => `${optionName} = ${worth(option)}`).join(", ")}`,
      );
      return `${role === table.role ? `The student, as ${name}` : `${name}, the AI`} (BATNA ${points(batna)} points):\n${issues.join("\n")}`;
    })
    .join("\n\n");
  const { yours, theirs, joint } = results(material);
  const outcome = [
    ending(material, "The student"),
    debrief.agreed === null
      ? "With no agreement, each side got its BATNA."
      : `The agreement: ${describeTerms(table.issues, debrief.agreed)}. It gave the student ${points(yours)} points and ${others} ${points(theirs)}.`,
    debrief.best === null || debrief.bestJointPoints === null
      ? "No deal could have given both sides at least their BATNAs."
      : `The best deal possible (the whole pie): ${describeTerms(table.issues, debrief.best)}, worth ${points(debrief.bestJointPoints)} points to both together. The student's outcome added up to ${points(joint)}.`,
    valueInWords(material, "the student"),
  ]
    .filter(Boolean)
    .join(" ");
  const differences =
    debrief.agreed === null || debrief.best === null
      ? ""
      : table.issues
          .filter((issue) => debrief.agreed?.[issue.issue] !== debrief.best?.[issue.issue])
          .map((issue) => `  ${issue.name}: agreed ${agreedOn(issue, debrief.agreed?.[issue.issue])}, best ${agreedOn(issue, debrief.best?.[issue.issue])}`)
          .join("\n");
  return `The scenario is "${table.scenarioName}". The student played ${table.roleName}, and the AI played ${others}.

What each option was worth to each side, in points (each side saw only its own):
${valued}

How it ended: ${outcome}
${differences ? `\nWhere the agreement differed from the best deal:\n${differences}\n` : ""}
The conversation and proposals, in order (points are the student's):
${transcript(table, call, "the student")}

Write the debrief in Markdown, in at most 220 words, with three short sections titled "What went well", "What to work on", and "The trade you missed". In the last one, explain the most valuable trade the student missed in terms of what each side cared about; if the deal was already the best possible, say so there instead. Point to specific moments in the conversation.`;
}

/** The coach played by `model`, which streams the debrief into the page as it writes. */
export function modelCoach(model: Model): Reasoner<DebriefMaterial> {
  return {
    name: model.name,
    // Room for the model's thinking as well as the debrief, which the prompt keeps short.
    answer: (_ask, material, write) => model.reply({ system: COACH, prompt: debriefPrompt(material), maxTokens: 8192 }, write),
  };
}
