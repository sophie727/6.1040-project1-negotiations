# Briefing

## Purpose

Give each side of a negotiation scenario a confidential brief that says what every possible agreement is worth to them and when they should walk away, so that any agreement can be scored for each side and compared with the most valuable one possible.

_Prevents:_ an agreement is scored for a scenario that is missing an issue, a payoff, or a brief; an agreement is scored on a value its issue doesn't allow; a payoff outlives the option or role it was for.

## Principle

Through Briefing, an author defines a specific scenario and sets the payoffs that negotiators can derive from it.

Sophie writes the scenario "The Job Offer". She then adds the issues that make up this scenario, including

- Salary, which is a continuous issue: its options $80K and $120K have the universal values 80000 and 120000, numbers that mean the same thing to every role, so negotiators are also able to agree on any salary in between, such as 100000.
- Health Insurance, a discrete issue: the options are Not included, Half Coverage, and Full Coverage. Only those three can be agreed on, so they need no universal values.

She then adds two roles:

- Hiro, the candidate, whose payoffs give $80K 0 points and $120K 600 points. For Health Insurance, Not included gets 0 points, Half Coverage 150 points, and Full Coverage 300 points. His BATNA is 1,000 points. A role's BATNA, the Best Alternative To A Negotiated Agreement, is what that role would get if no deal is reached, so Hiro should turn down any agreement worth less than 1,000 points to him.
- Manon, the employer, with payoffs and a BATNA of her own. She also gives Manon a brief--that is, a confidential description of Hiro's situation and priorities.

Each role can also have a summary, which, unlike the brief, everyone may read before choosing a side: Hiro's says he has been offered a job at Fernwood Analytics and is meeting Manon to settle its terms.

While she writes, Sophie changes her mind. She first called the bonus issue "Signing bonus", and renames it "Bonus". She added a fourth title, "Intern", and removes it, along with the points each role had for it. She first made the position title a continuous issue, and changing it to discrete removes the options it had, since an option of a range has a universal value that a discrete option can't have. She raises Manon's BATNA, and she could rename the scenario, remove a role, or discard the whole scenario.

Briefing won't score a deal yet, because Hiro doesn't have a brief: a scenario is complete only when it has an issue, at least two options for each issue, and at least two roles, each with a brief and payoffs for all options. Once she gives Hiro a brief, the scenario is complete, and Briefing scores and compares deals. In particular, Briefing can now score any term sheet for this scenario. A term sheet with a salary of 100000 and health insurance Full Coverage is worth 600 points to Hiro: 300 for salary, halfway between 0 and 600, and 300 for insurance. A term sheet can't agree on anything between Half Coverage and Full Coverage, because health insurance is discrete. Finally, Briefing finds the whole pie: a term sheet with the most points for Hiro and Manon together that satisfies both BATNAs, showing what the "best" agreement might be.

## Types

```types
external Author
  The person who writes a scenario.

IssueKind is CONTINUOUS or DISCRETE
  Whether negotiators may agree on any value between an issue's lowest and highest options, or only on one of its options.

opaque TermSheet
  What was agreed on each issue of a scenario: one of its options on a discrete issue, or a universal value from its lowest to its highest option on a continuous issue. The implementer chooses how to represent it.
```

## State

```state
a set of Scenarios with
  an Author
  a unique name String

a seq of Issues with
  a Scenario
  a name String
  a kind IssueKind
  an optional unit String
  unique scenario and name

a seq of Options with
  an Issue
  a name String
  an optional universalValue Number
  unique issue and name

a seq of Roles with
  a Scenario
  a name String
  a batna Number
  an optional brief String
  an optional summary String
  unique scenario and name

a set of Payoffs with
  a Role
  an Option
  a points Number
  unique role and option

Rule: every name, unit, and summary is trimmed (spaces at the start/end removed) before being stored, measured, and compared.
Rule: only a continuous issue has a unit.
Rule: an option has a universalValue exactly when its issue is continuous, and no two options of one issue share a universalValue.
Rule: a payoff's role and option belong to the same scenario, and a payoff goes when its role or option does.
```

## Actions

