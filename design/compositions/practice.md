# Practice

The bakery is where a person picks something to negotiate. A practice table seats them in the role they choose, and the counterpart, an AI player, in every other.

## Choosing a scenario

The [bakery endpoint](reaction:practice.choosing.ShowBakery) responds with the person's [ratings](ratings.md#showing-ratings), and two lists. The first is [the scenarios in the bakery](former:practice.choosing.scenarios): the ones [in the bakery](view:practice.choosing.inBakery), which their authors posted and haven't [archived](authoring.md#archiving), in the order they were posted, each with the time limit its author recommends, its roles with their summaries, so a person can tell who each side is before choosing one, and [how spicy it is](#how-spicy-a-scenario-is). The second is [the tables the person has a seat at](former:practice.choosing.tablesOf), most recently opened first, each with its scenario, the person's role, its status, and the usernames of the other people at it, so the person can go back to a negotiation or its debrief.

```endpoints
practice.choosing.ShowBakery at /bakery
```

## How spicy a scenario is

Each scenario in the bakery shows [how spicy it is](view:practice.choosing.spiceOf), from mild to hot, so a person can choose how hard a negotiation they want. Spiciness measures how much room there is to agree: how much the scenario's whole pie adds to what its roles get together by walking away, their joint BATNA, as a share of that joint BATNA. The less a deal can add, the harder it is to find one that every side prefers to walking away, and the hotter the scenario is. A scenario where no deal is possible is hot too, so the bakery doesn't give away that walking away is right.

It counts points, not term sheets. The share of term sheets that every side would accept depends on options nobody would agree to: raising the top of an issue's range past any deal the sides would take would make a scenario look harder, though nothing about negotiating it changed. Such options change neither the whole pie nor the BATNAs, so they don't change the spiciness either. Only a pie that grows or shrinks, or BATNAs that move, do. Since it's a share, it doesn't depend on how many points an author hands out.

The Job Offer's whole pie is worth 2,200 points, and Hiro and Manon get 2,000 together by walking away, so a deal can add 10%, and The Job Offer is hot.

Only the level leaves the server. The whole pie's points, or the joint BATNA, would tell each side something about the others' BATNAs, which their briefs keep secret.

```computations
spiceLevel(jointPoints?: Number, jointBatna: Number) : Number
  Rates how hard a scenario is to settle, from 1 (mild) to 3 (hot), by the share of the joint BATNA that the whole pie adds to it: 1 for at least 40%, 2 for at least 15%, and 3 for less, or when there's no whole pie because no deal is possible. When the joint BATNA is zero or less, a whole pie worth more than it is 1, and any other is 3.
```

## Starting a practice table

The [start endpoint](reaction:practice.starting.StartPractice) takes a scenario and one of its roles. The endpoint opens a table in Tabling, and a reaction in [the table](table.md#seating) adds an empty seat for each of the scenario's roles. The endpoint waits until the flow has settled, so those seats exist, and then seats the person in their role and [the counterpart](counterpart.md), the player `bot:counterpart`, in another, whichever Tabling gives it. At a scenario with more than two roles, such as The Launch Room, seats are still empty then, so when the counterpart sits down, a reaction [seats another counterpart in each of them](reaction:practice.starting.SeatMoreCounterparts). Tabling seats each player only once at a table, so each of these is a player of its own, [named for the role it plays](computation:counterpartFor). The reaction follows only the seat `bot:counterpart` takes, not the ones it fills, so it seats each counterpart once, and nothing it asks for is refused. Once every seat has joined the table's proposals, the endpoint responds with the table. The table is `PREPARING`: its clock doesn't run until the person [suggests how long to negotiate](table.md#starting), which every counterpart agrees to at once, so they can read their brief first.

```computations
counterpartFor(role: String) : String
  Names the AI counterpart that plays a role at a practice table beside `bot:counterpart`: `bot:counterpart:` followed by the role.
```

Only [a role of a scenario in the bakery can be practiced](view:practice.starting.playable): one that is posted and not archived. [A second endpoint at the same path](reaction:practice.starting.RefuseUnplayable) refuses anything else with `NOT_FOUND`, such as a role of another scenario, a scenario its author hasn't posted, or one its author archived. It needs no session, since anyone can see which scenarios are in the bakery.

```endpoints
practice.starting.StartPractice at /practice/start
practice.starting.RefuseUnplayable at /practice/start
```
