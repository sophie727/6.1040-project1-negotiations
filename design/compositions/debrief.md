# The debrief

However a negotiation ends, the person sees the whole pie: what they and the other side got, and the best deal the scenario allowed. Tabling says how the negotiation ended, Proposing holds the agreement, and Briefing scores term sheets and finds the whole pie.

The [debrief endpoint](reaction:debrief.showing.ShowDebrief) answers only once the table [has ended](view:debrief.outcome.ended). Before then, it is refused with `NOT_OVER`, since the debrief reveals the other side's BATNA and points. Someone without a seat is refused with `NOT_FOUND`. It responds with the person's role and [the debrief](former:debrief.showing.debriefOf):

- the outcome: `SETTLED`, `WITHDRAWN`, or `EXPIRED`;
- [the terms the table settled on](view:debrief.outcome.settledTerms), or null without an agreement. Tabling decides how a negotiation ended, so an agreement counts only when the table settled: one reached just as the table expired doesn't count;
- [the role that walked away](view:debrief.outcome.walkedAway), if one did;
- the whole pie, from `Briefing._wholePie`: among the term sheets worth at least its BATNA to every role, one with the most points for all the roles together, with those joint points and the roles' BATNAs added together. When no deal could have given every role its BATNA, these are null, and walking away was the right call;
- for each role, its name, its BATNA, its points from the agreement, and its points from the whole pie. Without an agreement, its points are null, and the role gets its BATNA instead.

From these, the page draws each side's slice, and how much value the deal created and how much of it the person claimed.

```endpoints
debrief.showing.ShowDebrief at /tables/debrief
```
