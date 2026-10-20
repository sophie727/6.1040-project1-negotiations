<!-- Generated from the The Whole Pie assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# The Whole Pie — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Authenticating

Defined in [Authenticating](../design/concepts/Authenticating.md), line 1.

#### Actions

- `set(user: User, password: String) : returns (user: User)`
  - Refuses `INVALID_PASSWORD`: A password must have 8 to 128 characters.
  - Refuses `PASSWORD_SET`: This account already has a password.
- `authenticate(user: User, password: String) : returns (user: User)`
  - Refuses `INVALID_CREDENTIALS`: The username or password is incorrect.

#### Queries

- `_acceptable(password: String) : one (acceptable: Flag)`

#### Instances

- `Authenticating` — instance of `Authenticating` — [The Whole Pie types](../design/types.md), line 36.
  - `User` is `Registering.User` — [The Whole Pie types](../design/types.md), line 37.

### Briefing

Defined in [Briefing](../design/concepts/Briefing.md), line 1.

#### Actions

- `create(author: Author, name: String) : returns (scenario: Scenario)`
  - Refuses `INVALID_SCENARIO_NAME`: A scenario name must have 1 to 100 characters.
  - Refuses `NAME_TAKEN`: A scenario with that name already exists.
- `addIssue(scenario: Scenario, name: String, kind: IssueKind, unit?: String) : returns (issue: Issue)`
  - Refuses `UNKNOWN_SCENARIO`: There is no such scenario.
  - Refuses `PUBLISHED`: A published scenario can't be changed.
  - Refuses `INVALID_ISSUE_NAME`: An issue name must have 1 to 100 characters.
  - Refuses `ISSUE_EXISTS`: This scenario already has an issue with that name.
  - Refuses `UNIT_NOT_ALLOWED`: Only a continuous issue has a unit.
- `addOption(issue: Issue, name: String, universalValue?: Number) : returns (option: Option)`
  - Refuses `UNKNOWN_ISSUE`: There is no such issue.
  - Refuses `PUBLISHED`: A published scenario can't be changed.
  - Refuses `INVALID_OPTION_NAME`: An option name must have 1 to 100 characters.
  - Refuses `OPTION_EXISTS`: This issue already has an option with that name.
  - Refuses `VALUE_REQUIRED`: An option of a continuous issue needs a universal value.
  - Refuses `VALUE_NOT_ALLOWED`: An option of a discrete issue has no universal value.
  - Refuses `VALUE_TAKEN`: This issue already has an option at that universal value.
- `addRole(scenario: Scenario, name: String, batna: Number) : returns (role: Role)`
  - Refuses `UNKNOWN_SCENARIO`: There is no such scenario.
  - Refuses `PUBLISHED`: A published scenario can't be changed.
  - Refuses `INVALID_ROLE_NAME`: A role name must have 1 to 100 characters.
  - Refuses `ROLE_EXISTS`: This scenario already has a role with that name.
- `setPayoff(role: Role, option: Option, points: Number) : returns ()`
  - Refuses `UNKNOWN_ROLE_OR_OPTION`: There is no such role or option.
  - Refuses `DIFFERENT_SCENARIOS`: The role and the option belong to different scenarios.
  - Refuses `PUBLISHED`: A published scenario can't be changed.
- `setBrief(role: Role, brief: String) : returns ()`
  - Refuses `UNKNOWN_ROLE`: There is no such role.
  - Refuses `PUBLISHED`: A published scenario can't be changed.
  - Refuses `INVALID_BRIEF`: A brief must have 1 to 20,000 characters.
- `publish(scenario: Scenario) : returns (scenario: Scenario)`
  - Refuses `UNKNOWN_SCENARIO`: There is no such scenario.
  - Refuses `ALREADY_PUBLISHED`: This scenario is already published.
  - Refuses `INCOMPLETE`: A scenario needs an issue, at least two roles, at least two options for every issue, and every payoff and brief before it can be published.

#### Queries

- `_published() : many (scenario: Scenario, name: String)`
- `_scenario(scenario: Scenario) : optional (name: String, author: Author, published: Flag)`
- `_issues(scenario: Scenario) : many (issue: Issue, name: String, kind: IssueKind, unit?: String)`
- `_options(issue: Issue) : many (option: Option, name: String, universalValue?: Number)`
- `_roles(scenario: Scenario) : many (role: Role, name: String)`
- `_role(role: Role) : optional (scenario: Scenario, name: String, batna: Number, brief?: String)`
- `_payoffs(role: Role) : many (issue: Issue, option: Option, points: Number)`
- `_dealValidity(scenario: Scenario, terms: TermSheet) : many (issue?: String, problem: String)`
- `_dealPayoff(role: Role, terms: TermSheet) : optional (points: Number)`
- `_dealJointPayoff(scenario: Scenario, terms: TermSheet) : optional (jointPoints: Number)`
- `_jointBatna(scenario: Scenario) : optional (jointBatna: Number)`
- `_wholePie(scenario: Scenario) : optional (terms: TermSheet, jointPoints: Number, jointBatna: Number)`

#### Instances

- `Briefing` — instance of `Briefing` — [The Whole Pie types](../design/types.md), line 45.
  - `Author` is `Registering.User` — [The Whole Pie types](../design/types.md), line 46.

### Conversing

Defined in [Conversing](../design/concepts/Conversing.md), line 1.

#### Actions

- `send(subject: Subject, sender: Speaker, body: String, now: DateTime) : returns (message: Message)`
  - Refuses `INVALID_MESSAGE`: A message must have 1 to 2,000 characters.

#### Queries

- `_messages(subject: Subject) : many (message: Message, sender: Speaker, body: String, sentAt: DateTime)`

#### Instances

- `Conversing` — instance of `Conversing` — [The Whole Pie types](../design/types.md), line 53.
  - `Speaker` is `Briefing.Role` — [The Whole Pie types](../design/types.md), line 55.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 54.

### Inviting

Defined in [Inviting](../design/concepts/Inviting.md), line 1.

#### Actions

- `invite(subject: Subject, inviter: Person) : returns (invitation: Invitation, code: String)`

#### Queries

- `_invitation(code: String) : optional (invitation: Invitation, subject: Subject, inviter: Person)`
- `_invitations(subject: Subject) : many (invitation: Invitation, code: String, inviter: Person)`

#### Instances

- `Inviting` — instance of `Inviting` — [The Whole Pie types](../design/types.md), line 75.
  - `Person` is `Registering.User` — [The Whole Pie types](../design/types.md), line 77.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 76.

### Matchmaking

Defined in [Matchmaking](../design/concepts/Matchmaking.md), line 1.

#### Actions

- `seek(seeker: Seeker, pool: Pool, size: Number, open: Flag, now: DateTime) : returns (request: Request, grouped: Flag)`
  - Refuses `INVALID_SIZE`: A group needs a whole number of people, at least two.
- `checkIn(request: Request, seeker: Seeker, now: DateTime) : returns ()`
  - Refuses `NOT_WAITING`: You aren't waiting for a match.
  - Refuses `LAPSED`: You stopped checking in, so you're no longer waiting. Look again.
- `stop(request: Request, seeker: Seeker) : returns ()`
  - Refuses `NOT_WAITING`: You aren't waiting for a match.
- `meet(request: Request, place: Place) : returns ()`
  - Refuses `NOT_MATCHED`: This request hasn't been matched.
  - Refuses `ALREADY_MET`: This match already has a place to meet.

#### Queries

- `_request(request: Request) : optional (seeker: Seeker, pool: Pool, size: Number, open: Flag, status: LookingStatus)`
- `_lapsed(request: Request, now: DateTime) : one (lapsed: Flag)`
- `_members(request: Request) : many (seeker: Seeker)`
- `_agreed(request: Request) : optional (pool: Pool)`
- `_place(request: Request) : optional (place: Place)`

#### Instances

- `Matchmaking` — instance of `Matchmaking` — [The Whole Pie types](../design/types.md), line 79.
  - `Place` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 82.
  - `Pool` is `Briefing.Scenario` — [The Whole Pie types](../design/types.md), line 81.
  - `Seeker` is `Registering.User` — [The Whole Pie types](../design/types.md), line 80.

### Noting

Defined in [Noting](../design/concepts/Noting.md), line 1.

#### Actions

- `write(author: Author, subject: Subject, body: String) : returns (note: Note)`
  - Refuses `TOO_LONG`: Notes can have at most 20,000 characters.

#### Queries

- `_note(author: Author, subject: Subject) : optional (body: String)`

#### Instances

- `Noting` — instance of `Noting` — [The Whole Pie types](../design/types.md), line 67.
  - `Author` is `Registering.User` — [The Whole Pie types](../design/types.md), line 68.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 69.
- `PrioritiesNoting` — instance of `Noting` — [The Whole Pie types](../design/types.md), line 100.
  - `Author` is `Registering.User` — [The Whole Pie types](../design/types.md), line 101.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 102.
- `TargetNoting` — instance of `Noting` — [The Whole Pie types](../design/types.md), line 92.
  - `Author` is `Registering.User` — [The Whole Pie types](../design/types.md), line 93.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 94.
- `WalkawayNoting` — instance of `Noting` — [The Whole Pie types](../design/types.md), line 96.
  - `Author` is `Registering.User` — [The Whole Pie types](../design/types.md), line 97.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 98.

### Preferring

Defined in [Preferring](../design/concepts/Preferring.md), line 1.

#### Actions

- `turnOn(person: Person, feature: String) : returns ()`
- `turnOff(person: Person, feature: String) : returns ()`

#### Queries

- `_on(person: Person, feature: String) : one (on: Flag)`

#### Instances

- `Preferring` — instance of `Preferring` — [The Whole Pie types](../design/types.md), line 104.
  - `Person` is `Registering.User` — [The Whole Pie types](../design/types.md), line 105.

### Proposing

Defined in [Proposing](../design/concepts/Proposing.md), line 1.

#### Actions

- `join(subject: Subject, party: Party) : returns ()`
  - Refuses `PROPOSALS_STARTED`: Nobody can join once proposals have been made.
  - Refuses `ALREADY_JOINED`: That party is already part of this negotiation.
- `propose(subject: Subject, proposer: Party, terms: Terms, now: DateTime) : returns (proposal: Proposal)`
  - Refuses `NOT_A_PARTICIPANT`: Only a party to this negotiation can make a proposal.
  - Refuses `NO_OTHER_PARTICIPANTS`: There's nobody else to make a proposal to.
  - Refuses `ALREADY_AGREED`: An agreement has already been reached.
- `accept(proposal: Proposal, party: Party) : returns (proposal: Proposal, subject: Subject, terms: Terms, status: ProposalStatus)`
  - Refuses `NOT_PENDING_FOR_YOU`: There is no such proposal waiting for your answer.
  - Refuses `ALREADY_ACCEPTED`: You've already accepted this proposal.
- `reject(proposal: Proposal, party: Party) : returns (proposal: Proposal)`
  - Refuses `NOT_PENDING_FOR_YOU`: There is no such proposal waiting for your answer.
- `retract(proposal: Proposal, proposer: Party) : returns (proposal: Proposal)`
  - Refuses `NOT_PENDING_FROM_YOU`: There is no such proposal of yours waiting for an answer.

#### Queries

- `_participants(subject: Subject) : many (party: Party)`
- `_proposal(proposal: Proposal) : optional (subject: Subject, proposer: Party, terms: Terms, status: ProposalStatus, proposedAt: DateTime)`
- `_proposals(subject: Subject) : many (proposal: Proposal, proposer: Party, terms: Terms, status: ProposalStatus, proposedAt: DateTime)`
- `_acceptances(proposal: Proposal) : many (party: Party)`
- `_agreement(subject: Subject) : optional (proposal: Proposal, proposer: Party, terms: Terms)`

#### Instances

- `Proposing` — instance of `Proposing` — [The Whole Pie types](../design/types.md), line 57.
  - `Party` is `Briefing.Role` — [The Whole Pie types](../design/types.md), line 59.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 58.
  - `Terms` is `TermSheet` — [The Whole Pie types](../design/types.md), line 60.
- `TimeLimitProposing` — instance of `Proposing` — [The Whole Pie types](../design/types.md), line 62.
  - `Party` is `Briefing.Role` — [The Whole Pie types](../design/types.md), line 64.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 63.
  - `Terms` is `TimeLimit` — [The Whole Pie types](../design/types.md), line 65.

### Rating

Defined in [Rating](../design/concepts/Rating.md), line 1.

#### Actions

- `record(person: Person, subject: Subject, points: Number, batna: Number, jointPoints: Number, jointBatna: Number, bestJointPoints?: Number, now: DateTime) : returns ()`
  - Refuses `ALREADY_RECORDED`: This negotiation already counts for them.

#### Queries

- `_ratings(person: Person) : one (claim?: Number, create?: Number, negotiations: Number)`
- `_results(person: Person) : many (subject: Subject, claim?: Number, create?: Number, recordedAt: DateTime)`

#### Instances

- `Rating` — instance of `Rating` — [The Whole Pie types](../design/types.md), line 88.
  - `Person` is `Registering.User` — [The Whole Pie types](../design/types.md), line 89.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 90.

### Reasoning

Defined in [Reasoning](../design/concepts/Reasoning.md), line 1.

#### Actions

- `prompt(subject: Subject, ask: String) : returns (prompt: Prompt)`
  - Refuses `NOTHING_ASKED`: The question is blank.
- `take(prompt: Prompt, reasoner: Reasoner) : returns (prompt: Prompt)`
  - Refuses `UNKNOWN_PROMPT`: There is no such prompt.
  - Refuses `CLOSED`: This prompt is already concluded or abandoned.
  - Refuses `ALREADY_TAKEN`: This prompt has already been taken.
- `extend(prompt: Prompt, reasoner: Reasoner, text: String) : returns ()`
  - Refuses `UNKNOWN_PROMPT`: There is no such prompt.
  - Refuses `CLOSED`: This prompt is already concluded or abandoned.
  - Refuses `NOT_TAKEN`: A reasoner has to take this prompt before answering it.
  - Refuses `NOT_YOURS`: Only the reasoner that took this prompt can answer it.
- `conclude(prompt: Prompt, reasoner: Reasoner) : returns (prompt: Prompt, subject: Subject, ask: String)`
  - Refuses `UNKNOWN_PROMPT`: There is no such prompt.
  - Refuses `CLOSED`: This prompt is already concluded or abandoned.
  - Refuses `NOT_TAKEN`: A reasoner has to take this prompt before answering it.
  - Refuses `NOT_YOURS`: Only the reasoner that took this prompt can answer it.
  - Refuses `EMPTY_ANSWER`: The answer is still empty; abandon the prompt instead.
- `abandon(prompt: Prompt, reason: String) : returns (prompt: Prompt)`
  - Refuses `NO_REASON`: Say why you are abandoning the prompt.
  - Refuses `UNKNOWN_PROMPT`: There is no such prompt.
  - Refuses `CLOSED`: This prompt is already concluded or abandoned.
- `forget(subject: Subject) : returns (subject: Subject)`

#### Queries

- `_waiting() : many (prompt: Prompt, subject: Subject, ask: String)`
- `_about(subject: Subject) : many (prompt: Prompt, ask: String, answer: String, stage: Stage)`
- `_taken(reasoner: Reasoner) : many (prompt: Prompt, subject: Subject)`
- `_reasoner(prompt: Prompt) : optional (reasoner: Reasoner)`
- `_reason(prompt: Prompt) : optional (reason: String)`
- `_lines(prompt: Prompt) : many (line: String, position: Number)`

#### Instances

- `Reasoning` — instance of `Reasoning` — [The Whole Pie types](../design/types.md), line 71.
  - `Reasoner` is `Agent` — [The Whole Pie types](../design/types.md), line 73.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 72.

### Registering

Defined in [Registering](../design/concepts/Registering.md), line 1.

#### Actions

- `register(username: String) : returns (user: User)`
  - Refuses `INVALID_USERNAME`: A username must have 3 to 32 letters, digits, underscores, or hyphens.
  - Refuses `USERNAME_TAKEN`: That username is taken.

#### Queries

- `_byUsername(username: String) : optional (user: User)`
- `_username(user: User) : optional (username: String)`

#### Instances

- `Registering` — instance of `Registering` — [The Whole Pie types](../design/types.md), line 34.

### Reviewing

Defined in [Reviewing](../design/concepts/Reviewing.md), line 1.

#### Actions

