import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, is, no, view, whether, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { textInput } from "./reusable/inputs.ts";
import { issuesOf, seatedAs } from "./table.ts";

const { Briefing, Proposing, Sessioning, Tabling } = concepts;

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

const ShowDebrief = endpoint(
  "/tables/debrief",
  ({ session, table, user, role }) =>
    receive({ session, table })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(seatedAs({ user, table }).is({ role }), ended({ table }))
          .then(respond({ role, debrief: debriefOf({ table }) }))
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
  showing: { debriefOf, ShowDebrief },
};
