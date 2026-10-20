# Matchmaking

## Purpose

Gather people who are each looking for others to do the same thing with into groups of the size it needs, first come, first served, so that nobody waits while there are enough people waiting to form a group, and nobody ends up in two groups. Someone who doesn't mind what they do, as long as the group is the size they want, can look with an open mind, and join whoever is waiting, so they wait less.

_Prevents:_ people who look at the same moment all wait, unaware of each other; someone ends up in two groups, or twice in one; someone who stopped looking, or left without saying so, is matched anyway; a group does something one of its members didn't want.

## Principle

Nadia looks for someone to negotiate The Job Offer with, a scenario for two. Nobody else is looking, so she waits, checking in every few seconds. When Omar looks for someone to negotiate The Job Offer with too, the two of them make a group, so they are matched at once, and neither waits any longer. Once their match has a place to meet, their table, each of them can find it. A three-way negotiation waits until three people are looking for it. Pia waits and then shuts her laptop. A minute after she last checked in, she no longer counts, so when Quinn looks, Quinn waits rather than being matched with her, and when Pia's laptop wakes up, she has to look again. Leo gets tired of waiting and stops looking, so he is never matched. Tess will negotiate any scenario for two, so Tess looks with an open mind, suggesting The Job Offer. Uma is already waiting for The Lease, a scenario for two, so Tess joins Uma at once, and their match agrees on The Lease. Later, Ravi and then Sam look with an open mind, and their match agrees on the scenario Ravi, who looked first, suggested.

## Types

```types
external Seeker
  Who looks for others to do something with.

external Pool
  What they want to do together, such as a scenario to negotiate. People are matched only when those of them who aren't open want the same pool.

external Place
  Where a match meets, such as the table its members negotiate at.

LookingStatus is WAITING or MATCHED or STOPPED
  Whether a request is still waiting for a group, found one, or was given up.
```

## State

```state
a seq of Requests with
  a Seeker
  a Pool
  a size Number
  an open Flag
  a status LookingStatus
  a lastSeen DateTime
  an optional Match

a set of Waiting Requests where status is WAITING with
  unique seeker

a set of Matches with
  a Pool
  an optional Place

Rule: a request has a match exactly when it is MATCHED.
Rule: a match has exactly as many requests as their size, all with the same size, and no two of them from the same seeker.
Rule: an open request's pool is only what its seeker suggests, since they go along with any pool for a group of their size.
Rule: every request of a match that isn't open has the match's pool, and when all of its requests are open, the match's pool is the oldest one's.
Rule: a request's size is a whole number of at least 2, counting its seeker.
Rule: of several searches at once that could form the same group, exactly one forms it.
```

## Actions

```actions
seek(seeker: Seeker, pool: Pool, size: Number, open: Flag, now: DateTime) : returns (request: Request, grouped: Flag)
  where size is not a whole number of at least 2
  then
    refuses INVALID_SIZE "A group needs a whole number of people, at least two."
  where size is accepted, and the new request can make a group with the waiting requests of size minus one other seekers, with size and last seen within a minute before now, whose members that aren't open, the new one included, all want one pool
  then
    stop the seeker's waiting request, if they have one
    append a new request with seeker, pool, size, and open, last seen now
    of the groups it can make, take the one whose members waited longest: the one with the oldest member, or, between groups with the same oldest member, the one with the oldest second member, and so on
    put them in a new match, all of them MATCHED, with the pool its members that aren't open want, or, when all of them are open, the pool the oldest suggested, so grouped is true
    returns request, grouped
  where size is accepted, and the new request can make no such group
  then
    stop the seeker's waiting request, if they have one
    append a new WAITING request with seeker, pool, size, and open, last seen now, so grouped is false
    returns request, grouped

checkIn(request: Request, seeker: Seeker, now: DateTime) : returns ()
  where request isn't a waiting request of seeker's
  then
    refuses NOT_WAITING "You aren't waiting for a match."
  where request is a waiting request of seeker's, last seen more than a minute before now
  then
    refuses LAPSED "You stopped checking in, so you're no longer waiting. Look again."
  where request is a waiting request of seeker's, last seen within a minute before now
  then
    set the request's lastSeen to now
    returns

stop(request: Request, seeker: Seeker) : returns ()
  where request isn't a waiting request of seeker's
  then
    refuses NOT_WAITING "You aren't waiting for a match."
  where request is a waiting request of seeker's
  then
    set the request's status to STOPPED
    returns

meet(request: Request, place: Place) : returns ()
  where request isn't MATCHED
  then
    refuses NOT_MATCHED "This request hasn't been matched."
  where request is MATCHED and its match already has a place
  then
    refuses ALREADY_MET "This match already has a place to meet."
  where request is MATCHED and its match has no place
  then
    set the place of the request's match to place
    returns
```

## Queries

```queries
_request(request: Request) : optional (seeker: Seeker, pool: Pool, size: Number, open: Flag, status: LookingStatus)
  Returns who made the request, what for, how many people its group needs, whether its seeker is open to any pool, and its status, or no row for an unknown request.

_lapsed(request: Request, now: DateTime) : one (lapsed: Flag)
  Returns true when the request is waiting but was last seen more than a minute before now, so it no longer counts, and false otherwise.

_members(request: Request) : many (seeker: Seeker)
  Returns the seeker of every request in the request's match, including its own, or no rows when the request isn't matched.
  Orders rows by when each request was made, oldest first.

_agreed(request: Request) : optional (pool: Pool)
  Returns the pool the request's match agreed on, or no row when the request isn't matched.

_place(request: Request) : optional (place: Place)
  Returns where the request's match meets, or no row when the request isn't matched or its match has no place yet.
```
