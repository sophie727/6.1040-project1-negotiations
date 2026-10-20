# Preparing

Someone who wants to prepare deliberately can turn on prep sheets. Then, before each negotiation, they write a plan, their target, their walkaway, and their priorities, and they can't start until it is complete. It is a setting, and off unless they turn it on, since the people who practice the most may not want to fill in a plan every time.

No concept is specific to prep sheets. Preferring keeps the setting, as the person's preference for the feature `prep-sheet`. Each part of a plan is a note about the table, kept by its own instance of Noting: TargetNoting, WalkawayNoting, and PrioritiesNoting. The parts behave exactly as notes do: each person has one per table, each save replaces the last, and only its author reads it.

## The setting

The [settings endpoint](reaction:preparing.settings.ShowSettings) says whether the person has prep sheets on. The prep-sheet endpoint changes it, and is two endpoints at one path, one for each value of the request's `on` field: one [turns prep sheets on](reaction:preparing.settings.TurnPrepSheetsOn), and the other [turns them off](reaction:preparing.settings.TurnPrepSheetsOff). Each answers with the new setting, and turning on prep sheets that are already on, or off when they're off, changes nothing.

```endpoints
preparing.settings.ShowSettings at /settings/show
preparing.settings.TurnPrepSheetsOn at /settings/prep-sheet
preparing.settings.TurnPrepSheetsOff at /settings/prep-sheet
```

## The plan

The [plan endpoint](reaction:preparing.planning.WritePlan) saves the person's plan for a table where they sit, replacing what they wrote before, so the page can save it as they type. It writes the target, then the walkaway, then the priorities, each as the person's note about the table. Someone without a seat is refused with `NOT_FOUND`. Noting refuses a part longer than 20,000 characters with `TOO_LONG`, and then that part and the parts after it keep what they had, while the parts before it are saved. The page trims each part before saving it, so a part with only spaces counts as empty. [The table](table.md#showing-the-table) shows the person their plan, so it is there during the negotiation too.

A person [is prepared to start a table](view:table.access.preparedFor) when they don't have prep sheets on, or when each part of their plan for it is a note that isn't empty. Suggesting a start, and agreeing to one, both need it, and [the endpoints that refuse a start](table.md#starting) refuse someone who isn't prepared with `PLAN_FIRST`. Whether someone is prepared doesn't change while they suggest or agree, so this refusal never races the start.

```endpoints
preparing.planning.WritePlan at /tables/plan
```
