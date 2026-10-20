# Tabling

## Purpose

Seat someone in every role of a negotiation and run its clock, so that each negotiation starts only once every role is filled, lasts as long as was chosen when it began, and ends exactly once: in an agreement, with someone walking away, or with time running out.

_Prevents:_ a negotiation starts with a role nobody is playing; two people take the same role at one table, or one person takes two; a negotiation goes on after its time is up; a negotiation that has ended ends again in a different way.

## Principle

The Job Offer's author recommends a 30-minute time limit for it. Nadia opens a table for The Job Offer, and it gets a seat for each of the scenario's roles, Hiro and Manon. Nadia takes Hiro's seat, and when someone else tries to take it too, they are refused. Nadia can't begin yet, because Manon's seat is still empty. Her friend Omar sits down without choosing a role, so he takes the only empty seat, Manon's, and when a third person tries to sit down, the table is full. The clock doesn't run while they read their briefs. They begin at 2:00 pm with the recommended 30 minutes, so time is up at 2:30 pm, while friends at another table who want more time begin theirs with 45. Nadia and Omar reach an agreement at 2:20 pm, and the table is settled. At another table, nobody agrees in time: settling at 2:31 pm is refused, and the table expires instead. At a third, Nadia walks away, and that table is withdrawn. At a fourth, the person Nadia was waiting for never sits down, so she leaves before it begins, and that table is withdrawn too.

## Types

```types
external Scenario
  What is being negotiated.

external Role
  A side in a negotiation.

external Negotiator
  Whoever sits at a table, whether a person or an AI counterpart.

TableStatus is PREPARING or OPEN or SETTLED or WITHDRAWN or EXPIRED
  Whether the negotiators are still taking their seats and reading their briefs, are negotiating, reached an agreement, saw someone walk away, or ran out of time.
```

## State

```state
a set of Scenarios with
  an optional recommendedTimeLimit Number

a seq of Tables with
  a Scenario
  an optional timeLimit Number
  an optional deadline DateTime
  a status TableStatus
  an optional withdrawnBy Negotiator

a seq of Seats with
  a Table
  a Role
  an optional Negotiator
  unique table and role

Rule: a seat is empty until a negotiator takes it, and no negotiator takes two seats at one table.
Rule: a table has a timeLimit and a deadline exactly when it has begun: when it is OPEN, SETTLED, or EXPIRED, or WITHDRAWN after it began.
Rule: a table that has begun has at least two seats, and none of them is empty.
Rule: a table has withdrawnBy exactly when it is WITHDRAWN, and that negotiator has a seat at the table.
```

## Actions

