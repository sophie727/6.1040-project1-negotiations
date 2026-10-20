import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, is, no, reaction, view, when, whether, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { DEBRIEF_ASK, JOINT_DEBRIEF_ASK } from "./asks.ts";
import { counterpartRole } from "./counterpart.ts";
import { textInput } from "./reusable/inputs.ts";
import { began, type Ending, ended, forEachEnding, issuesOf, seatedAs, tableAsSeenBy } from "./table.ts";

const { AgentSessioning, Briefing, Proposing, Reasoning, Registering, Reviewing, Sessioning, Tabling } = concepts;

/** The two questions the coach answers, defined with every agent's questions in `./asks.ts`. */
export { DEBRIEF_ASK, JOINT_DEBRIEF_ASK } from "./asks.ts";

/**
 * The terms (table) settled on. Tabling decides how a negotiation ended, so an agreement counts only when the table
 * settled: one reached at the moment time ran out, after the table expired, doesn't.
 */
export const settledTerms = view("the terms (table) settled on", ({ table }, { terms }) =>
  where(Tabling._table({ table }).is({ status: "SETTLED" }), Proposing._agreement({ subject: table }).is({ terms })),
).optional();

/** The role of whoever walked away from (table). */
const walkedAway = view("the role that walked away from (table)", ({ table }, { role }, { negotiator }) =>
  where(
    Tabling._table({ table }).is({ status: "WITHDRAWN", withdrawnBy: negotiator }),
    Tabling._seats({ table }).is({ role, negotiator }),
  ),
).optional();

/**
 * The whole pie of (table): how it ended, the terms agreed on if it settled, and the best deal the scenario allowed,
 * with each role's BATNA and its points from both. Without an agreement, each role gets its BATNA. When no deal could
 * have given every role at least its BATNA, the best deal is null. Now that the negotiation is over, it also reveals the
 * scenario's issues and every role's points for each option, so the page can show what each issue was worth to each side.
 */
const debriefOf = former(
  "the debrief of (table)",
  (
    { table },
    {
      scenario,
      outcome,
      agreed,
      quitter,
      best,
      bestJointPoints,
      jointBatna,
      role,
      name,
      batna,
      points,
      bestPoints,
      option,
      optionPoints,
    },
  ) =>
    where(
      Tabling._table({ table }).is({ scenario, status: outcome }),
      whether(settledTerms({ table }).is({ terms: agreed })),
      whether(walkedAway({ table }).is({ role: quitter })),
      whether(Briefing._wholePie({ scenario }).is({ terms: best, jointPoints: bestJointPoints, jointBatna })),
    ).form({
      outcome,
      agreed,
      walkedAway: quitter,
      best,
      bestJointPoints,
      jointBatna,
      issues: issuesOf({ scenario }),
      roles: each(Briefing._roles({ scenario }).is({ role, name }))
        .where(
          Briefing._role({ role }).is({ batna }),
          whether(Briefing._dealPayoff({ role, terms: agreed }).is({ points })),
          whether(Briefing._dealPayoff({ role, terms: best }).is({ points: bestPoints })),
        )
        .form({
          role,
          name,
          batna,
          points,
          bestPoints,
          payoffs: each(Briefing._payoffs({ role }).is({ option, points: optionPoints })).form({ option, points: optionPoints }),
        }),
    }),
);

// Coaching

/** The role the person plays at (table): the seat the counterpart doesn't have. */
const personRole = view("the role the person plays at (table)", ({ table }, { role }) =>
  where(Tabling._seats({ table }).is({ role }), no(counterpartRole({ table }).is({ role }))),
).optional();

/**
 * When a negotiation that began ends in the given way, the coach is asked for a debrief: of the person, at a practice
 * table, or of each side, at a table between people.
 */
function coachWhen(ended: Ending) {
  return reaction(({ table }) =>
    when(ended(table))
      .where(began({ table }))
      .then(
        where(counterpartRole({ table }))
          .then(Reasoning.prompt({ subject: table, ask: DEBRIEF_ASK }))
          .named("practice"),
        where(no(counterpartRole({ table })))
          .then(Reasoning.prompt({ subject: table, ask: JOINT_DEBRIEF_ASK }))
          .named("between-people"),
      ),
  );
}

/** One reaction for each way a negotiation can end, all defined once by `coachWhen`. */
const CoachWhenEnded = forEachEnding(coachWhen);