- `review(subject: Subject, reviewer: Person, reviewee: Person, stars: Number) : returns (review: Review)`
  - Refuses `SELF_REVIEW`: You can't review yourself.
  - Refuses `INVALID_STARS`: A review gives 1 to 5 stars.
  - Refuses `ALREADY_REVIEWED`: You've already reviewed them for this.

#### Queries

- `_review(subject: Subject, reviewer: Person, reviewee: Person) : optional (stars: Number)`
- `_standing(reviewee: Person) : one (stars?: Number, reviews: Number)`

#### Instances

- `Reviewing` — instance of `Reviewing` — [The Whole Pie types](../design/types.md), line 84.
  - `Person` is `Registering.User` — [The Whole Pie types](../design/types.md), line 86.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 85.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(subject: Subject) : returns (session: Session, expiresAt: DateTime)`
- `use(session: Session) : returns (subject: Subject)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.
- `end(session: Session) : returns (session: Session)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.

#### Instances

- `AgentSessioning` — instance of `Sessioning` — [The Whole Pie types](../design/types.md), line 42.
  - `Subject` is `Agent` — [The Whole Pie types](../design/types.md), line 43.
- `Sessioning` — instance of `Sessioning` — [The Whole Pie types](../design/types.md), line 39.
  - `Subject` is `Registering.User` — [The Whole Pie types](../design/types.md), line 40.

### Tabling

Defined in [Tabling](../design/concepts/Tabling.md), line 1.

#### Actions

- `recommendTimeLimit(scenario: Scenario, timeLimit: Number) : returns ()`
  - Refuses `INVALID_TIME_LIMIT`: The time limit must be a whole number of minutes from 1 to 180.
- `open(scenario: Scenario) : returns (table: Table)`
- `addSeat(table: Table, role: Role) : returns (table: Table)`
  - Refuses `UNKNOWN_TABLE`: There is no such negotiation.
  - Refuses `ALREADY_BEGUN`: This negotiation has already started.
  - Refuses `SEAT_EXISTS`: This table already has a seat for that role.
- `seat(table: Table, negotiator: Negotiator, role?: Role) : returns (table: Table, role: Role)`
  - Refuses `UNKNOWN_TABLE`: There is no such negotiation.
  - Refuses `ALREADY_BEGUN`: This negotiation has already started.
  - Refuses `NO_SUCH_SEAT`: This table has no seat for that role.
  - Refuses `ROLE_TAKEN`: Someone already has that role at this table.
  - Refuses `TABLE_FULL`: Every seat at this table is taken.
  - Refuses `ALREADY_SEATED`: You already have a seat at this table.
- `begin(table: Table, timeLimit: Number, now: DateTime) : returns (table: Table, deadline: DateTime)`
  - Refuses `INVALID_TIME_LIMIT`: The time limit must be a whole number of minutes from 1 to 180.
  - Refuses `UNKNOWN_TABLE`: There is no such negotiation.
  - Refuses `ALREADY_BEGUN`: This negotiation has already started.
  - Refuses `NOT_ENOUGH_SEATS`: A negotiation needs seats for at least two roles.
  - Refuses `NOT_ALL_SEATED`: Not every role has a negotiator yet.
- `settle(table: Table, now: DateTime) : returns (table: Table)`
  - Refuses `UNKNOWN_TABLE`: There is no such negotiation.
  - Refuses `NOT_OPEN`: This negotiation isn't under way.
  - Refuses `TIME_UP`: Time is up for this negotiation.
- `withdraw(table: Table, negotiator: Negotiator, now: DateTime) : returns (table: Table)`
  - Refuses `UNKNOWN_TABLE`: There is no such negotiation.
  - Refuses `NOT_SEATED`: You don't have a seat at this table.
  - Refuses `NOT_OPEN`: This negotiation isn't under way.
  - Refuses `TIME_UP`: Time is up for this negotiation.
- `expire(table: Table, now: DateTime) : returns (table: Table)`
  - Refuses `UNKNOWN_TABLE`: There is no such negotiation.
  - Refuses `NOT_OPEN`: This negotiation isn't under way.
  - Refuses `NOT_DUE`: Time isn't up for this negotiation yet.

#### Queries

- `_recommendedTimeLimit(scenario: Scenario) : optional (timeLimit: Number)`
- `_acceptableTimeLimit(timeLimit: Number) : one (acceptable: Flag)`
- `_table(table: Table) : optional (scenario: Scenario, status: TableStatus, timeLimit?: Number, deadline?: DateTime, withdrawnBy?: Negotiator)`
- `_seats(table: Table) : many (role: Role, negotiator?: Negotiator)`
- `_tablesOf(negotiator: Negotiator) : many (table: Table, role: Role, scenario: Scenario, status: TableStatus)`
- `_overdue(now: DateTime) : many (table: Table)`

#### Instances

- `Tabling` — instance of `Tabling` — [The Whole Pie types](../design/types.md), line 48.
  - `Negotiator` is `Player` — [The Whole Pie types](../design/types.md), line 51.
  - `Role` is `Briefing.Role` — [The Whole Pie types](../design/types.md), line 50.
  - `Scenario` is `Briefing.Scenario` — [The Whole Pie types](../design/types.md), line 49.

## Application types

Concrete types:

- `Agent` — [The Whole Pie types](../design/types.md), line 29.
- `Player` — [The Whole Pie types](../design/types.md), line 20.
- `TermSheet` — [The Whole Pie types](../design/types.md), line 23.
- `TimeLimit` — [The Whole Pie types](../design/types.md), line 26.

## Computations

- `spiceLevel(jointPoints?: Number, jointBatna: Number) : Number` — [Practice](../design/compositions/practice.md), line 24.

## Views

_Views name reusable conditions. Multiple `where` blocks are alternatives._

### (role) of (scenario) can be practiced

Authored path: `practice.starting.playable`.
- Covered by [Friends](../design/compositions/friends.md), line 7.
- Covered by [Practice](../design/compositions/practice.md), line 32.

```view
(role) of (scenario) can be practiced — inputs (scenario, role); outputs (); bindings ()
  where
    Briefing._role (role) has (scenario)
    Briefing._scenario (scenario) has (published: true)
```

### (table) has ended

Authored path: `table.access.ended`.
- Covered by [The debrief](../design/compositions/debrief.md), line 7.
- Covered by [Ratings](../design/compositions/ratings.md), line 13.
- Covered by [The table](../design/compositions/table.md), line 37.

```view
(table) has ended — inputs (table); outputs (); bindings (status)
  where
    Tabling._table (table) has (status)
    status is among ["SETTLED", "WITHDRAWN", "EXPIRED"]
```

### (table) is overdue at (instant)

Authored path: `table.access.overdue`.
- Covered by [The table](../design/compositions/table.md), line 15.

```view
(table) is overdue at (instant) — inputs (table, instant); outputs (); bindings (deadline)
  where
    Tabling._table (table) has (deadline, status: "OPEN")
    instant is at least deadline
```

### (table) is preparing

Authored path: `table.starting.preparing`.
- Covered by [The table](../design/compositions/table.md), line 39.

```view
(table) is preparing — inputs (table); outputs (); bindings ()
  where Tabling._table (table) has (status: "PREPARING")
```

### (table) is under way at (instant)

Authored path: `table.access.underWay`.
- Covered by [The table](../design/compositions/table.md), line 13.

```view
(table) is under way at (instant) — inputs (table, instant); outputs (); bindings (deadline)
  where
    Tabling._table (table) has (deadline, status: "OPEN")
    instant is less than deadline
```

### who sits in the seat for (role) at (table)

Authored path: `table.access.occupant`.
- Covered by [The table](../design/compositions/table.md), line 11.

```view
who sits in the seat for (role) at (table) — inputs (table, role); outputs (negotiator); bindings () — answers at most one (negotiator)
  where Tabling._seats (table) has (negotiator, role)
```

### the empty seats at (table)

Authored path: `table.access.openSeats`.
- Covered by [The table](../design/compositions/table.md), line 11.

```view
the empty seats at (table) — inputs (table); outputs (role); bindings () — answers any number of (role)
  where
    Tabling._seats (table) has (role)
    no view "who sits in the seat for (role) at (table)" with (role, table)
```

### (table) is waiting for someone

Authored path: `friends.joining.waitingForSomeone`.
- Covered by [Friends](../design/compositions/friends.md), line 20.

```view
(table) is waiting for someone — inputs (table); outputs (); bindings ()
  where
    view "(table) is preparing" with (table)
    view "the empty seats at (table)" with (table)
```

### (table) isn't open

Authored path: `table.access.notOpen`.
- Covered by [The table](../design/compositions/table.md), line 16.

```view
(table) isn't open — inputs (table); outputs (); bindings (status)
  where
    Tabling._table (table) has (status)
    status is among ["PREPARING", "SETTLED", "WITHDRAWN", "EXPIRED"]
```

### (user) is prepared to start (table)

Authored path: `table.access.preparedFor`.
- Covered by [Preparing](../design/compositions/preparing.md), line 21.

```view
(user) is prepared to start (table) — inputs (user, table); outputs (); bindings ()
  where Preferring._on (feature: "prep-sheet", person: user) has (on: false)
  where
    TargetNoting._note (author: user, subject: table) and not (body: "")
    WalkawayNoting._note (author: user, subject: table) and not (body: "")
    PrioritiesNoting._note (author: user, subject: table) and not (body: "")
```

### a question that asks (ask) about (table) is waiting

Authored path: `counterpart.asking.hasWaitingQuestion`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 9.

```view
a question that asks (ask) about (table) is waiting — inputs (table, ask); outputs (); bindings ()
  where Reasoning._about (subject: table) has (ask, stage: "WAITING")
```

### how many people a negotiation of (scenario) needs

Authored path: `matchmaking.looking.groupSize`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 7.

```view
how many people a negotiation of (scenario) needs — inputs (scenario); outputs (size); bindings () — answers exactly one (size)
  where size is the count of Briefing._roles (scenario)
```

### how spicy (scenario) is

Authored path: `practice.choosing.spiceOf`.
- Covered by [Practice](../design/compositions/practice.md), line 15.

```view
how spicy (scenario) is — inputs (scenario); outputs (spice); bindings (jointPoints, jointBatna) — answers at most one (spice)
  where
    whether Briefing._wholePie (scenario) has (jointPoints)
    Briefing._jointBatna (scenario) has (jointBatna)
    spice is spiceLevel (jointBatna, jointPoints)
```

### people can look for others to negotiate (scenario) with

Authored path: `matchmaking.looking.findable`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 7.

```view
people can look for others to negotiate (scenario) with — inputs (scenario); outputs (); bindings ()
  where Briefing._scenario (scenario) has (published: true)
```

### the role (user) plays at (table)

Authored path: `table.access.seatedAs`.
- Covered by [The table](../design/compositions/table.md), line 11.

```view
the role (user) plays at (table) — inputs (user, table); outputs (role); bindings () — answers at most one (role)
  where Tabling._seats (table) has (negotiator: user, role)
```

### the role that walked away from (table)

Authored path: `debrief.outcome.walkedAway`.
- Covered by [The debrief](../design/compositions/debrief.md), line 11.

```view
the role that walked away from (table) — inputs (table); outputs (role); bindings (negotiator) — answers at most one (role)
  where
    Tabling._table (table) has (status: "WITHDRAWN", withdrawnBy: negotiator)
    Tabling._seats (table) has (negotiator, role)
```

### the role the counterpart plays at (table)

Authored path: `counterpart.asking.counterpartRole`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 9.

```view
the role the counterpart plays at (table) — inputs (table); outputs (role); bindings () — answers at most one (role)
  where Tabling._seats (table) has (negotiator: "bot:counterpart", role)
```

### the role the person plays at (table)

Authored path: `debrief.coaching.personRole`.
- Covered by [The debrief](../design/compositions/debrief.md), line 26.

```view
the role the person plays at (table) — inputs (table); outputs (role); bindings () — answers at most one (role)
  where
    Tabling._seats (table) has (role)
    no view "the role the counterpart plays at (table)" with (table) has (role)
```

### the table of the debrief (prompt) that (agent) took

Authored path: `debrief.coaching.debriefTakenBy`.
- Covered by [The debrief](../design/compositions/debrief.md), line 26.

```view
the table of the debrief (prompt) that (agent) took — inputs (agent, prompt); outputs (table); bindings () — answers at most one (table)
  where
    Reasoning._taken (reasoner: agent) has (prompt, subject: table)
    Reasoning._about (subject: table) has (ask: "How did the person negotiate, and what could they do better next time?", prompt)
```

### the table of the joint debrief (prompt) that (agent) took

Authored path: `debrief.coaching.jointDebriefTakenBy`.
- Covered by [The debrief](../design/compositions/debrief.md), line 26.

```view
the table of the joint debrief (prompt) that (agent) took — inputs (agent, prompt); outputs (table); bindings () — answers at most one (table)
  where
    Reasoning._taken (reasoner: agent) has (prompt, subject: table)
    Reasoning._about (subject: table) has (ask: "How did each side negotiate, and what could each do better next time?", prompt)
```

### the table the invitation (code) lets people into

Authored path: `friends.joining.invitedTo`.
- Covered by [Friends](../design/compositions/friends.md), line 18.

```view
the table the invitation (code) lets people into — inputs (code); outputs (table); bindings () — answers at most one (table)
  where Inviting._invitation (code) has (subject: table)
```

### the table where (user) sits with the group (request) found

Authored path: `matchmaking.looking.seatedFor`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 7.

```view
the table where (user) sits with the group (request) found — inputs (request, user); outputs (table); bindings () — answers at most one (table)
  where
    Matchmaking._place (request) has (place: table)
    view "the role (user) plays at (table)" with (table, user)
```

### the terms (table) settled on

Authored path: `debrief.outcome.settledTerms`.
- Covered by [The debrief](../design/compositions/debrief.md), line 10.
- Covered by [Ratings](../design/compositions/ratings.md), line 9.

```view
the terms (table) settled on — inputs (table); outputs (terms); bindings () — answers at most one (terms)
  where
    Tabling._table (table) has (status: "SETTLED")
    Proposing._agreement (subject: table) has (terms)
```

### when the time is up at (table), once it began

Authored path: `table.access.began`.
- Covered by [The debrief](../design/compositions/debrief.md), line 24.
- Covered by [Ratings](../design/compositions/ratings.md), line 9.

```view
when the time is up at (table), once it began — inputs (table); outputs (deadline); bindings () — answers at most one (deadline)
  where Tabling._table (table) has (deadline)
```

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the issues of (scenario)

Authored path: `table.showing.issuesOf`.
- Covered by [The table](../design/compositions/table.md), line 23.

```former
Former "the issues of (scenario)" — inputs (scenario); bindings (issue, name, kind, unit, option, optionName, universalValue); promises exactly one record — forms:
  each Briefing._issues (scenario) has (issue, kind, name)
    where whether Briefing._issues (scenario) has (issue, unit)
    form a record of
      issue
      kind
      name
      options: each Briefing._options (issue) has (name: optionName, option)
        where whether Briefing._options (issue) has (option, universalValue)
        form a record of
          name: optionName
          option
          universalValue
      unit
```

### the ratings of (user)

Authored path: `table.showing.ratingsOf`.
- Covered by [Ratings](../design/compositions/ratings.md), line 23.

```former
Former "the ratings of (user)" — inputs (user); bindings (claim, create, negotiations, stars, reviews); promises at most one record — forms:
  a record of
    where Rating._ratings (person: user) has (negotiations)
    where whether Rating._ratings (person: user) has (claim)
    where whether Rating._ratings (person: user) has (create)
    where Reviewing._standing (reviewee: user) has (reviews)
    where whether Reviewing._standing (reviewee: user) has (stars)
    claim
    create
    negotiations
    reviews
    stars
