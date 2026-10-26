# Writing a scenario

Anyone with an account can write a scenario of their own, as the built-in ones were written, and publish it to the bakery, where everyone can negotiate it. Sophie writes The Lease, in which Ana and Ben agree on who takes the big bedroom and how to split the rent. Everything here goes through Briefing, whose drafts can change until they are published: the endpoints check who is writing, and Briefing checks what is written.

## Who may write what

Only the author of a scenario can see or change it. Each endpoint below reads its user from the session and checks that they [wrote the scenario](view:authoring.access.wrote), or the scenario that [the issue](view:authoring.access.wroteIssue), [the option](view:authoring.access.wroteOption), or [the role](view:authoring.access.wroteRole) belongs to. Anyone else, and anything that doesn't exist, is refused with `NOT_FOUND`, as if the scenario weren't there, so a draft's contents stay private until it is published. Briefing's own refusals, such as `PUBLISHED` for any change to a published scenario, reach the author as they are.

## Your scenarios

The [list endpoint](reaction:authoring.showing.ShowMine) responds with [the scenarios the person wrote](former:authoring.showing.scenariosBy), drafts and published ones, newest first, so the bakery can list them. The [show endpoint](reaction:authoring.showing.ShowDraft) responds with [the scenario as its author writes it](former:authoring.showing.draftOf): its name, whether it is published, the time limit its author recommends, every issue with its options, and every role with its BATNA, its brief, its summary, and the points it has so far. Unlike [the table](table.md#showing-the-table), which shows each negotiator only their own brief and points, it shows the author everyone's.

```endpoints
authoring.showing.ShowMine at /scenarios/mine
authoring.showing.ShowDraft at /scenarios/show
```

## Drafting

Sophie [starts a draft](reaction:authoring.drafting.Create) by naming it. Briefing refuses a blank name, or one that another scenario, published or not, already has. While it's a draft, she can [rename it](reaction:authoring.drafting.Rename), [recommend a time limit](reaction:authoring.drafting.RecommendTimeLimit) in Tabling, which the page suggests to whoever negotiates it, and [discard it](reaction:authoring.drafting.Discard) with everything in it. Tabling would take a new recommendation for a published scenario too, so the `published` path refuses it with `PUBLISHED`, as Briefing refuses every other change once a scenario is published.

When it's ready, she [publishes it](reaction:authoring.drafting.Publish). Briefing refuses with `INCOMPLETE` until it has an issue, at least two roles, two options for every issue, and a brief and every payoff for every role. From then on, the scenario is in the bakery, where anyone can practice it, negotiate it with friends, or be matched for it, and nothing about it changes but its roles' summaries.

```endpoints
authoring.drafting.Create at /scenarios/create
authoring.drafting.Rename at /scenarios/rename
authoring.drafting.RecommendTimeLimit at /scenarios/limit
authoring.drafting.Discard at /scenarios/discard
authoring.drafting.Publish at /scenarios/publish
```

## Issues

An issue is [added](reaction:authoring.issues.AddIssue) with a name, a kind, and a unit, which is blank for none. A kind other than CONTINUOUS and DISCRETE [isn't a kind of issue](view:authoring.access.isIssueKind), so it is refused with `INVALID_KIND` before Briefing sees it. Sophie can [change an issue's name, kind, or unit](reaction:authoring.issues.UpdateIssue), and changing its kind removes its options, as Briefing describes. She can also [remove the issue](reaction:authoring.issues.RemoveIssue), with its options and their payoffs.

Options are [added](reaction:authoring.issues.AddOption), [changed](reaction:authoring.issues.UpdateOption), and [removed](reaction:authoring.issues.RemoveOption) one at a time. Each request carries a universal value, but only an option of a continuous issue has one: the `continuous` path passes it to Briefing, and the `discrete` path leaves it out, so the page sends the same fields for both.

```endpoints
authoring.issues.AddIssue at /scenarios/issues/add
authoring.issues.UpdateIssue at /scenarios/issues/update
authoring.issues.RemoveIssue at /scenarios/issues/remove
authoring.issues.AddOption at /scenarios/options/add
authoring.issues.UpdateOption at /scenarios/options/update
authoring.issues.RemoveOption at /scenarios/options/remove
```

## Roles

A role is [added](reaction:authoring.roles.AddRole) with a name and a BATNA. Until the scenario is published, its name and BATNA [can change](reaction:authoring.roles.UpdateRole), and the role can be [removed](reaction:authoring.roles.RemoveRole), with its brief and payoffs. The [brief endpoint](reaction:authoring.roles.WriteBrief) sets the role's brief, which only whoever plays the role reads. The [summary endpoint](reaction:authoring.roles.DescribeRole) sets who the role is, in a sentence or two that everyone sees in the bakery before choosing a side, such as "Head of operations at Fernwood Analytics, hiring someone to lead client operations." A summary changes nothing a deal is worth, so Sophie can write or change one even after publishing, unlike the rest of the scenario. The [payoff endpoint](reaction:authoring.roles.SetPayoff) sets what an option is worth to the role. Briefing refuses a payoff for an option of another scenario, so a role of Sophie's can't be given points for an option of somebody else's draft.

The page writes each brief in two parts. Sophie writes what the role knows and wants, and when she publishes, the page adds a "Your points" section, with the role's points for every option and its BATNA, as in the built-in briefs. So the brief a negotiator reads always agrees with the points Briefing scores their deals with. Any option Sophie gave no points to is worth nothing to the role, so the page sets those payoffs to 0 before it publishes.

```endpoints
authoring.roles.AddRole at /scenarios/roles/add
authoring.roles.UpdateRole at /scenarios/roles/update
authoring.roles.RemoveRole at /scenarios/roles/remove
authoring.roles.WriteBrief at /scenarios/roles/brief
authoring.roles.DescribeRole at /scenarios/roles/summary
authoring.roles.SetPayoff at /scenarios/payoffs/set
```
