import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, is, no, now, reaction, view, when, where } from "@mit-sdg/sync-engine/language";
import { computations, concepts } from "../concepts.ts";
import { DECISION_ASK, FOLLOW_UP_ASK, REPLY_ASK } from "./asks.ts";
import { textInput } from "./reusable/inputs.ts";
import { tableAsSeenBy, underWay } from "./table.ts";

const { AgentSessioning, Briefing, Conversing, Proposing, Reasoning, Tabling, TimeLimitProposing } = concepts;
const { isCounterpart } = computations;

/**
 * The player that takes a seat at a practice table for the AI. The agent named `counterpart` plays it, and the other
 * counterparts that take any further seats, each named for its role by `counterpartFor`.
 */
export const COUNTERPART = "bot:counterpart";

/** The three questions the counterpart answers, defined with every agent's questions in `./asks.ts`. */
export { DECISION_ASK, FOLLOW_UP_ASK, REPLY_ASK } from "./asks.ts";

/** The roles the counterparts play at (table): every seat an AI counterpart has taken. */
export const counterpartRole = view("a role a counterpart plays at (table)", ({ table }, { role }, { negotiator }) =>
  where(Tabling._seats({ table }).is({ role, negotiator }), isCounterpart({ negotiator })),
);

/** A question that asks (ask) about (table) is waiting for the counterpart to take it. */
const hasWaitingQuestion = view("a question that asks (ask) about (table) is waiting", ({ table, ask }) =>
  where(Reasoning._about({ subject: table }).is({ ask, stage: "WAITING" })),
).holds();

/** A counterpart at (table) has yet to answer (proposal): it didn't make the proposal, and hasn't accepted it. */
const owesAnswer = view("a counterpart at (table) has yet to answer (proposal)", ({ table, proposal }, _outputs, { role }) =>
  where(
    counterpartRole({ table }).is({ role }),
    Proposing._proposal({ proposal }).is.not({ proposer: role }),
    no(Proposing._acceptances({ proposal }).is({ party: role })),
  ),
).holds();

// Asking

/** When a person sends a message, a counterpart replies, unless a reply is already waiting to be written. */
const AskForReply = reaction(({ table, sender }) =>
  when(Conversing.send({ subject: table, sender }).responds({}))
    .where(
      counterpartRole({ table }),
      no(counterpartRole({ table }).is({ role: sender })),
      no(hasWaitingQuestion({ table, ask: REPLY_ASK })),
    )
    .then(Reasoning.prompt({ subject: table, ask: REPLY_ASK })),
);

/**
 * Once a counterpart's reply has been sent, at a table with another counterpart, the counterpart is asked whether
 * another one adds something, unless that question is already waiting. Each reply to it asks again, until no
 * counterpart has anything to add.
 */
const AskForFollowUp = reaction(({ prompt, table, ask, role }) =>
  when(Reasoning.conclude({ prompt }).responds({ subject: table, ask }))
    .afterFlowSettles()
    .where(
      is.among(ask, [REPLY_ASK, FOLLOW_UP_ASK]),
      Reasoning._lines({ prompt }).is({ line: role, position: 0 }),
      counterpartRole({ table }).is({ role }),
      counterpartRole({ table }).is.not({ role }),
      no(hasWaitingQuestion({ table, ask: FOLLOW_UP_ASK })),
    )
    .then(Reasoning.prompt({ subject: table, ask: FOLLOW_UP_ASK })),
);

/** When a person proposes, a counterpart decides, unless a decision is already waiting to be made. */
const AskForDecision = reaction(({ table, proposer }) =>
  when(Proposing.propose({ subject: table, proposer }).responds({}))
    .where(
      counterpartRole({ table }),
      no(counterpartRole({ table }).is({ role: proposer })),
      no(hasWaitingQuestion({ table, ask: DECISION_ASK })),
    )
    .then(Reasoning.prompt({ subject: table, ask: DECISION_ASK })),
);

/**
 * When a counterpart accepts a proposal that still waits for another counterpart's answer, the counterpart is asked
 * again, unless a decision is already waiting to be made, so each counterpart decides in turn.
 */
const AskForNextDecision = reaction(({ proposal, party, table }) =>
  when(Proposing.accept({ proposal, party }).responds({ subject: table, status: "PENDING" }))
    .afterFlowSettles()
    .where(
      counterpartRole({ table }).is({ role: party }),
      owesAnswer({ table, proposal }),
      no(hasWaitingQuestion({ table, ask: DECISION_ASK })),
    )
    .then(Reasoning.prompt({ subject: table, ask: DECISION_ASK })),
);

// Starting

/**
 * When someone else suggests how long to negotiate, every counterpart at the table agrees at once: it has nothing to
 * read, so it is always ready, and at a practice table the person's suggestion starts the clock.
 */
const AgreeToAnyStart = reaction(({ table, proposer, proposal, role }) =>
  when(TimeLimitProposing.propose({ subject: table, proposer }).responds({ proposal }))
    .where(counterpartRole({ table }).is({ role }), no(counterpartRole({ table }).is({ role: proposer })))
    .then(TimeLimitProposing.accept({ proposal, party: role })),
);