```

### (table) as (role) sees it

Authored path: `table.showing.tableAsSeenBy`.
- Covered by [The table](../design/compositions/table.md), line 23.

```former
Former "(table) as (role) sees it" — inputs (table, role); bindings (scenario, scenarioName, status, timeLimit, recommendedTimeLimit, deadline, roleName, batna, brief, seat, seatName, sitter, player, open, message, sender, body, sentAt, proposal, proposer, terms, proposalStatus, proposedAt, points, option, optionPoints); promises exactly one record — forms:
  a record of
    where Tabling._table (table) has (scenario, status)
    where whether Tabling._table (table) has (timeLimit)
    where whether Tabling._table (table) has (deadline)
    where whether Tabling._recommendedTimeLimit (scenario) has (timeLimit: recommendedTimeLimit)
    where Briefing._scenario (scenario) has (name: scenarioName)
    where Briefing._role (role) has (batna, brief, name: roleName)
    batna
    brief
    deadline
    issues: former "the issues of (scenario)" with (scenario)
    messages: each Conversing._messages (subject: table) has (body, message, sender, sentAt)
      form a record of
        body
        message
        sender
        sentAt
    openSeats: the distinct open of each view "the empty seats at (table)" with (table) has (role: open)
    payoffs: each Briefing._payoffs (role) has (option, points: optionPoints)
      form a record of
        option
        points: optionPoints
    proposals: each Proposing._proposals (subject: table) has (proposal, proposedAt, proposer, status: proposalStatus, terms)
      where whether Briefing._dealPayoff (role, terms) has (points)
      form a record of
        points
        proposal
        proposedAt
        proposer
        status: proposalStatus
        terms
    recommendedTimeLimit
    role
    roleName
    scenario
    scenarioName
    seats: each Tabling._seats (table) has (role: seat)
      where Briefing._role (role: seat) has (name: seatName)
      where whether view "who sits in the seat for (role) at (table)" with (role: seat, table) has (negotiator: sitter)
      where whether Registering._username (user: sitter) has (username: player)
      form a record of
        name: seatName
        player
        ratings: whether former "the ratings of (user)" with (user: sitter)
        role: seat
    status
    table
    timeLimit
```

### every side of (table), as each saw it

Authored path: `debrief.coaching.sidesOf`.
- Covered by [The debrief](../design/compositions/debrief.md), line 26.

```former
Former "every side of (table), as each saw it" — inputs (table); bindings (role); promises exactly one record — forms:
  each Tabling._seats (table) has (role)
    form a record of
      role
      table: former "(table) as (role) sees it" with (role, table)
```

### the coach's debriefs of (table)

Authored path: `debrief.coaching.coachingOf`.
- Covered by [The debrief](../design/compositions/debrief.md), line 28.

```former
Former "the coach's debriefs of (table)" — inputs (table); bindings (prompt, ask, answer, stage, reason); promises exactly one record — forms:
  each Reasoning._about (subject: table) has (answer, ask, prompt, stage)
    where ask is among ["How did the person negotiate, and what could they do better next time?", "How did each side negotiate, and what could each do better next time?"]
    where whether Reasoning._reason (prompt) has (reason)
    form a record of
      answer
      reason
      stage
```

### the debrief of (table)

Authored path: `debrief.showing.debriefOf`.
- Covered by [The debrief](../design/compositions/debrief.md), line 7.

```former
Former "the debrief of (table)" — inputs (table); bindings (scenario, outcome, agreed, quitter, best, bestJointPoints, jointBatna, role, name, batna, points, bestPoints, option, optionPoints); promises exactly one record — forms:
  a record of
    where Tabling._table (table) has (scenario, status: outcome)
    where whether view "the terms (table) settled on" with (table) has (terms: agreed)
    where whether view "the role that walked away from (table)" with (table) has (role: quitter)
    where whether Briefing._wholePie (scenario) has (jointBatna, jointPoints: bestJointPoints, terms: best)
    agreed
    best
    bestJointPoints
    issues: former "the issues of (scenario)" with (scenario)
    jointBatna
    outcome
    roles: each Briefing._roles (scenario) has (name, role)
      where Briefing._role (role) has (batna)
      where whether Briefing._dealPayoff (role, terms: agreed) has (points)
      where whether Briefing._dealPayoff (role, terms: best) has (points: bestPoints)
      form a record of
        batna
        bestPoints
        name
        payoffs: each Briefing._payoffs (role) has (option, points: optionPoints)
          form a record of
            option
            points: optionPoints
        points
        role
    walkedAway: quitter
```

### the invitation link to (table)

Authored path: `table.showing.linkOf`.
- Covered by [The table](../design/compositions/table.md), line 23.

```former
Former "the invitation link to (table)" — inputs (table); bindings (code); promises exactly one record — forms:
  the code of the first Inviting._invitations (subject: table) has (code)
```

### the invitation to (table) from (inviter)

Authored path: `friends.joining.invitationTo`.
- Covered by [Friends](../design/compositions/friends.md), line 20.

```former
Former "the invitation to (table) from (inviter)" — inputs (table, inviter); bindings (scenario, scenarioName, username, timeLimit, role, name); promises exactly one record — forms:
  a record of
    where Tabling._table (table) has (scenario)
    where Briefing._scenario (scenario) has (name: scenarioName)
    where Registering._username (user: inviter) has (username)
    where whether Tabling._recommendedTimeLimit (scenario) has (timeLimit)
    inviter: username
    openSeats: each view "the empty seats at (table)" with (table) has (role)
      where Briefing._role (role) has (name)
      form a record of
        name
        role
    recommendedTimeLimit: timeLimit
    scenarioName
```

### the notes (user) wrote about (table)

Authored path: `table.showing.notesOf`.
- Covered by [The table](../design/compositions/table.md), line 23.

```former
Former "the notes (user) wrote about (table)" — inputs (user, table); bindings (body); promises exactly one record — forms:
  a record of
    where whether Noting._note (author: user, subject: table) has (body)
    body
```

### the open questions about (table)

Authored path: `table.showing.questionsOpenAt`.
- Covered by [The table](../design/compositions/table.md), line 23.

```former
Former "the open questions about (table)" — inputs (table); bindings (prompt, ask, stage); promises exactly one record — forms:
  the count of Reasoning._about (subject: table) has (ask, prompt, stage)
    where ask is among ["What do you say next to the other side?", "Do you accept the proposal waiting for your answer?"]
    where stage is among ["WAITING", "FORMING"]
```

### the people (user) can review at (table)

Authored path: `debrief.showing.reviewsBy`.
- Covered by [Ratings](../design/compositions/ratings.md), line 15.

```former
Former "the people (user) can review at (table)" — inputs (user, table); bindings (role, negotiator, username, stars); promises exactly one record — forms:
  each Tabling._seats (table) has (negotiator, role)
    where no view "the role (user) plays at (table)" with (table, user) has (role)
    where Registering._username (user: negotiator) has (username)
    where whether Reviewing._review (reviewee: negotiator, reviewer: user, subject: table) has (stars)
    form a record of
      player: username
      role
      stars
```

### the plan (user) wrote for (table)

Authored path: `table.showing.planOf`.
- Covered by [The table](../design/compositions/table.md), line 23.

```former
Former "the plan (user) wrote for (table)" — inputs (user, table); bindings (on, target, walkaway, priorities); promises exactly one record — forms:
  a record of
    where Preferring._on (feature: "prep-sheet", person: user) has (on)
    where whether TargetNoting._note (author: user, subject: table) has (body: target)
    where whether WalkawayNoting._note (author: user, subject: table) has (body: walkaway)
    where whether PrioritiesNoting._note (author: user, subject: table) has (body: priorities)
    on
    priorities
    target
    walkaway
```

### the prompts (agent) has taken and not finished

Authored path: `reusable.answering.finding.promptsTakenBy`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 22.

```former
Former "the prompts (agent) has taken and not finished" — inputs (agent); bindings (prompt); promises exactly one record — forms:
  each Reasoning._taken (reasoner: agent) has (prompt)
    form a record of
      prompt
```

### the published scenarios

Authored path: `practice.choosing.scenarios`.
- Covered by [Practice](../design/compositions/practice.md), line 7.

```former
Former "the published scenarios" — inputs (); bindings (scenario, name, timeLimit, role, roleName, spice); promises exactly one record — forms:
  each Briefing._published () has (name, scenario)
    where whether Tabling._recommendedTimeLimit (scenario) has (timeLimit)
    where view "how spicy (scenario) is" with (scenario) has (spice)
    form a record of
      name
      roles: each Briefing._roles (scenario) has (name: roleName, role)
        form a record of
          name: roleName
          role
      scenario
      spice
      timeLimit
```

### the questions about (table)

Authored path: `table.showing.questionsAbout`.
- Covered by [The table](../design/compositions/table.md), line 23.

```former
Former "the questions about (table)" — inputs (table); bindings (prompt, ask, stage, reason); promises exactly one record — forms:
  each Reasoning._about (subject: table) has (ask, prompt, stage)
    where ask is among ["What do you say next to the other side?", "Do you accept the proposal waiting for your answer?"]
    where whether Reasoning._reason (prompt) has (reason)
    form a record of
      reason
      stage
```

### the suggestion to start (table)

Authored path: `table.showing.startTalksAt`.
- Covered by [The table](../design/compositions/table.md), line 23.

```former
Former "the suggestion to start (table)" — inputs (table); bindings (proposal, proposer, minutes, party); promises exactly one record — forms:
  each TimeLimitProposing._proposals (subject: table) has (proposal, proposer, status: "PENDING", terms: minutes)
    form a record of
      agreed: the distinct party of each TimeLimitProposing._acceptances (proposal) has (party)
      minutes
      proposal
      proposer
```

### the tables (user) has a seat at

Authored path: `practice.choosing.tablesOf`.
- Covered by [Practice](../design/compositions/practice.md), line 7.

```former
Former "the tables (user) has a seat at" — inputs (user); bindings (table, role, scenario, status, scenarioName, roleName, seat, other, username); promises exactly one record — forms:
  each Tabling._tablesOf (negotiator: user) has (role, scenario, status, table)
    where Briefing._scenario (scenario) has (name: scenarioName)
    where Briefing._role (role) has (name: roleName)
    form a record of
      opponents: the distinct username of each Tabling._seats (table) has (negotiator: other, role: seat)
        where no view "the role (user) plays at (table)" with (table, user) has (role: seat)
        where Registering._username (user: other) has (username)
      role
      roleName
      scenario
      scenarioName
      status
      table
```

### the waiting prompts

Authored path: `reusable.answering.finding.waitingPrompts`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 22.

```former
Former "the waiting prompts" — inputs (); bindings (prompt, ask); promises exactly one record — forms:
  each Reasoning._waiting () has (ask, prompt)
    form a record of
      ask
      prompt
```

## Reactions

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### counterpart.answering.AcceptForCounterpart

Authored path: `counterpart.answering.AcceptForCounterpart`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 29.

```reaction
when Reasoning.conclude (prompt, ask: "Do you accept the proposal waiting for your answer?", subject: table)
where
  instant is the current flow's instant
  Reasoning._lines (prompt) has (line: "ACCEPT", position: 0)
  Reasoning._lines (prompt) has (line: proposal, position: 1)
  Proposing._proposal (proposal) has (status: "PENDING", subject: table, terms)
  view "the role the counterpart plays at (table)" with (table) has (role)
  Briefing._dealPayoff (role, terms) has (points)
  Briefing._role (role) has (batna)
  points is at least batna
  view "(table) is under way at (instant)" with (instant, table)
then
  Proposing.accept (party: role, proposal)
```

### counterpart.answering.RejectForCounterpart:below-batna

Authored path: `counterpart.answering.RejectForCounterpart`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 29.

```reaction
when Reasoning.conclude (prompt, ask: "Do you accept the proposal waiting for your answer?", subject: table)
where
  instant is the current flow's instant
  Reasoning._lines (prompt) has (line: proposal, position: 1)
  Proposing._proposal (proposal) has (status: "PENDING", subject: table)
  view "the role the counterpart plays at (table)" with (table) has (role)
  view "(table) is under way at (instant)" with (instant, table)
  Reasoning._lines (prompt) has (line: "ACCEPT", position: 0)
  Proposing._proposal (proposal) has (terms)
  Briefing._dealPayoff (role, terms) has (points)
  Briefing._role (role) has (batna)
  points is less than batna
then
  Proposing.reject (party: role, proposal)
```

### counterpart.answering.RejectForCounterpart:decided

Authored path: `counterpart.answering.RejectForCounterpart`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 29.

```reaction
when Reasoning.conclude (prompt, ask: "Do you accept the proposal waiting for your answer?", subject: table)
where
  instant is the current flow's instant
  Reasoning._lines (prompt) has (line: proposal, position: 1)
  Proposing._proposal (proposal) has (status: "PENDING", subject: table)
  view "the role the counterpart plays at (table)" with (table) has (role)
  view "(table) is under way at (instant)" with (instant, table)
  Reasoning._lines (prompt) has (line: "REJECT", position: 0)
then
  Proposing.reject (party: role, proposal)
```

### counterpart.answering.SayWhy

Authored path: `counterpart.answering.SayWhy`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 29.

```reaction
when Reasoning.conclude (prompt, ask: "Do you accept the proposal waiting for your answer?", subject: table)
where
  instant is the current flow's instant
  Reasoning._lines (prompt) has (line: remark, position)
  position is at least 2
  view "the role the counterpart plays at (table)" with (table) has (role)
  view "(table) is under way at (instant)" with (instant, table)
then
  Conversing.send (body: remark, now: instant, sender: role, subject: table)
```

### counterpart.answering.SendReply

Authored path: `counterpart.answering.SendReply`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 25.

```reaction
when Reasoning.conclude (prompt, ask: "What do you say next to the other side?", subject: table)
where
  instant is the current flow's instant
  Reasoning._lines (prompt) has (line: part)
  view "the role the counterpart plays at (table)" with (table) has (role)
  view "(table) is under way at (instant)" with (instant, table)
then
  Conversing.send (body: part, now: instant, sender: role, subject: table)
```

### counterpart.asking.AskForDecision

Authored path: `counterpart.asking.AskForDecision`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 9.

```reaction
when Proposing.propose (proposer, subject: table)
where
  view "the role the counterpart plays at (table)" with (table)
  no view "the role the counterpart plays at (table)" with (table) has (role: proposer)
  no view "a question that asks (ask) about (table) is waiting" with (ask: "Do you accept the proposal waiting for your answer?", table)
then
  Reasoning.prompt (ask: "Do you accept the proposal waiting for your answer?", subject: table)
```

### counterpart.asking.AskForReply

Authored path: `counterpart.asking.AskForReply`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 9.

```reaction
when Conversing.send (sender, subject: table)
where
  view "the role the counterpart plays at (table)" with (table)
  no view "the role the counterpart plays at (table)" with (table) has (role: sender)
  no view "a question that asks (ask) about (table) is waiting" with (ask: "What do you say next to the other side?", table)
then
  Reasoning.prompt (ask: "What do you say next to the other side?", subject: table)
```

### counterpart.reading.ReadTable

Authored path: `counterpart.reading.ReadTable`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 17.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 20.

```reaction
when RequestBoundary.request (path: "/counterpart/table", prompt, requestId, session)
then
  AgentSessioning.use (session)
```

### counterpart.reading.ReadTable:not-seated#2

Authored path: `counterpart.reading.ReadTable`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 17.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 20.

```reaction
when AgentSessioning.use (session, subject: agent), asked by counterpart.reading.ReadTable
where
  Reasoning._taken (reasoner: agent) has (prompt, subject: table)
  no view "the role the counterpart plays at (table)" with (table)
  earlier, RequestBoundary.request (path: "/counterpart/table", prompt, requestId, session)
then
  RequestBoundary.respond (error: "NOT_SEATED", requestId)
```

### counterpart.reading.ReadTable:not-taken#2

Authored path: `counterpart.reading.ReadTable`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 17.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 20.

```reaction
when AgentSessioning.use (session, subject: agent), asked by counterpart.reading.ReadTable
where
  earlier, RequestBoundary.request (path: "/counterpart/table", prompt, requestId, session)
  no Reasoning._taken (reasoner: agent) has (prompt)
then
  RequestBoundary.respond (error: "NOT_TAKEN", requestId)
```

### counterpart.reading.ReadTable:seated#2

Authored path: `counterpart.reading.ReadTable`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 17.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 20.

```reaction
when AgentSessioning.use (session, subject: agent), asked by counterpart.reading.ReadTable
where
  Reasoning._taken (reasoner: agent) has (prompt, subject: table)
  view "the role the counterpart plays at (table)" with (table) has (role)
  earlier, RequestBoundary.request (path: "/counterpart/table", prompt, requestId, session)
then
  RequestBoundary.respond (requestId, table: former "(table) as (role) sees it" with (role, table))
```

### counterpart.starting.AgreeToAnyStart

Authored path: `counterpart.starting.AgreeToAnyStart`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 13.

```reaction
when TimeLimitProposing.propose (proposer, subject: table, proposal)
where
  view "the role the counterpart plays at (table)" with (table) has (role)
  no view "the role the counterpart plays at (table)" with (table) has (role: proposer)
then
  TimeLimitProposing.accept (party: role, proposal)
