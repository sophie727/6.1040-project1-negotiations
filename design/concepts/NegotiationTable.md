# NegotiationTable

## Purpose

Give parties a space to negotiate in.

## Principle

The "universal" value is a number that objectively represents this option, regardless of perspective. e.g. two people might value salary differently, but regardless of how much they value a salary of $100K, the number 100K is still a number that objectively represents this option.

#### **concept** NegotiationTable [User, Case, Role]

**purpose** give parties a space to negotiate in.

**principle**

**state**

```
  a set of Tables with
    an id String
    a case Case
    a set of Seats with
      a user User
      a role Role
    a transcript seq of Messages with
      a sender (User)
      a body String
      a time DateTime
    a status of OPEN or SETTLED or WITHDRAWN or EXPIRED
    a TermSheet set of Results with
      an issue Issue
      an option Option
    a debrief
      a description String
    a deadline DateTime
```

**actions**

```
  open (case: Case, deadline: DateTime): (table: Table)
    then create an OPEN Table with no seats and an empty transcript.
  seat (table: Table, user: User, role: Role)
    when table is OPEN and this role has not been seated yet
    then adds a seat with this user and this role.
  send (table: Table, sender: User, body: String): (message: Message)
    where table is OPEN and sender is seated at this table
    then append this Message to the transcript.
  settle (table: Table, outcome: set of Results)
    where table is OPEN
    then set this table's status to SETTLED and set the outcome to the input.
  withdraw (table: Table, user: User)
    where table is OPEN and the user is seated
    then set this table's status to WITHDRAWN
  expire (table: Table)
    where table is OPEN
    then set this table's status to EXPIRED
  debrief (table: Table) : (debrief String)
    where table is not OPEN
    then generate a string describing what was done well and what wasn't.
```
