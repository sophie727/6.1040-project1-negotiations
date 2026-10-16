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

- `Authenticating` — instance of `Authenticating` — [The Whole Pie types](../design/types.md), line 25.
  - `User` is `Registering.User` — [The Whole Pie types](../design/types.md), line 26.

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
- `_wholePie(scenario: Scenario) : optional (terms: TermSheet, jointPoints: Number, jointBatna: Number)`

#### Instances

- `Briefing` — instance of `Briefing` — [The Whole Pie types](../design/types.md), line 34.
  - `Author` is `Registering.User` — [The Whole Pie types](../design/types.md), line 35.

### Conversing

Defined in [Conversing](../design/concepts/Conversing.md), line 1.

#### Actions

- `send(subject: Subject, sender: Speaker, body: String, now: DateTime) : returns (message: Message)`
  - Refuses `INVALID_MESSAGE`: A message must have 1 to 2,000 characters.

#### Queries

- `_messages(subject: Subject) : many (message: Message, sender: Speaker, body: String, sentAt: DateTime)`

#### Instances

- `Conversing` — instance of `Conversing` — [The Whole Pie types](../design/types.md), line 42.
  - `Speaker` is `Briefing.Role` — [The Whole Pie types](../design/types.md), line 44.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 43.

### Noting

Defined in [Noting](../design/concepts/Noting.md), line 1.

#### Actions

- `write(author: Author, subject: Subject, body: String) : returns (note: Note)`
  - Refuses `TOO_LONG`: Notes can have at most 20,000 characters.

#### Queries

- `_note(author: Author, subject: Subject) : optional (body: String)`

#### Instances

- `Noting` — instance of `Noting` — [The Whole Pie types](../design/types.md), line 51.
  - `Author` is `Registering.User` — [The Whole Pie types](../design/types.md), line 52.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 53.

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

- `Proposing` — instance of `Proposing` — [The Whole Pie types](../design/types.md), line 46.
  - `Party` is `Briefing.Role` — [The Whole Pie types](../design/types.md), line 48.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 47.
  - `Terms` is `TermSheet` — [The Whole Pie types](../design/types.md), line 49.

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

- `Reasoning` — instance of `Reasoning` — [The Whole Pie types](../design/types.md), line 55.
  - `Reasoner` is `Agent` — [The Whole Pie types](../design/types.md), line 57.
  - `Subject` is `Tabling.Table` — [The Whole Pie types](../design/types.md), line 56.

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

- `Registering` — instance of `Registering` — [The Whole Pie types](../design/types.md), line 23.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(subject: Subject) : returns (session: Session, expiresAt: DateTime)`
- `use(session: Session) : returns (subject: Subject)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.
- `end(session: Session) : returns (session: Session)`
  - Refuses `NOT_SIGNED_IN`: Your session has ended. Sign in again.

#### Instances

- `AgentSessioning` — instance of `Sessioning` — [The Whole Pie types](../design/types.md), line 31.
  - `Subject` is `Agent` — [The Whole Pie types](../design/types.md), line 32.
- `Sessioning` — instance of `Sessioning` — [The Whole Pie types](../design/types.md), line 28.
  - `Subject` is `Registering.User` — [The Whole Pie types](../design/types.md), line 29.

### Tabling

Defined in [Tabling](../design/concepts/Tabling.md), line 1.

#### Actions

- `recommendTimeLimit(scenario: Scenario, timeLimit: Number) : returns ()`
  - Refuses `INVALID_TIME_LIMIT`: The time limit must be a whole number of minutes from 1 to 180.
- `open(scenario: Scenario, timeLimit?: Number) : returns (table: Table)`
  - Refuses `INVALID_TIME_LIMIT`: The time limit must be a whole number of minutes from 1 to 180.
  - Refuses `NO_TIME_LIMIT`: This scenario has no recommended time limit, so choose one.
- `addSeat(table: Table, role: Role) : returns (table: Table)`
  - Refuses `UNKNOWN_TABLE`: There is no such negotiation.
  - Refuses `ALREADY_BEGUN`: This negotiation has already started.
  - Refuses `SEAT_EXISTS`: This table already has a seat for that role.