/** The table that the debrief question (prompt), taken by (agent), is about. */
const debriefTakenBy = view("the table of the debrief (prompt) that (agent) took", ({ agent, prompt }, { table }) =>
  where(Reasoning._taken({ reasoner: agent }).is({ prompt, subject: table }), Reasoning._about({ subject: table }).is({ prompt, ask: DEBRIEF_ASK })),
).optional();

/** The table that the debrief of every side, question (prompt), taken by (agent), is about. */
const jointDebriefTakenBy = view("the table of the joint debrief (prompt) that (agent) took", ({ agent, prompt }, { table }) =>
  where(
    Reasoning._taken({ reasoner: agent }).is({ prompt, subject: table }),
    Reasoning._about({ subject: table }).is({ prompt, ask: JOINT_DEBRIEF_ASK }),
  ),
).optional();

/** Every side of (table), each with the table as that side saw it, for a debrief of every side. */
const sidesOf = former("every side of (table), as each saw it", ({ table }, { role }) =>
  each(Tabling._seats({ table }).is({ role })).form({ role, table: tableAsSeenBy({ table, role }) }),
);

/**
 * What the coach reads for a debrief it took: the table as the person saw it, or, for a debrief of every side, as each
 * side saw it, and the whole pie. A person's session is refused by `AgentSessioning.use`, and any prompt but a debrief
 * the agent took is refused with NOT_TAKEN.
 */
const ReadDebrief = endpoint(
  "/coach/table",
  ({ session, prompt, agent, table, person }) =>
    receive({ session, prompt })
      .then(AgentSessioning.use({ session }).responds({ subject: agent }))
      .then(
        where(debriefTakenBy({ agent, prompt }).is({ table }), ended({ table }), personRole({ table }).is({ role: person }))
          .then(respond({ table: tableAsSeenBy({ table, role: person }), debrief: debriefOf({ table }) }))
          .named("ended"),
        where(jointDebriefTakenBy({ agent, prompt }).is({ table }), ended({ table }))
          .then(respond({ sides: sidesOf({ table }), debrief: debriefOf({ table }) }))
          .named("joint"),
        where(no(debriefTakenBy({ agent, prompt })), no(jointDebriefTakenBy({ agent, prompt })))
          .then(respond({ error: "NOT_TAKEN" }))
          .named("not-taken"),
      ),
  { validators: { input: textInput } },
);

/** The coach's debriefs of (table), oldest first: normally one, with its answer so far, its stage, and why it was abandoned if it was. */
const coachingOf = former("the coach's debriefs of (table)", ({ table }, { prompt, ask, answer, stage, reason }) =>
  each(Reasoning._about({ subject: table }).is({ prompt, ask, answer, stage }))
    .where(is.among(ask, [DEBRIEF_ASK, JOINT_DEBRIEF_ASK]), whether(Reasoning._reason({ prompt }).is({ reason })))
    .form({ answer, stage, reason }),
);

// Showing

/**
 * The other people at (table), each with their username and the stars (user) gave them, if they've reviewed them yet.
 * The counterpart has no username, so it is never among them, and at a practice table nobody is.
 */
const reviewsBy = former("the people (user) can review at (table)", ({ user, table }, { role, negotiator, username, stars }) =>
  each(Tabling._seats({ table }).is({ role, negotiator }))
    .where(
      no(seatedAs({ user, table }).is({ role })),
      Registering._username({ user: negotiator }).is({ username }),
      whether(Reviewing._review({ subject: table, reviewer: user, reviewee: negotiator }).is({ stars })),
    )
    .form({ role, player: username, stars }),
);

const ShowDebrief = endpoint(
  "/tables/debrief",
  ({ session, table, user, role }) =>
    receive({ session, table })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(seatedAs({ user, table }).is({ role }), ended({ table }))
          .then(respond({ role, debrief: debriefOf({ table }), coaching: coachingOf({ table }), reviews: reviewsBy({ user, table }) }))
          .named("ended"),
        where(seatedAs({ user, table }), no(ended({ table })))
          .then(respond({ error: "NOT_OVER" }))
          .named("not-over"),
        where(no(seatedAs({ user, table })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-seated"),
      ),
  { validators: { input: textInput } },
);

export const composition = {
  outcome: { settledTerms, walkedAway },
  coaching: { personRole, CoachWhenEnded, debriefTakenBy, jointDebriefTakenBy, sidesOf, ReadDebrief, coachingOf },
  showing: { debriefOf, reviewsBy, ShowDebrief },
};
