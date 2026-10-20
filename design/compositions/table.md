# The table

A table is where a negotiation happens. Tabling seats the negotiators and runs the clock, Conversing keeps what they say, Proposing keeps their offers, TimeLimitProposing keeps their suggestions of how long to negotiate, and Noting keeps each person's notes. None of these concepts knows about the others; the endpoints and reactions here connect them.

## Seating

When Tabling opens a table, a reaction [adds an empty seat for each role of its scenario](reaction:table.seating.AddSeatForEachRole) in Briefing. Whoever takes a seat [joins the table's proposals](reaction:table.seating.JoinProposalsWhenSeated) as the seat's role, so Proposing knows who must accept a proposal before it is agreed. The reaction reads the role from what `Tabling.seat` answers, because someone who sits down without choosing a role gets whichever empty seat Tabling gives them. `Tabling.begin` refuses a table with an empty seat, and nobody can propose before the negotiation begins, so everyone at the table has joined before the first proposal, after which Proposing lets nobody join.

## Who may do what

A person can see and act at a table only where they have a seat: [the role they play there](view:table.access.seatedAs) is the first condition of every endpoint below. A seat is empty until [someone sits in it](view:table.access.occupant), and [the empty seats](view:table.access.openSeats) are the ones [friends](friends.md) can still take. Anyone else is refused with `NOT_FOUND`, the same refusal as for a table that doesn't exist, so nobody can tell which tables other people have. The role also says who is speaking or proposing, so a person can't send a message or make an offer as another role.

Sending a message, proposing, answering a proposal, and walking away all need the negotiation to be [under way](view:table.access.underWay): begun, and before its deadline. Each of those endpoints reads the current instant with `now`, and each gives the same three answers when the negotiation isn't under way:

- When the table is still open but [overdue](view:table.access.overdue), the endpoint expires it, and the request is refused with `TIME_UP`. This is how a table catches up when nobody was watching its countdown: the next message, proposal, or answer ends it.
- When the table [isn't open](view:table.access.notOpen), because the person is still reading their brief or the negotiation has ended, the request is refused with `NOT_OPEN`.
- Someone without a seat is refused with `NOT_FOUND`.

The check and the action use the same instant, so an action that passes the check isn't then refused by Tabling for being late.

## Showing the table

The [show endpoint](reaction:table.showing.ShowTable) responds with [the table as the person's role sees it](former:table.showing.tableAsSeenBy), [the suggestion to start that is waiting for answers](former:table.showing.startTalksAt), if there is one, [their notes](former:table.showing.notesOf), [how many questions to the counterpart are open](former:table.showing.questionsOpenAt), so the screen can show that the counterpart is writing, and [every question to the counterpart](former:table.showing.questionsAbout) with its stage. When the newest question was abandoned, the screen says why, such as "The model couldn't be reached.", and that sending another message or proposing again tries again. The table includes the scenario's name, the status, the time limit and the deadline once the negotiation has begun, the scenario's recommended time limit, which the page suggests until then, each seat's role with the username of the person in it (null for the counterpart or an empty seat) and their [ratings](ratings.md#showing-ratings), the empty seats, [the code of the link that invites people to the table](former:table.showing.linkOf), if someone made one, [their plan](former:table.showing.planOf), if they have prep sheets on, the person's own brief, BATNA, and points for each option, each seat's role, [the issues with their options](former:table.showing.issuesOf), every message, and every proposal with what it is worth to the person's role. With their own points, the page can show what a deal is worth to them while they write a proposal. Nothing in it comes from another role's brief or points; the other side's points are revealed only in [the debrief](debrief.md), once the negotiation has ended.

The page asks again every second or two, so new messages and proposals appear without a refresh. Showing a table changes nothing; when the page sees that the deadline has passed, it calls the expire endpoint.

```endpoints
table.showing.ShowTable at /tables/show
```

## Starting

The clock doesn't run while the negotiators read their briefs, and it starts only once they all agree on how long to negotiate. They agree the way they agree on a deal, with proposals that hold once everyone else accepts them, so TimeLimitProposing, a second instance of Proposing, keeps them. Its proposals can say nothing but a number of minutes, so nobody can start negotiating before the clock runs.

Every role at a table [joins the table's start talks](reaction:table.starting.JoinStartTalksForEachSeat) as soon as Tabling adds its seat, before anyone can suggest anything. A suggestion made before a friend has sat down still waits for that friend's agreement.

The [start endpoint](reaction:table.starting.SuggestStart) suggests starting with a time limit, and also says that the person is ready. It replaces any suggestion still waiting for answers. It checks the limit with `Tabling._acceptableTimeLimit` first, and [a second endpoint at the same path](reaction:table.starting.RefuseStart) refuses one that isn't a whole number of minutes from 1 to 180 with `INVALID_TIME_LIMIT`. The [agree endpoint](reaction:table.starting.AgreeToStart) accepts someone else's suggestion, and [its second endpoint](reaction:table.starting.RefuseAgreement) refuses a suggestion from another table with `NOT_FOUND`. Both second endpoints refuse someone without a seat with `NOT_FOUND` too, a table that has [ended](view:table.access.ended) with `NOT_OPEN`, and someone who [turned on prep sheets](preparing.md) but hasn't finished their plan with `PLAN_FIRST`.

The second endpoints read only what a suggestion or an agreement can't change, such as who sits at the table, and never whether it has begun. Each endpoint at a path reads the table when its own session check returns, so a check of whether the table had begun could run after the first endpoint began it, and answer wrongly. TimeLimitProposing refuses on its own once everyone has agreed: a new suggestion with `ALREADY_AGREED`, and an agreement to one that was replaced or already agreed with `NOT_PENDING_FOR_YOU`. Only [a table that is still preparing](view:table.starting.preparing) takes new people, and once everyone has agreed, it begins.

When the last person agrees, a reaction [begins the negotiation](reaction:table.starting.BeginOnceEveryoneAgrees) with the agreed time limit, so its deadline is that many minutes after now. Both endpoints answer once the flow has settled, with the deadline when the negotiation began then. At a practice table, [the counterpart](counterpart.md#starting) agrees to any suggestion at once, so the person's suggestion starts the clock.

```endpoints
table.starting.SuggestStart at /tables/start
table.starting.RefuseStart at /tables/start
table.starting.AgreeToStart at /tables/agree
table.starting.RefuseAgreement at /tables/agree
```

## The clock

When the countdown reaches zero, the page calls the [expire endpoint](reaction:table.clock.Expire). `Tabling.expire` checks the deadline itself, so a page whose clock runs fast is refused with `NOT_DUE` and can ask again a moment later, and a table that has already ended is refused with `NOT_OPEN`.

A table can also run out of time while nobody is watching it, such as when everyone has closed the page. The timekeeper, an agent that signs in to AgentSessioning like the counterpart and the coach, calls the [timekeeper's endpoint](reaction:table.clock.ExpireOverdue) every half minute. That endpoint reads `Tabling._overdue` and expires each open table whose deadline has passed, so the reactions that follow an ending, such as the coach's, run even then. A person's session is refused by `AgentSessioning.use`.

The [withdraw endpoint](reaction:table.clock.Withdraw) lets the person walk away from a negotiation under way, and Tabling records that they did. It also lets them leave a table that hasn't begun, such as one whose other seats nobody took, so they aren't stuck waiting for a friend who never comes. A table left before it began ended without anyone negotiating, so it is neither coached nor rated.

Tabling ends each negotiation exactly once, whichever request comes first: settling, withdrawing, and expiring each change only a table that is still open.

```endpoints
table.clock.Expire at /tables/expire
table.clock.ExpireOverdue at /timekeeper/expire
table.clock.Withdraw at /tables/withdraw
```

## Talking and taking notes

The [send endpoint](reaction:table.talking.Send) adds a message from the person's role to the table's conversation while the negotiation is under way. Conversing refuses a blank message, or one over 2,000 characters, with `INVALID_MESSAGE`.

The [notes endpoint](reaction:table.talking.WriteNotes) replaces the person's notes about the table with what they wrote. Notes are private to their author, and the person can write them before, during, or after the negotiation. Noting refuses notes over 20,000 characters with `TOO_LONG`.

```endpoints
table.talking.Send at /tables/send
table.talking.WriteNotes at /tables/notes
```