- `seat(table: Table, negotiator: Negotiator, role: Role) : returns (table: Table)`
  - Refuses `UNKNOWN_TABLE`: There is no such negotiation.
  - Refuses `ALREADY_BEGUN`: This negotiation has already started.
  - Refuses `NO_SUCH_SEAT`: This table has no seat for that role.
  - Refuses `ROLE_TAKEN`: Someone already has that role at this table.
  - Refuses `ALREADY_SEATED`: You already have a seat at this table.
- `begin(table: Table, now: DateTime) : returns (table: Table, deadline: DateTime)`
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
- `_table(table: Table) : optional (scenario: Scenario, status: TableStatus, timeLimit: Number, deadline?: DateTime, withdrawnBy?: Negotiator)`
- `_seats(table: Table) : many (role: Role, negotiator?: Negotiator)`
- `_tablesOf(negotiator: Negotiator) : many (table: Table, role: Role, scenario: Scenario, status: TableStatus)`

#### Instances

- `Tabling` — instance of `Tabling` — [The Whole Pie types](../design/types.md), line 37.
  - `Negotiator` is `Player` — [The Whole Pie types](../design/types.md), line 40.
  - `Role` is `Briefing.Role` — [The Whole Pie types](../design/types.md), line 39.
  - `Scenario` is `Briefing.Scenario` — [The Whole Pie types](../design/types.md), line 38.

## Application types

Concrete types:

- `Agent` — [The Whole Pie types](../design/types.md), line 18.
- `Player` — [The Whole Pie types](../design/types.md), line 12.
- `TermSheet` — [The Whole Pie types](../design/types.md), line 15.

## Views

_Views name reusable conditions. Multiple `where` blocks are alternatives._

### (role) of (scenario) can be practiced

Authored path: `practice.starting.playable`.
- Covered by [Practice](../design/compositions/practice.md), line 17.

```view
(role) of (scenario) can be practiced — inputs (scenario, role); outputs (); bindings ()
  where
    Briefing._role (role) has (scenario)
    Briefing._scenario (scenario) has (published: true)
```

### (table) has ended

Authored path: `debrief.outcome.ended`.
- Covered by [The debrief](../design/compositions/debrief.md), line 5.

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

### (table) is under way at (instant)

Authored path: `table.access.underWay`.
- Covered by [The table](../design/compositions/table.md), line 13.

```view
(table) is under way at (instant) — inputs (table, instant); outputs (); bindings (deadline)
  where
    Tabling._table (table) has (deadline, status: "OPEN")
    instant is less than deadline
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

### a question that asks (ask) about (table) is waiting

Authored path: `counterpart.asking.hasWaitingQuestion`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 9.

```view
a question that asks (ask) about (table) is waiting — inputs (table, ask); outputs (); bindings ()
  where Reasoning._about (subject: table) has (ask, stage: "WAITING")
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
- Covered by [The debrief](../design/compositions/debrief.md), line 9.

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

### the terms (table) settled on

Authored path: `debrief.outcome.settledTerms`.
- Covered by [The debrief](../design/compositions/debrief.md), line 8.

```view
the terms (table) settled on — inputs (table); outputs (terms); bindings () — answers at most one (terms)
  where
    Tabling._table (table) has (status: "SETTLED")
    Proposing._agreement (subject: table) has (terms)
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

### (table) as (role) sees it

Authored path: `table.showing.tableAsSeenBy`.
- Covered by [The table](../design/compositions/table.md), line 23.

```former
Former "(table) as (role) sees it" — inputs (table, role); bindings (scenario, scenarioName, status, timeLimit, deadline, roleName, batna, brief, seat, seatName, message, sender, body, sentAt, proposal, proposer, terms, proposalStatus, proposedAt, points); promises exactly one record — forms:
  a record of
    where Tabling._table (table) has (scenario, status, timeLimit)
    where whether Tabling._table (table) has (deadline)
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
    proposals: each Proposing._proposals (subject: table) has (proposal, proposedAt, proposer, status: proposalStatus, terms)
      where whether Briefing._dealPayoff (role, terms) has (points)
      form a record of
        points
        proposal
        proposedAt
        proposer
        status: proposalStatus
        terms
    role
    roleName
    scenario
    scenarioName
    seats: each Tabling._seats (table) has (role: seat)
      where Briefing._role (role: seat) has (name: seatName)
      form a record of
        name: seatName
        role: seat
    status
    table
    timeLimit
