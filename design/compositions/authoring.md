# Writing a scenario

Anyone with an account can write a scenario of their own, as the built-in ones were written, and publish it to the bakery, where everyone can negotiate it. Sophie writes The Lease, in which Ana and Ben agree on who takes the big bedroom and how to split the rent. Briefing holds what she writes and checks it, and Posting puts it in the bakery when she publishes it. The endpoints here check who is writing, and that the scenario isn't posted yet, since a posted scenario stays as people negotiate it.

## Who may write what

Only the author of a scenario can see or change it. Each endpoint below reads its user from the session and checks that they [wrote the scenario](view:authoring.access.wrote), or the scenario that [the issue](view:authoring.access.wroteIssue), [the option](view:authoring.access.wroteOption), or [the role](view:authoring.access.wroteRole) belongs to. Anyone else, and anything that doesn't exist, is refused with `NOT_FOUND`, as if the scenario weren't there, so a draft's contents stay private until it is published. Briefing's own refusals, such as `NAME_TAKEN`, reach the author as they are.

Briefing lets a scenario change whenever its author likes, but once people negotiate a scenario, it mustn't change under them: a deal's points, the whole pie, and the ratings all come from it. So every endpoint that changes a scenario first checks that the author [is still writing it](view:authoring.access.drafting), or the scenario of [the issue](view:authoring.access.draftingIssue), [the option](view:authoring.access.draftingOption), or [the role](view:authoring.access.draftingRole): they wrote it, and haven't posted it yet. The author of a posted scenario is refused with `PUBLISHED`. Only a role's summary can change after posting, since it changes nothing a deal is worth.

## Your scenarios

The [list endpoint](reaction:authoring.showing.ShowMine) responds with [the scenarios the person wrote](former:authoring.showing.scenariosBy), newest first, each with whether it is posted, whether it is archived, and by whom, so the bakery can list them. The [show endpoint](reaction:authoring.showing.ShowDraft) responds with [the scenario as its author writes it](former:authoring.showing.draftOf): its name, whether it is posted, whether it is archived and by whom, the time limit its author recommends, every issue with its options, and every role with its BATNA, its brief, its summary, and the points it has so far. Unlike [the table](table.md#showing-the-table), which shows each negotiator only their own brief and points, it shows the author everyone's.

```endpoints
authoring.showing.ShowMine at /scenarios/mine
authoring.showing.ShowDraft at /scenarios/show
```

## Drafting

Sophie [starts a draft](reaction:authoring.drafting.Create) by naming it. Briefing refuses a blank name, or one that another scenario, published or not, already has. While it's a draft, she can [rename it](reaction:authoring.drafting.Rename), [recommend a time limit](reaction:authoring.drafting.RecommendTimeLimit) in Tabling, which the page suggests to whoever negotiates it, and [discard it](reaction:authoring.drafting.Discard) with everything in it. Tabling would take a new recommendation for a posted scenario too, so it is refused with `PUBLISHED`, like every other change.

When it's ready, she [publishes it](reaction:authoring.drafting.Publish), which posts it with `Posting.post`. Until Briefing says it is complete, with an issue, at least two roles, two options for every issue, and a brief and every payoff for every role, the endpoint refuses with `INCOMPLETE`. From then on, the scenario is [in the bakery](view:practice.choosing.inBakery), where anyone can practice it, negotiate it with friends, or be matched for it, and nothing about it changes but its roles' summaries.

```endpoints
authoring.drafting.Create at /scenarios/create
authoring.drafting.Rename at /scenarios/rename
authoring.drafting.RecommendTimeLimit at /scenarios/limit
authoring.drafting.Discard at /scenarios/discard
authoring.drafting.Publish at /scenarios/publish
```

## Archiving

Sophie published Test Lease to see how the page works, and doesn't want anyone else to pick it. She [archives it](reaction:authoring.archiving.Archive), and it leaves the bakery: nobody can [practice it](view:practice.starting.playable), start a table for friends with it, or [be matched for it](view:matchmaking.looking.findable). Archiving takes nothing from the people who already negotiated it, or are negotiating it: their tables stay in their list of negotiations, and they can still negotiate there, read the transcript, and see the debrief. An archived scenario is still posted, so it still can't change under them. Friends can still join a table opened for it with its link. Posting refuses to archive a draft with `NOT_POSTED`, since a draft isn't in the bakery and can be discarded instead, and an archived scenario with `ALREADY_ARCHIVED`. Posting remembers who archived it: Sophie, or [the admin](admin.md), who can archive anyone's scenario.

If Sophie changes her mind, she [unarchives it](reaction:authoring.archiving.Unarchive), and it is back in the bakery. Posting refuses a scenario that isn't archived with `NOT_ARCHIVED`. A scenario the admin archived only the admin can put back, so Sophie is refused with `ARCHIVED_BY_ADMIN`.

```endpoints
authoring.archiving.Archive at /scenarios/archive
authoring.archiving.Unarchive at /scenarios/unarchive
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
