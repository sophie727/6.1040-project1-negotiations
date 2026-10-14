#### **concept** NegotiationTable [User, Case, Role]

**purpose** give parties a space to negotiate in.

**principle** the negotiation table is opened for a case, with one seat per role; seated users exchange messages, which are recorded in order. After the negotiation ends, no further messages can be sent, and the transcript cannot be changed. A user's payoff after a negotiation will be based on their payoff sheet and will be the sum of the linear interpolations of the optionWeights for each issue.

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
    a termSheet set of Results with
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

---

#### **concept** CounterpartAgent [NegotiationTable, CaseBank]

**purpose** provide an always-available practice partner that negotiates from its own private interests (given by the case) with a consistent personality.

**principle** a counterpart agent is created with a persona and a confidential brief that it can see but the user cannot. Each time the user speaks, it replies in persona, based on its own private information. It agrees to a term sheet only if that term sheet is above its BATNA.

**state**

```
  a set of Counterparts with
    a negotiationTable Table
    a brief String
    a persona String
    a BATNA String
```

**actions**

```
  assign (table: Table, brief: String, persona: String) : (c: Counterpart)
    then creates a Counterpart with this persona, and this brief, at this table.
  respond (c: Counterpart, heard: String) : (reply: String)
    then returns an in-persona reply consistent with c.brief and c.BATNA
  consider (c: Counterpart, terms: set of Term) : (verdict of SIGN or REJECT, reply: String)
    then SIGN if and only if the terms are above this persona's BATNA, and otherwise, reject.
```

---

### Reactions

Below is a reaction for starting a practice and then, once you choose the negotiation, choosing who to negotiate with (an agent with X personality or a human). I've only given the reaction for negotiating with an agent because the MVP isn't going to have human-human interaction; however, it would be easy to add human-human interaction, since you'd just need to set up an assignHuman reaction.

```
reaction startPractice
  when Requesting.startPractice (user: User, skeleton: Skeleton)
  then CaseBank.instantiate (skeleton, issueWeightings: randomized)  : (case)
      NegotiationTable.open (case, deadline: now + 40 min)          : (table)
      NegotiationTable.seat (table, user, role: case.Roles.first)

reaction assignAgent
  when
    Requesting.negotiateWithAgent (persona: String)
    CaseBank.instantiate() : (case)
  then Counterpart.assign(table, brief: CaseBank._getBrief(case, second), persona)
```

Below is a reaction for the negotiation agent responding when a user says something in a negotiation.

```
reaction counterpartResponse
  when NegotiationTable.send (table, sender, body) : (message)
  where a Counterpart c is seated at this table and sender is not c
  then Counterpart.respond (c, heard: body) : (reply)
    NegotiationTable.send (table, sender: c, body: reply)
```

And finally, this is (perhaps) one of the most important reactions: when the negotiation ends, you generate a debrief!

```
reaction revealPie
when  NegotiationTable.settle (table)
      or NegotiationTable.withdraw (table)
      or NegotiationTable.expire (table)
then  NegotiationTable.debrief (table) : (debrief)
```

### Concept explanation

The concepts above capture the core functionality of _The Whole Pie_: Namely, the concepts above allow a user to start a solo game and play against an agent. As the MVP is hosted locally, it's necessary that the MVP is playable with just one person.

The Case Bank is a concept describing the negotiation cases which users can practice with in _The Whole Pie_. For the MVP, I might honestly make it simpler and skip the "skeleton" aspect (and just have two or three example cases to work with).

The NegotiationTable represents each negotiation that the user actually participates in, from the start of the negotiation to the end (when the terms are agreed upon and the debrief has occured).

As mentioned above, the user must be able to play single-player games against an agent. Thus, we need to create an agent for the user to play with, which is the CounterpartAgent concept.

Finally, we also have the TripleRating concept. This concept is one that persists outside negotiations: it represents a user's overall skill level.