```

### the debrief of (table)

Authored path: `debrief.showing.debriefOf`.
- Covered by [The debrief](../design/compositions/debrief.md), line 5.

```former
Former "the debrief of (table)" — inputs (table); bindings (scenario, outcome, agreed, quitter, best, bestJointPoints, jointBatna, role, name, batna, points, bestPoints); promises exactly one record — forms:
  a record of
    where Tabling._table (table) has (scenario, status: outcome)
    where whether view "the terms (table) settled on" with (table) has (terms: agreed)
    where whether view "the role that walked away from (table)" with (table) has (role: quitter)
    where whether Briefing._wholePie (scenario) has (jointBatna, jointPoints: bestJointPoints, terms: best)
    agreed
    best
    bestJointPoints
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
        points
        role
    walkedAway: quitter
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
Former "the open questions about (table)" — inputs (table); bindings (prompt, stage); promises exactly one record — forms:
  the count of Reasoning._about (subject: table) has (prompt, stage)
    where stage is among ["WAITING", "FORMING"]
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
Former "the published scenarios" — inputs (); bindings (scenario, name, timeLimit, role, roleName); promises exactly one record — forms:
  each Briefing._published () has (name, scenario)
    where whether Tabling._recommendedTimeLimit (scenario) has (timeLimit)
    form a record of
      name
      roles: each Briefing._roles (scenario) has (name: roleName, role)
        form a record of
          name: roleName
          role
      scenario
      timeLimit
```

### the tables (user) has a seat at

Authored path: `practice.choosing.tablesOf`.
- Covered by [Practice](../design/compositions/practice.md), line 7.

```former
Former "the tables (user) has a seat at" — inputs (user); bindings (table, role, scenario, status, scenarioName, roleName); promises exactly one record — forms:
  each Tabling._tablesOf (negotiator: user) has (role, scenario, status, table)
    where Briefing._scenario (scenario) has (name: scenarioName)
    where Briefing._role (role) has (name: roleName)
    form a record of
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
- Covered by [The counterpart](../design/compositions/counterpart.md), line 25.

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
- Covered by [The counterpart](../design/compositions/counterpart.md), line 25.

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
- Covered by [The counterpart](../design/compositions/counterpart.md), line 25.

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
- Covered by [The counterpart](../design/compositions/counterpart.md), line 25.

```reaction
when Reasoning.conclude (prompt, ask: "Do you accept the proposal waiting for your answer?", subject: table)
where
  instant is the current flow's instant
  Reasoning._lines (prompt) has (line: remark, position: 2)
  view "the role the counterpart plays at (table)" with (table) has (role)
  view "(table) is under way at (instant)" with (instant, table)
then
  Conversing.send (body: remark, now: instant, sender: role, subject: table)
```

### counterpart.answering.SendReply

Authored path: `counterpart.answering.SendReply`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 21.

```reaction
when Reasoning.conclude (prompt, ask: "What do you say next to the other side?", subject: table)
where
  instant is the current flow's instant
  Reasoning._about (subject: table) has (answer, prompt)
  view "the role the counterpart plays at (table)" with (table) has (role)
  view "(table) is under way at (instant)" with (instant, table)
then
  Conversing.send (body: answer, now: instant, sender: role, subject: table)
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

### counterpart.asking.GreetWhenBegun

Authored path: `counterpart.asking.GreetWhenBegun`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 9.

```reaction
when Tabling.begin (table)
where
  view "the role the counterpart plays at (table)" with (table)
then
  Reasoning.prompt (ask: "What do you say next to the other side?", subject: table)
```

### counterpart.reading.ReadTable

Authored path: `counterpart.reading.ReadTable`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 13.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 16.

```reaction
when RequestBoundary.request (path: "/counterpart/table", prompt, requestId, session)
then
  AgentSessioning.use (session)
