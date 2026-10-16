# The counterpart

At a practice table, the person negotiates against the counterpart: the player `bot:counterpart`, who takes every seat the person doesn't. As in conceptbox, the counterpart is an agent. Reactions here ask it questions with `Reasoning.prompt`, the agent answers through [the answering endpoints](reusable/answering.md), and reactions here apply its concluded answers. No reaction calls a model, and the agent changes nothing at the table directly; the reactions here decide what each answer does.

For now, the agent in `src/agents/counterpart.ts` answers with a stand-in: canned replies, and an answer to each proposal that accepts it exactly when it is worth at least the counterpart's BATNA. In the next step of the plan, a language model takes the stand-in's place, and nothing here changes.

## Asking

[The role the counterpart plays at a table](view:counterpart.asking.counterpartRole) is the seat Tabling gives to `bot:counterpart`. When the negotiation begins, a reaction [asks the counterpart to speak first](reaction:counterpart.asking.GreetWhenBegun). When someone else sends a message, a reaction [asks it to reply](reaction:counterpart.asking.AskForReply), and when someone else proposes, a reaction [asks whether it accepts](reaction:counterpart.asking.AskForDecision). Neither asks while a question of the same kind [is waiting](view:counterpart.asking.hasWaitingQuestion) for the agent to take it. The agent reads the whole table when it takes a question, so one waiting question covers every message or proposal that came before it. A question the agent is already answering doesn't count, so a message that arrives while the counterpart is writing still gets its own reply. The counterpart's own messages and proposals ask nothing, so it never answers itself.

## Reading

The [read endpoint](reaction:counterpart.reading.ReadTable) starts with `AgentSessioning.use`, so a person's session is refused. It responds with [the table as the counterpart's role sees it](table.md#showing-the-table): its own brief and BATNA, the conversation, and each proposal with its worth to the counterpart, which is exactly what a person would see from that seat. It answers only for a prompt the agent took, matched through `Reasoning._taken`, so the agent can't read any other table. A prompt the agent didn't take is refused with `NOT_TAKEN`, and a table without a counterpart with `NOT_SEATED`. When the table is no longer open, the agent abandons the question with the reason "The negotiation is over."

```endpoints
counterpart.reading.ReadTable at /counterpart/table
```

## Answering

When the agent concludes a reply, a reaction [sends it as the counterpart's next message](reaction:counterpart.answering.SendReply), as long as the negotiation is still under way.

The answer to a proposal has three lines: ACCEPT or REJECT, the proposal it answers, and what the counterpart says about it. The agent writes the proposal from the table it read, so each decision applies only to the proposal it was about. If the person replaced that proposal in the meantime, the old decision finds it no longer pending and does nothing, and the question the new proposal asked answers the new one.

A reaction [accepts the proposal](reaction:counterpart.answering.AcceptForCounterpart) when the answer accepts it, it is still pending, and `Briefing._dealPayoff` says it is worth at least the counterpart's BATNA. Another reaction [rejects it](reaction:counterpart.answering.RejectForCounterpart) when the answer rejects it (the `decided` path), and also when the answer accepts a proposal worth less than the BATNA (the `below-batna` path). So the counterpart never agrees to less than its alternative, whatever a model writes, and the person's offer is never left without an answer. The third line [becomes the counterpart's next message](reaction:counterpart.answering.SayWhy), so the person reads why.
