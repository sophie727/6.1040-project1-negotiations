import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { is, no, now, reaction, view, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { DECISION_ASK, REPLY_ASK } from "./asks.ts";
import { textInput } from "./reusable/inputs.ts";
import { tableAsSeenBy, underWay } from "./table.ts";

const { AgentSessioning, Briefing, Conversing, Proposing, Reasoning, Tabling, TimeLimitProposing } = concepts;

/** The player that takes the other seats at a practice table. The agent named `counterpart` plays it. */
export const COUNTERPART = "bot:counterpart";

/** The two questions the counterpart answers, defined with every agent's questions in `./asks.ts`. */
export { DECISION_ASK, REPLY_ASK } from "./asks.ts";

/** The role the counterpart plays at (table), if it has a seat there. */
export const counterpartRole = view("the role the counterpart plays at (table)", ({ table }, { role }) =>
  where(Tabling._seats({ table }).is({ role, negotiator: COUNTERPART })),
).optional();

/** A question that asks (ask) about (table) is waiting for the counterpart to take it. */
const hasWaitingQuestion = view("a question that asks (ask) about (table) is waiting", ({ table, ask }) =>
  where(Reasoning._about({ subject: table }).is({ ask, stage: "WAITING" })),
).holds();

// Asking

/** When someone else sends a message, the counterpart replies, unless a reply is already waiting to be written. */
const AskForReply = reaction(({ table, sender }) =>
  when(Conversing.send({ subject: table, sender }).responds({}))
    .where(
      counterpartRole({ table }),
      no(counterpartRole({ table }).is({ role: sender })),
      no(hasWaitingQuestion({ table, ask: REPLY_ASK })),
    )
    .then(Reasoning.prompt({ subject: table, ask: REPLY_ASK })),
);

/** When someone else proposes, the counterpart decides, unless a decision is already waiting to be made. */
const AskForDecision = reaction(({ table, proposer }) =>
  when(Proposing.propose({ subject: table, proposer }).responds({}))
    .where(
      counterpartRole({ table }),
      no(counterpartRole({ table }).is({ role: proposer })),
      no(hasWaitingQuestion({ table, ask: DECISION_ASK })),
    )
    .then(Reasoning.prompt({ subject: table, ask: DECISION_ASK })),
);

// Starting

/**
 * When someone else suggests how long to negotiate, the counterpart agrees at once: it has nothing to read, so it is
 * always ready, and at a practice table the person's suggestion starts the clock.
 */
const AgreeToAnyStart = reaction(({ table, proposer, proposal, role }) =>
  when(TimeLimitProposing.propose({ subject: table, proposer }).responds({ proposal }))
    .where(counterpartRole({ table }).is({ role }), no(counterpartRole({ table }).is({ role: proposer })))
    .then(TimeLimitProposing.accept({ proposal, party: role })),
);

// Reading

/** The table a prompt is about, as the counterpart sees it, for the agent that took the prompt. A person's session is refused by `AgentSessioning.use`. */
const ReadTable = endpoint(
  "/counterpart/table",
  ({ session, prompt, agent, table, role }) =>
    receive({ session, prompt })
      .then(AgentSessioning.use({ session }).responds({ subject: agent }))
      .then(
        where(Reasoning._taken({ reasoner: agent }).is({ prompt, subject: table }), counterpartRole({ table }).is({ role }))
          .then(respond({ table: tableAsSeenBy({ table, role }) }))
          .named("seated"),
        where(Reasoning._taken({ reasoner: agent }).is({ prompt, subject: table }), no(counterpartRole({ table })))
          .then(respond({ error: "NOT_SEATED" }))
          .named("not-seated"),
        where(no(Reasoning._taken({ reasoner: agent }).is({ prompt })))
          .then(respond({ error: "NOT_TAKEN" }))
          .named("not-taken"),
      ),
  { validators: { input: textInput } },
);

// Answering

/**
 * Each line of the counterpart's reply is its next message, in order, while the negotiation is under way. The agent
 * puts each paragraph on its own line, and splits one too long for a message, so a long reply arrives in parts.
 */
const SendReply = reaction(({ prompt, table, part, role, instant }) =>
  when(Reasoning.conclude({ prompt }).responds({ subject: table, ask: REPLY_ASK }))
    .where(
      now(instant),
      Reasoning._lines({ prompt }).is({ line: part }),
      counterpartRole({ table }).is({ role }),
      underWay({ table, instant }),
    )
    .then(Conversing.send({ subject: table, sender: role, body: part, now: instant })),
);

/** What the counterpart says about a proposal it answers, from the third line on, is its next message or messages. */
const SayWhy = reaction(({ prompt, table, remark, position, role, instant }) =>
  when(Reasoning.conclude({ prompt }).responds({ subject: table, ask: DECISION_ASK }))
    .where(
      now(instant),
      Reasoning._lines({ prompt }).is({ line: remark, position }),
      is.ge(position, 2),
      counterpartRole({ table }).is({ role }),
      underWay({ table, instant }),
    )
    .then(Conversing.send({ subject: table, sender: role, body: remark, now: instant })),
);

/** The counterpart accepts the proposal it decided to accept, if that proposal is still pending and worth at least its BATNA. */
const AcceptForCounterpart = reaction(({ prompt, table, proposal, terms, role, points, batna, instant }) =>
  when(Reasoning.conclude({ prompt }).responds({ subject: table, ask: DECISION_ASK }))
    .where(
      now(instant),
      Reasoning._lines({ prompt }).is({ line: "ACCEPT", position: 0 }),
      Reasoning._lines({ prompt }).is({ line: proposal, position: 1 }),
      Proposing._proposal({ proposal }).is({ subject: table, terms, status: "PENDING" }),
      counterpartRole({ table }).is({ role }),
      Briefing._dealPayoff({ role, terms }).is({ points }),
      Briefing._role({ role }).is({ batna }),
      is.ge(points, batna),
      underWay({ table, instant }),
    )
    .then(Proposing.accept({ proposal, party: role })),
);

/**
 * The counterpart rejects the proposal it decided to reject, if that proposal is still pending. It also rejects a
 * proposal it decided to accept that is worth less than its BATNA, so it never agrees to less than its alternative.
 */
const RejectForCounterpart = reaction(({ prompt, table, proposal, terms, role, points, batna, instant }) =>
  when(Reasoning.conclude({ prompt }).responds({ subject: table, ask: DECISION_ASK }))
    .where(
      now(instant),
      Reasoning._lines({ prompt }).is({ line: proposal, position: 1 }),
      Proposing._proposal({ proposal }).is({ subject: table, status: "PENDING" }),
      counterpartRole({ table }).is({ role }),
      underWay({ table, instant }),
    )
    .then(
      where(Reasoning._lines({ prompt }).is({ line: "REJECT", position: 0 }))
        .then(Proposing.reject({ proposal, party: role }))
        .named("decided"),
      where(
        Reasoning._lines({ prompt }).is({ line: "ACCEPT", position: 0 }),
        Proposing._proposal({ proposal }).is({ terms }),
        Briefing._dealPayoff({ role, terms }).is({ points }),
        Briefing._role({ role }).is({ batna }),
        is.lt(points, batna),
      )
        .then(Proposing.reject({ proposal, party: role }))
        .named("below-batna"),
    ),
);

export const composition = {
  asking: { counterpartRole, hasWaitingQuestion, AskForReply, AskForDecision },
  starting: { AgreeToAnyStart },
  reading: { ReadTable },
  answering: { SendReply, SayWhy, AcceptForCounterpart, RejectForCounterpart },
};
