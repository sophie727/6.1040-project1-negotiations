// Copied from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng.
/**
 * An agent that answers questions in Reasoning. It signs in to AgentSessioning, then calls the
 * endpoints of the reusable answering composition, as a person calls endpoints from the browser:
 * it takes a waiting prompt, reads what the prompt is about with `read`, calls `/answers/extend`
 * as the reasoner writes, and calls `/answers/conclude` when the reasoner finishes. Reactions in
 * the app apply a concluded answer.
 */
import type { OperationalEvent } from "@mit-sdg/sync-engine/assembly";

/** Writes an answer to `ask` about `material`, and passes each piece of it to `write` in order. */
export interface Reasoner<Material> {
  /** A name for the server's startup log, such as the model's. Reasoning records the agent's name instead. */
  name: string;
  answer(ask: string, material: Material, write: (text: string) => Promise<void>): Promise<void>;
}

/** An error whose message the agent uses as the reason when it abandons a prompt. */
export class ReasonerFailure extends Error {}

type Result<T> = Promise<T | { error: string }>;

/** The answering endpoints. The app's generated client has these, and tsc checks that it does. */
export interface AnsweringClient {
  answers: {
    open(input: { session: string }): Result<{
      waiting: readonly { prompt: string; ask: string }[];
      taken: readonly { prompt: string }[];
    }>;
    take(input: { session: string; prompt: string }): Result<object>;
    extend(input: { session: string; prompt: string; text: string }): Result<object>;
    conclude(input: { session: string; prompt: string }): Result<object>;
    abandon(input: { session: string; prompt: string; reason: string }): Result<object>;
  };
}

/** The assembled app, where the agent starts its session. */
interface AgentApplication {
  concepts: {
    AgentSessioning: { start(input: { subject: string }): Promise<{ session: string } | { error: string }> };
  };
}

export interface AgentOptions<Material, Api> {
  /** The agent's name: its subject in AgentSessioning, and the reasoner Reasoning records. */
  name: string;
  /** The questions this agent answers. It leaves every other prompt for another agent. */
  asks: readonly string[];
  reasoner: Reasoner<Material>;
  /** Reads what a prompt is about. Throws a ReasonerFailure, with a reason a person can read, when it can't. */
  read: (api: Api, prompt: string, session: string) => Promise<Material>;
}

/** How many prompts the agent answers at once. */
const AT_ONCE = 4;
/** How long the agent sleeps when nothing wakes it. It then looks for work anyway, in case a call failed. */
const SLEEP_MS = 10_000;

export function createAgent<Material, Api>({ name, asks, reasoner, read }: AgentOptions<Material, Api>) {
  let woken = false;
  let rouse = () => {};
  function wake() {
    woken = true;
    rouse();
  }

  /** Wakes the agent after each successful `Reasoning.prompt`. The event carries no data; the agent reads the prompts through `/answers/open`. */
  function observer(event: OperationalEvent) {
    if (event.type === "action-settled" && event.concept === "Reasoning" && event.action === "prompt" && event.result === "success") {
      wake();
    }
  }

  /** Looks for work, then sleeps until a prompt arrives, an answer finishes, or SLEEP_MS passes, and repeats until the server stops. */
  async function start({ application, api }: { application: AgentApplication; api: AnsweringClient & Api }) {
    let session: string | undefined;
    const answering = new Set<string>();

    async function signIn() {
      const started = await application.concepts.AgentSessioning.start({ subject: name });
      if ("error" in started) throw new Error(`${name} couldn't sign in: ${started.error}`);
      session = started.session;
      return session;
    }

    /** Calls an endpoint with the agent's session, and signs in again once if the session has ended. */
    async function withSession<T extends object>(call: (session: string) => Result<T>) {
      const result = await call(session ?? (await signIn()));
      if (!("error" in result) || result.error !== "NOT_SIGNED_IN") return result;
      return call(await signIn());
    }

    /** Reads what a taken prompt is about, writes the answer, and concludes it, or abandons it with a reason. */
    async function answer(prompt: string, ask: string) {
      try {
        const material = await read(api, prompt, session ?? (await signIn()));
        await reasoner.answer(ask, material, async (text) => {
          const extended = await withSession((session) => api.answers.extend({ session, prompt, text }));
          if ("error" in extended) throw new ReasonerFailure("The answer couldn't be saved.");
        });
        const concluded = await withSession((session) => api.answers.conclude({ session, prompt }));
        if ("error" in concluded) throw new ReasonerFailure("The answer couldn't be concluded.");
      } catch (error) {
        if (!(error instanceof ReasonerFailure)) console.error(`${name} failed while answering:`, error);
        const reason = error instanceof ReasonerFailure ? error.message : "Something went wrong while answering.";
        await withSession((session) => api.answers.abandon({ session, prompt, reason }));
      }
    }

    /** Abandons each prompt the agent took and isn't answering, left by a restart or a failed abandon, then takes waiting prompts up to AT_ONCE. */
    async function findWork() {
      const open = await withSession((session) => api.answers.open({ session }));
      if ("error" in open) throw new Error(`/answers/open returned ${open.error}`);
      for (const { prompt } of open.taken) {
        if (answering.has(prompt)) continue;
        await withSession((session) =>
          api.answers.abandon({ session, prompt, reason: "The agent stopped before the answer finished." }),
        );
      }
      for (const { prompt, ask } of open.waiting) {
        if (answering.size >= AT_ONCE) return; // Each answer that finishes wakes the agent.
        if (!asks.includes(ask)) continue;
        const taken = await withSession((session) => api.answers.take({ session, prompt }));
        if ("error" in taken) continue; // Another agent took it first, or it was closed.
        answering.add(prompt);
        answer(prompt, ask)
          .catch((error: unknown) => console.error(`${name} couldn't abandon a prompt:`, error))
          .finally(() => {
            answering.delete(prompt);
            wake();
          });
      }
    }

    for (;;) {
      woken = false;
      await findWork().catch((error: unknown) => console.error(`${name} couldn't reach its endpoints, and will try again:`, error));
      if (woken) continue; // A wake that came while findWork ran had no sleep to end, so look again now.
      await new Promise<void>((resolve) => {
        rouse = resolve;
        setTimeout(resolve, SLEEP_MS);
      });
    }
  }

  return { observer, start };
}
