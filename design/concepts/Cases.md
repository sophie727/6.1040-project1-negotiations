# Cases

## Purpose

A negotiation case consists of the scenario for a negotiation roleplay, complete with each role's payoffs and confidential briefings.

## Principle

An author presents the issues under discussion and the options available on each issue (and the corresponding universal value of each option; the "universal" value is a number that objectively represents this option, regardless of perspective. e.g. two people might value salary differently, but regardless of how much they value a salary of $100K, the number 100K is still a number that objectively represents this option). Additionally, a case must include the knowledge that each person has about the situation, including the payoffs of each option and the BATNA (the walkaway value which the deal should exceed in order for this role to agree to the deal), producing a case that multiple parties can negotiate.

## Types

```types
external Author
  The person who created this case.
```

## State

```state
  a set of Cases with
    an author Author
    a caseName String
    a set of Issues with
      a name String
      a set of Options with
        an optionName String
        a  universalValue Number
    a set of Roles with
      a label String
      a PayoffSheet set of IssueWeightings with
        an Issue
        a set of optionWeights with
          an Option
          an optionWeight Number
      a BATNA Number
      a confidentialBrief String
```

## Actions

```actions
  defineCase (author: Author, caseName: String, a set of Issues, a set of Roles) : (case: Case)
    where no author has created a case with that name.
    then create a case matching the above inputs.
```

## Queries

```queries
  _getCase (caseName: String) : (case: Case)
    where a case with this caseName exists,
    then return that case.

  _getBrief (case: Case, role: Role) : (confidential: String)
    where role in case.roles and case exists,
    then return the confidentialBrief for that role.

  _getPayoff (case: Case, role: Role, termSheet: TermSheet) : (payoff: Number)
    where role in case.roles, case exists, and the options chosen for the issues addressed in TermSheet are the same options and issues as exist in this case's set of Issues
    then return the payoff for that role in this case given this TermSheet
```