```

### debrief.coaching.CoachWhenEnded.Expired:between-people

Authored path: `debrief.coaching.CoachWhenEnded.Expired`.
- Covered by [The debrief](../design/compositions/debrief.md), line 24.

```reaction
when Tabling.expire (table)
where
  view "when the time is up at (table), once it began" with (table)
  no view "the role the counterpart plays at (table)" with (table)
then
  Reasoning.prompt (ask: "How did each side negotiate, and what could each do better next time?", subject: table)
```

### debrief.coaching.CoachWhenEnded.Expired:practice

Authored path: `debrief.coaching.CoachWhenEnded.Expired`.
- Covered by [The debrief](../design/compositions/debrief.md), line 24.

```reaction
when Tabling.expire (table)
where
  view "when the time is up at (table), once it began" with (table)
  view "the role the counterpart plays at (table)" with (table)
then
  Reasoning.prompt (ask: "How did the person negotiate, and what could they do better next time?", subject: table)
```

### debrief.coaching.CoachWhenEnded.Settled:between-people

Authored path: `debrief.coaching.CoachWhenEnded.Settled`.
- Covered by [The debrief](../design/compositions/debrief.md), line 24.

```reaction
when Tabling.settle (table)
where
  view "when the time is up at (table), once it began" with (table)
  no view "the role the counterpart plays at (table)" with (table)
then
  Reasoning.prompt (ask: "How did each side negotiate, and what could each do better next time?", subject: table)
```

### debrief.coaching.CoachWhenEnded.Settled:practice

Authored path: `debrief.coaching.CoachWhenEnded.Settled`.
- Covered by [The debrief](../design/compositions/debrief.md), line 24.

```reaction
when Tabling.settle (table)
where
  view "when the time is up at (table), once it began" with (table)
  view "the role the counterpart plays at (table)" with (table)
then
  Reasoning.prompt (ask: "How did the person negotiate, and what could they do better next time?", subject: table)
```

### debrief.coaching.CoachWhenEnded.Withdrawn:between-people

Authored path: `debrief.coaching.CoachWhenEnded.Withdrawn`.
- Covered by [The debrief](../design/compositions/debrief.md), line 24.

```reaction
when Tabling.withdraw (table)
where
  view "when the time is up at (table), once it began" with (table)
  no view "the role the counterpart plays at (table)" with (table)
then
  Reasoning.prompt (ask: "How did each side negotiate, and what could each do better next time?", subject: table)
```

### debrief.coaching.CoachWhenEnded.Withdrawn:practice

Authored path: `debrief.coaching.CoachWhenEnded.Withdrawn`.
- Covered by [The debrief](../design/compositions/debrief.md), line 24.

```reaction
when Tabling.withdraw (table)
where
  view "when the time is up at (table), once it began" with (table)
  view "the role the counterpart plays at (table)" with (table)
then
  Reasoning.prompt (ask: "How did the person negotiate, and what could they do better next time?", subject: table)
```

### debrief.coaching.ReadDebrief

Authored path: `debrief.coaching.ReadDebrief`.
- Covered by [The debrief](../design/compositions/debrief.md), line 26.
- Covered by [The debrief](../design/compositions/debrief.md), line 31.

```reaction
when RequestBoundary.request (path: "/coach/table", prompt, requestId, session)
then
  AgentSessioning.use (session)
```

### debrief.coaching.ReadDebrief:ended#2

Authored path: `debrief.coaching.ReadDebrief`.
- Covered by [The debrief](../design/compositions/debrief.md), line 26.
- Covered by [The debrief](../design/compositions/debrief.md), line 31.

```reaction
when AgentSessioning.use (session, subject: agent), asked by debrief.coaching.ReadDebrief
where
  earlier, RequestBoundary.request (path: "/coach/table", prompt, requestId, session)
  view "the table of the debrief (prompt) that (agent) took" with (agent, prompt) has (table)
  view "(table) has ended" with (table)
  view "the role the person plays at (table)" with (table) has (role: person)
then
  RequestBoundary.respond (debrief: former "the debrief of (table)" with (table), requestId, table: former "(table) as (role) sees it" with (role: person, table))
```

### debrief.coaching.ReadDebrief:joint#2

Authored path: `debrief.coaching.ReadDebrief`.
- Covered by [The debrief](../design/compositions/debrief.md), line 26.
- Covered by [The debrief](../design/compositions/debrief.md), line 31.

```reaction
when AgentSessioning.use (session, subject: agent), asked by debrief.coaching.ReadDebrief
where
  earlier, RequestBoundary.request (path: "/coach/table", prompt, requestId, session)
  view "the table of the joint debrief (prompt) that (agent) took" with (agent, prompt) has (table)
  view "(table) has ended" with (table)
then
  RequestBoundary.respond (debrief: former "the debrief of (table)" with (table), requestId, sides: former "every side of (table), as each saw it" with (table))
```

### debrief.coaching.ReadDebrief:not-taken#2

Authored path: `debrief.coaching.ReadDebrief`.
- Covered by [The debrief](../design/compositions/debrief.md), line 26.
- Covered by [The debrief](../design/compositions/debrief.md), line 31.

```reaction
when AgentSessioning.use (session, subject: agent), asked by debrief.coaching.ReadDebrief
where
  earlier, RequestBoundary.request (path: "/coach/table", prompt, requestId, session)
  no view "the table of the debrief (prompt) that (agent) took" with (agent, prompt)
  no view "the table of the joint debrief (prompt) that (agent) took" with (agent, prompt)
then
  RequestBoundary.respond (error: "NOT_TAKEN", requestId)
```

### debrief.showing.ShowDebrief

Authored path: `debrief.showing.ShowDebrief`.
- Covered by [The debrief](../design/compositions/debrief.md), line 7.
- Covered by [The debrief](../design/compositions/debrief.md), line 19.

```reaction
when RequestBoundary.request (path: "/tables/debrief", requestId, session, table)
then
  Sessioning.use (session)
```

### debrief.showing.ShowDebrief:ended#2

Authored path: `debrief.showing.ShowDebrief`.
- Covered by [The debrief](../design/compositions/debrief.md), line 7.
- Covered by [The debrief](../design/compositions/debrief.md), line 19.

```reaction
when Sessioning.use (session, subject: user), asked by debrief.showing.ShowDebrief
where
  earlier, RequestBoundary.request (path: "/tables/debrief", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user) has (role)
  view "(table) has ended" with (table)
then
  RequestBoundary.respond (coaching: former "the coach's debriefs of (table)" with (table), debrief: former "the debrief of (table)" with (table), requestId, reviews: former "the people (user) can review at (table)" with (table, user), role)
