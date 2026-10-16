import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, is, no, now, reaction, view, when, whether, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { textInput } from "./reusable/inputs.ts";

const { Briefing, Conversing, Noting, Proposing, Reasoning, Sessioning, Tabling } = concepts;

// Seating

/** A table gets an empty seat for each role of its scenario. */
const AddSeatForEachRole = reaction(({ table, scenario, role }) =>
  when(Tabling.open({ scenario }).responds({ table }))
    .where(Briefing._roles({ scenario }).is({ role }))
    .then(Tabling.addSeat({ table, role })),
);

/** Whoever takes a seat makes and answers proposals at that table, as the seat's role. */
const JoinProposalsWhenSeated = reaction(({ table, role }) =>
  when(Tabling.seat({ table, role }).responds({})).then(Proposing.join({ subject: table, party: role })),
);

// Who may do what

/** The role (user) plays at (table). A person sees and acts at a table only where they have a seat. */
export const seatedAs = view("the role (user) plays at (table)", ({ user, table }, { role }) =>
  where(Tabling._seats({ table }).is({ role, negotiator: user })),
).optional();

/** (table) is under way at (instant): it has begun, and its time isn't up. */
export const underWay = view("(table) is under way at (instant)", ({ table, instant }, _outputs, { deadline }) =>
  where(Tabling._table({ table }).is({ status: "OPEN", deadline }), is.lt(instant, deadline)),
).holds();

/** (table) is overdue at (instant): it is still open, but its time is up. */
export const overdue = view("(table) is overdue at (instant)", ({ table, instant }, _outputs, { deadline }) =>
  where(Tabling._table({ table }).is({ status: "OPEN", deadline }), is.ge(instant, deadline)),
).holds();

/** (table) isn't open: its negotiators are still preparing, or it has ended. */
export const notOpen = view("(table) isn't open", ({ table }, _outputs, { status }) =>
  where(Tabling._table({ table }).is({ status }), is.among(status, ["PREPARING", "SETTLED", "WITHDRAWN", "EXPIRED"])),
).holds();

/**
 * The answers to a request to act at a table that can't go ahead. When time is up, the table expires, and the request
 * is refused with TIME_UP; when the negotiation hasn't begun or has ended, with NOT_OPEN; and someone without a seat
 * is refused with NOT_FOUND, as if the table didn't exist. Each endpoint that acts at a table adds these paths beside
 * its own, which needs the table to be under way.
 */
export function unlessUnderWay({ user, table, instant }: { user: symbol; table: symbol; instant: symbol }) {
  return [
    where(now(instant), seatedAs({ user, table }), overdue({ table, instant }))
      .then(Tabling.expire({ table, now: instant }).responds({}))
      .then(respond({ error: "TIME_UP" }))
      .named("time-up"),
    where(seatedAs({ user, table }), notOpen({ table }))
      .then(respond({ error: "NOT_OPEN" }))
      .named("not-open"),
    where(no(seatedAs({ user, table })))
      .then(respond({ error: "NOT_FOUND" }))
      .named("not-seated"),
  ] as const;
}

// Showing

/** The issues of (scenario), in the order they were added, each with its options. */
export const issuesOf = former(
  "the issues of (scenario)",
  ({ scenario }, { issue, name, kind, unit, option, optionName, universalValue }) =>
    each(Briefing._issues({ scenario }).is({ issue, name, kind }))
      .where(whether(Briefing._issues({ scenario }).is({ issue, unit })))
      .form({
        issue,
        name,
        kind,
        unit,
        options: each(Briefing._options({ issue }).is({ option, name: optionName }))
          .where(whether(Briefing._options({ issue }).is({ option, universalValue })))
          .form({ option, name: optionName, universalValue }),
      }),
);

/**
 * (table) as whoever plays (role) there sees it: the scenario, the table's status and clock, the role's own brief,
 * BATNA, and points for each option, every seat's role, the issues, the conversation, and every proposal with what it
 * is worth to (role). Nothing here comes from another role's brief or points.
 */
