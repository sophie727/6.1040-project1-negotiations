# The Whole Pie types

Every person in The Whole Pie is a Registering user, who signs in with a password through Authenticating and stays signed in through Sessioning. People write scenarios in Briefing, and negotiate them at tables in Tabling.

A seat at a table belongs to a player: either a person, or one of the AI counterparts. The counterparts are a fixed set of bots, each with its own persona, named like `bot:obstinate`; the agent process that plays them keeps their persona prompts, so a bot's name is all a table needs to record.

Everything said and offered at a table is said and offered by a role, not by a player, so the AI counterpart needs no account: its messages in Conversing and its proposals in Proposing come from the role it plays. A proposal offers a term sheet, which Proposing keeps without reading, and which Briefing scores. Each person keeps their own notes about each table in Noting.

The agent signs in to its own instance of Sessioning, AgentSessioning, under a name such as `counterpart`, and it is the reasoner that Reasoning records for its answers. For now, every question to the agent is about a table: what the counterpart says next, whether it accepts a proposal, and the debrief. Once people can write scenarios in the app, generating their briefs will need questions about scenarios and roles too.

```types
concrete Player
  Whoever sits at a negotiation table: a person's Registering user, or the name of an AI counterpart, such as `bot:obstinate`.

concrete TermSheet
  One agreed universal value for each issue of a scenario, in the form Briefing reads.

concrete Agent
  The name of an agent process, such as `counterpart`.
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

instantiate Noting with
  Author is Registering.User
  Subject is Tabling.Table

instantiate Reasoning with
  Subject is Tabling.Table
  Reasoner is Agent
```