```

### counterpart.reading.ReadTable:not-seated#2

Authored path: `counterpart.reading.ReadTable`.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 13.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 16.

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
- Covered by [The counterpart](../design/compositions/counterpart.md), line 13.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 16.

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
- Covered by [The counterpart](../design/compositions/counterpart.md), line 13.
- Covered by [The counterpart](../design/compositions/counterpart.md), line 16.

```reaction
when AgentSessioning.use (session, subject: agent), asked by counterpart.reading.ReadTable
where
  Reasoning._taken (reasoner: agent) has (prompt, subject: table)
  view "the role the counterpart plays at (table)" with (table) has (role)
  earlier, RequestBoundary.request (path: "/counterpart/table", prompt, requestId, session)
then
  RequestBoundary.respond (requestId, table: former "(table) as (role) sees it" with (role, table))
```

### debrief.showing.ShowDebrief

Authored path: `debrief.showing.ShowDebrief`.
- Covered by [The debrief](../design/compositions/debrief.md), line 5.
- Covered by [The debrief](../design/compositions/debrief.md), line 16.

```reaction
when RequestBoundary.request (path: "/tables/debrief", requestId, session, table)
then
  Sessioning.use (session)
```

### debrief.showing.ShowDebrief:ended#2

Authored path: `debrief.showing.ShowDebrief`.
- Covered by [The debrief](../design/compositions/debrief.md), line 5.
- Covered by [The debrief](../design/compositions/debrief.md), line 16.

```reaction
when Sessioning.use (session, subject: user), asked by debrief.showing.ShowDebrief
where
  earlier, RequestBoundary.request (path: "/tables/debrief", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user) has (role)
  view "(table) has ended" with (table)
then
  RequestBoundary.respond (debrief: former "the debrief of (table)" with (table), requestId, role)
