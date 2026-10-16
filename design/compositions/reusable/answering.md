# Answering questions

Reactions call `Reasoning.prompt`, and an agent answers each prompt. The agent is an actor, like a person: it signs in to its own session from the server, and then changes state only by calling the endpoints below. These endpoints use only Reasoning and AgentSessioning, a second instance of Sessioning, so they are the same as in conceptbox, and so is `src/agents/reusable/agent.ts`, which calls them.

The rest is in [the counterpart](../counterpart.md): the reactions that call `Reasoning.prompt`, the endpoint that returns what the agent may read about a prompt's table, and the reactions that apply a concluded answer.

## A question, from asking to answer

1. A reaction calls `Reasoning.prompt`, and the prompt is waiting.
2. The agent takes the prompt, and the prompt is forming.
3. The agent reads the table through the counterpart's read endpoint, and calls extend once for each piece of the answer as it writes it.
4. The agent concludes the prompt, and reactions in the counterpart composition apply the answer. If the agent can't finish, it abandons the prompt with a reason a person can read.

Apart from signing in, the agent calls only these endpoints and the read endpoint, so it changes nothing but Reasoning.

## Who the agent is

The agent is named `counterpart`. It signs in from the server, by calling `AgentSessioning.start` with its name, and signs in again when a call is refused with `NOT_SIGNED_IN`. No endpoint starts an agent session, so nobody can sign in as an agent over HTTP. Every endpoint below starts with `AgentSessioning.use`, so a person's session is refused there, and an agent's session is refused by `Sessioning.use` at every person's endpoint. The agent's name is also the reasoner that Reasoning records for each answer.

## Finding work

[The open endpoint](reaction:reusable.answering.finding.ShowOpen) returns [the waiting prompts](former:reusable.answering.finding.waitingPrompts) with what each one asks, and [the prompts this agent took and hasn't finished](former:reusable.answering.finding.promptsTakenBy).

```endpoints
reusable.answering.finding.ShowOpen at /answers/open
```

The agent looks for work when it starts and after each successful `Reasoning.prompt`. The server passes the engine an observer that wakes the agent after that action. The observer passes no data, and the agent reads the prompts through the open endpoint. The agent takes only prompts whose question is one of its own, answers at most four at once, and looks for work again each time it finishes one. When nothing wakes it, it looks again after ten seconds, which also retries after a failed call.

Each time it looks, the agent first abandons every prompt it took and isn't answering, with the reason "The agent stopped before the answer finished." Such a prompt is left behind when the server restarts in the middle of an answer, or when an abandon fails. Run each agent in one server process only, because a second process with the same name would abandon the first one's prompts.

## Writing an answer

[Take](reaction:reusable.answering.writing.Take), [extend](reaction:reusable.answering.writing.Extend), and [conclude](reaction:reusable.answering.writing.Conclude) call the Reasoning actions of the same names, with the agent as the reasoner. `Reasoning.take` is refused with `ALREADY_TAKEN` or `CLOSED` for a prompt that was already taken or finished, and `extend` and `conclude` are refused with `NOT_YOURS` for a prompt another agent took. [Abandon](reaction:reusable.answering.abandoning.Abandon) abandons a prompt only when this agent took it, and is refused with `NOT_TAKEN` otherwise. `Reasoning.abandon` itself takes no reasoner, so a reaction can call it.

```endpoints
reusable.answering.writing.Take at /answers/take
reusable.answering.writing.Extend at /answers/extend
reusable.answering.writing.Conclude at /answers/conclude
reusable.answering.abandoning.Abandon at /answers/abandon
```

_Adapted from [conceptbox](https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng._
