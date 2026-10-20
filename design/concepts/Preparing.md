# Preparing

## Purpose

Help people who choose to prepare deliberately: before something starts, they write down what they aim for, the least they would accept, and what matters most to them, so they go in with a plan and can compare how it went with the plan afterwards.

_Prevents:_ someone who chose to plan starts without a complete plan; one person ends up with two plans for one thing.

## Principle

Nadia turns on prep sheets. Before her negotiation of The Job Offer, she writes her target, "$115K and a January start", and her walkaway, "anything worth at least my 1,000-point BATNA". Her plan isn't complete until she adds her priorities, "salary, then title". Then she starts, and her plan is there to look back on. Rewriting her target replaces it, so she still has one plan. Omar hasn't turned prep sheets on, so he has nothing to complete. When Nadia turns them off, she has nothing to complete either.

## Types

```types
external Author
  Who prepares, and writes a plan.

external Subject
  What a plan is for, such as a negotiation.
```

## State

```state
a set of Planner Authors

a set of Plans with
  an Author
  a Subject
  a target String
  a walkaway String
  a priorities String
  unique author and subject

Rule: every part of a plan has at most 2,000 characters.
```

## Actions

```actions
turnOn(author: Author) : returns ()
  where true
  then
    add author to Planner Authors, if they aren't one already
    returns

turnOff(author: Author) : returns ()
  where true
  then
    remove author from Planner Authors, if they are one
    returns

plan(author: Author, subject: Subject, target: String, walkaway: String, priorities: String) : returns (plan: Plan)
  where target, walkaway, or priorities has more than 2000 characters
  then
    refuses TOO_LONG "Each part of a plan can have at most 2,000 characters."
  where every part has at most 2000 characters and author has a plan for subject
  then
    replace that plan's target, walkaway, and priorities
    returns plan
  where every part has at most 2000 characters and author has no plan for subject
  then
    add a new plan with author, subject, target, walkaway, and priorities
    returns plan
```

## Queries

```queries
_planner(author: Author) : one (on: Flag)
  Returns true when the author has turned prep sheets on, and false otherwise.

_plan(author: Author, subject: Subject) : optional (target: String, walkaway: String, priorities: String)
  Returns the author's plan for the subject, or no row when they haven't written one.

_complete(author: Author, subject: Subject) : one (complete: Flag)
  Returns true when the author has a plan for the subject whose target, walkaway, and priorities are none of them blank, and false otherwise.
```
