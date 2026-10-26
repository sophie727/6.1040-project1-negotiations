import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, is, no, type ReadLine, view, whether, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { inputOf, textInput } from "./reusable/inputs.ts";
import { issuesOf } from "./table.ts";

const { Briefing, Posting, Sessioning, Tabling } = concepts;

// Access

/** (user) wrote (scenario). */
export const wrote = view("(user) wrote (scenario)", ({ user, scenario }) =>
  where(Briefing._scenario({ scenario }).is({ author: user })),
).holds();

/** (user) wrote the scenario that (issue) is part of. */
const wroteIssue = view("(user) wrote the scenario of (issue)", ({ user, issue }, _outputs, { scenario }) =>
  where(Briefing._issue({ issue }).is({ scenario }), wrote({ user, scenario })),
).holds();

/** (user) wrote the scenario that (option) is part of. */
const wroteOption = view("(user) wrote the scenario of (option)", ({ user, option }, _outputs, { scenario }) =>
  where(Briefing._option({ option }).is({ scenario }), wrote({ user, scenario })),
).holds();

/** (user) wrote the scenario that (role) is part of. */
const wroteRole = view("(user) wrote the scenario of (role)", ({ user, role }, _outputs, { scenario }) =>
  where(Briefing._role({ role }).is({ scenario }), wrote({ user, scenario })),
).holds();

/** (user) wrote (scenario), and hasn't posted it yet, so they can still change it. */
const drafting = view("(user) is still writing (scenario)", ({ user, scenario }) =>
  where(wrote({ user, scenario }), Posting._post({ item: scenario }).is({ posted: false })),
).holds();

/** (user) is still writing the scenario that (issue) is part of. */
const draftingIssue = view("(user) is still writing the scenario of (issue)", ({ user, issue }, _outputs, { scenario }) =>
  where(Briefing._issue({ issue }).is({ scenario }), drafting({ user, scenario })),
).holds();

/** (user) is still writing the scenario that (option) is part of. */
const draftingOption = view("(user) is still writing the scenario of (option)", ({ user, option }, _outputs, { scenario }) =>
  where(Briefing._option({ option }).is({ scenario }), drafting({ user, scenario })),
).holds();

/** (user) is still writing the scenario that (role) is part of. */
const draftingRole = view("(user) is still writing the scenario of (role)", ({ user, role }, _outputs, { scenario }) =>
  where(Briefing._role({ role }).is({ scenario }), drafting({ user, scenario })),
).holds();

/**
 * The refusals of a change to a scenario that the person can't make: PUBLISHED when they wrote it but have posted it,
 * since a posted scenario stays as people negotiate it, and NOT_FOUND when they didn't write it, or it doesn't exist.
 * (wrote) says the person wrote the scenario, or the scenario of the issue, option or role being changed, and
 * (stillDrafting) that they haven't posted it yet.
 */
function unlessDrafting(wrote: ReadLine, stillDrafting: ReadLine) {
  return [
    where(wrote, no(stillDrafting))
      .then(respond({ error: "PUBLISHED" }))
      .named("posted"),
    where(no(wrote))
      .then(respond({ error: "NOT_FOUND" }))
      .named("not-author"),
  ] as const;
}

/** (kind) is a kind of issue: a range of values, CONTINUOUS, or a list of options, DISCRETE. */
const isIssueKind = view("(kind) is a kind of issue", ({ kind }) => where(is.among(kind, ["CONTINUOUS", "DISCRETE"]))).holds();

// Showing

/** The scenarios (user) wrote, newest first, each with whether it is posted and whether it is archived. */
const scenariosBy = former("the scenarios (user) wrote", ({ user }, { scenario, name, published, archived }) =>
  each(Briefing._authoredBy({ author: user }).is({ scenario, name }))
    .where(Posting._post({ item: scenario }).is({ posted: published, archived }))
    .form({ scenario, name, published, archived }),
);

/**
 * (scenario) as its author writes it: its name, whether it is posted and archived, the time limit its author recommends, its
 * issues with their options, and each role with its BATNA, its brief and its summary, each null before it has one, and its
 * points for each option it has points for so far.
 */
