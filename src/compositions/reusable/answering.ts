// Copied from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng.
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../../concepts.ts";
import { textInput } from "./inputs.ts";

const { AgentSessioning, Reasoning } = concepts;

// Finding

/** The prompts no reasoner has taken, oldest first, with what each one asks. */
const waitingPrompts = former("the waiting prompts", (_input, { prompt, ask }) =>
  each(Reasoning._waiting({}).is({ prompt, ask })).form({ prompt, ask }),
);

/** The prompts (agent) took and hasn't concluded or abandoned. The agent abandons those it isn't answering, such as after a restart. */
const promptsTakenBy = former("the prompts (agent) has taken and not finished", ({ agent }, { prompt }) =>
  each(Reasoning._taken({ reasoner: agent }).is({ prompt })).form({ prompt }),
);

/** The waiting prompts, and the prompts this agent took and hasn't finished. */
const ShowOpen = endpoint(
  "/answers/open",
  ({ session, agent }) =>
    receive({ session })
      .then(AgentSessioning.use({ session }).responds({ subject: agent }))
      .then(respond({ waiting: waitingPrompts({}), taken: promptsTakenBy({ agent }) })),
  { validators: { input: textInput } },
);

// Writing

const Take = endpoint(
  "/answers/take",
  ({ session, prompt, agent }) =>
    receive({ session, prompt })
      .then(AgentSessioning.use({ session }).responds({ subject: agent }))
      .then(Reasoning.take({ prompt, reasoner: agent }).responds({}))
      .then(respond({ prompt })),
  { validators: { input: textInput } },
);

const Extend = endpoint(
  "/answers/extend",
  ({ session, prompt, text, agent }) =>
    receive({ session, prompt, text })
      .then(AgentSessioning.use({ session }).responds({ subject: agent }))
      .then(Reasoning.extend({ prompt, reasoner: agent, text }).responds({}))
      .then(respond({})),
  { validators: { input: textInput } },
);

const Conclude = endpoint(
  "/answers/conclude",
  ({ session, prompt, agent }) =>
    receive({ session, prompt })
      .then(AgentSessioning.use({ session }).responds({ subject: agent }))
      .then(Reasoning.conclude({ prompt, reasoner: agent }).responds({}))
      .then(respond({})),
  { validators: { input: textInput } },
);

// Abandoning

const Abandon = endpoint(
  "/answers/abandon",
  ({ session, prompt, reason, agent }) =>
    receive({ session, prompt, reason })
      .then(AgentSessioning.use({ session }).responds({ subject: agent }))
      .then(
        where(Reasoning._taken({ reasoner: agent }).is({ prompt }))
          .then(Reasoning.abandon({ prompt, reason }).responds({}))
          .then(respond({}))
          .named("taken"),
        where(no(Reasoning._taken({ reasoner: agent }).is({ prompt })))
          .then(respond({ error: "NOT_TAKEN" }))
          .named("not-taken"),
      ),
  { validators: { input: textInput } },
);

export const composition = {
  finding: { waitingPrompts, promptsTakenBy, ShowOpen },
  writing: { Take, Extend, Conclude },
  abandoning: { Abandon },
};