```

### debrief.showing.ShowDebrief:not-over#2

Authored path: `debrief.showing.ShowDebrief`.
- Covered by [The debrief](../design/compositions/debrief.md), line 5.
- Covered by [The debrief](../design/compositions/debrief.md), line 16.

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
- Covered by [The debrief](../design/compositions/debrief.md), line 5.
- Covered by [The debrief](../design/compositions/debrief.md), line 16.

```reaction
when Sessioning.use (session, subject: user), asked by debrief.showing.ShowDebrief
where
  earlier, RequestBoundary.request (path: "/tables/debrief", requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
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
  RequestBoundary.respond (requestId, scenarios: former "the published scenarios", tables: former "the tables (user) has a seat at" with (user))
```

### practice.starting.RefuseUnplayable

Authored path: `practice.starting.RefuseUnplayable`.
- Covered by [Practice](../design/compositions/practice.md), line 17.
- Covered by [Practice](../design/compositions/practice.md), line 21.

```reaction
when RequestBoundary.request (path: "/practice/start", requestId, role, scenario, session, timeLimit)
where
  no view "(role) of (scenario) can be practiced" with (role, scenario)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### practice.starting.StartPractice

Authored path: `practice.starting.StartPractice`.
- Covered by [Practice](../design/compositions/practice.md), line 15.
- Covered by [Practice](../design/compositions/practice.md), line 20.

```reaction
when RequestBoundary.request (path: "/practice/start", requestId, role, scenario, session, timeLimit)
where
  view "(role) of (scenario) can be practiced" with (role, scenario)
then
  Sessioning.use (session)
```

### practice.starting.StartPractice#2

Authored path: `practice.starting.StartPractice`.
- Covered by [Practice](../design/compositions/practice.md), line 15.
- Covered by [Practice](../design/compositions/practice.md), line 20.

```reaction
when Sessioning.use (session, subject: user), asked by practice.starting.StartPractice
where
  earlier, RequestBoundary.request (path: "/practice/start", requestId, role, scenario, session, timeLimit)
then
  Tabling.open (scenario, timeLimit)
```

### practice.starting.StartPractice#3

Authored path: `practice.starting.StartPractice`.
- Covered by [Practice](../design/compositions/practice.md), line 15.
- Covered by [Practice](../design/compositions/practice.md), line 20.

```reaction
when Tabling.open (scenario, timeLimit, table), asked by practice.starting.StartPractice#2
at the flow's settlement frontier
where
  earlier, Sessioning.use (session, subject: user), asked by practice.starting.StartPractice
  earlier, RequestBoundary.request (path: "/practice/start", requestId, role, scenario, session, timeLimit)
then
  Tabling.seat (negotiator: user, role, table)
```

### practice.starting.StartPractice#4

Authored path: `practice.starting.StartPractice`.
- Covered by [Practice](../design/compositions/practice.md), line 15.
- Covered by [Practice](../design/compositions/practice.md), line 20.

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
- Covered by [Practice](../design/compositions/practice.md), line 15.
- Covered by [Practice](../design/compositions/practice.md), line 20.

```reaction
when Tabling.seat (negotiator: "bot:counterpart", role: other, table), asked by practice.starting.StartPractice#4
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (path: "/practice/start", requestId, role, scenario, session, timeLimit)
then
  RequestBoundary.respond (requestId, table)
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

### table.clock.Begin

Authored path: `table.clock.Begin`.
- Covered by [The table](../design/compositions/table.md), line 33.
- Covered by [The table](../design/compositions/table.md), line 42.

```reaction
when RequestBoundary.request (path: "/tables/begin", requestId, session, table)
then
  Sessioning.use (session)
```

### table.clock.Begin:not-seated#2

Authored path: `table.clock.Begin`.
- Covered by [The table](../design/compositions/table.md), line 33.
- Covered by [The table](../design/compositions/table.md), line 42.

```reaction
when Sessioning.use (session, subject: user), asked by table.clock.Begin
where
  earlier, RequestBoundary.request (path: "/tables/begin", requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### table.clock.Begin:seated#2

Authored path: `table.clock.Begin`.
- Covered by [The table](../design/compositions/table.md), line 33.
- Covered by [The table](../design/compositions/table.md), line 42.

```reaction
when Sessioning.use (session, subject: user), asked by table.clock.Begin
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/tables/begin", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
then
  Tabling.begin (now: instant, table)
```

### table.clock.Begin:seated#3

Authored path: `table.clock.Begin`.
- Covered by [The table](../design/compositions/table.md), line 33.
- Covered by [The table](../design/compositions/table.md), line 42.

```reaction
when Tabling.begin (now: instant, table, deadline), asked by table.clock.Begin:seated#2
where
  earlier, RequestBoundary.request (path: "/tables/begin", requestId, session, table)
then
  RequestBoundary.respond (deadline, requestId)
```

### table.clock.Expire

Authored path: `table.clock.Expire`.
- Covered by [The table](../design/compositions/table.md), line 35.
- Covered by [The table](../design/compositions/table.md), line 43.

```reaction
when RequestBoundary.request (path: "/tables/expire", requestId, session, table)
then
  Sessioning.use (session)
```

### table.clock.Expire:not-seated#2

Authored path: `table.clock.Expire`.
- Covered by [The table](../design/compositions/table.md), line 35.
- Covered by [The table](../design/compositions/table.md), line 43.

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
- Covered by [The table](../design/compositions/table.md), line 35.
- Covered by [The table](../design/compositions/table.md), line 43.

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
- Covered by [The table](../design/compositions/table.md), line 35.
- Covered by [The table](../design/compositions/table.md), line 43.

```reaction
when Tabling.expire (now: instant, table), asked by table.clock.Expire:seated#2
where
  earlier, RequestBoundary.request (path: "/tables/expire", requestId, session, table)
then
  RequestBoundary.respond (requestId)
```

### table.clock.Withdraw

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 44.

```reaction
when RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
then
  Sessioning.use (session)
```

### table.clock.Withdraw:not-open#2

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 44.

```reaction
when Sessioning.use (session, subject: user), asked by table.clock.Withdraw
where
  earlier, RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
  view "the role (user) plays at (table)" with (table, user)
  view "(table) isn't open" with (table)
then
  RequestBoundary.respond (error: "NOT_OPEN", requestId)
```

### table.clock.Withdraw:not-seated#2

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 44.

```reaction
when Sessioning.use (session, subject: user), asked by table.clock.Withdraw
where
  earlier, RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
  no view "the role (user) plays at (table)" with (table, user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### table.clock.Withdraw:time-up#2

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 44.

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
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 44.

```reaction
when Tabling.expire (now: instant, table), asked by table.clock.Withdraw:time-up#2
where
  earlier, RequestBoundary.request (path: "/tables/withdraw", requestId, session, table)
then
  RequestBoundary.respond (error: "TIME_UP", requestId)
```

### table.clock.Withdraw:under-way#2

Authored path: `table.clock.Withdraw`.
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 44.

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
- Covered by [The table](../design/compositions/table.md), line 37.
- Covered by [The table](../design/compositions/table.md), line 44.

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
when Tabling.seat (role, table)
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
  RequestBoundary.respond (notes: former "the notes (user) wrote about (table)" with (table, user), openQuestions: former "the open questions about (table)" with (table), requestId, table: former "(table) as (role) sees it" with (role, table))
```

### table.talking.Send

Authored path: `table.talking.Send`.
- Covered by [The table](../design/compositions/table.md), line 49.
- Covered by [The table](../design/compositions/table.md), line 54.

```reaction
when RequestBoundary.request (body, path: "/tables/send", requestId, session, table)
then
  Sessioning.use (session)
```

### table.talking.Send:not-open#2

Authored path: `table.talking.Send`.
- Covered by [The table](../design/compositions/table.md), line 49.
- Covered by [The table](../design/compositions/table.md), line 54.

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
- Covered by [The table](../design/compositions/table.md), line 49.
- Covered by [The table](../design/compositions/table.md), line 54.

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
- Covered by [The table](../design/compositions/table.md), line 49.
- Covered by [The table](../design/compositions/table.md), line 54.

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
- Covered by [The table](../design/compositions/table.md), line 49.
- Covered by [The table](../design/compositions/table.md), line 54.

```reaction
when Tabling.expire (now: instant, table), asked by table.talking.Send:time-up#2
where
  earlier, RequestBoundary.request (body, path: "/tables/send", requestId, session, table)
then
  RequestBoundary.respond (error: "TIME_UP", requestId)
```

### table.talking.Send:under-way#2

Authored path: `table.talking.Send`.
- Covered by [The table](../design/compositions/table.md), line 49.
- Covered by [The table](../design/compositions/table.md), line 54.

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
- Covered by [The table](../design/compositions/table.md), line 49.
- Covered by [The table](../design/compositions/table.md), line 54.

```reaction
when Conversing.send (body, now: instant, sender: role, subject: table, message), asked by table.talking.Send:under-way#2
where
  earlier, RequestBoundary.request (body, path: "/tables/send", requestId, session, table)
then
  RequestBoundary.respond (message, requestId)
```

### table.talking.WriteNotes

Authored path: `table.talking.WriteNotes`.
- Covered by [The table](../design/compositions/table.md), line 51.
- Covered by [The table](../design/compositions/table.md), line 55.

```reaction
when RequestBoundary.request (body, path: "/tables/notes", requestId, session, table)
then
  Sessioning.use (session)
```

### table.talking.WriteNotes:not-seated#2

Authored path: `table.talking.WriteNotes`.
- Covered by [The table](../design/compositions/table.md), line 51.
- Covered by [The table](../design/compositions/table.md), line 55.

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
- Covered by [The table](../design/compositions/table.md), line 51.
- Covered by [The table](../design/compositions/table.md), line 55.

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
- Covered by [The table](../design/compositions/table.md), line 51.
- Covered by [The table](../design/compositions/table.md), line 55.

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
- `/counterpart/table` — requires `prompt`, `session`
- `/practice/start` — requires `role`, `scenario`, `session`, `timeLimit`
- `/tables/accept` — requires `proposal`, `session`, `table`
- `/tables/begin` — requires `session`, `table`
- `/tables/debrief` — requires `session`, `table`
- `/tables/expire` — requires `session`, `table`
- `/tables/notes` — requires `body`, `session`, `table`
- `/tables/propose` — requires `session`, `table`, `terms`
- `/tables/reject` — requires `proposal`, `session`, `table`
- `/tables/retract` — requires `proposal`, `session`, `table`
- `/tables/send` — requires `body`, `session`, `table`
- `/tables/show` — requires `session`, `table`
- `/tables/withdraw` — requires `session`, `table`
