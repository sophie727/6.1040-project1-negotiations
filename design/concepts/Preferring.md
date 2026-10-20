# Preferring

## Purpose

Let each person turn the app's optional features on or off for themselves, and keep their choices from one visit to the next, so the app works the way each of them wants.

_Prevents:_ a feature someone turned off comes back on; one person's choice changes how the app works for someone else.

## Principle

Nadia turns on prep sheets, so from then on she writes a plan before each negotiation. Omar never turns them on, so he never has to. When Nadia turns them off again, she stops, and turning them off a second time changes nothing.

## Types

```types
external Person
  Who chooses how the app works for them.
```

## State

```state
a set of Preferences with
  a Person
  a feature String
  unique person and feature

Rule: a person has a preference for a feature exactly while they have it turned on, so every feature is off until they turn it on.
```

## Actions

```actions
turnOn(person: Person, feature: String) : returns ()
  where true
  then
    add a preference for person and feature, if they don't have one
    returns

turnOff(person: Person, feature: String) : returns ()
  where true
  then
    remove person's preference for feature, if they have one
    returns
```

## Queries

```queries
_on(person: Person, feature: String) : one (on: Flag)
  Returns true when the person has turned the feature on, and false otherwise.
```