export const tableAsSeenBy = former(
  "(table) as (role) sees it",
  (
    { table, role },
    {
      scenario,
      scenarioName,
      status,
      timeLimit,
      deadline,
      roleName,
      batna,
      brief,
      seat,
      seatName,
      message,
      sender,
      body,
      sentAt,
      proposal,
      proposer,
      terms,
      proposalStatus,
      proposedAt,
      points,
      option,
      optionPoints,
    },
  ) =>
    where(
      Tabling._table({ table }).is({ scenario, status, timeLimit }),
      whether(Tabling._table({ table }).is({ deadline })),
      Briefing._scenario({ scenario }).is({ name: scenarioName }),
      Briefing._role({ role }).is({ name: roleName, batna, brief }),
    ).form({
      table,
      scenario,
      scenarioName,
      status,
      timeLimit,
      deadline,
      role,
      roleName,
      batna,
      brief,
      seats: each(Tabling._seats({ table }).is({ role: seat }))
        .where(Briefing._role({ role: seat }).is({ name: seatName }))
        .form({ role: seat, name: seatName }),
      issues: issuesOf({ scenario }),
      payoffs: each(Briefing._payoffs({ role }).is({ option, points: optionPoints })).form({ option, points: optionPoints }),
      messages: each(Conversing._messages({ subject: table }).is({ message, sender, body, sentAt })).form({
        message,
        sender,
        body,
        sentAt,
      }),
      proposals: each(Proposing._proposals({ subject: table }).is({ proposal, proposer, terms, status: proposalStatus, proposedAt }))
        .where(whether(Briefing._dealPayoff({ role, terms }).is({ points })))
        .form({ proposal, proposer, terms, status: proposalStatus, proposedAt, points }),
    }),
);

/** The notes (user) wrote about (table), or null before they write any. */
const notesOf = former("the notes (user) wrote about (table)", ({ user, table }, { body }) =>
  where(whether(Noting._note({ author: user, subject: table }).is({ body }))).form({ body }),
);

/** How many questions to the counterpart about (table) are waiting or being answered, so the screen can show that it is writing. */
const questionsOpenAt = former("the open questions about (table)", ({ table }, { prompt, stage }) =>
  each(Reasoning._about({ subject: table }).is({ prompt, stage }))
    .where(is.among(stage, ["WAITING", "FORMING"]))
    .count(),
);

const ShowTable = endpoint(
  "/tables/show",
  ({ session, table, user, role }) =>
    receive({ session, table })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(seatedAs({ user, table }).is({ role }))
          .then(
            respond({
              table: tableAsSeenBy({ table, role }),
              notes: notesOf({ user, table }),
              openQuestions: questionsOpenAt({ table }),
            }),
          )
          .named("seated"),
        where(no(seatedAs({ user, table })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-seated"),
      ),
  { validators: { input: textInput } },
);

// Running the clock

const Begin = endpoint(
  "/tables/begin",
  ({ session, table, user, instant, deadline }) =>
    receive({ session, table })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(now(instant), seatedAs({ user, table }))
          .then(Tabling.begin({ table, now: instant }).responds({ deadline }))
          .then(respond({ deadline }))
          .named("seated"),
        where(no(seatedAs({ user, table })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-seated"),
      ),
  { validators: { input: textInput } },
);

const Expire = endpoint(
  "/tables/expire",
  ({ session, table, user, instant }) =>
    receive({ session, table })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(now(instant), seatedAs({ user, table }))
          .then(Tabling.expire({ table, now: instant }).responds({}))
          .then(respond({}))
          .named("seated"),
        where(no(seatedAs({ user, table })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-seated"),
      ),
  { validators: { input: textInput } },
);

const Withdraw = endpoint(
  "/tables/withdraw",
  ({ session, table, user, instant }) =>
    receive({ session, table })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(now(instant), seatedAs({ user, table }), underWay({ table, instant }))
          .then(Tabling.withdraw({ table, negotiator: user, now: instant }).responds({}))
          .then(respond({}))
          .named("under-way"),
        ...unlessUnderWay({ user, table, instant }),
      ),
  { validators: { input: textInput } },
);

// Talking and taking notes

const Send = endpoint(
  "/tables/send",
  ({ session, table, body, user, role, instant, message }) =>
    receive({ session, table, body })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(now(instant), seatedAs({ user, table }).is({ role }), underWay({ table, instant }))
          .then(Conversing.send({ subject: table, sender: role, body, now: instant }).responds({ message }))
          .then(respond({ message }))
          .named("under-way"),
        ...unlessUnderWay({ user, table, instant }),
      ),
  { validators: { input: textInput } },
);

const WriteNotes = endpoint(
  "/tables/notes",
  ({ session, table, body, user }) =>
    receive({ session, table, body })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(seatedAs({ user, table }))
          .then(Noting.write({ author: user, subject: table, body }).responds({}))
          .then(respond({}))
          .named("seated"),
        where(no(seatedAs({ user, table })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-seated"),
      ),
  { validators: { input: textInput } },
);

export const composition = {
  seating: { AddSeatForEachRole, JoinProposalsWhenSeated },
  access: { seatedAs, underWay, overdue, notOpen },
  showing: { issuesOf, tableAsSeenBy, notesOf, questionsOpenAt, ShowTable },
  clock: { Begin, Expire, Withdraw },
  talking: { Send, WriteNotes },
};
