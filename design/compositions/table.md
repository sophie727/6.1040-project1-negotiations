# The table

A table is where a negotiation happens. Tabling seats the negotiators and runs the clock, Conversing keeps what they say, Proposing keeps their offers, and Noting keeps each person's notes. None of these concepts knows about the others; the endpoints and reactions here connect them.

## Seating

When Tabling opens a table, a reaction [adds an empty seat for each role of its scenario](reaction:table.seating.AddSeatForEachRole) in Briefing. Whoever takes a seat [joins the table's proposals](reaction:table.seating.JoinProposalsWhenSeated) as the seat's role, so Proposing knows who must accept a proposal before it is agreed. `Tabling.begin` refuses a table with an empty seat, and nobody can propose before the negotiation begins, so everyone at the table has joined before the first proposal, after which Proposing lets nobody join.

## Who may do what

A person can see and act at a table only where they have a seat: [the role they play there](view:table.access.seatedAs) is the first condition of every endpoint below. Anyone else is refused with `NOT_FOUND`, the same refusal as for a table that doesn't exist, so nobody can tell which tables other people have. The role also says who is speaking or proposing, so a person can't send a message or make an offer as another role.

Sending a message, proposing, answering a proposal, and walking away all need the negotiation to be [under way](view:table.access.underWay): begun, and before its deadline. Each of those endpoints reads the current instant with `now`, and each gives the same three answers when the negotiation isn't under way:

- When the table is still open but [overdue](view:table.access.overdue), the endpoint expires it, and the request is refused with `TIME_UP`. This is how a table catches up when nobody was watching its countdown: the next message, proposal, or answer ends it.
- When the table [isn't open](view:table.access.notOpen), because the person is still reading their brief or the negotiation has ended, the request is refused with `NOT_OPEN`.
- Someone without a seat is refused with `NOT_FOUND`.

The check and the action use the same instant, so an action that passes the check isn't then refused by Tabling for being late.

## Showing the table

The [show endpoint](reaction:table.showing.ShowTable) responds with [the table as the person's role sees it](former:table.showing.tableAsSeenBy), [their notes](former:table.showing.notesOf), and [how many questions to the counterpart are open](former:table.showing.questionsOpenAt), so the screen can show that the counterpart is writing. The table includes the scenario's name, the status, the time limit, the deadline once the negotiation has begun, the person's own brief, BATNA, and points for each option, each seat's role, [the issues with their options](former:table.showing.issuesOf), every message, and every proposal with what it is worth to the person's role. With their own points, the page can show what a deal is worth to them while they write a proposal. Nothing in it comes from another role's brief or points; the other side's points are revealed only in [the debrief](debrief.md), once the negotiation has ended.

The page asks again every second or two, so new messages and proposals appear without a refresh. Showing a table changes nothing; when the page sees that the deadline has passed, it calls the expire endpoint.

```endpoints
table.showing.ShowTable at /tables/show
```

## The clock

The [begin endpoint](reaction:table.clock.Begin) starts the clock once the person has read their brief. `Tabling.begin` opens the negotiation and sets its deadline to its time limit after now, and the endpoint responds with the deadline for the countdown. Beginning twice is refused with `ALREADY_BEGUN`.

When the countdown reaches zero, the page calls the [expire endpoint](reaction:table.clock.Expire). `Tabling.expire` checks the deadline itself, so a page whose clock runs fast is refused with `NOT_DUE` and can ask again a moment later, and a table that has already ended is refused with `NOT_OPEN`.

The [withdraw endpoint](reaction:table.clock.Withdraw) lets the person walk away from a negotiation under way, and Tabling records that they did.

Tabling ends each negotiation exactly once, whichever request comes first: settling, withdrawing, and expiring each change only a table that is still open.

```endpoints
table.clock.Begin at /tables/begin
table.clock.Expire at /tables/expire
table.clock.Withdraw at /tables/withdraw
```

## Talking and taking notes

The [send endpoint](reaction:table.talking.Send) adds a message from the person's role to the table's conversation while the negotiation is under way. Conversing refuses a blank message, or one over 2,000 characters, with `INVALID_MESSAGE`.

The [notes endpoint](reaction:table.talking.WriteNotes) replaces the person's notes about the table with what they wrote. Notes are private to their author, and the person can write them before, during, or after the negotiation. Noting refuses notes over 20,000 characters with `TOO_LONG`.

```endpoints
table.talking.Send at /tables/send
table.talking.WriteNotes at /tables/notes
```
