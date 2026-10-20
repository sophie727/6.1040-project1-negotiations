# Rating

## Purpose

Keep each person's results from every rated negotiation, how much of the value a deal could add it created, and how much of what it created they claimed, so that their skill shows as averages over time.

_Prevents:_ one negotiation counts twice for someone; a result is scored differently from one person to the next.

## Principle

In Nadia's first rated negotiation, she and Omar reach the best deal possible: it is worth 2,200 points to the two of them together, where walking away was worth 2,000, so it created all 200 points a deal could add. Nadia gets 1,100 points, 100 more than her BATNA, so she claimed half of what it created. In her second, the deal adds 120 of a possible 200 points, so it created 60%, and she claimed 84 of those 120 points, 70%. Her ratings are now: create 80% and claim 60%, over 2 negotiations. In her third, time runs out: no deal creates nothing, and leaves nothing to claim, so her create rating falls to about 53%, and her claim rating stays at 60%. Recording her first negotiation again is refused.

## Types

```types
external Person
  Who negotiated.

external Subject
  The negotiation a result is from.
```

## State

```state
a set of Results with
  a Person
  a Subject
  an optional claim Number
  an optional create Number
  a recordedAt DateTime
  unique person and subject

Rule: create is the share of what the best deal possible could add over everyone's BATNAs that the deal added, and is missing when no deal could add anything.
Rule: claim is the share of what the deal added over everyone's BATNAs that went to the person, and is missing when the deal added nothing.
```

## Actions

```actions
record(person: Person, subject: Subject, points: Number, batna: Number, jointPoints: Number, jointBatna: Number, bestJointPoints?: Number, now: DateTime) : returns ()
  where person already has a result for subject
  then
    refuses ALREADY_RECORDED "This negotiation already counts for them."
  where person has no result for subject
  then
    add a result for person and subject, recorded now, whose create is jointPoints minus jointBatna over bestJointPoints minus jointBatna, when bestJointPoints is given and above jointBatna, and whose claim is points minus batna over jointPoints minus jointBatna, when jointPoints is above jointBatna
    returns
```

## Queries

```queries
_ratings(person: Person) : one (claim?: Number, create?: Number, negotiations: Number)
  Returns the average of the person's claim results and of their create results, each over the results that have one, and how many negotiations count for them, or no averages and 0 negotiations when none do.

_results(person: Person) : many (subject: Subject, claim?: Number, create?: Number, recordedAt: DateTime)
  Returns every result of the person's, or no rows when they have none.
  Orders rows by when each was recorded, oldest first.
```