// Reading

/** (table) as each counterpart there sees it, one view for each of their seats. */
const tablesAsCounterpartsSeeIt = former("(table) as each counterpart there sees it", ({ table }, { role }) =>
  each(counterpartRole({ table }).is({ role }))
    .form({})
    .splicing(tableAsSeenBy({ table, role })),
);

/**
 * The table a prompt is about, as each counterpart there sees it, for the agent that took the prompt. A person's
 * session is refused by `AgentSessioning.use`.
 */
const ReadTable = endpoint(
  "/counterpart/table",
  ({ session, prompt, agent, table }) =>
    receive({ session, prompt })
      .then(AgentSessioning.use({ session }).responds({ subject: agent }))
      .then(
        where(Reasoning._taken({ reasoner: agent }).is({ prompt, subject: table }), counterpartRole({ table }))
          .then(respond({ tables: tablesAsCounterpartsSeeIt({ table }) }))
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
 * Each line of a counterpart's reply after the first, which names the role replying, is that role's next message, in
 * order, while the negotiation is under way. The agent puts each paragraph on its own line, and splits one too long for
 * a message, so a long reply arrives in parts.
 */
const SendReply = reaction(({ prompt, table, ask, part, position, role, instant }) =>
  when(Reasoning.conclude({ prompt }).responds({ subject: table, ask }))
    .where(
      is.among(ask, [REPLY_ASK, FOLLOW_UP_ASK]),
      now(instant),
      Reasoning._lines({ prompt }).is({ line: role, position: 0 }),
      counterpartRole({ table }).is({ role }),
      Reasoning._lines({ prompt }).is({ line: part, position }),
      is.ge(position, 1),
      underWay({ table, instant }),
    )
    .then(Conversing.send({ subject: table, sender: role, body: part, now: instant })),
);

/** What a counterpart says about a proposal it answers, from the fourth line on, is its next message or messages. */
const SayWhy = reaction(({ prompt, table, remark, position, role, instant }) =>
  when(Reasoning.conclude({ prompt }).responds({ subject: table, ask: DECISION_ASK }))
    .where(
      now(instant),
      Reasoning._lines({ prompt }).is({ line: role, position: 0 }),
      counterpartRole({ table }).is({ role }),
      Reasoning._lines({ prompt }).is({ line: remark, position }),
      is.ge(position, 3),
      underWay({ table, instant }),
    )
    .then(Conversing.send({ subject: table, sender: role, body: remark, now: instant })),
);

/**
 * A counterpart accepts the proposal it decided to accept, if that proposal is still pending, the counterpart hasn't
 * accepted it already, and it is worth at least the counterpart's BATNA.
 */
const AcceptForCounterpart = reaction(({ prompt, table, proposal, terms, role, points, batna, instant }) =>
  when(Reasoning.conclude({ prompt }).responds({ subject: table, ask: DECISION_ASK }))
    .where(
      now(instant),
      Reasoning._lines({ prompt }).is({ line: role, position: 0 }),
      Reasoning._lines({ prompt }).is({ line: "ACCEPT", position: 1 }),
      Reasoning._lines({ prompt }).is({ line: proposal, position: 2 }),
      counterpartRole({ table }).is({ role }),
      Proposing._proposal({ proposal }).is({ subject: table, terms, status: "PENDING" }),
      no(Proposing._acceptances({ proposal }).is({ party: role })),
      Briefing._dealPayoff({ role, terms }).is({ points }),
      Briefing._role({ role }).is({ batna }),
      is.ge(points, batna),
      underWay({ table, instant }),
    )
    .then(Proposing.accept({ proposal, party: role })),
);

/**
 * A counterpart rejects the proposal it decided to reject, if that proposal is still pending. It also rejects a
 * proposal it decided to accept that is worth less than its BATNA, so it never agrees to less than its alternative.
 */
const RejectForCounterpart = reaction(({ prompt, table, proposal, terms, role, points, batna, instant }) =>
  when(Reasoning.conclude({ prompt }).responds({ subject: table, ask: DECISION_ASK }))
    .where(
      now(instant),
      Reasoning._lines({ prompt }).is({ line: role, position: 0 }),
      Reasoning._lines({ prompt }).is({ line: proposal, position: 2 }),
      counterpartRole({ table }).is({ role }),
      Proposing._proposal({ proposal }).is({ subject: table, status: "PENDING" }),
      underWay({ table, instant }),
    )
    .then(
      where(Reasoning._lines({ prompt }).is({ line: "REJECT", position: 1 }))
        .then(Proposing.reject({ proposal, party: role }))
        .named("decided"),
      where(
        Reasoning._lines({ prompt }).is({ line: "ACCEPT", position: 1 }),
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
  asking: { counterpartRole, hasWaitingQuestion, owesAnswer, AskForReply, AskForFollowUp, AskForDecision, AskForNextDecision },
  starting: { AgreeToAnyStart },
  reading: { tablesAsCounterpartsSeeIt, ReadTable },
  answering: { SendReply, SayWhy, AcceptForCounterpart, RejectForCounterpart },
};