const draftOf = former(
  "(scenario) as its author writes it",
  ({ scenario }, { name, published, archived, timeLimit, role, roleName, batna, brief, summary, option, points }) =>
    where(
      Briefing._scenario({ scenario }).is({ name }),
      Posting._post({ item: scenario }).is({ posted: published, archived }),
      whether(Tabling._recommendedTimeLimit({ scenario }).is({ timeLimit })),
    ).form({
      scenario,
      name,
      published,
      archived,
      timeLimit,
      issues: issuesOf({ scenario }),
      roles: each(Briefing._roles({ scenario }).is({ role, name: roleName }))
        .where(
          Briefing._role({ role }).is({ batna }),
          whether(Briefing._role({ role }).is({ brief })),
          whether(Briefing._role({ role }).is({ summary })),
        )
        .form({
          role,
          name: roleName,
          batna,
          brief,
          summary,
          payoffs: each(Briefing._payoffs({ role }).is({ option, points })).form({ option, points }),
        }),
    }),
);

const ShowMine = endpoint(
  "/scenarios/mine",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(respond({ scenarios: scenariosBy({ user }) })),
  { validators: { input: textInput } },
);

const ShowDraft = endpoint(
  "/scenarios/show",
  ({ session, scenario, user }) =>
    receive({ session, scenario })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(wrote({ user, scenario }))
          .then(respond({ draft: draftOf({ scenario }) }))
          .named("author"),
        where(no(wrote({ user, scenario })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-author"),
      ),
  { validators: { input: textInput } },
);

// Drafting

const Create = endpoint(
  "/scenarios/create",
  ({ session, name, user, scenario }) =>
    receive({ session, name })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Briefing.create({ author: user, name }).responds({ scenario }))
      .then(respond({ scenario })),
  { validators: { input: textInput } },
);

const Rename = endpoint(
  "/scenarios/rename",
  ({ session, scenario, name, user }) =>
    receive({ session, scenario, name })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(drafting({ user, scenario }))
          .then(Briefing.rename({ scenario, name }).responds({}))
          .then(respond({}))
          .named("author"),
        ...unlessDrafting(wrote({ user, scenario }), drafting({ user, scenario })),
      ),
  { validators: { input: textInput } },
);

const RecommendTimeLimit = endpoint(
  "/scenarios/limit",
  ({ session, scenario, minutes, user }) =>
    receive({ session, scenario, minutes })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(drafting({ user, scenario }))
          .then(Tabling.recommendTimeLimit({ scenario, timeLimit: minutes }).responds({}))
          .then(respond({}))
          .named("draft"),
        ...unlessDrafting(wrote({ user, scenario }), drafting({ user, scenario })),
      ),
  { validators: { input: inputOf({ minutes: "number" }) } },
);

const Discard = endpoint(
  "/scenarios/discard",
  ({ session, scenario, user }) =>
    receive({ session, scenario })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(drafting({ user, scenario }))
          .then(Briefing.discard({ scenario }).responds({}))
          .then(respond({}))
          .named("author"),
        ...unlessDrafting(wrote({ user, scenario }), drafting({ user, scenario })),
      ),
  { validators: { input: textInput } },
);

/**
 * Posts (scenario) to the bakery once Briefing says it is complete. From then on, the endpoints above refuse to change
 * it with PUBLISHED, so it stays as people negotiate it.
 */
const Publish = endpoint(
  "/scenarios/publish",
  ({ session, scenario, user }) =>
    receive({ session, scenario })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(drafting({ user, scenario }), Briefing._complete({ scenario }).is({ complete: true }))
          .then(Posting.post({ item: scenario }).responds({}))
          .then(respond({ scenario }))
          .named("complete"),
        where(drafting({ user, scenario }), Briefing._complete({ scenario }).is({ complete: false }))
          .then(respond({ error: "INCOMPLETE" }))
          .named("incomplete"),
        ...unlessDrafting(wrote({ user, scenario }), drafting({ user, scenario })),
      ),
  { validators: { input: textInput } },
);

// Issues

