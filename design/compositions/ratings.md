# Ratings

Negotiating with other people is rated, as chess is rated on chess.com, so a person can see whether they are getting better. P1's three ratings have different sources, so two concepts keep them. Rating keeps how much value each negotiation created and how much of it each person claimed, the moment the negotiation ends. Reviewing keeps what the people at a table say it was like to deal with each other, which they write afterwards, if they write it at all. Negotiating with the AI counterpart is practice, and never changes anyone's ratings.

## Rating each negotiation

When a negotiation between people ends, a reaction records a result for everyone at the table. A negotiation can end in three ways, each a different Tabling action, and a reaction watches exactly one action, so `RecordRatingsWhenEnded` is one definition registered three times: [when a table settles](reaction:ratings.rating.RecordRatingsWhenEnded.Settled), [when someone walks away](reaction:ratings.rating.RecordRatingsWhenEnded.Withdrawn), and [when time runs out](reaction:ratings.rating.RecordRatingsWhenEnded.Expired). sync-engine's `returned(...)` trigger can watch every action at once, but it binds only an action's whole input, not the table inside it, so it can't say which table ended.

Each rates only a table that [began](view:table.access.began), since a table someone left before its clock started was never negotiated, and only a table without [the counterpart](counterpart.md). For each seat, it passes Rating the role's points, its BATNA, the points of every role together, their BATNAs together, from `Briefing._jointBatna`, and the whole pie's joint points, when a deal could beat every BATNA. Rating works out the two shares itself. Create is how much of what the best deal could add over everyone's BATNAs this deal added, and claim is how much of what this deal added went to the person: the same two scores [the Whole Pie page](debrief.md#showing-the-whole-pie) shows. When the table [settled](view:debrief.outcome.settledTerms) (the `deal` path), the points are the agreement's. Otherwise (the `no-deal` path), everyone gets their BATNA, so the negotiation created nothing and left nothing to claim.

## Reviewing each other

The [review endpoint](reaction:ratings.reviewing.Review) lets someone who sat at a table review the person in another of its seats, by role, with 1 to 5 stars. It answers only once the negotiation [has ended](view:table.access.ended). Before then, it is refused with `NOT_OVER`, so a review can't be part of the negotiating. At a table with the counterpart, or for a seat nobody sat in, it is refused with `NOT_FOUND`, as is someone without a seat. Reviewing refuses a review of yourself with `SELF_REVIEW`, stars outside the scale with `INVALID_STARS`, and a second review of the same person for the same negotiation with `ALREADY_REVIEWED`. A review can't be changed, so a person's standing is what everyone said when it was fresh.

The debrief endpoint includes [the people the person can review](former:debrief.showing.reviewsBy): everyone else at the table who is a person, with their username and the stars the person gave them, once they have. The counterpart has no username, so it is never among them.

```endpoints
ratings.reviewing.Review at /tables/review
```

## Showing ratings

[A person's ratings](former:table.showing.ratingsOf) are the averages of their create and claim results, each over the results that have one, how many negotiations count, and the average of the stars they have received, with how many reviews. The bakery shows the person their own, and the table shows the ratings of the other people at it, so they can see who they are up against.
