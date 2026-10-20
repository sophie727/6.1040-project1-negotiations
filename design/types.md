# The Whole Pie types

Every person in The Whole Pie is a Registering user, who signs in with a password through Authenticating and stays signed in through Sessioning. People write scenarios in Briefing, and negotiate them at tables in Tabling.

A seat at a table belongs to a player: either a person, or one of the AI counterparts. The counterparts are a fixed set of bots, each with its own persona, named like `bot:obstinate`; the agent process that plays them keeps their persona prompts, so a bot's name is all a table needs to record.

Everything said and offered at a table is said and offered by a role, not by a player, so the AI counterpart needs no account: its messages in Conversing and its proposals in Proposing come from the role it plays. A proposal offers a term sheet, which Proposing keeps without reading, and which Briefing scores. Each person keeps their own notes about each table in Noting.

Before a negotiation begins, the roles at its table agree on how long it lasts, and they do it the way they agree on a deal: someone proposes a time limit, and it holds once everyone else accepts it. So a second instance of Proposing, TimeLimitProposing, keeps those proposals, whose terms are a time limit in minutes. Its proposals can say nothing but a number, so the negotiators can't start negotiating before the clock runs.

A person can negotiate against the AI counterpart, or against other people. To bring friends to a table, they share a link from Inviting, whose code is the only way in: a table's own address can be guessed, and only people with a seat can see a table at all. How many people the link lets in is up to the table's empty seats in Tabling. To negotiate with someone new instead, a person looks for others in Matchmaking: its pools are scenarios, a group is as large as its scenario has roles, and each group meets at a table opened for it.

Negotiating with other people is rated, as on chess.com, and negotiating with the AI counterpart never is. P1's three ratings come from two concepts, because they have different sources: Rating keeps how much value each negotiation created and how much of it each person claimed, recorded when the negotiation ends, and Reviewing keeps how the people at a table say it was to deal with each other, written afterwards, if at all.

Someone who wants to prepare deliberately turns on prep sheets in Preparing, and then writes a plan for each negotiation, their target, walkaway, and priorities, before they can start it.

Two agents answer questions: the counterpart, which plays the other side, and the coach, which writes the debrief. A third agent, the timekeeper, answers none: every half minute, it asks the app to expire the tables whose time is up, which matters once people negotiate each other and may both close the page. Each signs in to its own instance of Sessioning, AgentSessioning, under its name, `counterpart`, `coach`, or `timekeeper`, and the first two are the reasoners that Reasoning records for their answers. For now, every question to an agent is about a table: what the counterpart says next, whether it accepts a proposal, and the debrief. Once people can write scenarios in the app, generating their briefs will need questions about scenarios and roles too.

```types
concrete Player
  Whoever sits at a negotiation table: a person's Registering user, or the name of an AI counterpart, such as `bot:obstinate`.

concrete TermSheet
  One agreed universal value for each issue of a scenario, in the form Briefing reads.

concrete TimeLimit
  How long a negotiation lasts, in whole minutes from 1 to 180.

concrete Agent
  The name of an agent, `counterpart`, `coach`, or `timekeeper`.
```

```instances
instantiate Registering

instantiate Authenticating with
  User is Registering.User

instantiate Sessioning with
  Subject is Registering.User

instantiate Sessioning as AgentSessioning with
  Subject is Agent

instantiate Briefing with
  Author is Registering.User

instantiate Tabling with
  Scenario is Briefing.Scenario
  Role is Briefing.Role
  Negotiator is Player

instantiate Conversing with
  Subject is Tabling.Table
  Speaker is Briefing.Role

instantiate Proposing with
  Subject is Tabling.Table
  Party is Briefing.Role
  Terms is TermSheet

instantiate Proposing as TimeLimitProposing with
  Subject is Tabling.Table
  Party is Briefing.Role
  Terms is TimeLimit

instantiate Noting with
  Author is Registering.User
  Subject is Tabling.Table

instantiate Reasoning with
  Subject is Tabling.Table
  Reasoner is Agent

instantiate Inviting with
  Subject is Tabling.Table
  Person is Registering.User

instantiate Matchmaking with
  Seeker is Registering.User
  Pool is Briefing.Scenario
  Place is Tabling.Table

instantiate Reviewing with
  Subject is Tabling.Table
  Person is Registering.User

instantiate Rating with
  Person is Registering.User
  Subject is Tabling.Table

instantiate Preparing with
  Author is Registering.User
  Subject is Tabling.Table
```
