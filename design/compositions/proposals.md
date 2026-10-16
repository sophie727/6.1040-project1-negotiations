# Proposals

A proposal is a formal offer: a term sheet that agrees on every issue of the scenario. Proposing keeps proposals without reading their terms; Briefing checks and scores them.

The [propose endpoint](reaction:proposals.proposing.Propose) proposes a term sheet as the person's role while the negotiation is [under way](table.md#who-may-do-what). It first asks `Briefing._dealValidity` whether the term sheet agrees on every issue of the table's scenario: on one of its options for a discrete issue, and within its range for a continuous one. When it doesn't, the request is refused with `INVALID_TERMS` (the `invalid` path), and nothing is proposed. The page builds term sheets only from the issues' options and ranges, so this refusal guards against requests the page didn't write. A new proposal supersedes the one waiting for an answer, and once there is an agreement, Proposing refuses new proposals with `ALREADY_AGREED`.

```endpoints
proposals.proposing.Propose at /tables/propose
```

The [accept](reaction:proposals.answering.Accept), [reject](reaction:proposals.answering.Reject), and [retract](reaction:proposals.answering.Retract) endpoints answer a proposal as the person's role, with the Proposing actions of the same names. They take only a proposal made at that table; any other is refused with `NOT_FOUND` (the `elsewhere` path). Proposing refuses to accept or reject a proposal that isn't waiting for the person's answer, such as their own or one that was replaced, with `NOT_PENDING_FOR_YOU`, and to retract one that isn't theirs or isn't waiting with `NOT_PENDING_FROM_YOU`. The accept endpoint responds with the proposal's status, which is `ACCEPTED` once everyone else has accepted it too.

```endpoints
proposals.answering.Accept at /tables/accept
proposals.answering.Reject at /tables/reject
proposals.answering.Retract at /tables/retract
```

When an acceptance completes the agreement, a reaction [settles the table](reaction:proposals.agreeing.SettleOnAgreement). Whether a person or the counterpart accepted, the acceptance was checked against the deadline at the same instant this reaction passes to `Tabling.settle`, so settling isn't refused for being late. If the table ended in between, because another request expired it or the person walked away, `Tabling.settle` refuses with `NOT_OPEN`, and the table keeps the ending it already had. The agreement in Proposing then doesn't count, as [the debrief](debrief.md) explains. The accept endpoint responds as soon as the acceptance is recorded, and the table settles a moment later in the same flow; the page sees it the next time it shows the table.
