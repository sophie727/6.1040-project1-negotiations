import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, now, reaction, when, whether, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { counterpartRole } from "./counterpart.ts";
import { settledTerms } from "./debrief.ts";
import { inputOf } from "./reusable/inputs.ts";
import { began, type Ending, ended, forEachEnding, occupant, seatedAs } from "./table.ts";

const { Briefing, Rating, Reviewing, Sessioning, Tabling } = concepts;

// Rating

/**
 * When a negotiation between people ends in the given way, everyone at the table gets a result: how much of what a
 * deal could add theirs created, and how much of what it created they claimed. Without a deal, everyone gets their
 * BATNA. A table with the AI counterpart, or one that never began, isn't rated.
 */
function recordRatingsWhen(ended: Ending) {
  return reaction(({ table, instant, scenario, role, person, batna, jointBatna, best, terms, points, jointPoints }) =>
    when(ended(table))
      .where(
        now(instant),
        began({ table }),
        no(counterpartRole({ table })),
        Tabling._table({ table }).is({ scenario }),
        Tabling._seats({ table }).is({ role, negotiator: person }),
        Briefing._role({ role }).is({ batna }),
        Briefing._jointBatna({ scenario }).is({ jointBatna }),
        whether(Briefing._wholePie({ scenario }).is({ jointPoints: best })),
      )
      .then(
        where(
          settledTerms({ table }).is({ terms }),
          Briefing._dealPayoff({ role, terms }).is({ points }),
          Briefing._dealJointPayoff({ scenario, terms }).is({ jointPoints }),
        )
          .then(Rating.record({ person, subject: table, points, batna, jointPoints, jointBatna, bestJointPoints: best, now: instant }))
          .named("deal"),
        where(no(settledTerms({ table })))
          .then(
            Rating.record({
              person,
              subject: table,
              points: batna,
              batna,
              jointPoints: jointBatna,
              jointBatna,
              bestJointPoints: best,
              now: instant,
            }),
          )
          .named("no-deal"),
      ),
  );
}

/** One reaction for each way a negotiation can end, all defined once by `recordRatingsWhen`. */
const RecordRatingsWhenEnded = forEachEnding(recordRatingsWhen);

// Reviewing

/**
 * Reviews the person in (role)'s seat at a table where the reviewer sat, once the negotiation has ended. Reviewing
 * refuses a review of yourself with SELF_REVIEW, stars outside 1 to 5 with INVALID_STARS, and a second review of the same
 * person for the same negotiation with ALREADY_REVIEWED.
 */
const Review = endpoint(
  "/tables/review",
  ({ session, table, role, stars, user, reviewee }) =>
    receive({ session, table, role, stars })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(
          seatedAs({ user, table }),
          ended({ table }),
          no(counterpartRole({ table })),
          occupant({ table, role }).is({ negotiator: reviewee }),
        )
          .then(Reviewing.review({ subject: table, reviewer: user, reviewee, stars }).responds({}))
          .then(respond({}))
          .named("ended"),
        where(seatedAs({ user, table }), no(ended({ table })))
          .then(respond({ error: "NOT_OVER" }))
          .named("not-over"),
        where(seatedAs({ user, table }), ended({ table }), counterpartRole({ table }))
          .then(respond({ error: "NOT_FOUND" }))
          .named("with-counterpart"),
        where(seatedAs({ user, table }), ended({ table }), no(counterpartRole({ table })), no(occupant({ table, role })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("nobody-there"),
        where(no(seatedAs({ user, table })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-seated"),
      ),
  { validators: { input: inputOf({ stars: "number" }) } },
);

export const composition = {
  rating: { RecordRatingsWhenEnded },
  reviewing: { Review },
};
