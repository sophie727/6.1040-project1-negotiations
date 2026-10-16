# Practice

The bakery is where a person picks something to negotiate. A practice table seats them in the role they choose, and the counterpart, an AI player, in the other.

## Choosing a scenario

The [bakery endpoint](reaction:practice.choosing.ShowBakery) responds with two lists. The first is [the published scenarios](former:practice.choosing.scenarios), by name, each with the time limit its author recommends and its roles. The second is [the tables the person has a seat at](former:practice.choosing.tablesOf), most recently opened first, each with its scenario, the person's role, and its status, so the person can go back to a negotiation or its debrief.

```endpoints
practice.choosing.ShowBakery at /bakery
```

## Starting a practice table

The [start endpoint](reaction:practice.starting.StartPractice) takes a scenario, one of its roles, and a time limit in minutes. The page fills in the recommended time limit, and the person can change it. The endpoint opens a table in Tabling with that time limit, and Tabling refuses one that isn't a whole number from 1 to 180 with `INVALID_TIME_LIMIT`. A reaction in [the table](table.md#seating) adds an empty seat for each of the scenario's roles. The endpoint waits until the flow has settled, so those seats exist, and then seats the person in their role and the counterpart, the player `bot:counterpart`, in every other one. Once both seats have joined the table's proposals, it responds with the table. The table is `PREPARING`: its clock doesn't run until the person begins, so they can read their brief first.

Only [a role of a published scenario can be practiced](view:practice.starting.playable). [A second endpoint at the same path](reaction:practice.starting.RefuseUnplayable) refuses anything else with `NOT_FOUND`, such as a role of another scenario, or a scenario its author hasn't published. It needs no session, since anyone can see which scenarios are published.

```endpoints
practice.starting.StartPractice at /practice/start
practice.starting.RefuseUnplayable at /practice/start
```

Tabling lets a player take only one seat at a table, so at a scenario with three roles, the counterpart's second seat would be refused with `ALREADY_SEATED`, and so would the request. Every built-in scenario has two roles; practicing a larger one will need more than one counterpart.