```

### debrief.showing.ShowDebrief:not-over#2

Authored path: `debrief.showing.ShowDebrief`.
- Covered by [The debrief](../design/compositions/debrief.md), line 7.
- Covered by [The debrief](../design/compositions/debrief.md), line 19.

```reaction
when Sessioning.use (session, subject: user), asked by debrief.showing.ShowDebrief
where
  earlier, RequestBoundary.request (path: "/tables/debrief", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  no view "(table) has ended" with (table)
then
  RequestBoundary.respond (error: "NOT_OVER", requestId)
```

### debrief.showing.ShowDebrief:not-seated#2

Authored path: `debrief.showing.ShowDebrief`.
- Covered by [The debrief](../design/compositions/debrief.md), line 7.
- Covered by [The debrief](../design/compositions/debrief.md), line 19.

```reaction
when Sessioning.use (session, subject: user), asked by debrief.showing.ShowDebrief
where
  earlier, RequestBoundary.request (path: "/tables/debrief", requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### friends.joining.Join

Authored path: `friends.joining.Join`.
- Covered by [Friends](../design/compositions/friends.md), line 22.
- Covered by [Friends](../design/compositions/friends.md), line 26.

```reaction
when RequestBoundary.request (code, path: "/friends/join", requestId, role, session)
then
  Sessioning.use (session)
```

### friends.joining.Join#2

Authored path: `friends.joining.Join`.
- Covered by [Friends](../design/compositions/friends.md), line 22.
- Covered by [Friends](../design/compositions/friends.md), line 26.

```reaction
when Sessioning.use (session, subject: user), asked by friends.joining.Join
where
  earlier, RequestBoundary.request (code, path: "/friends/join", requestId, role, session)
  view "the table the invitation (code) lets people into" with (code) has (table)
then
  Tabling.seat (negotiator: user, role, table)
```

### friends.joining.Join#3

Authored path: `friends.joining.Join`.
- Covered by [Friends](../design/compositions/friends.md), line 22.
- Covered by [Friends](../design/compositions/friends.md), line 26.

```reaction
when Tabling.seat (negotiator: user, role, table), asked by friends.joining.Join#2
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (code, path: "/friends/join", requestId, role, session)
then
  RequestBoundary.respond (requestId, table)
```

### friends.joining.RefuseUnknownCode

Authored path: `friends.joining.RefuseUnknownCode`.
- Covered by [Friends](../design/compositions/friends.md), line 22.
- Covered by [Friends](../design/compositions/friends.md), line 27.

```reaction
when RequestBoundary.request (code, path: "/friends/join", requestId, role, session)
where
  no view "the table the invitation (code) lets people into" with (code)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### friends.joining.ShowInvitation

Authored path: `friends.joining.ShowInvitation`.
- Covered by [Friends](../design/compositions/friends.md), line 20.
- Covered by [Friends](../design/compositions/friends.md), line 25.

```reaction
when RequestBoundary.request (code, path: "/friends/invitation", requestId, session)
then
  Sessioning.use (session)
```

### friends.joining.ShowInvitation:full#2

Authored path: `friends.joining.ShowInvitation`.
- Covered by [Friends](../design/compositions/friends.md), line 20.
- Covered by [Friends](../design/compositions/friends.md), line 25.

```reaction
when Sessioning.use (session, subject: user), asked by friends.joining.ShowInvitation
where
  earlier, RequestBoundary.request (code, path: "/friends/invitation", requestId, session)
  view "the table the invitation (code) lets people into" with (code) has (table)
  no view "the role (user) plays at (table)" with (table, user)
  no view "(table) is waiting for someone" with (table)
then
  RequestBoundary.respond (error: "TABLE_FULL", requestId)
```

### friends.joining.ShowInvitation:joined#2

Authored path: `friends.joining.ShowInvitation`.
- Covered by [Friends](../design/compositions/friends.md), line 20.
- Covered by [Friends](../design/compositions/friends.md), line 25.

```reaction
when Sessioning.use (session, subject: user), asked by friends.joining.ShowInvitation
where
  earlier, RequestBoundary.request (code, path: "/friends/invitation", requestId, session)
  view "the table the invitation (code) lets people into" with (code) has (table)
  view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (requestId, table)
```

### friends.joining.ShowInvitation:open#2

Authored path: `friends.joining.ShowInvitation`.
- Covered by [Friends](../design/compositions/friends.md), line 20.
- Covered by [Friends](../design/compositions/friends.md), line 25.

```reaction
when Sessioning.use (session, subject: user), asked by friends.joining.ShowInvitation
where
  earlier, RequestBoundary.request (code, path: "/friends/invitation", requestId, session)
  Inviting._invitation (code) has (inviter, subject: table)
  no view "the role (user) plays at (table)" with (table, user)
  view "(table) is waiting for someone" with (table)
then
  RequestBoundary.respond (invitation: former "the invitation to (table) from (inviter)" with (inviter, table), requestId)
```

### friends.joining.ShowInvitation:unknown#2

Authored path: `friends.joining.ShowInvitation`.
- Covered by [Friends](../design/compositions/friends.md), line 20.
- Covered by [Friends](../design/compositions/friends.md), line 25.

```reaction
when Sessioning.use (session, subject: user), asked by friends.joining.ShowInvitation
where
  earlier, RequestBoundary.request (code, path: "/friends/invitation", requestId, session)
  no view "the table the invitation (code) lets people into" with (code)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### friends.starting.RefuseUnplayable

Authored path: `friends.starting.RefuseUnplayable`.
- Covered by [Friends](../design/compositions/friends.md), line 7.
- Covered by [Friends](../design/compositions/friends.md), line 11.

```reaction
when RequestBoundary.request (path: "/friends/start", requestId, role, scenario, session)
where
  no view "(role) of (scenario) can be practiced" with (role, scenario)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### friends.starting.StartWithFriends

Authored path: `friends.starting.StartWithFriends`.
- Covered by [Friends](../design/compositions/friends.md), line 7.
- Covered by [Friends](../design/compositions/friends.md), line 10.

```reaction
when RequestBoundary.request (path: "/friends/start", requestId, role, scenario, session)
where
  view "(role) of (scenario) can be practiced" with (role, scenario)
then
  Sessioning.use (session)
```

### friends.starting.StartWithFriends#2

Authored path: `friends.starting.StartWithFriends`.
- Covered by [Friends](../design/compositions/friends.md), line 7.
- Covered by [Friends](../design/compositions/friends.md), line 10.

```reaction
when Sessioning.use (session, subject: user), asked by friends.starting.StartWithFriends
where
  earlier, RequestBoundary.request (path: "/friends/start", requestId, role, scenario, session)
then
  Tabling.open (scenario)
```

### friends.starting.StartWithFriends#3

Authored path: `friends.starting.StartWithFriends`.
- Covered by [Friends](../design/compositions/friends.md), line 7.
- Covered by [Friends](../design/compositions/friends.md), line 10.

```reaction
when Tabling.open (scenario, table), asked by friends.starting.StartWithFriends#2
at the flow's settlement frontier
where
  earlier, Sessioning.use (session, subject: user), asked by friends.starting.StartWithFriends
  earlier, RequestBoundary.request (path: "/friends/start", requestId, role, scenario, session)
then
  Tabling.seat (negotiator: user, role, table)
```

### friends.starting.StartWithFriends#4

Authored path: `friends.starting.StartWithFriends`.
- Covered by [Friends](../design/compositions/friends.md), line 7.
- Covered by [Friends](../design/compositions/friends.md), line 10.

```reaction
when Tabling.seat (negotiator: user, role, table), asked by friends.starting.StartWithFriends#3
then
  Inviting.invite (inviter: user, subject: table)
```

### friends.starting.StartWithFriends#5

Authored path: `friends.starting.StartWithFriends`.
- Covered by [Friends](../design/compositions/friends.md), line 7.
- Covered by [Friends](../design/compositions/friends.md), line 10.

```reaction
when Inviting.invite (inviter: user, subject: table), asked by friends.starting.StartWithFriends#4
where
  earlier, RequestBoundary.request (path: "/friends/start", requestId, role, scenario, session)
then
  RequestBoundary.respond (requestId, table)
```

### matchmaking.looking.Find

Authored path: `matchmaking.looking.Find`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 7.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 10.

```reaction
when RequestBoundary.request (open, path: "/matchmaking/find", requestId, scenario, session)
where
  view "people can look for others to negotiate (scenario) with" with (scenario)
then
  Sessioning.use (session)
```

### matchmaking.looking.Find#2

Authored path: `matchmaking.looking.Find`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 7.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 10.

```reaction
when Sessioning.use (session, subject: user), asked by matchmaking.looking.Find
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (open, path: "/matchmaking/find", requestId, scenario, session)
  view "how many people a negotiation of (scenario) needs" with (scenario) has (size)
then
  Matchmaking.seek (now: instant, open, pool: scenario, seeker: user, size)
```

### matchmaking.looking.Find:matched#3

Authored path: `matchmaking.looking.Find`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 7.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 10.

```reaction
when Matchmaking.seek (now: instant, open, pool: scenario, seeker: user, size, request), asked by matchmaking.looking.Find#2
at the flow's settlement frontier
where
  view "the table where (user) sits with the group (request) found" with (request, user) has (table)
  earlier, RequestBoundary.request (open, path: "/matchmaking/find", requestId, scenario, session)
then
  RequestBoundary.respond (request, requestId, status: "MATCHED", table)
```

### matchmaking.looking.Find:waiting#3

Authored path: `matchmaking.looking.Find`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 7.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 10.

```reaction
when Matchmaking.seek (now: instant, open, pool: scenario, seeker: user, size, request), asked by matchmaking.looking.Find#2
at the flow's settlement frontier
where
  Matchmaking._request (request) has (status: "WAITING")
  earlier, RequestBoundary.request (open, path: "/matchmaking/find", requestId, scenario, session)
then
  RequestBoundary.respond (request, requestId, status: "WAITING", table: null)
```

### matchmaking.looking.RefuseUnfindable

Authored path: `matchmaking.looking.RefuseUnfindable`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 7.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 11.

```reaction
when RequestBoundary.request (open, path: "/matchmaking/find", requestId, scenario, session)
where
  no view "people can look for others to negotiate (scenario) with" with (scenario)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### matchmaking.looking.Stop

Authored path: `matchmaking.looking.Stop`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 23.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 27.

```reaction
when RequestBoundary.request (path: "/matchmaking/stop", request, requestId, session)
then
  Sessioning.use (session)
```

### matchmaking.looking.Stop:not-yours#2

Authored path: `matchmaking.looking.Stop`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 23.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 27.

```reaction
when Sessioning.use (session, subject: user), asked by matchmaking.looking.Stop
where
  earlier, RequestBoundary.request (path: "/matchmaking/stop", request, requestId, session)
  no Matchmaking._request (request) has (seeker: user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### matchmaking.looking.Stop:yours#2

Authored path: `matchmaking.looking.Stop`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 23.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 27.

```reaction
when Sessioning.use (session, subject: user), asked by matchmaking.looking.Stop
where
  earlier, RequestBoundary.request (path: "/matchmaking/stop", request, requestId, session)
  Matchmaking._request (request) has (seeker: user)
then
  Matchmaking.stop (request, seeker: user)
```

### matchmaking.looking.Stop:yours#3

Authored path: `matchmaking.looking.Stop`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 23.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 27.

```reaction
when Matchmaking.stop (request, seeker: user), asked by matchmaking.looking.Stop:yours#2
where
  earlier, RequestBoundary.request (path: "/matchmaking/stop", request, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### matchmaking.looking.Wait

Authored path: `matchmaking.looking.Wait`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 14.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 26.

```reaction
when RequestBoundary.request (path: "/matchmaking/wait", request, requestId, session)
then
  Sessioning.use (session)
```

### matchmaking.looking.Wait:lapsed#2

Authored path: `matchmaking.looking.Wait`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 14.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 26.

```reaction
when Sessioning.use (session, subject: user), asked by matchmaking.looking.Wait
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/matchmaking/wait", request, requestId, session)
  Matchmaking._request (request) has (seeker: user, status: "WAITING")
  Matchmaking._lapsed (now: instant, request) has (lapsed: true)
then
  RequestBoundary.respond (requestId, status: "LAPSED", table: null)
```

### matchmaking.looking.Wait:meeting#2

Authored path: `matchmaking.looking.Wait`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 14.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 26.

```reaction
when Sessioning.use (session, subject: user), asked by matchmaking.looking.Wait
where
  earlier, RequestBoundary.request (path: "/matchmaking/wait", request, requestId, session)
  Matchmaking._request (request) has (seeker: user, status: "MATCHED")
  no view "the table where (user) sits with the group (request) found" with (request, user)
then
  RequestBoundary.respond (requestId, status: "MATCHED", table: null)
```

### matchmaking.looking.Wait:not-yours#2

Authored path: `matchmaking.looking.Wait`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 14.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 26.

```reaction
when Sessioning.use (session, subject: user), asked by matchmaking.looking.Wait
where
  earlier, RequestBoundary.request (path: "/matchmaking/wait", request, requestId, session)
  no Matchmaking._request (request) has (seeker: user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### matchmaking.looking.Wait:seated#2

Authored path: `matchmaking.looking.Wait`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 14.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 26.

```reaction
when Sessioning.use (session, subject: user), asked by matchmaking.looking.Wait
where
  earlier, RequestBoundary.request (path: "/matchmaking/wait", request, requestId, session)
  Matchmaking._request (request) has (seeker: user, status: "MATCHED")
  view "the table where (user) sits with the group (request) found" with (request, user) has (table)
then
  RequestBoundary.respond (requestId, status: "MATCHED", table)
```

### matchmaking.looking.Wait:stopped#2

Authored path: `matchmaking.looking.Wait`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 14.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 26.

```reaction
when Sessioning.use (session, subject: user), asked by matchmaking.looking.Wait
where
  earlier, RequestBoundary.request (path: "/matchmaking/wait", request, requestId, session)
  Matchmaking._request (request) has (seeker: user, status: "STOPPED")
then
  RequestBoundary.respond (requestId, status: "STOPPED", table: null)
```

### matchmaking.looking.Wait:waiting#2

Authored path: `matchmaking.looking.Wait`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 14.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 26.

```reaction
when Sessioning.use (session, subject: user), asked by matchmaking.looking.Wait
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/matchmaking/wait", request, requestId, session)
  Matchmaking._request (request) has (seeker: user, status: "WAITING")
  Matchmaking._lapsed (now: instant, request) has (lapsed: false)
then
  Matchmaking.checkIn (now: instant, request, seeker: user)
```

### matchmaking.looking.Wait:waiting#3

Authored path: `matchmaking.looking.Wait`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 14.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 26.

```reaction
when Matchmaking.checkIn (now: instant, request, seeker: user), asked by matchmaking.looking.Wait:waiting#2
where
  earlier, RequestBoundary.request (path: "/matchmaking/wait", request, requestId, session)
then
  RequestBoundary.respond (requestId, status: "WAITING", table: null)
```

### matchmaking.meeting.OpenTableForMatch

Authored path: `matchmaking.meeting.OpenTableForMatch`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 32.

```reaction
when Matchmaking.seek (grouped: true, request)
where
  Matchmaking._agreed (request) has (pool: scenario)
then
  Tabling.open (scenario)
```

### matchmaking.meeting.OpenTableForMatch#2

Authored path: `matchmaking.meeting.OpenTableForMatch`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 32.

```reaction
when Tabling.open (scenario, table), asked by matchmaking.meeting.OpenTableForMatch
where
  earlier, Matchmaking.seek (grouped: true, request)
then
  Matchmaking.meet (place: table, request)
```

### matchmaking.meeting.SeatMembers

Authored path: `matchmaking.meeting.SeatMembers`.
- Covered by [Matchmaking](../design/compositions/matchmaking.md), line 32.

```reaction
when Matchmaking.meet (place: table, request)
at the flow's settlement frontier
where
  Matchmaking._members (request) has (seeker)
then
  Tabling.seat (negotiator: seeker, table)
```

### practice.choosing.ShowBakery

Authored path: `practice.choosing.ShowBakery`.
- Covered by [Practice](../design/compositions/practice.md), line 7.
- Covered by [Practice](../design/compositions/practice.md), line 10.

```reaction
when RequestBoundary.request (path: "/bakery", requestId, session)
then
  Sessioning.use (session)
```

### practice.choosing.ShowBakery#2

Authored path: `practice.choosing.ShowBakery`.
- Covered by [Practice](../design/compositions/practice.md), line 7.
- Covered by [Practice](../design/compositions/practice.md), line 10.

```reaction
when Sessioning.use (session, subject: user), asked by practice.choosing.ShowBakery
where
  earlier, RequestBoundary.request (path: "/bakery", requestId, session)
then
  RequestBoundary.respond (ratings: former "the ratings of (user)" with (user), requestId, scenarios: former "the published scenarios", tables: former "the tables (user) has a seat at" with (user))
```

### practice.starting.RefuseUnplayable

Authored path: `practice.starting.RefuseUnplayable`.
- Covered by [Practice](../design/compositions/practice.md), line 32.
- Covered by [Practice](../design/compositions/practice.md), line 36.

```reaction
when RequestBoundary.request (path: "/practice/start", requestId, role, scenario, session)
where
  no view "(role) of (scenario) can be practiced" with (role, scenario)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### practice.starting.StartPractice

Authored path: `practice.starting.StartPractice`.
- Covered by [Practice](../design/compositions/practice.md), line 30.
- Covered by [Practice](../design/compositions/practice.md), line 35.

```reaction
when RequestBoundary.request (path: "/practice/start", requestId, role, scenario, session)
where
  view "(role) of (scenario) can be practiced" with (role, scenario)
then
  Sessioning.use (session)
```

### practice.starting.StartPractice#2

Authored path: `practice.starting.StartPractice`.
- Covered by [Practice](../design/compositions/practice.md), line 30.
- Covered by [Practice](../design/compositions/practice.md), line 35.

```reaction
when Sessioning.use (session, subject: user), asked by practice.starting.StartPractice
where
  earlier, RequestBoundary.request (path: "/practice/start", requestId, role, scenario, session)
then
  Tabling.open (scenario)
```

### practice.starting.StartPractice#3

Authored path: `practice.starting.StartPractice`.
- Covered by [Practice](../design/compositions/practice.md), line 30.
- Covered by [Practice](../design/compositions/practice.md), line 35.

```reaction
when Tabling.open (scenario, table), asked by practice.starting.StartPractice#2
at the flow's settlement frontier
where
  earlier, Sessioning.use (session, subject: user), asked by practice.starting.StartPractice
  earlier, RequestBoundary.request (path: "/practice/start", requestId, role, scenario, session)
then
  Tabling.seat (negotiator: user, role, table)
```

### practice.starting.StartPractice#4

Authored path: `practice.starting.StartPractice`.
- Covered by [Practice](../design/compositions/practice.md), line 30.
- Covered by [Practice](../design/compositions/practice.md), line 35.

```reaction
when Tabling.seat (negotiator: user, role, table), asked by practice.starting.StartPractice#3
where
  Tabling._seats (table) has (role: other)
  no Tabling._seats (table) has (negotiator: user, role: other)
then
  Tabling.seat (negotiator: "bot:counterpart", role: other, table)
```

### practice.starting.StartPractice#5

Authored path: `practice.starting.StartPractice`.
- Covered by [Practice](../design/compositions/practice.md), line 30.
- Covered by [Practice](../design/compositions/practice.md), line 35.

```reaction
when Tabling.seat (negotiator: "bot:counterpart", role: other, table), asked by practice.starting.StartPractice#4
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (path: "/practice/start", requestId, role, scenario, session)
then
  RequestBoundary.respond (requestId, table)
```

### preparing.planning.WritePlan

Authored path: `preparing.planning.WritePlan`.
- Covered by [Preparing](../design/compositions/preparing.md), line 19.
- Covered by [Preparing](../design/compositions/preparing.md), line 24.

```reaction
when RequestBoundary.request (path: "/tables/plan", priorities, requestId, session, table, target, walkaway)
then
  Sessioning.use (session)
```

### preparing.planning.WritePlan:not-seated#2

Authored path: `preparing.planning.WritePlan`.
- Covered by [Preparing](../design/compositions/preparing.md), line 19.
- Covered by [Preparing](../design/compositions/preparing.md), line 24.

```reaction
when Sessioning.use (session, subject: user), asked by preparing.planning.WritePlan
where
  earlier, RequestBoundary.request (path: "/tables/plan", priorities, requestId, session, table, target, walkaway)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### preparing.planning.WritePlan:seated#2

Authored path: `preparing.planning.WritePlan`.
- Covered by [Preparing](../design/compositions/preparing.md), line 19.
- Covered by [Preparing](../design/compositions/preparing.md), line 24.

```reaction
when Sessioning.use (session, subject: user), asked by preparing.planning.WritePlan
where
  earlier, RequestBoundary.request (path: "/tables/plan", priorities, requestId, session, table, target, walkaway)
  view "the role (user) plays at (table)" with (table, user)
then
  TargetNoting.write (author: user, body: target, subject: table)
```

### preparing.planning.WritePlan:seated#3

Authored path: `preparing.planning.WritePlan`.
- Covered by [Preparing](../design/compositions/preparing.md), line 19.
- Covered by [Preparing](../design/compositions/preparing.md), line 24.

```reaction
when TargetNoting.write (author: user, body: target, subject: table), asked by preparing.planning.WritePlan:seated#2
where
  earlier, RequestBoundary.request (path: "/tables/plan", priorities, requestId, session, table, target, walkaway)
then
  WalkawayNoting.write (author: user, body: walkaway, subject: table)
```

### preparing.planning.WritePlan:seated#4

Authored path: `preparing.planning.WritePlan`.
- Covered by [Preparing](../design/compositions/preparing.md), line 19.
- Covered by [Preparing](../design/compositions/preparing.md), line 24.

```reaction
when WalkawayNoting.write (author: user, body: walkaway, subject: table), asked by preparing.planning.WritePlan:seated#3
where
  earlier, RequestBoundary.request (path: "/tables/plan", priorities, requestId, session, table, target, walkaway)
then
  PrioritiesNoting.write (author: user, body: priorities, subject: table)
```

### preparing.planning.WritePlan:seated#5

Authored path: `preparing.planning.WritePlan`.
- Covered by [Preparing](../design/compositions/preparing.md), line 19.
- Covered by [Preparing](../design/compositions/preparing.md), line 24.

```reaction
when PrioritiesNoting.write (author: user, body: priorities, subject: table), asked by preparing.planning.WritePlan:seated#4
where
  earlier, RequestBoundary.request (path: "/tables/plan", priorities, requestId, session, table, target, walkaway)
then
  RequestBoundary.respond (requestId)
```

### preparing.settings.ShowSettings

Authored path: `preparing.settings.ShowSettings`.
- Covered by [Preparing](../design/compositions/preparing.md), line 9.
- Covered by [Preparing](../design/compositions/preparing.md), line 12.

```reaction
when RequestBoundary.request (path: "/settings/show", requestId, session)
then
  Sessioning.use (session)
```

### preparing.settings.ShowSettings#2

Authored path: `preparing.settings.ShowSettings`.
- Covered by [Preparing](../design/compositions/preparing.md), line 9.
- Covered by [Preparing](../design/compositions/preparing.md), line 12.

```reaction
when Sessioning.use (session, subject: user), asked by preparing.settings.ShowSettings
where
  Preferring._on (feature: "prep-sheet", person: user) has (on)
  earlier, RequestBoundary.request (path: "/settings/show", requestId, session)
then
  RequestBoundary.respond (prepSheet: on, requestId)
```

### preparing.settings.TurnPrepSheetsOff

Authored path: `preparing.settings.TurnPrepSheetsOff`.
- Covered by [Preparing](../design/compositions/preparing.md), line 9.
- Covered by [Preparing](../design/compositions/preparing.md), line 14.

```reaction
when RequestBoundary.request (on: false, path: "/settings/prep-sheet", requestId, session)
then
  Sessioning.use (session)
```

### preparing.settings.TurnPrepSheetsOff#2

Authored path: `preparing.settings.TurnPrepSheetsOff`.
- Covered by [Preparing](../design/compositions/preparing.md), line 9.
- Covered by [Preparing](../design/compositions/preparing.md), line 14.

```reaction
when Sessioning.use (session, subject: user), asked by preparing.settings.TurnPrepSheetsOff
then
  Preferring.turnOff (feature: "prep-sheet", person: user)
```

### preparing.settings.TurnPrepSheetsOff#3

Authored path: `preparing.settings.TurnPrepSheetsOff`.
- Covered by [Preparing](../design/compositions/preparing.md), line 9.
- Covered by [Preparing](../design/compositions/preparing.md), line 14.

```reaction
when Preferring.turnOff (feature: "prep-sheet", person: user), asked by preparing.settings.TurnPrepSheetsOff#2
where
  earlier, RequestBoundary.request (on: false, path: "/settings/prep-sheet", requestId, session)
then
  RequestBoundary.respond (prepSheet: false, requestId)
```

### preparing.settings.TurnPrepSheetsOn

Authored path: `preparing.settings.TurnPrepSheetsOn`.
- Covered by [Preparing](../design/compositions/preparing.md), line 9.
- Covered by [Preparing](../design/compositions/preparing.md), line 13.

```reaction
when RequestBoundary.request (on: true, path: "/settings/prep-sheet", requestId, session)
then
  Sessioning.use (session)
```

### preparing.settings.TurnPrepSheetsOn#2

Authored path: `preparing.settings.TurnPrepSheetsOn`.
- Covered by [Preparing](../design/compositions/preparing.md), line 9.
- Covered by [Preparing](../design/compositions/preparing.md), line 13.

```reaction
when Sessioning.use (session, subject: user), asked by preparing.settings.TurnPrepSheetsOn
then
  Preferring.turnOn (feature: "prep-sheet", person: user)
```

### preparing.settings.TurnPrepSheetsOn#3

Authored path: `preparing.settings.TurnPrepSheetsOn`.
- Covered by [Preparing](../design/compositions/preparing.md), line 9.
- Covered by [Preparing](../design/compositions/preparing.md), line 13.

```reaction
when Preferring.turnOn (feature: "prep-sheet", person: user), asked by preparing.settings.TurnPrepSheetsOn#2
where
  earlier, RequestBoundary.request (on: true, path: "/settings/prep-sheet", requestId, session)
then
  RequestBoundary.respond (prepSheet: true, requestId)
```

### proposals.agreeing.SettleOnAgreement

Authored path: `proposals.agreeing.SettleOnAgreement`.
- Covered by [Proposals](../design/compositions/proposals.md), line 19.

```reaction
when Proposing.accept (status: "ACCEPTED", subject: table)
where
  instant is the current flow's instant
then
  Tabling.settle (now: instant, table)
```

### proposals.answering.Accept

Authored path: `proposals.answering.Accept`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 14.

```reaction
when RequestBoundary.request (path: "/tables/accept", proposal, requestId, session, table)
then
  Sessioning.use (session)
```

### proposals.answering.Accept:elsewhere#2

Authored path: `proposals.answering.Accept`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 14.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Accept
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/accept", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) is under way at (instant)" with (instant, table)
  no Proposing._proposal (proposal) has (subject: table)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### proposals.answering.Accept:not-open#2

Authored path: `proposals.answering.Accept`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 14.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Accept
where
  earlier, RequestBoundary.request (path: "/tables/accept", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) isn't open" with (table)
then
  RequestBoundary.respond (error: "NOT_OPEN", requestId)
```

### proposals.answering.Accept:not-seated#2

Authored path: `proposals.answering.Accept`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 14.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Accept
where
  earlier, RequestBoundary.request (path: "/tables/accept", proposal, requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### proposals.answering.Accept:time-up#2

Authored path: `proposals.answering.Accept`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 14.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Accept
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/accept", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) is overdue at (instant)" with (instant, table)
then
  Tabling.expire (now: instant, table)
```

### proposals.answering.Accept:time-up#3

Authored path: `proposals.answering.Accept`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 14.

```reaction
when Tabling.expire (now: instant, table), asked by proposals.answering.Accept:time-up#2
where
  earlier, RequestBoundary.request (path: "/tables/accept", proposal, requestId, session, table)
then
  RequestBoundary.respond (error: "TIME_UP", requestId)
```

### proposals.answering.Accept:under-way#2

Authored path: `proposals.answering.Accept`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 14.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Accept
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/accept", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user) has (role)
  view "(table) is under way at (instant)" with (instant, table)
  Proposing._proposal (proposal) has (subject: table)
then
  Proposing.accept (party: role, proposal)
```

### proposals.answering.Accept:under-way#3

Authored path: `proposals.answering.Accept`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 14.

```reaction
when Proposing.accept (party: role, proposal, status), asked by proposals.answering.Accept:under-way#2
where
  earlier, RequestBoundary.request (path: "/tables/accept", proposal, requestId, session, table)
then
  RequestBoundary.respond (requestId, status)
```

### proposals.answering.Reject

Authored path: `proposals.answering.Reject`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 15.

```reaction
when RequestBoundary.request (path: "/tables/reject", proposal, requestId, session, table)
then
  Sessioning.use (session)
```

### proposals.answering.Reject:elsewhere#2

Authored path: `proposals.answering.Reject`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 15.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Reject
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/reject", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) is under way at (instant)" with (instant, table)
  no Proposing._proposal (proposal) has (subject: table)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### proposals.answering.Reject:not-open#2

Authored path: `proposals.answering.Reject`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 15.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Reject
where
  earlier, RequestBoundary.request (path: "/tables/reject", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) isn't open" with (table)
then
  RequestBoundary.respond (error: "NOT_OPEN", requestId)
```

### proposals.answering.Reject:not-seated#2

Authored path: `proposals.answering.Reject`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 15.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Reject
where
  earlier, RequestBoundary.request (path: "/tables/reject", proposal, requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### proposals.answering.Reject:time-up#2

Authored path: `proposals.answering.Reject`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 15.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Reject
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/reject", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) is overdue at (instant)" with (instant, table)
then
  Tabling.expire (now: instant, table)
```

### proposals.answering.Reject:time-up#3

Authored path: `proposals.answering.Reject`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 15.

```reaction
when Tabling.expire (now: instant, table), asked by proposals.answering.Reject:time-up#2
where
  earlier, RequestBoundary.request (path: "/tables/reject", proposal, requestId, session, table)
then
  RequestBoundary.respond (error: "TIME_UP", requestId)
```

### proposals.answering.Reject:under-way#2

Authored path: `proposals.answering.Reject`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 15.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Reject
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/reject", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user) has (role)
  view "(table) is under way at (instant)" with (instant, table)
  Proposing._proposal (proposal) has (subject: table)
then
  Proposing.reject (party: role, proposal)
```

### proposals.answering.Reject:under-way#3

Authored path: `proposals.answering.Reject`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 15.

```reaction
when Proposing.reject (party: role, proposal), asked by proposals.answering.Reject:under-way#2
where
  earlier, RequestBoundary.request (path: "/tables/reject", proposal, requestId, session, table)
then
  RequestBoundary.respond (requestId)
```

### proposals.answering.Retract

Authored path: `proposals.answering.Retract`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 16.

```reaction
when RequestBoundary.request (path: "/tables/retract", proposal, requestId, session, table)
then
  Sessioning.use (session)
```

### proposals.answering.Retract:elsewhere#2

Authored path: `proposals.answering.Retract`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 16.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Retract
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/retract", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) is under way at (instant)" with (instant, table)
  no Proposing._proposal (proposal) has (subject: table)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### proposals.answering.Retract:not-open#2

Authored path: `proposals.answering.Retract`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 16.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Retract
where
  earlier, RequestBoundary.request (path: "/tables/retract", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) isn't open" with (table)
then
  RequestBoundary.respond (error: "NOT_OPEN", requestId)
```

### proposals.answering.Retract:not-seated#2

Authored path: `proposals.answering.Retract`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 16.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Retract
where
  earlier, RequestBoundary.request (path: "/tables/retract", proposal, requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### proposals.answering.Retract:time-up#2

Authored path: `proposals.answering.Retract`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 16.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Retract
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/retract", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) is overdue at (instant)" with (instant, table)
then
  Tabling.expire (now: instant, table)
```

### proposals.answering.Retract:time-up#3

Authored path: `proposals.answering.Retract`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 16.

```reaction
when Tabling.expire (now: instant, table), asked by proposals.answering.Retract:time-up#2
where
  earlier, RequestBoundary.request (path: "/tables/retract", proposal, requestId, session, table)
then
  RequestBoundary.respond (error: "TIME_UP", requestId)
```

### proposals.answering.Retract:under-way#2

Authored path: `proposals.answering.Retract`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 16.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.answering.Retract
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/retract", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user) has (role)
  view "(table) is under way at (instant)" with (instant, table)
  Proposing._proposal (proposal) has (subject: table)
then
  Proposing.retract (proposal, proposer: role)
```

### proposals.answering.Retract:under-way#3

Authored path: `proposals.answering.Retract`.
- Covered by [Proposals](../design/compositions/proposals.md), line 11.
- Covered by [Proposals](../design/compositions/proposals.md), line 16.

```reaction
when Proposing.retract (proposal, proposer: role), asked by proposals.answering.Retract:under-way#2
where
  earlier, RequestBoundary.request (path: "/tables/retract", proposal, requestId, session, table)
then
  RequestBoundary.respond (requestId)
```

### proposals.proposing.Propose

Authored path: `proposals.proposing.Propose`.
- Covered by [Proposals](../design/compositions/proposals.md), line 5.
- Covered by [Proposals](../design/compositions/proposals.md), line 8.

```reaction
when RequestBoundary.request (path: "/tables/propose", requestId, session, table, terms)
then
  Sessioning.use (session)
```

### proposals.proposing.Propose:invalid#2

Authored path: `proposals.proposing.Propose`.
- Covered by [Proposals](../design/compositions/proposals.md), line 5.
- Covered by [Proposals](../design/compositions/proposals.md), line 8.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.proposing.Propose
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/propose", requestId, session, table, terms)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) is under way at (instant)" with (instant, table)
  Tabling._table (table) has (scenario)
  Briefing._dealValidity (scenario, terms)
then
  RequestBoundary.respond (error: "INVALID_TERMS", requestId)
```

### proposals.proposing.Propose:not-open#2

Authored path: `proposals.proposing.Propose`.
- Covered by [Proposals](../design/compositions/proposals.md), line 5.
- Covered by [Proposals](../design/compositions/proposals.md), line 8.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.proposing.Propose
where
  earlier, RequestBoundary.request (path: "/tables/propose", requestId, session, table, terms)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) isn't open" with (table)
then
  RequestBoundary.respond (error: "NOT_OPEN", requestId)
```

### proposals.proposing.Propose:not-seated#2

Authored path: `proposals.proposing.Propose`.
- Covered by [Proposals](../design/compositions/proposals.md), line 5.
- Covered by [Proposals](../design/compositions/proposals.md), line 8.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.proposing.Propose
where
  earlier, RequestBoundary.request (path: "/tables/propose", requestId, session, table, terms)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### proposals.proposing.Propose:time-up#2

Authored path: `proposals.proposing.Propose`.
- Covered by [Proposals](../design/compositions/proposals.md), line 5.
- Covered by [Proposals](../design/compositions/proposals.md), line 8.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.proposing.Propose
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/propose", requestId, session, table, terms)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) is overdue at (instant)" with (instant, table)
then
  Tabling.expire (now: instant, table)
```

### proposals.proposing.Propose:time-up#3

Authored path: `proposals.proposing.Propose`.
- Covered by [Proposals](../design/compositions/proposals.md), line 5.
- Covered by [Proposals](../design/compositions/proposals.md), line 8.

```reaction
when Tabling.expire (now: instant, table), asked by proposals.proposing.Propose:time-up#2
where
  earlier, RequestBoundary.request (path: "/tables/propose", requestId, session, table, terms)
then
  RequestBoundary.respond (error: "TIME_UP", requestId)
```

### proposals.proposing.Propose:valid#2

Authored path: `proposals.proposing.Propose`.
- Covered by [Proposals](../design/compositions/proposals.md), line 5.
- Covered by [Proposals](../design/compositions/proposals.md), line 8.

```reaction
when Sessioning.use (session, subject: user), asked by proposals.proposing.Propose
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/propose", requestId, session, table, terms)
  view "the role (user) plays at (table)" with (table, user) has (role)
  view "(table) is under way at (instant)" with (instant, table)
  Tabling._table (table) has (scenario)
  no Briefing._dealValidity (scenario, terms)
then
  Proposing.propose (now: instant, proposer: role, subject: table, terms)
```

### proposals.proposing.Propose:valid#3

Authored path: `proposals.proposing.Propose`.
- Covered by [Proposals](../design/compositions/proposals.md), line 5.
- Covered by [Proposals](../design/compositions/proposals.md), line 8.

```reaction
when Proposing.propose (now: instant, proposer: role, subject: table, terms, proposal), asked by proposals.proposing.Propose:valid#2
where
  earlier, RequestBoundary.request (path: "/tables/propose", requestId, session, table, terms)
then
  RequestBoundary.respond (proposal, requestId)
```

### ratings.rating.RecordRatingsWhenEnded.Expired:deal

Authored path: `ratings.rating.RecordRatingsWhenEnded.Expired`.
- Covered by [Ratings](../design/compositions/ratings.md), line 7.

```reaction
when Tabling.expire (table)
where
  instant is the current flow's instant
  view "when the time is up at (table), once it began" with (table)
  no view "the role the counterpart plays at (table)" with (table)
  Tabling._table (table) has (scenario)
  Tabling._seats (table) has (negotiator: person, role)
  Briefing._role (role) has (batna)
  Briefing._jointBatna (scenario) has (jointBatna)
  whether Briefing._wholePie (scenario) has (jointPoints: best)
  view "the terms (table) settled on" with (table) has (terms)
  Briefing._dealPayoff (role, terms) has (points)
  Briefing._dealJointPayoff (scenario, terms) has (jointPoints)
then
  Rating.record (batna, bestJointPoints: best, jointBatna, jointPoints, now: instant, person, points, subject: table)
```

### ratings.rating.RecordRatingsWhenEnded.Expired:no-deal

Authored path: `ratings.rating.RecordRatingsWhenEnded.Expired`.
- Covered by [Ratings](../design/compositions/ratings.md), line 7.

```reaction
when Tabling.expire (table)
where
  instant is the current flow's instant
  view "when the time is up at (table), once it began" with (table)
  no view "the role the counterpart plays at (table)" with (table)
  Tabling._table (table) has (scenario)
  Tabling._seats (table) has (negotiator: person, role)
  Briefing._role (role) has (batna)
  Briefing._jointBatna (scenario) has (jointBatna)
  whether Briefing._wholePie (scenario) has (jointPoints: best)
  no view "the terms (table) settled on" with (table)
then
  Rating.record (batna, bestJointPoints: best, jointBatna, jointPoints: jointBatna, now: instant, person, points: batna, subject: table)
```

### ratings.rating.RecordRatingsWhenEnded.Settled:deal

Authored path: `ratings.rating.RecordRatingsWhenEnded.Settled`.
- Covered by [Ratings](../design/compositions/ratings.md), line 7.

```reaction
when Tabling.settle (table)
where
  instant is the current flow's instant
  view "when the time is up at (table), once it began" with (table)
  no view "the role the counterpart plays at (table)" with (table)
  Tabling._table (table) has (scenario)
  Tabling._seats (table) has (negotiator: person, role)
  Briefing._role (role) has (batna)
  Briefing._jointBatna (scenario) has (jointBatna)
  whether Briefing._wholePie (scenario) has (jointPoints: best)
  view "the terms (table) settled on" with (table) has (terms)
  Briefing._dealPayoff (role, terms) has (points)
  Briefing._dealJointPayoff (scenario, terms) has (jointPoints)
then
  Rating.record (batna, bestJointPoints: best, jointBatna, jointPoints, now: instant, person, points, subject: table)
```

### ratings.rating.RecordRatingsWhenEnded.Settled:no-deal

Authored path: `ratings.rating.RecordRatingsWhenEnded.Settled`.
- Covered by [Ratings](../design/compositions/ratings.md), line 7.

```reaction
when Tabling.settle (table)
where
  instant is the current flow's instant
  view "when the time is up at (table), once it began" with (table)
  no view "the role the counterpart plays at (table)" with (table)
  Tabling._table (table) has (scenario)
  Tabling._seats (table) has (negotiator: person, role)
  Briefing._role (role) has (batna)
  Briefing._jointBatna (scenario) has (jointBatna)
  whether Briefing._wholePie (scenario) has (jointPoints: best)
  no view "the terms (table) settled on" with (table)
then
  Rating.record (batna, bestJointPoints: best, jointBatna, jointPoints: jointBatna, now: instant, person, points: batna, subject: table)
```

### ratings.rating.RecordRatingsWhenEnded.Withdrawn:deal

Authored path: `ratings.rating.RecordRatingsWhenEnded.Withdrawn`.
- Covered by [Ratings](../design/compositions/ratings.md), line 7.

```reaction
when Tabling.withdraw (table)
where
  instant is the current flow's instant
  view "when the time is up at (table), once it began" with (table)
  no view "the role the counterpart plays at (table)" with (table)
  Tabling._table (table) has (scenario)
  Tabling._seats (table) has (negotiator: person, role)
  Briefing._role (role) has (batna)
  Briefing._jointBatna (scenario) has (jointBatna)
  whether Briefing._wholePie (scenario) has (jointPoints: best)
  view "the terms (table) settled on" with (table) has (terms)
  Briefing._dealPayoff (role, terms) has (points)
  Briefing._dealJointPayoff (scenario, terms) has (jointPoints)
then
  Rating.record (batna, bestJointPoints: best, jointBatna, jointPoints, now: instant, person, points, subject: table)
```

### ratings.rating.RecordRatingsWhenEnded.Withdrawn:no-deal

Authored path: `ratings.rating.RecordRatingsWhenEnded.Withdrawn`.
- Covered by [Ratings](../design/compositions/ratings.md), line 7.

```reaction
when Tabling.withdraw (table)
where
  instant is the current flow's instant
  view "when the time is up at (table), once it began" with (table)
  no view "the role the counterpart plays at (table)" with (table)
  Tabling._table (table) has (scenario)
  Tabling._seats (table) has (negotiator: person, role)
  Briefing._role (role) has (batna)
  Briefing._jointBatna (scenario) has (jointBatna)
  whether Briefing._wholePie (scenario) has (jointPoints: best)
  no view "the terms (table) settled on" with (table)
then
  Rating.record (batna, bestJointPoints: best, jointBatna, jointPoints: jointBatna, now: instant, person, points: batna, subject: table)
```

### ratings.reviewing.Review

Authored path: `ratings.reviewing.Review`.
- Covered by [Ratings](../design/compositions/ratings.md), line 13.
- Covered by [Ratings](../design/compositions/ratings.md), line 18.

```reaction
when RequestBoundary.request (path: "/tables/review", requestId, role, session, stars, table)
then
  Sessioning.use (session)
```

### ratings.reviewing.Review:ended#2

Authored path: `ratings.reviewing.Review`.
- Covered by [Ratings](../design/compositions/ratings.md), line 13.
- Covered by [Ratings](../design/compositions/ratings.md), line 18.

```reaction
when Sessioning.use (session, subject: user), asked by ratings.reviewing.Review
where
  earlier, RequestBoundary.request (path: "/tables/review", requestId, role, session, stars, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) has ended" with (table)
  no view "the role the counterpart plays at (table)" with (table)
  view "who sits in the seat for (role) at (table)" with (role, table) has (negotiator: reviewee)
then
  Reviewing.review (reviewee, reviewer: user, stars, subject: table)
```

### ratings.reviewing.Review:ended#3

Authored path: `ratings.reviewing.Review`.
- Covered by [Ratings](../design/compositions/ratings.md), line 13.
- Covered by [Ratings](../design/compositions/ratings.md), line 18.

```reaction
when Reviewing.review (reviewee, reviewer: user, stars, subject: table), asked by ratings.reviewing.Review:ended#2
where
  earlier, RequestBoundary.request (path: "/tables/review", requestId, role, session, stars, table)
then
  RequestBoundary.respond (requestId)
```

### ratings.reviewing.Review:nobody-there#2

Authored path: `ratings.reviewing.Review`.
- Covered by [Ratings](../design/compositions/ratings.md), line 13.
- Covered by [Ratings](../design/compositions/ratings.md), line 18.

```reaction
when Sessioning.use (session, subject: user), asked by ratings.reviewing.Review
where
  earlier, RequestBoundary.request (path: "/tables/review", requestId, role, session, stars, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) has ended" with (table)
  no view "the role the counterpart plays at (table)" with (table)
  no view "who sits in the seat for (role) at (table)" with (role, table)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### ratings.reviewing.Review:not-over#2

Authored path: `ratings.reviewing.Review`.
- Covered by [Ratings](../design/compositions/ratings.md), line 13.
- Covered by [Ratings](../design/compositions/ratings.md), line 18.

```reaction
when Sessioning.use (session, subject: user), asked by ratings.reviewing.Review
where
  earlier, RequestBoundary.request (path: "/tables/review", requestId, role, session, stars, table)
  view "the role (user) plays at (table)" with (table, user)
  no view "(table) has ended" with (table)
then
  RequestBoundary.respond (error: "NOT_OVER", requestId)
```

### ratings.reviewing.Review:not-seated#2

Authored path: `ratings.reviewing.Review`.
- Covered by [Ratings](../design/compositions/ratings.md), line 13.
- Covered by [Ratings](../design/compositions/ratings.md), line 18.

```reaction
when Sessioning.use (session, subject: user), asked by ratings.reviewing.Review
where
  earlier, RequestBoundary.request (path: "/tables/review", requestId, role, session, stars, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### ratings.reviewing.Review:with-counterpart#2

Authored path: `ratings.reviewing.Review`.
- Covered by [Ratings](../design/compositions/ratings.md), line 13.
- Covered by [Ratings](../design/compositions/ratings.md), line 18.

```reaction
when Sessioning.use (session, subject: user), asked by ratings.reviewing.Review
where
  earlier, RequestBoundary.request (path: "/tables/review", requestId, role, session, stars, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) has ended" with (table)
  view "the role the counterpart plays at (table)" with (table)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### reusable.accounts.identifying.Me

Authored path: `reusable.accounts.identifying.Me`.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 5.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 8.

```reaction
when RequestBoundary.request (path: "/auth/me", requestId, session)
then
  Sessioning.use (session)
```

### reusable.accounts.identifying.Me#2

Authored path: `reusable.accounts.identifying.Me`.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 5.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 8.

```reaction
when Sessioning.use (session, subject: user), asked by reusable.accounts.identifying.Me
where
  Registering._username (user) has (username)
  earlier, RequestBoundary.request (path: "/auth/me", requestId, session)
then
  RequestBoundary.respond (requestId, username)
```

### reusable.accounts.leaving.SignOut

Authored path: `reusable.accounts.leaving.SignOut`.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 11.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 14.

```reaction
when RequestBoundary.request (path: "/auth/logout", requestId, session)
then
  Sessioning.end (session)
```

### reusable.accounts.leaving.SignOut#2

Authored path: `reusable.accounts.leaving.SignOut`.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 11.
- Covered by [Accounts](../design/compositions/reusable/accounts.md), line 14.

```reaction
when Sessioning.end (session), asked by reusable.accounts.leaving.SignOut
where
  earlier, RequestBoundary.request (path: "/auth/logout", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### reusable.answering.abandoning.Abandon

Authored path: `reusable.answering.abandoning.Abandon`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 40.

```reaction
when RequestBoundary.request (path: "/answers/abandon", prompt, reason, requestId, session)
then
  AgentSessioning.use (session)
```

### reusable.answering.abandoning.Abandon:not-taken#2

Authored path: `reusable.answering.abandoning.Abandon`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 40.

```reaction
when AgentSessioning.use (session, subject: agent), asked by reusable.answering.abandoning.Abandon
where
  earlier, RequestBoundary.request (path: "/answers/abandon", prompt, reason, requestId, session)
  no Reasoning._taken (reasoner: agent) has (prompt)
then
  RequestBoundary.respond (error: "NOT_TAKEN", requestId)
```

### reusable.answering.abandoning.Abandon:taken#2

Authored path: `reusable.answering.abandoning.Abandon`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 40.

```reaction
when AgentSessioning.use (session, subject: agent), asked by reusable.answering.abandoning.Abandon
where
  Reasoning._taken (reasoner: agent) has (prompt)
  earlier, RequestBoundary.request (path: "/answers/abandon", prompt, reason, requestId, session)
then
  Reasoning.abandon (prompt, reason)
```

### reusable.answering.abandoning.Abandon:taken#3

Authored path: `reusable.answering.abandoning.Abandon`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 40.

```reaction
when Reasoning.abandon (prompt, reason), asked by reusable.answering.abandoning.Abandon:taken#2
where
  earlier, RequestBoundary.request (path: "/answers/abandon", prompt, reason, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### reusable.answering.finding.ShowOpen

Authored path: `reusable.answering.finding.ShowOpen`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 22.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 25.

```reaction
when RequestBoundary.request (path: "/answers/open", requestId, session)
then
  AgentSessioning.use (session)
```

### reusable.answering.finding.ShowOpen#2

Authored path: `reusable.answering.finding.ShowOpen`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 22.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 25.

```reaction
when AgentSessioning.use (session, subject: agent), asked by reusable.answering.finding.ShowOpen
where
  earlier, RequestBoundary.request (path: "/answers/open", requestId, session)
then
  RequestBoundary.respond (requestId, taken: former "the prompts (agent) has taken and not finished" with (agent), waiting: former "the waiting prompts")
```

### reusable.answering.writing.Conclude

Authored path: `reusable.answering.writing.Conclude`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 39.

```reaction
when RequestBoundary.request (path: "/answers/conclude", prompt, requestId, session)
then
  AgentSessioning.use (session)
```

### reusable.answering.writing.Conclude#2

Authored path: `reusable.answering.writing.Conclude`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 39.

```reaction
when AgentSessioning.use (session, subject: agent), asked by reusable.answering.writing.Conclude
where
  earlier, RequestBoundary.request (path: "/answers/conclude", prompt, requestId, session)
then
  Reasoning.conclude (prompt, reasoner: agent)
```

### reusable.answering.writing.Conclude#3

Authored path: `reusable.answering.writing.Conclude`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 39.

```reaction
when Reasoning.conclude (prompt, reasoner: agent), asked by reusable.answering.writing.Conclude#2
where
  earlier, RequestBoundary.request (path: "/answers/conclude", prompt, requestId, session)
then
  RequestBoundary.respond (requestId)
```

### reusable.answering.writing.Extend

Authored path: `reusable.answering.writing.Extend`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 38.

```reaction
when RequestBoundary.request (path: "/answers/extend", prompt, requestId, session, text)
then
  AgentSessioning.use (session)
```

### reusable.answering.writing.Extend#2

Authored path: `reusable.answering.writing.Extend`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 38.

```reaction
when AgentSessioning.use (session, subject: agent), asked by reusable.answering.writing.Extend
where
  earlier, RequestBoundary.request (path: "/answers/extend", prompt, requestId, session, text)
then
  Reasoning.extend (prompt, reasoner: agent, text)
```

### reusable.answering.writing.Extend#3

Authored path: `reusable.answering.writing.Extend`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 38.

```reaction
when Reasoning.extend (prompt, reasoner: agent, text), asked by reusable.answering.writing.Extend#2
where
  earlier, RequestBoundary.request (path: "/answers/extend", prompt, requestId, session, text)
then
  RequestBoundary.respond (requestId)
```

### reusable.answering.writing.Take

Authored path: `reusable.answering.writing.Take`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 37.

```reaction
when RequestBoundary.request (path: "/answers/take", prompt, requestId, session)
then
  AgentSessioning.use (session)
```

### reusable.answering.writing.Take#2

Authored path: `reusable.answering.writing.Take`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 37.

```reaction
when AgentSessioning.use (session, subject: agent), asked by reusable.answering.writing.Take
where
  earlier, RequestBoundary.request (path: "/answers/take", prompt, requestId, session)
then
  Reasoning.take (prompt, reasoner: agent)
```

### reusable.answering.writing.Take#3

Authored path: `reusable.answering.writing.Take`.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 34.
- Covered by [Answering questions](../design/compositions/reusable/answering.md), line 37.

```reaction
when Reasoning.take (prompt, reasoner: agent), asked by reusable.answering.writing.Take#2
where
  earlier, RequestBoundary.request (path: "/answers/take", prompt, requestId, session)
then
  RequestBoundary.respond (prompt, requestId)
```

### reusable.passwords.entering.Register:accepted

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
where
  Authenticating._acceptable (password) has (acceptable: true)
then
  Registering.register (username)
```

### reusable.passwords.entering.Register:accepted#2

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when Registering.register (username, user), asked by reusable.passwords.entering.Register:accepted
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  Authenticating.set (password, user)
```

### reusable.passwords.entering.Register:accepted#3

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when Authenticating.set (password, user), asked by reusable.passwords.entering.Register:accepted#2
then
  Sessioning.start (subject: user)
```

### reusable.passwords.entering.Register:accepted#4

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when Sessioning.start (subject: user, expiresAt, session), asked by reusable.passwords.entering.Register:accepted#3
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  RequestBoundary.respond (expiresAt, requestId, session, user)
```

### reusable.passwords.entering.Register:refused

Authored path: `reusable.passwords.entering.Register`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 5.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 12.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
where
  Authenticating._acceptable (password) has (acceptable: false)
then
  RequestBoundary.respond (error: "INVALID_PASSWORD", requestId)
```

### reusable.passwords.entering.SignIn:known

Authored path: `reusable.passwords.entering.SignIn`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 7.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 13.

```reaction
when RequestBoundary.request (password, path: "/auth/login", requestId, username)
where
  Registering._byUsername (username) has (user)
then
  Authenticating.authenticate (password, user)
```

### reusable.passwords.entering.SignIn:known#2

Authored path: `reusable.passwords.entering.SignIn`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 7.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 13.

```reaction
when Authenticating.authenticate (password, user), asked by reusable.passwords.entering.SignIn:known
then
  Sessioning.start (subject: user)
```

### reusable.passwords.entering.SignIn:known#3

Authored path: `reusable.passwords.entering.SignIn`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 7.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 13.

```reaction
when Sessioning.start (subject: user, expiresAt, session), asked by reusable.passwords.entering.SignIn:known#2
where
  earlier, RequestBoundary.request (password, path: "/auth/login", requestId, username)
then
  RequestBoundary.respond (expiresAt, requestId, session, user)
```

### reusable.passwords.entering.SignIn:unknown

Authored path: `reusable.passwords.entering.SignIn`.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 7.
- Covered by [Passwords](../design/compositions/reusable/passwords.md), line 13.

```reaction
when RequestBoundary.request (password, path: "/auth/login", requestId, username)
where
  no Registering._byUsername (username)
then
  RequestBoundary.respond (error: "INVALID_CREDENTIALS", requestId)
```

### table.clock.Expire

Authored path: `table.clock.Expire`.
- Covered by [The table](../design/compositions/table.md), line 52.
- Covered by [The table](../design/compositions/table.md), line 61.

```reaction
when RequestBoundary.request (path: "/tables/expire", requestId, session, table)
then
  Sessioning.use (session)
```

### table.clock.Expire:not-seated#2

Authored path: `table.clock.Expire`.
- Covered by [The table](../design/compositions/table.md), line 52.
- Covered by [The table](../design/compositions/table.md), line 61.

```reaction
when Sessioning.use (session, subject: user), asked by table.clock.Expire
where
  earlier, RequestBoundary.request (path: "/tables/expire", requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### table.clock.Expire:seated#2

Authored path: `table.clock.Expire`.
- Covered by [The table](../design/compositions/table.md), line 52.
- Covered by [The table](../design/compositions/table.md), line 61.

```reaction
when Sessioning.use (session, subject: user), asked by table.clock.Expire
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/expire", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
then
  Tabling.expire (now: instant, table)
```

### table.clock.Expire:seated#3

Authored path: `table.clock.Expire`.
- Covered by [The table](../design/compositions/table.md), line 52.
- Covered by [The table](../design/compositions/table.md), line 61.

```reaction
when Tabling.expire (now: instant, table), asked by table.clock.Expire:seated#2
where
  earlier, RequestBoundary.request (path: "/tables/expire", requestId, session, table)
then
  RequestBoundary.respond (requestId)
```

### table.clock.ExpireOverdue

Authored path: `table.clock.ExpireOverdue`.
- Covered by [The table](../design/compositions/table.md), line 54.
- Covered by [The table](../design/compositions/table.md), line 62.

```reaction
when RequestBoundary.request (path: "/timekeeper/expire", requestId, session)
then
  AgentSessioning.use (session)
```

### table.clock.ExpireOverdue:answer#2

Authored path: `table.clock.ExpireOverdue`.
- Covered by [The table](../design/compositions/table.md), line 54.
- Covered by [The table](../design/compositions/table.md), line 62.

```reaction
when AgentSessioning.use (session, subject: agent), asked by table.clock.ExpireOverdue
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/timekeeper/expire", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### table.clock.ExpireOverdue:overdue#2

Authored path: `table.clock.ExpireOverdue`.
- Covered by [The table](../design/compositions/table.md), line 54.
- Covered by [The table](../design/compositions/table.md), line 62.

```reaction
when AgentSessioning.use (session, subject: agent), asked by table.clock.ExpireOverdue
where
  instant is the current flow's instant
  Tabling._overdue (now: instant) has (table)
then
  Tabling.expire (now: instant, table)
```

### table.clock.Withdraw

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 56.
- Covered by [The table](../design/compositions/table.md), line 63.

```reaction
when RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
then
  Sessioning.use (session)
```

### table.clock.Withdraw:ended#2

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 56.
- Covered by [The table](../design/compositions/table.md), line 63.

```reaction
when Sessioning.use (session, subject: user), asked by table.clock.Withdraw
where
  earlier, RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) has ended" with (table)
then
  RequestBoundary.respond (error: "NOT_OPEN", requestId)
```

### table.clock.Withdraw:not-seated#2

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 56.
- Covered by [The table](../design/compositions/table.md), line 63.

```reaction
when Sessioning.use (session, subject: user), asked by table.clock.Withdraw
where
  earlier, RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### table.clock.Withdraw:preparing#2

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 56.
- Covered by [The table](../design/compositions/table.md), line 63.

```reaction
when Sessioning.use (session, subject: user), asked by table.clock.Withdraw
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) is preparing" with (table)
then
  Tabling.withdraw (negotiator: user, now: instant, table)
```

### table.clock.Withdraw:preparing#3

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 56.
- Covered by [The table](../design/compositions/table.md), line 63.

```reaction
when Tabling.withdraw (negotiator: user, now: instant, table), asked by table.clock.Withdraw:preparing#2
where
  earlier, RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
then
  RequestBoundary.respond (requestId)
```

### table.clock.Withdraw:time-up#2

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 56.
- Covered by [The table](../design/compositions/table.md), line 63.

```reaction
when Sessioning.use (session, subject: user), asked by table.clock.Withdraw
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) is overdue at (instant)" with (instant, table)
then
  Tabling.expire (now: instant, table)
```

### table.clock.Withdraw:time-up#3

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 56.
- Covered by [The table](../design/compositions/table.md), line 63.

```reaction
when Tabling.expire (now: instant, table), asked by table.clock.Withdraw:time-up#2
where
  earlier, RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
then
  RequestBoundary.respond (error: "TIME_UP", requestId)
```

### table.clock.Withdraw:under-way#2

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 56.
- Covered by [The table](../design/compositions/table.md), line 63.

```reaction
when Sessioning.use (session, subject: user), asked by table.clock.Withdraw
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) is under way at (instant)" with (instant, table)
then
  Tabling.withdraw (negotiator: user, now: instant, table)
```

### table.clock.Withdraw:under-way#3

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 56.
- Covered by [The table](../design/compositions/table.md), line 63.

```reaction
when Tabling.withdraw (negotiator: user, now: instant, table), asked by table.clock.Withdraw:under-way#2
where
  earlier, RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
then
  RequestBoundary.respond (requestId)
```

### table.seating.AddSeatForEachRole

Authored path: `table.seating.AddSeatForEachRole`.
- Covered by [The table](../design/compositions/table.md), line 7.

```reaction
when Tabling.open (scenario, table)
where
  Briefing._roles (scenario) has (role)
then
  Tabling.addSeat (role, table)
```

### table.seating.JoinProposalsWhenSeated

Authored path: `table.seating.JoinProposalsWhenSeated`.
- Covered by [The table](../design/compositions/table.md), line 7.

```reaction
when Tabling.seat (table, role)
then
  Proposing.join (party: role, subject: table)
```

### table.showing.ShowTable

Authored path: `table.showing.ShowTable`.
- Covered by [The table](../design/compositions/table.md), line 23.
- Covered by [The table](../design/compositions/table.md), line 28.

```reaction
when RequestBoundary.request (path: "/tables/show", requestId, session, table)
then
  Sessioning.use (session)
```

### table.showing.ShowTable:not-seated#2

Authored path: `table.showing.ShowTable`.
- Covered by [The table](../design/compositions/table.md), line 23.
- Covered by [The table](../design/compositions/table.md), line 28.

```reaction
when Sessioning.use (session, subject: user), asked by table.showing.ShowTable
where
  earlier, RequestBoundary.request (path: "/tables/show", requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### table.showing.ShowTable:seated#2

Authored path: `table.showing.ShowTable`.
- Covered by [The table](../design/compositions/table.md), line 23.
- Covered by [The table](../design/compositions/table.md), line 28.

```reaction
when Sessioning.use (session, subject: user), asked by table.showing.ShowTable
where
  earlier, RequestBoundary.request (path: "/tables/show", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user) has (role)
then
  RequestBoundary.respond (link: former "the invitation link to (table)" with (table), notes: former "the notes (user) wrote about (table)" with (table, user), openQuestions: former "the open questions about (table)" with (table), plan: former "the plan (user) wrote for (table)" with (table, user), questions: former "the questions about (table)" with (table), requestId, start: former "the suggestion to start (table)" with (table), table: former "(table) as (role) sees it" with (role, table))
```

### table.starting.AgreeToStart

Authored path: `table.starting.AgreeToStart`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 46.

```reaction
when RequestBoundary.request (path: "/tables/agree", proposal, requestId, session, table)
then
  Sessioning.use (session)
```

### table.starting.AgreeToStart#2

Authored path: `table.starting.AgreeToStart`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 46.

```reaction
when Sessioning.use (session, subject: user), asked by table.starting.AgreeToStart
where
  earlier, RequestBoundary.request (path: "/tables/agree", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user) has (role)
  no view "(table) has ended" with (table)
  TimeLimitProposing._proposal (proposal) has (subject: table)
  view "(user) is prepared to start (table)" with (table, user)
then
  TimeLimitProposing.accept (party: role, proposal)
```

### table.starting.AgreeToStart#3

Authored path: `table.starting.AgreeToStart`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 46.

```reaction
when TimeLimitProposing.accept (party: role, proposal, status), asked by table.starting.AgreeToStart#2
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (path: "/tables/agree", proposal, requestId, session, table)
  whether Tabling._table (table) has (deadline)
then
  RequestBoundary.respond (deadline, requestId, status)
```

### table.starting.BeginOnceEveryoneAgrees

Authored path: `table.starting.BeginOnceEveryoneAgrees`.
- Covered by [The table](../design/compositions/table.md), line 41.

```reaction
when TimeLimitProposing.accept (status: "ACCEPTED", subject: table, terms: minutes)
where
  instant is the current flow's instant
then
  Tabling.begin (now: instant, table, timeLimit: minutes)
```

### table.starting.JoinStartTalksForEachSeat

Authored path: `table.starting.JoinStartTalksForEachSeat`.
- Covered by [The table](../design/compositions/table.md), line 35.

```reaction
when Tabling.addSeat (role, table)
then
  TimeLimitProposing.join (party: role, subject: table)
```

### table.starting.RefuseAgreement

Authored path: `table.starting.RefuseAgreement`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 47.

```reaction
when RequestBoundary.request (path: "/tables/agree", proposal, requestId, session, table)
then
  Sessioning.use (session)
```

### table.starting.RefuseAgreement:elsewhere#2

Authored path: `table.starting.RefuseAgreement`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 47.

```reaction
when Sessioning.use (session, subject: user), asked by table.starting.RefuseAgreement
where
  earlier, RequestBoundary.request (path: "/tables/agree", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  no view "(table) has ended" with (table)
  no TimeLimitProposing._proposal (proposal) has (subject: table)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### table.starting.RefuseAgreement:ended#2

Authored path: `table.starting.RefuseAgreement`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 47.

```reaction
when Sessioning.use (session, subject: user), asked by table.starting.RefuseAgreement
where
  earlier, RequestBoundary.request (path: "/tables/agree", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) has ended" with (table)
then
  RequestBoundary.respond (error: "NOT_OPEN", requestId)
```

### table.starting.RefuseAgreement:not-seated#2

Authored path: `table.starting.RefuseAgreement`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 47.

```reaction
when Sessioning.use (session, subject: user), asked by table.starting.RefuseAgreement
where
  earlier, RequestBoundary.request (path: "/tables/agree", proposal, requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### table.starting.RefuseAgreement:plan-first#2

Authored path: `table.starting.RefuseAgreement`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 47.

```reaction
when Sessioning.use (session, subject: user), asked by table.starting.RefuseAgreement
where
  earlier, RequestBoundary.request (path: "/tables/agree", proposal, requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  no view "(table) has ended" with (table)
  TimeLimitProposing._proposal (proposal) has (subject: table)
  no view "(user) is prepared to start (table)" with (table, user)
then
  RequestBoundary.respond (error: "PLAN_FIRST", requestId)
```

### table.starting.RefuseStart

Authored path: `table.starting.RefuseStart`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 45.

```reaction
when RequestBoundary.request (minutes, path: "/tables/start", requestId, session, table)
then
  Sessioning.use (session)
```

### table.starting.RefuseStart:ended#2

Authored path: `table.starting.RefuseStart`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 45.

```reaction
when Sessioning.use (session, subject: user), asked by table.starting.RefuseStart
where
  earlier, RequestBoundary.request (minutes, path: "/tables/start", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) has ended" with (table)
then
  RequestBoundary.respond (error: "NOT_OPEN", requestId)
```

### table.starting.RefuseStart:invalid#2

Authored path: `table.starting.RefuseStart`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 45.

```reaction
when Sessioning.use (session, subject: user), asked by table.starting.RefuseStart
where
  earlier, RequestBoundary.request (minutes, path: "/tables/start", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  no view "(table) has ended" with (table)
  Tabling._acceptableTimeLimit (timeLimit: minutes) has (acceptable: false)
then
  RequestBoundary.respond (error: "INVALID_TIME_LIMIT", requestId)
```

### table.starting.RefuseStart:not-seated#2

Authored path: `table.starting.RefuseStart`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 45.

```reaction
when Sessioning.use (session, subject: user), asked by table.starting.RefuseStart
where
  earlier, RequestBoundary.request (minutes, path: "/tables/start", requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### table.starting.RefuseStart:plan-first#2

Authored path: `table.starting.RefuseStart`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 45.

```reaction
when Sessioning.use (session, subject: user), asked by table.starting.RefuseStart
where
  earlier, RequestBoundary.request (minutes, path: "/tables/start", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  no view "(table) has ended" with (table)
  Tabling._acceptableTimeLimit (timeLimit: minutes) has (acceptable: true)
  no view "(user) is prepared to start (table)" with (table, user)
then
  RequestBoundary.respond (error: "PLAN_FIRST", requestId)
```

### table.starting.SuggestStart

Authored path: `table.starting.SuggestStart`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 44.

```reaction
when RequestBoundary.request (minutes, path: "/tables/start", requestId, session, table)
then
  Sessioning.use (session)
```

### table.starting.SuggestStart#2

Authored path: `table.starting.SuggestStart`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 44.

```reaction
when Sessioning.use (session, subject: user), asked by table.starting.SuggestStart
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (minutes, path: "/tables/start", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user) has (role)
  no view "(table) has ended" with (table)
  Tabling._acceptableTimeLimit (timeLimit: minutes) has (acceptable: true)
  view "(user) is prepared to start (table)" with (table, user)
then
  TimeLimitProposing.propose (now: instant, proposer: role, subject: table, terms: minutes)
```

### table.starting.SuggestStart#3

Authored path: `table.starting.SuggestStart`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 44.

```reaction
when TimeLimitProposing.propose (now: instant, proposer: role, subject: table, terms: minutes, proposal), asked by table.starting.SuggestStart#2
at the flow's settlement frontier
where
  whether Tabling._table (table) has (deadline)
  earlier, RequestBoundary.request (minutes, path: "/tables/start", requestId, session, table)
then
  RequestBoundary.respond (deadline, proposal, requestId)
```

### table.talking.Send

Authored path: `table.talking.Send`.
- Covered by [The table](../design/compositions/table.md), line 68.
- Covered by [The table](../design/compositions/table.md), line 73.

```reaction
when RequestBoundary.request (body, path: "/tables/send", requestId, session, table)
then
  Sessioning.use (session)
```

### table.talking.Send:not-open#2

Authored path: `table.talking.Send`.
- Covered by [The table](../design/compositions/table.md), line 68.
- Covered by [The table](../design/compositions/table.md), line 73.

```reaction
when Sessioning.use (session, subject: user), asked by table.talking.Send
where
  earlier, RequestBoundary.request (body, path: "/tables/send", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) isn't open" with (table)
then
  RequestBoundary.respond (error: "NOT_OPEN", requestId)
```

### table.talking.Send:not-seated#2

Authored path: `table.talking.Send`.
- Covered by [The table](../design/compositions/table.md), line 68.
- Covered by [The table](../design/compositions/table.md), line 73.

```reaction
when Sessioning.use (session, subject: user), asked by table.talking.Send
where
  earlier, RequestBoundary.request (body, path: "/tables/send", requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### table.talking.Send:time-up#2

Authored path: `table.talking.Send`.
- Covered by [The table](../design/compositions/table.md), line 68.
- Covered by [The table](../design/compositions/table.md), line 73.

```reaction
when Sessioning.use (session, subject: user), asked by table.talking.Send
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (body, path: "/tables/send", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) is overdue at (instant)" with (instant, table)
then
  Tabling.expire (now: instant, table)
```

### table.talking.Send:time-up#3

Authored path: `table.talking.Send`.
- Covered by [The table](../design/compositions/table.md), line 68.
- Covered by [The table](../design/compositions/table.md), line 73.

```reaction
when Tabling.expire (now: instant, table), asked by table.talking.Send:time-up#2
where
  earlier, RequestBoundary.request (body, path: "/tables/send", requestId, session, table)
then
  RequestBoundary.respond (error: "TIME_UP", requestId)
```

### table.talking.Send:under-way#2

Authored path: `table.talking.Send`.
- Covered by [The table](../design/compositions/table.md), line 68.
- Covered by [The table](../design/compositions/table.md), line 73.

```reaction
when Sessioning.use (session, subject: user), asked by table.talking.Send
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (body, path: "/tables/send", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user) has (role)
  view "(table) is under way at (instant)" with (instant, table)
then
  Conversing.send (body, now: instant, sender: role, subject: table)
```

### table.talking.Send:under-way#3

Authored path: `table.talking.Send`.
- Covered by [The table](../design/compositions/table.md), line 68.
- Covered by [The table](../design/compositions/table.md), line 73.

```reaction
when Conversing.send (body, now: instant, sender: role, subject: table, message), asked by table.talking.Send:under-way#2
where
  earlier, RequestBoundary.request (body, path: "/tables/send", requestId, session, table)
then
  RequestBoundary.respond (message, requestId)
```

### table.talking.WriteNotes

Authored path: `table.talking.WriteNotes`.
- Covered by [The table](../design/compositions/table.md), line 70.
- Covered by [The table](../design/compositions/table.md), line 74.

```reaction
when RequestBoundary.request (body, path: "/tables/notes", requestId, session, table)
then
  Sessioning.use (session)
```

### table.talking.WriteNotes:not-seated#2

Authored path: `table.talking.WriteNotes`.
- Covered by [The table](../design/compositions/table.md), line 70.
- Covered by [The table](../design/compositions/table.md), line 74.

```reaction
when Sessioning.use (session, subject: user), asked by table.talking.WriteNotes
where
  earlier, RequestBoundary.request (body, path: "/tables/notes", requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### table.talking.WriteNotes:seated#2

Authored path: `table.talking.WriteNotes`.
- Covered by [The table](../design/compositions/table.md), line 70.
- Covered by [The table](../design/compositions/table.md), line 74.

```reaction
when Sessioning.use (session, subject: user), asked by table.talking.WriteNotes
where
  earlier, RequestBoundary.request (body, path: "/tables/notes", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
then
  Noting.write (author: user, body, subject: table)
```

### table.talking.WriteNotes:seated#3

Authored path: `table.talking.WriteNotes`.
- Covered by [The table](../design/compositions/table.md), line 70.
- Covered by [The table](../design/compositions/table.md), line 74.

```reaction
when Noting.write (author: user, body, subject: table), asked by table.talking.WriteNotes:seated#2
where
  earlier, RequestBoundary.request (body, path: "/tables/notes", requestId, session, table)
then
  RequestBoundary.respond (requestId)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/answers/abandon` — requires `prompt`, `reason`, `session`
- `/answers/conclude` — requires `prompt`, `session`
- `/answers/extend` — requires `prompt`, `session`, `text`
- `/answers/open` — requires `session`
- `/answers/take` — requires `prompt`, `session`
- `/auth/login` — requires `password`, `username`
- `/auth/logout` — requires `session`
- `/auth/me` — requires `session`
- `/auth/register` — requires `password`, `username`
- `/bakery` — requires `session`
- `/coach/table` — requires `prompt`, `session`
- `/counterpart/table` — requires `prompt`, `session`
- `/friends/invitation` — requires `code`, `session`
- `/friends/join` — requires `code`, `role`, `session`
- `/friends/start` — requires `role`, `scenario`, `session`
- `/matchmaking/find` — requires `open`, `scenario`, `session`
- `/matchmaking/stop` — requires `request`, `session`
- `/matchmaking/wait` — requires `request`, `session`
- `/practice/start` — requires `role`, `scenario`, `session`
- `/settings/prep-sheet` — requires `on`, `session`
- `/settings/show` — requires `session`
- `/tables/accept` — requires `proposal`, `session`, `table`
- `/tables/agree` — requires `proposal`, `session`, `table`
- `/tables/debrief` — requires `session`, `table`
- `/tables/expire` — requires `session`, `table`
- `/tables/notes` — requires `body`, `session`, `table`
- `/tables/plan` — requires `priorities`, `session`, `table`, `target`, `walkaway`
- `/tables/propose` — requires `session`, `table`, `terms`
- `/tables/reject` — requires `proposal`, `session`, `table`
- `/tables/retract` — requires `proposal`, `session`, `table`
- `/tables/review` — requires `role`, `session`, `stars`, `table`
- `/tables/send` — requires `body`, `session`, `table`
- `/tables/show` — requires `session`, `table`
- `/tables/start` — requires `minutes`, `session`, `table`
- `/tables/withdraw` — requires `session`, `table`
- `/timekeeper/expire` — requires `session`
