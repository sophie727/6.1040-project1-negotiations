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