const AddIssue = endpoint(
  "/scenarios/issues/add",
  ({ session, scenario, name, kind, unit, user, issue }) =>
    receive({ session, scenario, name, kind, unit })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(drafting({ user, scenario }), isIssueKind({ kind }))
          .then(Briefing.addIssue({ scenario, name, kind, unit }).responds({ issue }))
          .then(respond({ issue }))
          .named("author"),
        where(drafting({ user, scenario }), no(isIssueKind({ kind })))
          .then(respond({ error: "INVALID_KIND" }))
          .named("invalid-kind"),
        ...unlessDrafting(wrote({ user, scenario }), drafting({ user, scenario })),
      ),
  { validators: { input: textInput } },
);

const UpdateIssue = endpoint(
  "/scenarios/issues/update",
  ({ session, issue, name, kind, unit, user }) =>
    receive({ session, issue, name, kind, unit })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(draftingIssue({ user, issue }), isIssueKind({ kind }))
          .then(Briefing.updateIssue({ issue, name, kind, unit }).responds({}))
          .then(respond({}))
          .named("author"),
        where(draftingIssue({ user, issue }), no(isIssueKind({ kind })))
          .then(respond({ error: "INVALID_KIND" }))
          .named("invalid-kind"),
        ...unlessDrafting(wroteIssue({ user, issue }), draftingIssue({ user, issue })),
      ),
  { validators: { input: textInput } },
);

const RemoveIssue = endpoint(
  "/scenarios/issues/remove",
  ({ session, issue, user }) =>
    receive({ session, issue })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(draftingIssue({ user, issue }))
          .then(Briefing.removeIssue({ issue }).responds({}))
          .then(respond({}))
          .named("author"),
        ...unlessDrafting(wroteIssue({ user, issue }), draftingIssue({ user, issue })),
      ),
  { validators: { input: textInput } },
);

/** An option of a continuous issue takes the universal value it was sent; an option of a discrete issue has none, so it leaves it out. */
const AddOption = endpoint(
  "/scenarios/options/add",
  ({ session, issue, name, universalValue, user, option }) =>
    receive({ session, issue, name, universalValue })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(draftingIssue({ user, issue }), Briefing._issue({ issue }).is({ kind: "CONTINUOUS" }))
          .then(Briefing.addOption({ issue, name, universalValue }).responds({ option }))
          .then(respond({ option }))
          .named("continuous"),
        where(draftingIssue({ user, issue }), Briefing._issue({ issue }).is({ kind: "DISCRETE" }))
          .then(Briefing.addOption({ issue, name }).responds({ option }))
          .then(respond({ option }))
          .named("discrete"),
        ...unlessDrafting(wroteIssue({ user, issue }), draftingIssue({ user, issue })),
      ),
  { validators: { input: inputOf({ universalValue: "number" }) } },
);

const UpdateOption = endpoint(
  "/scenarios/options/update",
  ({ session, option, name, universalValue, user, issue }) =>
    receive({ session, option, name, universalValue })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(draftingOption({ user, option }), Briefing._option({ option }).is({ issue }), Briefing._issue({ issue }).is({ kind: "CONTINUOUS" }))
          .then(Briefing.updateOption({ option, name, universalValue }).responds({}))
          .then(respond({}))
          .named("continuous"),
        where(draftingOption({ user, option }), Briefing._option({ option }).is({ issue }), Briefing._issue({ issue }).is({ kind: "DISCRETE" }))
          .then(Briefing.updateOption({ option, name }).responds({}))
          .then(respond({}))
          .named("discrete"),
        ...unlessDrafting(wroteOption({ user, option }), draftingOption({ user, option })),
      ),
  { validators: { input: inputOf({ universalValue: "number" }) } },
);

const RemoveOption = endpoint(
  "/scenarios/options/remove",
  ({ session, option, user }) =>
    receive({ session, option })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(draftingOption({ user, option }))
          .then(Briefing.removeOption({ option }).responds({}))
          .then(respond({}))
          .named("author"),
        ...unlessDrafting(wroteOption({ user, option }), draftingOption({ user, option })),
      ),
  { validators: { input: textInput } },
);

// Roles

const AddRole = endpoint(
  "/scenarios/roles/add",
  ({ session, scenario, name, batna, user, role }) =>
    receive({ session, scenario, name, batna })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(drafting({ user, scenario }))
          .then(Briefing.addRole({ scenario, name, batna }).responds({ role }))
          .then(respond({ role }))
          .named("author"),
        ...unlessDrafting(wrote({ user, scenario }), drafting({ user, scenario })),
      ),
  { validators: { input: inputOf({ batna: "number" }) } },
);

