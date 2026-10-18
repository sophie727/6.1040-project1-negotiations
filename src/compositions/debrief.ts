import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, is, no, reaction, view, when, whether, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { counterpartRole } from "./counterpart.ts";
import { textInput } from "./reusable/inputs.ts";
import { issuesOf, seatedAs, tableAsSeenBy } from "./table.ts";

const { AgentSessioning, Briefing, Proposing, Reasoning, Sessioning, Tabling } = concepts;

/**
 * The question the coach answers when a practice negotiation ends. The reactions below, the debrief's former, and the
 * agent in `src/agents/coach.ts` match prompts by this exact text.
 */
export const DEBRIEF_ASK = "How did the person negotiate, and what could they do better next time?";

/** (table) has ended: in an agreement, with someone walking away, or with time running out. */
const ended = view("(table) has ended", ({ table }, _outputs, { status }) =>
  where(Tabling._table({ table }).is({ status }), is.among(status, ["SETTLED", "WITHDRAWN", "EXPIRED"])),
).holds();

/**
 * The terms (table) settled on. Tabling decides how a negotiation ended, so an agreement counts only when the table
 * settled: one reached at the moment time ran out, after the table expired, doesn't.
 */
const settledTerms = view("the terms (table) settled on", ({ table }, { terms }) =>
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

/** When a practice negotiation is settled, the coach is asked for a debrief. */
const CoachWhenSettled = reaction(({ table }) =>
  when(Tabling.settle({ table }).responds({}))
    .where(counterpartRole({ table }))
    .then(Reasoning.prompt({ subject: table, ask: DEBRIEF_ASK })),
);

/** When someone walks away from a practice negotiation, the coach is asked for a debrief. */
const CoachWhenWithdrawn = reaction(({ table }) =>
  when(Tabling.withdraw({ table }).responds({}))
    .where(counterpartRole({ table }))
    .then(Reasoning.prompt({ subject: table, ask: DEBRIEF_ASK })),
);

/** When a practice negotiation runs out of time, the coach is asked for a debrief. */
const CoachWhenExpired = reaction(({ table }) =>
  when(Tabling.expire({ table }).responds({}))
    .where(counterpartRole({ table }))
    .then(Reasoning.prompt({ subject: table, ask: DEBRIEF_ASK })),
);

/** The table that the debrief question (prompt), taken by (agent), is about. */
const debriefTakenBy = view("the table of the debrief (prompt) that (agent) took", ({ agent, prompt }, { table }) =>
  where(Reasoning._taken({ reasoner: agent }).is({ prompt, subject: table }), Reasoning._about({ subject: table }).is({ prompt, ask: DEBRIEF_ASK })),
).optional();

/**
 * What the coach reads for a debrief it took: the table as the person saw it, and the whole pie. A person's session is
 * refused by `AgentSessioning.use`, and any prompt but a debrief the agent took is refused with NOT_TAKEN.
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
        where(no(debriefTakenBy({ agent, prompt })))
          .then(respond({ error: "NOT_TAKEN" }))
          .named("not-taken"),
      ),
  { validators: { input: textInput } },
);

/** The coach's debriefs of (table), oldest first: normally one, with its answer so far, its stage, and why it was abandoned if it was. */
const coachingOf = former("the coach's debriefs of (table)", ({ table }, { prompt, answer, stage, reason }) =>
  each(Reasoning._about({ subject: table }).is({ prompt, ask: DEBRIEF_ASK, answer, stage }))
    .where(whether(Reasoning._reason({ prompt }).is({ reason })))
    .form({ answer, stage, reason }),
);

// Showing

const ShowDebrief = endpoint(
  "/tables/debrief",
  ({ session, table, user, role }) =>
    receive({ session, table })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(seatedAs({ user, table }).is({ role }), ended({ table }))
          .then(respond({ role, debrief: debriefOf({ table }), coaching: coachingOf({ table }) }))
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
  outcome: { ended, settledTerms, walkedAway },
  coaching: { personRole, CoachWhenSettled, CoachWhenWithdrawn, CoachWhenExpired, debriefTakenBy, ReadDebrief, coachingOf },
  showing: { debriefOf, ShowDebrief },
};