```actions
create(author: Author, name: String) : returns (scenario: Scenario)
  where name is blank or longer than 100 characters
  then
    refuses INVALID_SCENARIO_NAME "A scenario name must have 1 to 100 characters."
  where name is accepted and a scenario already has that name
  then
    refuses NAME_TAKEN "A scenario with that name already exists."
  where name is accepted and no scenario has that name
  then
    add a new scenario with author and name
    returns scenario

addIssue(scenario: Scenario, name: String, kind: IssueKind, unit?: String) : returns (issue: Issue)
  where scenario is not in Scenarios
  then
    refuses UNKNOWN_SCENARIO "There is no such scenario."
  where scenario is in Scenarios and name is blank or longer than 100 characters
  then
    refuses INVALID_ISSUE_NAME "An issue name must have 1 to 100 characters."
  where scenario is in Scenarios, name is accepted, and scenario has an issue with that name
  then
    refuses ISSUE_EXISTS "This scenario already has an issue with that name."
  where scenario is in Scenarios, name is accepted, scenario has no issue with that name, kind is DISCRETE, and a unit that isn't blank is given
  then
    refuses UNIT_NOT_ALLOWED "Only a continuous issue has a unit."
  where scenario is in Scenarios, name is accepted, scenario has no issue with that name, and kind is CONTINUOUS or no unit that isn't blank is given
  then
    append a new issue with scenario, name, kind, and unit, leaving out a blank unit
    returns issue

addOption(issue: Issue, name: String, universalValue?: Number) : returns (option: Option)
  where issue is not in Issues
  then
    refuses UNKNOWN_ISSUE "There is no such issue."
  where issue is in Issues and name is blank or longer than 100 characters
  then
    refuses INVALID_OPTION_NAME "An option name must have 1 to 100 characters."
  where issue is in Issues, name is accepted, and issue has an option with that name
  then
    refuses OPTION_EXISTS "This issue already has an option with that name."
  where issue is in Issues, name is accepted, issue has no option with that name, issue is continuous, and no universalValue is given
  then
    refuses VALUE_REQUIRED "An option of a continuous issue needs a universal value."
  where issue is in Issues, name is accepted, issue has no option with that name, issue is discrete, and a universalValue is given
  then
    refuses VALUE_NOT_ALLOWED "An option of a discrete issue has no universal value."
  where issue is in Issues, name is accepted, issue has no option with that name, issue is continuous, a universalValue is given, and issue has an option at that universalValue
  then
    refuses VALUE_TAKEN "This issue already has an option at that universal value."
  where issue is in Issues, name is accepted, issue has no option with that name, and either issue is discrete and no universalValue is given, or issue is continuous and has no option at the given universalValue
  then
    append a new option with issue, name, and universalValue if given
    returns option

addRole(scenario: Scenario, name: String, batna: Number) : returns (role: Role)
  where scenario is not in Scenarios
  then
    refuses UNKNOWN_SCENARIO "There is no such scenario."
  where scenario is in Scenarios and name is blank or longer than 100 characters
  then
    refuses INVALID_ROLE_NAME "A role name must have 1 to 100 characters."
  where scenario is in Scenarios, name is accepted, and scenario has a role with that name
  then
    refuses ROLE_EXISTS "This scenario already has a role with that name."
  where scenario is in Scenarios, name is accepted, and scenario has no role with that name
  then
    append a new role with scenario, name, and batna
    returns role

setPayoff(role: Role, option: Option, points: Number) : returns ()
  where role is not in Roles or option is not in Options
  then
    refuses UNKNOWN_ROLE_OR_OPTION "There is no such role or option."
  where role and option belong to different scenarios
  then
    refuses DIFFERENT_SCENARIOS "The role and the option belong to different scenarios."
  where role and option belong to the same scenario
  then
    set the points of the payoff with role and option, adding that payoff if there is none
    returns

setBrief(role: Role, brief: String) : returns ()
  where role is not in Roles
  then
    refuses UNKNOWN_ROLE "There is no such role."
  where role is in Roles and brief is blank or longer than 20000 characters
  then
    refuses INVALID_BRIEF "A brief must have 1 to 20,000 characters."
  where role is in Roles and brief is accepted
  then
    set the role's brief to brief
    returns

describeRole(role: Role, summary: String) : returns ()
  where role is not in Roles
  then
    refuses UNKNOWN_ROLE "There is no such role."
  where role is in Roles and summary is longer than 300 characters
  then
    refuses INVALID_SUMMARY "A role's summary must have at most 300 characters."
  where role is in Roles and summary is blank
  then
    remove the role's summary
    returns
  where role is in Roles and summary is accepted
  then
    set the role's summary to summary
    returns

rename(scenario: Scenario, name: String) : returns ()
  where scenario is not in Scenarios
  then
    refuses UNKNOWN_SCENARIO "There is no such scenario."
  where scenario is in Scenarios and name is blank or longer than 100 characters
  then
    refuses INVALID_SCENARIO_NAME "A scenario name must have 1 to 100 characters."
  where scenario is in Scenarios, name is accepted, and another scenario has that name
  then
    refuses NAME_TAKEN "A scenario with that name already exists."
  where scenario is in Scenarios, name is accepted, and no other scenario has that name
  then
    set the scenario's name to name
    returns

discard(scenario: Scenario) : returns ()
  where scenario is not in Scenarios
  then
    refuses UNKNOWN_SCENARIO "There is no such scenario."
  where scenario is in Scenarios
  then
    remove the scenario, with its issues, their options, its roles, and their payoffs
    returns

updateIssue(issue: Issue, name: String, kind: IssueKind, unit?: String) : returns ()
  where issue is not in Issues
  then
    refuses UNKNOWN_ISSUE "There is no such issue."
  where issue is in Issues and name is blank or longer than 100 characters
  then
    refuses INVALID_ISSUE_NAME "An issue name must have 1 to 100 characters."
  where issue is in Issues, name is accepted, and another issue of the scenario has that name
  then
    refuses ISSUE_EXISTS "This scenario already has an issue with that name."
  where issue is in Issues, name is accepted, no other issue of the scenario has that name, kind is DISCRETE, and a unit that isn't blank is given
  then
    refuses UNIT_NOT_ALLOWED "Only a continuous issue has a unit."
  where issue is in Issues, name is accepted, no other issue of the scenario has that name, and kind is CONTINUOUS or no unit that isn't blank is given
  then
    set the issue's name, kind, and unit, leaving out a blank unit
    when kind is not the issue's kind before, remove the issue's options and their payoffs
    returns

removeIssue(issue: Issue) : returns ()
  where issue is not in Issues
  then
    refuses UNKNOWN_ISSUE "There is no such issue."
  where issue is in Issues
  then
    remove the issue, its options, and their payoffs
    returns

updateOption(option: Option, name: String, universalValue?: Number) : returns ()
  where option is not in Options
  then
    refuses UNKNOWN_OPTION "There is no such option."
  where option is in Options and name is blank or longer than 100 characters
  then
    refuses INVALID_OPTION_NAME "An option name must have 1 to 100 characters."
  where option is in Options, name is accepted, and another option of its issue has that name
  then
    refuses OPTION_EXISTS "This issue already has an option with that name."
  where option is in Options, name is accepted, no other option of its issue has that name, its issue is continuous, and no universalValue is given
  then
    refuses VALUE_REQUIRED "An option of a continuous issue needs a universal value."
  where option is in Options, name is accepted, no other option of its issue has that name, its issue is discrete, and a universalValue is given
  then
    refuses VALUE_NOT_ALLOWED "An option of a discrete issue has no universal value."
  where option is in Options, name is accepted, no other option of its issue has that name, its issue is continuous, a universalValue is given, and another option of its issue is at that universalValue
  then
    refuses VALUE_TAKEN "This issue already has an option at that universal value."
  where option is in Options, name is accepted, no other option of its issue has that name, and either its issue is discrete and no universalValue is given, or its issue is continuous and no other option of it is at the given universalValue
  then
    set the option's name, and its universalValue if given
    returns

removeOption(option: Option) : returns ()
  where option is not in Options
  then
    refuses UNKNOWN_OPTION "There is no such option."
  where option is in Options
  then
    remove the option and its payoffs
    returns

updateRole(role: Role, name: String, batna: Number) : returns ()
  where role is not in Roles
  then
    refuses UNKNOWN_ROLE "There is no such role."
  where role is in Roles and name is blank or longer than 100 characters
  then
    refuses INVALID_ROLE_NAME "A role name must have 1 to 100 characters."
  where role is in Roles, name is accepted, and another role of the scenario has that name
  then
    refuses ROLE_EXISTS "This scenario already has a role with that name."
  where role is in Roles, name is accepted, and no other role of the scenario has that name
  then
    set the role's name and batna
    returns

removeRole(role: Role) : returns ()
  where role is not in Roles
  then
    refuses UNKNOWN_ROLE "There is no such role."
  where role is in Roles
  then
    remove the role, with its brief and its payoffs
    returns
```

