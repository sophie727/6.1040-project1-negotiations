# The debrief

However a negotiation ends, the person sees the whole pie: what they and the other side got, and the best deal the scenario allowed. Tabling says how the negotiation ended, Proposing holds the agreement, and Briefing scores term sheets and finds the whole pie. A coach, the second agent, writes them a debrief.

## Showing the whole pie

The [debrief endpoint](reaction:debrief.showing.ShowDebrief) answers only once the table [has ended](view:table.access.ended). Before then, it is refused with `NOT_OVER`, since the debrief reveals the other side's BATNA and points. Someone without a seat is refused with `NOT_FOUND`. It responds with the person's role, [the coach's debrief](#coaching), and [the debrief](former:debrief.showing.debriefOf):

- the outcome: `SETTLED`, `WITHDRAWN`, or `EXPIRED`;
- [the terms the table settled on](view:debrief.outcome.settledTerms), or null without an agreement. Tabling decides how a negotiation ended, so an agreement counts only when the table settled: one reached just as the table expired doesn't count;
- [the role that walked away](view:debrief.outcome.walkedAway), if one did;
- the whole pie, from `Briefing._wholePie`: among the term sheets worth at least its BATNA to every role, one with the most points for all the roles together, with those joint points and the roles' BATNAs added together. When no deal could have given every role its BATNA, these are null, and walking away was the right call;
- for each role, its name, its BATNA, its points from the agreement, and its points from the whole pie. Without an agreement, its points are null, and the role gets its BATNA instead;
- [the scenario's issues](table.md#showing-the-table), and every role's points for each option. During the negotiation, each person saw only their own; now that it's over, the page can show what each issue was worth to each side, and so which trades the deal missed.

From these, the page draws each side's slice, and how much value the deal created and how much of it the person claimed.

```endpoints
debrief.showing.ShowDebrief at /tables/debrief
```

## Coaching

When a negotiation ends, the coach writes a debrief: what went well, what to work on, and the most valuable trade that was missed. As with [the counterpart](counterpart.md), reactions ask with `Reasoning.prompt`, and an agent, named `coach`, answers through [the answering endpoints](reusable/answering.md). A negotiation can end in three ways, each a different Tabling action, and a reaction watches one action, so `CoachWhenEnded` is one definition registered for each: [when a table settles](reaction:debrief.coaching.CoachWhenEnded.Settled), [when someone walks away](reaction:debrief.coaching.CoachWhenEnded.Withdrawn), and [when time runs out](reaction:debrief.coaching.CoachWhenEnded.Expired). Each asks only about a table that [began](view:table.access.began), since one left before its clock started was never negotiated. At a practice table (the `practice` path), it asks for a debrief of the person. At a table between people (the `between-people` path), it asks for one debrief of every side, which everyone at the table reads, as a class debriefs a negotiation with both sides in the room. Tabling ends each table exactly once, so each table gets one debrief.

The coach reads the negotiation through [the coach's endpoint](reaction:debrief.coaching.ReadDebrief), which starts with `AgentSessioning.use`, so a person's session is refused. It answers only for [a debrief question the agent took](view:debrief.coaching.debriefTakenBy), or [a debrief of every side it took](view:debrief.coaching.jointDebriefTakenBy), and only once the table has ended, since it reveals the other side's points. For a practice table, it responds with the table as [the person](view:debrief.coaching.personRole) saw it, including the conversation and their own brief, and the whole pie above. For a table between people, it responds with [the table as each side saw it](former:debrief.coaching.sidesOf), each with its own brief, and the whole pie. Any other prompt, such as one of the counterpart's questions during the negotiation, is refused with `NOT_TAKEN`, so no agent can read the other side's points while the negotiation is under way.

The debrief endpoint includes [the coach's debriefs](former:debrief.coaching.coachingOf) of the table, of either kind, normally one, with its answer so far and its stage, and the reason if the coach abandoned it, such as "The model couldn't be reached." The page shows the answer as the coach writes it, and asks again until the debrief is concluded or abandoned.

```endpoints
debrief.coaching.ReadDebrief at /coach/table
```