const UpdateRole = endpoint(
  "/scenarios/roles/update",
  ({ session, role, name, batna, user }) =>
    receive({ session, role, name, batna })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(draftingRole({ user, role }))
          .then(Briefing.updateRole({ role, name, batna }).responds({}))
          .then(respond({}))
          .named("author"),
        ...unlessDrafting(wroteRole({ user, role }), draftingRole({ user, role })),
      ),
  { validators: { input: inputOf({ batna: "number" }) } },
);

const RemoveRole = endpoint(
  "/scenarios/roles/remove",
  ({ session, role, user }) =>
    receive({ session, role })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(draftingRole({ user, role }))
          .then(Briefing.removeRole({ role }).responds({}))
          .then(respond({}))
          .named("author"),
        ...unlessDrafting(wroteRole({ user, role }), draftingRole({ user, role })),
      ),
  { validators: { input: textInput } },
);

const WriteBrief = endpoint(
  "/scenarios/roles/brief",
  ({ session, role, brief, user }) =>
    receive({ session, role, brief })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(draftingRole({ user, role }))
          .then(Briefing.setBrief({ role, brief }).responds({}))
          .then(respond({}))
          .named("author"),
        ...unlessDrafting(wroteRole({ user, role }), draftingRole({ user, role })),
      ),
  { validators: { input: textInput } },
);

/** A role's summary can change even after the scenario is posted, since it changes nothing a deal is worth, so only the author is checked. */
const DescribeRole = endpoint(
  "/scenarios/roles/summary",
  ({ session, role, summary, user }) =>
    receive({ session, role, summary })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(wroteRole({ user, role }))
          .then(Briefing.describeRole({ role, summary }).responds({}))
          .then(respond({}))
          .named("author"),
        where(no(wroteRole({ user, role })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-author"),
      ),
  { validators: { input: textInput } },
);

/** Briefing refuses an option of another scenario than the role's, so the author's role is the only check needed here. */
const SetPayoff = endpoint(
  "/scenarios/payoffs/set",
  ({ session, role, option, points, user }) =>
    receive({ session, role, option, points })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(draftingRole({ user, role }))
          .then(Briefing.setPayoff({ role, option, points }).responds({}))
          .then(respond({}))
          .named("author"),
        ...unlessDrafting(wroteRole({ user, role }), draftingRole({ user, role })),
      ),
  { validators: { input: inputOf({ points: "number" }) } },
);

// Archiving

/**
 * Takes (scenario) out of the bakery, so nobody can start negotiating it. Tables already opened for it stay with the
 * people at them. Posting refuses a scenario that isn't posted with NOT_POSTED, and an archived one with ALREADY_ARCHIVED.
 */
const Archive = endpoint(
  "/scenarios/archive",
  ({ session, scenario, user }) =>
    receive({ session, scenario })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(wrote({ user, scenario }))
          .then(Posting.archive({ item: scenario }).responds({}))
          .then(respond({}))
          .named("author"),
        where(no(wrote({ user, scenario })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-author"),
      ),
  { validators: { input: textInput } },
);

/** Puts (scenario) back in the bakery. Posting refuses a scenario that isn't archived with NOT_ARCHIVED. */
const Unarchive = endpoint(
  "/scenarios/unarchive",
  ({ session, scenario, user }) =>
    receive({ session, scenario })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(wrote({ user, scenario }))
          .then(Posting.unarchive({ item: scenario }).responds({}))
          .then(respond({}))
          .named("author"),
        where(no(wrote({ user, scenario })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-author"),
      ),
  { validators: { input: textInput } },
);

export const composition = {
  access: { wrote, wroteIssue, wroteOption, wroteRole, drafting, draftingIssue, draftingOption, draftingRole, isIssueKind },
  showing: { scenariosBy, draftOf, ShowMine, ShowDraft },
  drafting: { Create, Rename, RecommendTimeLimit, Discard, Publish },
  archiving: { Archive, Unarchive },
  issues: { AddIssue, UpdateIssue, RemoveIssue, AddOption, UpdateOption, RemoveOption },
  roles: { AddRole, UpdateRole, RemoveRole, WriteBrief, DescribeRole, SetPayoff },
};