```actions
recommendTimeLimit(scenario: Scenario, timeLimit: Number) : returns ()
  where timeLimit is not a whole number from 1 to 180
  then
    refuses INVALID_TIME_LIMIT "The time limit must be a whole number of minutes from 1 to 180."
  where timeLimit is a whole number from 1 to 180
  then
    set the scenario's recommendedTimeLimit to timeLimit, in minutes
    returns

open(scenario: Scenario) : returns (table: Table)
  where true
  then
    append a new PREPARING table with scenario
    returns table

addSeat(table: Table, role: Role) : returns (table: Table)
  where table is not in Tables
  then
    refuses UNKNOWN_TABLE "There is no such negotiation."
  where table is not PREPARING
  then
    refuses ALREADY_BEGUN "This negotiation has already started."
  where table is PREPARING and already has a seat for role
  then
    refuses SEAT_EXISTS "This table already has a seat for that role."
  where table is PREPARING and has no seat for role
  then
    append a new empty seat with table and role
    returns table

seat(table: Table, negotiator: Negotiator, role?: Role) : returns (table: Table, role: Role)
  where table is not in Tables
  then
    refuses UNKNOWN_TABLE "There is no such negotiation."
  where table is not PREPARING
  then
    refuses ALREADY_BEGUN "This negotiation has already started."
  where table is PREPARING, a role is given, and table has no seat for role
  then
    refuses NO_SUCH_SEAT "This table has no seat for that role."
  where table is PREPARING, a role is given, and its seat for role is taken
  then
    refuses ROLE_TAKEN "Someone already has that role at this table."
  where table is PREPARING, no role is given, and none of its seats is empty
  then
    refuses TABLE_FULL "Every seat at this table is taken."
  where table is PREPARING, the seat for the given role, or some seat when no role is given, is empty, and negotiator already has a seat at table
  then
    refuses ALREADY_SEATED "You already have a seat at this table."
  where table is PREPARING, a role is given, its seat for role is empty, and negotiator has no seat at table
  then
    put negotiator in the table's seat for role
    returns table, role
  where table is PREPARING, no role is given, it has an empty seat, and negotiator has no seat at table
  then
    put negotiator in one of the table's empty seats, chosen at random, whose role is role
    returns table, role

begin(table: Table, timeLimit: Number, now: DateTime) : returns (table: Table, deadline: DateTime)
  where timeLimit is not a whole number from 1 to 180
  then
    refuses INVALID_TIME_LIMIT "The time limit must be a whole number of minutes from 1 to 180."
  where timeLimit is accepted and table is not in Tables
  then
    refuses UNKNOWN_TABLE "There is no such negotiation."
  where timeLimit is accepted and table is not PREPARING
  then
    refuses ALREADY_BEGUN "This negotiation has already started."
  where timeLimit is accepted, table is PREPARING, and it has fewer than two seats
  then
    refuses NOT_ENOUGH_SEATS "A negotiation needs seats for at least two roles."
  where timeLimit is accepted, table is PREPARING, it has at least two seats, and one of them is empty
  then
    refuses NOT_ALL_SEATED "Not every role has a negotiator yet."
  where timeLimit is accepted, table is PREPARING, it has at least two seats, and none of them is empty
  then
    set the table's status to OPEN, its timeLimit to timeLimit, in minutes, and its deadline to timeLimit minutes after now
    returns table, deadline

settle(table: Table, now: DateTime) : returns (table: Table)
  where table is not in Tables
  then
    refuses UNKNOWN_TABLE "There is no such negotiation."
  where table is not OPEN
  then
    refuses NOT_OPEN "This negotiation isn't under way."
  where table is OPEN and now is at or after its deadline
  then
    refuses TIME_UP "Time is up for this negotiation."
  where table is OPEN and now is before its deadline
  then
    set the table's status to SETTLED
    returns table

withdraw(table: Table, negotiator: Negotiator, now: DateTime) : returns (table: Table)
  where table is not in Tables
  then
    refuses UNKNOWN_TABLE "There is no such negotiation."
  where negotiator has no seat at table
  then
    refuses NOT_SEATED "You don't have a seat at this table."
  where negotiator has a seat at table and table is SETTLED, WITHDRAWN, or EXPIRED
  then
    refuses NOT_OPEN "This negotiation isn't under way."
  where negotiator has a seat at table, table is OPEN, and now is at or after its deadline
  then
    refuses TIME_UP "Time is up for this negotiation."
  where negotiator has a seat at table, and table is PREPARING, or OPEN with now before its deadline
  then
    set the table's status to WITHDRAWN and its withdrawnBy to negotiator
    returns table

expire(table: Table, now: DateTime) : returns (table: Table)
  where table is not in Tables
  then
    refuses UNKNOWN_TABLE "There is no such negotiation."
  where table is not OPEN
  then
    refuses NOT_OPEN "This negotiation isn't under way."
  where table is OPEN and now is before its deadline
  then
    refuses NOT_DUE "Time isn't up for this negotiation yet."
  where table is OPEN and now is at or after its deadline
  then
    set the table's status to EXPIRED
    returns table
```

## Queries

```queries
_recommendedTimeLimit(scenario: Scenario) : optional (timeLimit: Number)
  Returns the time limit recommended for the scenario, in minutes, or no row when none has been recommended.

_acceptableTimeLimit(timeLimit: Number) : one (acceptable: Flag)
  Returns true when the time limit is a whole number of minutes from 1 to 180, and false otherwise.

_table(table: Table) : optional (scenario: Scenario, status: TableStatus, timeLimit?: Number, deadline?: DateTime, withdrawnBy?: Negotiator)
  Returns the table's scenario and status, its time limit in minutes and its deadline once it has begun, and who walked away if someone did, or no row for an unknown table.

_seats(table: Table) : many (role: Role, negotiator?: Negotiator)
  Returns every seat at the table with its role, and its negotiator once someone has taken it, or no rows for an unknown table or one with no seats.
  Orders rows by when each seat was added.

_tablesOf(negotiator: Negotiator) : many (table: Table, role: Role, scenario: Scenario, status: TableStatus)
  Returns every table where the negotiator has a seat, with their role, or no rows when they have none.
  Orders rows by when each table was opened, most recent first.

_overdue(now: DateTime) : many (table: Table)
  Returns every OPEN table whose deadline is at or before now, or no rows when there are none.
  Orders rows by deadline, earliest first.
```