## Queries

```queries
_scenario(scenario: Scenario) : optional (name: String, author: Author)
  Returns the scenario's name and author, or no row for an unknown scenario.

_complete(scenario: Scenario) : optional (complete: Flag)
  Returns whether the scenario is complete: it has at least one issue, each with at least two options, and at least two roles, each with a brief and a payoff for every option of the scenario. Returns no row for an unknown scenario.

_authoredBy(author: Author) : many (scenario: Scenario, name: String)
  Returns every scenario the author created, complete or not, with its name, or no rows when they have created none.
  Orders rows by when each scenario was created, newest first.

_issue(issue: Issue) : optional (scenario: Scenario, name: String, kind: IssueKind, unit?: String)
  Returns the issue's scenario, name, kind, and unit if it has one, or no row for an unknown issue.

_option(option: Option) : optional (scenario: Scenario, issue: Issue, name: String, universalValue?: Number)
  Returns the option's scenario, issue, name, and universal value if it has one, or no row for an unknown option.

_issues(scenario: Scenario) : many (issue: Issue, name: String, kind: IssueKind, unit?: String)
  Returns the scenario's issues, or no rows when it has none.
  Orders rows by when each issue was added.

_options(issue: Issue) : many (option: Option, name: String, universalValue?: Number)
  Returns the issue's options, with their universal values on a continuous issue, or no rows when it has none.
  Orders rows by universal value, lowest first, on a continuous issue, and by when each option was added on a discrete issue.

_roles(scenario: Scenario) : many (role: Role, name: String)
  Returns the scenario's roles, or no rows when it has none.
  Orders rows by when each role was added.

_role(role: Role) : optional (scenario: Scenario, name: String, batna: Number, brief?: String, summary?: String)
  Returns the role's scenario, name, BATNA, and its brief and summary if it has them, or no row for an unknown role.

_payoffs(role: Role) : many (issue: Issue, option: Option, points: Number)
  Returns the role's points for each option, or no rows when it has none.
  Orders rows by issue, in the order the issues were added, and then by option, in the order _options gives.

_dealValidity(scenario: Scenario, terms: TermSheet) : many (issue?: String, problem: String)
  Returns one row for each problem with the term sheet: the issue it's about, by the issue's name or, for an issue the scenario doesn't have, however the term sheet names it; and what's wrong: "This scenario has no such issue.", "Nothing is agreed on this issue.", "This issue has no such option." for a discrete issue, or "The value must be a number from 80000 to 120000." with the issue's own range for a continuous issue.
  Returns a single row with no issue, saying "This scenario doesn't exist or isn't complete.", for a scenario that isn't complete, and no rows when the term sheet is valid.
  Orders rows by issue, in the order the issues were added, with issues the scenario doesn't have last.

_dealPayoff(role: Role, terms: TermSheet) : optional (points: Number)
  Returns the role's total points for the term sheet: on a discrete issue, the points of the agreed option; on a continuous issue, the points of the option at the agreed value, or the straight-line blend of the points of the two options on either side of it.
  Returns no row for an unknown role, or when _dealValidity finds a problem with the term sheet for the role's scenario.

_dealJointPayoff(scenario: Scenario, terms: TermSheet) : optional (jointPoints: Number)
  Returns the total points of all the scenario's roles for the term sheet, added together.
  Returns no row when _dealValidity finds a problem with the term sheet for the scenario.

_jointBatna(scenario: Scenario) : optional (jointBatna: Number)
  Returns the BATNAs of all the scenario's roles added together, which is what they get together when nobody agrees, or no row for an unknown scenario.

_wholePie(scenario: Scenario) : optional (terms: TermSheet, jointPoints: Number, jointBatna: Number)
  Returns, among the term sheets worth at least its BATNA to every role, one with the most points for all the scenario's roles together, along with those joint points and the roles' BATNAs added together; when several term sheets tie, it returns the same one every time.
  Returns no row for a scenario that isn't complete, or when no term sheet is worth at least its BATNA to every role, which means no deal was possible.
```
