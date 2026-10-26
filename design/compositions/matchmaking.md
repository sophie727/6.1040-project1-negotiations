# Matchmaking

A person can negotiate with someone new: they pick a scenario, and wait until enough other people want to negotiate it too. Or they pick "Surprise me!" and how many people to negotiate with, and join the first people who are looking for a negotiation that size, whatever scenario they picked, so they wait less. Matchmaking gathers the group, first come, first served, and decides who is in it in one action, so people who look at the same moment are never all left waiting. Everything after that, opening a table and seating the group, happens here.

## Looking for others

People can look for others to negotiate [a scenario in the bakery](view:matchmaking.looking.findable) with: one that is posted and not archived. The [find endpoint](reaction:matchmaking.looking.Find) takes the scenario, and whether the person is open to any scenario with as many roles, and looks for a group of [as many people as the scenario has roles](view:matchmaking.looking.groupSize), which it counts with `count(Briefing._roles)`. For "Surprise me!", the page picks a scenario at random with as many roles as the people the person wants to negotiate with, and looks with an open mind, so the scenario is only a suggestion. It asks `Matchmaking.seek`, which first stops any search the person already had, so each person looks for one group at a time. When enough people are waiting, Matchmaking matches them at once: people who picked a scenario only with others who picked it or are open, and someone who is open with whoever has waited longest for a group that size. Otherwise the person waits. The endpoint answers once the flow has settled. While the person waits, it answers with their request and no table. When their request completed a group, it waits until they have [a seat at the group's table](view:matchmaking.looking.seatedFor), and answers with that table. [A second endpoint at the same path](reaction:matchmaking.looking.RefuseUnfindable) refuses a scenario that isn't posted, or that its author archived, with `NOT_FOUND`. Someone already waiting when the author archives the scenario keeps waiting, and can still be matched.

```endpoints
matchmaking.looking.Find at /matchmaking/find
matchmaking.looking.RefuseUnfindable at /matchmaking/find
```

While the person waits, the page asks the [wait endpoint](reaction:matchmaking.looking.Wait) what became of their request every few seconds. Each time, it answers with a status rather than a refusal, because over HTTP a refusal arrives only as its category, and the page needs to tell these cases apart:

- `WAITING`: the request is still waiting, and asking again checks in with `Matchmaking.checkIn`, so the request keeps counting.
- `LAPSED`: the page stopped asking for over a minute, such as while a laptop slept, so the request no longer counts, and the page looks again. A lapsed request can't be matched, so looking again never puts the person in two groups.
- `MATCHED`: with the group's table once the person is seated there, or with no table for the moment between the match and their seat.
- `STOPPED`: the person stopped looking, or started looking again elsewhere, such as in another tab.

Someone else's request is refused with `NOT_FOUND`. In the instant between reading a request and checking it in, someone may complete a group with it, and then `Matchmaking.checkIn` refuses with `NOT_WAITING`. The page simply asks again, and is told it was matched.

The [stop endpoint](reaction:matchmaking.looking.Stop) stops looking when the person cancels, closes the dialog, or leaves the page. Matchmaking refuses a request that was already matched or stopped with `NOT_WAITING`, and someone else's request is refused with `NOT_FOUND`.

```endpoints
matchmaking.looking.Wait at /matchmaking/wait
matchmaking.looking.Stop at /matchmaking/stop
```

## Meeting

When a search completes a group, a reaction [opens a table for the scenario the group agreed on](reaction:matchmaking.meeting.OpenTableForMatch), which `Matchmaking._agreed` gives, and tells Matchmaking that the group meets there, with `Matchmaking.meet`. It's the scenario that the members who picked one picked, or, when everyone in the group was open, the one suggested to whoever looked first. `Matchmaking.seek` says whether the search formed a group, and exactly one search forms each group, even when several look at once, so each group gets exactly one table. Once [the table](table.md#seating) has a seat for each role, another reaction [seats every member of the group](reaction:matchmaking.meeting.SeatMembers). Nobody chooses a role, so Tabling gives each member one of the empty seats at random.

The table then [starts](table.md#starting) like any other: once everyone has read their brief, someone suggests how long to negotiate, and the clock starts when everyone agrees. There is no counterpart at the table, so [its reactions](counterpart.md) never ask it anything there.
