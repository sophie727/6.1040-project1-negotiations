import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, is, no, now, reaction, view, when, whether, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { COUNTERPART_ASKS } from "./asks.ts";
import { inputOf, textInput } from "./reusable/inputs.ts";

const {
  AgentSessioning,
  Briefing,
  Conversing,
  Inviting,
  Noting,
  Preferring,
  PrioritiesNoting,
  Proposing,
  Rating,
  Reasoning,
  Registering,
  Reviewing,
  Sessioning,
  Tabling,
  TargetNoting,
  TimeLimitProposing,
  WalkawayNoting,
} = concepts;

/** The feature in Preferring that someone turns on to write a prep sheet before each negotiation. */
export const PREP_SHEET = "prep-sheet";

// Seating

/** A table gets an empty seat for each role of its scenario. */
const AddSeatForEachRole = reaction(({ table, scenario, role }) =>
  when(Tabling.open({ scenario }).responds({ table }))
    .where(Briefing._roles({ scenario }).is({ role }))
    .then(Tabling.addSeat({ table, role })),
);

/**
 * Whoever takes a seat makes and answers proposals at that table, as the seat's role. The role comes from what Tabling
 * answers, since someone who sits down without choosing a role gets whichever empty seat Tabling gives them.
 */
const JoinProposalsWhenSeated = reaction(({ table, role }) =>
  when(Tabling.seat({ table }).responds({ role })).then(Proposing.join({ subject: table, party: role })),
);

// Who may do what

/** The role (user) plays at (table). A person sees and acts at a table only where they have a seat. */
export const seatedAs = view("the role (user) plays at (table)", ({ user, table }, { role }) =>
  where(Tabling._seats({ table }).is({ role, negotiator: user })),
).optional();

/** When (table)'s time is up, which it has only once it began: a table that never began has no deadline. */
export const began = view("when the time is up at (table), once it began", ({ table }, { deadline }) =>
  where(Tabling._table({ table }).is({ deadline })),
).optional();

/** Whoever sits in the seat for (role) at (table), once someone has taken it. */
export const occupant = view("who sits in the seat for (role) at (table)", ({ table, role }, { negotiator }) =>
  where(Tabling._seats({ table }).is({ role, negotiator })),
).optional();

/** The roles at (table) whose seats nobody has taken yet. */
export const openSeats = view("the empty seats at (table)", ({ table }, { role }) =>
  where(Tabling._seats({ table }).is({ role }), no(occupant({ table, role }))),
);

/** (table) is under way at (instant): it has begun, and its time isn't up. */
export const underWay = view("(table) is under way at (instant)", ({ table, instant }, _outputs, { deadline }) =>
  where(Tabling._table({ table }).is({ status: "OPEN", deadline }), is.lt(instant, deadline)),
).holds();

/** (table) is overdue at (instant): it is still open, but its time is up. */
export const overdue = view("(table) is overdue at (instant)", ({ table, instant }, _outputs, { deadline }) =>
  where(Tabling._table({ table }).is({ status: "OPEN", deadline }), is.ge(instant, deadline)),
).holds();

/**
 * The three ways a negotiation ends, each a Tabling action, as triggers: an agreement, a walkout, or time running out.
 * A reaction watches exactly one action, so a rule that follows every ending is registered once for each of these.
 */
const endings = {
  Settled: (table: symbol) => Tabling.settle({ table }).responds({}),
  Withdrawn: (table: symbol) => Tabling.withdraw({ table }).responds({}),
  Expired: (table: symbol) => Tabling.expire({ table }).responds({}),
};

/** The trigger for one way a negotiation ends, given the variable that binds its table. */
export type Ending = (typeof endings)[keyof typeof endings];

/** Registers `rule` once for each way a negotiation ends: when it is Settled, Withdrawn, or Expired. */
export function forEachEnding<Rule>(rule: (ended: Ending) => Rule) {
  return { Settled: rule(endings.Settled), Withdrawn: rule(endings.Withdrawn), Expired: rule(endings.Expired) };
}

/**
 * (user) is prepared to start (table): they haven't turned prep sheets on, or they have written every part of their
 * plan for the table: a target, a walkaway, and priorities, each a note that isn't empty.
 */
export const preparedFor = view("(user) is prepared to start (table)", ({ user, table }) => [
  where(Preferring._on({ person: user, feature: PREP_SHEET }).is({ on: false })),
  where(
    TargetNoting._note({ author: user, subject: table }).is.not({ body: "" }),
    WalkawayNoting._note({ author: user, subject: table }).is.not({ body: "" }),
    PrioritiesNoting._note({ author: user, subject: table }).is.not({ body: "" }),
  ),
]).holds();

/** (table) has ended: in an agreement, with someone walking away, or with time running out. */
export const ended = view("(table) has ended", ({ table }, _outputs, { status }) =>
  where(Tabling._table({ table }).is({ status }), is.among(status, ["SETTLED", "WITHDRAWN", "EXPIRED"])),
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

/**
 * The ratings of (user): the averages of their create and claim results over the negotiations with other people that
 * count for them, how many count, and the average of the stars the people they negotiated with gave them. Absent for
 * an empty seat, which has nobody to rate.
 */
export const ratingsOf = former(
  "the ratings of (user)",
  ({ user }, { claim, create, negotiations, stars, reviews }) =>
    where(
      Rating._ratings({ person: user }).is({ negotiations }),
      whether(Rating._ratings({ person: user }).is({ claim })),
      whether(Rating._ratings({ person: user }).is({ create })),
      Reviewing._standing({ reviewee: user }).is({ reviews }),
      whether(Reviewing._standing({ reviewee: user }).is({ stars })),
    ).form({ create, claim, negotiations, stars, reviews }),
).optional();

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
 * (table) as whoever plays (role) there sees it: the scenario, the table's status and clock (its time limit once it has
 * begun, and the scenario's recommended one, which the page suggests until then), every seat's role and the username of
 * the person in it (null for the counterpart or an empty seat), the empty seats, the role's own brief,
 * BATNA, and points for each option, every seat's role, the issues, the conversation, and every proposal with what it
 * is worth to (role) and the roles that have accepted it so far. Nothing here comes from another role's brief or points.
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
      recommendedTimeLimit,
      deadline,
      roleName,
      batna,
      brief,
      seat,
      seatName,
      sitter,
      player,
      open,
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
      accepter,
      option,
      optionPoints,
    },
  ) =>
    where(
      Tabling._table({ table }).is({ scenario, status }),
      whether(Tabling._table({ table }).is({ timeLimit })),
      whether(Tabling._table({ table }).is({ deadline })),
      whether(Tabling._recommendedTimeLimit({ scenario }).is({ timeLimit: recommendedTimeLimit })),
      Briefing._scenario({ scenario }).is({ name: scenarioName }),
      Briefing._role({ role }).is({ name: roleName, batna, brief }),
    ).form({
      table,
      scenario,
      scenarioName,
      status,
      timeLimit,
      recommendedTimeLimit,
      deadline,
      role,
      roleName,
      batna,
      brief,
      seats: each(Tabling._seats({ table }).is({ role: seat }))
        .where(
          Briefing._role({ role: seat }).is({ name: seatName }),
          whether(occupant({ table, role: seat }).is({ negotiator: sitter })),
          whether(Registering._username({ user: sitter }).is({ username: player })),
        )
        .form({ role: seat, name: seatName, player, ratings: whether(ratingsOf({ user: sitter })) }),
      openSeats: each(openSeats({ table }).is({ role: open })).distinct(open),
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
        .form({
          proposal,
          proposer,
          terms,
          status: proposalStatus,
          proposedAt,
          points,
          acceptedBy: each(Proposing._acceptances({ proposal }).is({ party: accepter })).distinct(accepter),
        }),
    }),
);

/** The notes (user) wrote about (table), or null before they write any. */
const notesOf = former("the notes (user) wrote about (table)", ({ user, table }, { body }) =>
  where(whether(Noting._note({ author: user, subject: table }).is({ body }))).form({ body }),
);

/** How many questions to the counterpart about (table) are waiting or being answered, so the screen can show that it is writing. */
const questionsOpenAt = former("the open questions about (table)", ({ table }, { prompt, ask, stage }) =>
  each(Reasoning._about({ subject: table }).is({ prompt, ask, stage }))
    .where(is.among(ask, COUNTERPART_ASKS), is.among(stage, ["WAITING", "FORMING"]))
    .count(),
);

/**
 * Every question to the counterpart about (table), oldest first, with its stage and the reason it was abandoned, if it
 * was, so the screen can say when the counterpart couldn't answer, rather than just stop showing that it is writing.
 */
const questionsAbout = former("the questions about (table)", ({ table }, { prompt, ask, stage, reason }) =>
  each(Reasoning._about({ subject: table }).is({ prompt, ask, stage }))
    .where(is.among(ask, COUNTERPART_ASKS), whether(Reasoning._reason({ prompt }).is({ reason })))
    .form({ stage, reason }),
);

/** The suggestion to start (table) that is waiting for answers, if there is one: who made it, how long, and who has agreed to it. */
const startTalksAt = former("the suggestion to start (table)", ({ table }, { proposal, proposer, minutes, party }) =>
  each(TimeLimitProposing._proposals({ subject: table }).is({ proposal, proposer, terms: minutes, status: "PENDING" })).form({
    proposal,
    proposer,
    minutes,
    agreed: each(TimeLimitProposing._acceptances({ proposal }).is({ party })).distinct(party),
  }),
);

/**
 * Whether (user) has prep sheets on, and the plan they wrote for (table), or nulls before they write one, so the page
 * can ask for a plan, and show it during the negotiation.
 */
const planOf = former("the plan (user) wrote for (table)", ({ user, table }, { on, target, walkaway, priorities }) =>
  where(
    Preferring._on({ person: user, feature: PREP_SHEET }).is({ on }),
    whether(TargetNoting._note({ author: user, subject: table }).is({ body: target })),
    whether(WalkawayNoting._note({ author: user, subject: table }).is({ body: walkaway })),
    whether(PrioritiesNoting._note({ author: user, subject: table }).is({ body: priorities })),
  ).form({ on, target, walkaway, priorities }),
);

/** The code of the link that invites people to (table), or null when nobody made one, as at a practice table. */
const linkOf = former("the invitation link to (table)", ({ table }, { code }) =>
  each(Inviting._invitations({ subject: table }).is({ code })).first(code),
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
              start: startTalksAt({ table }),
              link: linkOf({ table }),
              plan: planOf({ user, table }),
              notes: notesOf({ user, table }),
              openQuestions: questionsOpenAt({ table }),
              questions: questionsAbout({ table }),
            }),
          )
          .named("seated"),
        where(no(seatedAs({ user, table })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-seated"),
      ),
  { validators: { input: textInput } },
);

// Starting

/** (table) is still preparing: its negotiators are taking their seats and reading their briefs. */
export const preparing = view("(table) is preparing", ({ table }) =>
  where(Tabling._table({ table }).is({ status: "PREPARING" })),
).holds();

/** Every role at a table takes part in agreeing how long its negotiation lasts, from the moment its seat exists. */
const JoinStartTalksForEachSeat = reaction(({ table, role }) =>
  when(Tabling.addSeat({ table, role }).responds({})).then(TimeLimitProposing.join({ subject: table, party: role })),
);

/** Once everyone at a table has agreed to start with a time limit, the negotiation begins and runs for that long. */
const BeginOnceEveryoneAgrees = reaction(({ table, minutes, instant }) =>
  when(TimeLimitProposing.accept({}).responds({ subject: table, terms: minutes, status: "ACCEPTED" }))
    .where(now(instant))
    .then(Tabling.begin({ table, timeLimit: minutes, now: instant })),
);

/**
 * Suggests starting with a time limit, which also says the person is ready. It answers once the flow has settled, with
 * the deadline when the negotiation began then: at a practice table, the counterpart agrees at once. Once the table has
 * begun, TimeLimitProposing refuses a new suggestion with ALREADY_AGREED.
 */
const SuggestStart = endpoint(
  "/tables/start",
  ({ session, table, minutes, user, role, instant, proposal, deadline }) =>
    receive({ session, table, minutes })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(
          now(instant),
          seatedAs({ user, table }).is({ role }),
          no(ended({ table })),
          Tabling._acceptableTimeLimit({ timeLimit: minutes }).is({ acceptable: true }),
          preparedFor({ user, table }),
        ).then(TimeLimitProposing.propose({ subject: table, proposer: role, terms: minutes, now: instant }).responds({ proposal })),
      )
      .afterFlowSettles()
      .where(whether(Tabling._table({ table }).is({ deadline })))
      .then(respond({ proposal, deadline })),
  { validators: { input: inputOf({ minutes: "number" }) } },
);

/**
 * The answers to a suggestion that can't be made. They read only what the suggestion itself can't change, so they never
 * race the endpoint above, which answers in a later stage.
 */
const RefuseStart = endpoint("/tables/start", ({ session, table, minutes, user }) =>
  receive({ session, table, minutes })
    .then(Sessioning.use({ session }).responds({ subject: user }))
    .then(
      where(seatedAs({ user, table }), no(ended({ table })), Tabling._acceptableTimeLimit({ timeLimit: minutes }).is({ acceptable: false }))
        .then(respond({ error: "INVALID_TIME_LIMIT" }))
        .named("invalid"),
      where(seatedAs({ user, table }), ended({ table }))
        .then(respond({ error: "NOT_OPEN" }))
        .named("ended"),
      where(
        seatedAs({ user, table }),
        no(ended({ table })),
        Tabling._acceptableTimeLimit({ timeLimit: minutes }).is({ acceptable: true }),
        no(preparedFor({ user, table })),
      )
        .then(respond({ error: "PLAN_FIRST" }))
        .named("plan-first"),
      where(no(seatedAs({ user, table })))
        .then(respond({ error: "NOT_FOUND" }))
        .named("not-seated"),
    ),
);

/**
 * Agrees to someone else's suggestion to start. It answers once the flow has settled, with the deadline when this was
 * the last agreement. A suggestion that was replaced, or that everyone already agreed to, is refused by
 * TimeLimitProposing with NOT_PENDING_FOR_YOU.
 */
const AgreeToStart = endpoint(
  "/tables/agree",
  ({ session, table, proposal, user, role, status, deadline }) =>
    receive({ session, table, proposal })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(
          seatedAs({ user, table }).is({ role }),
          no(ended({ table })),
          TimeLimitProposing._proposal({ proposal }).is({ subject: table }),
          preparedFor({ user, table }),
        ).then(TimeLimitProposing.accept({ proposal, party: role }).responds({ status })),
      )
      .afterFlowSettles()
      .where(whether(Tabling._table({ table }).is({ deadline })))
      .then(respond({ status, deadline })),
  { validators: { input: textInput } },
);

/** The answers to an agreement that can't be made, which, like the start's, read only what the agreement can't change. */
const RefuseAgreement = endpoint("/tables/agree", ({ session, table, proposal, user }) =>
  receive({ session, table, proposal })
    .then(Sessioning.use({ session }).responds({ subject: user }))
    .then(
      where(seatedAs({ user, table }), no(ended({ table })), no(TimeLimitProposing._proposal({ proposal }).is({ subject: table })))
        .then(respond({ error: "NOT_FOUND" }))
        .named("elsewhere"),
      where(seatedAs({ user, table }), ended({ table }))
        .then(respond({ error: "NOT_OPEN" }))
        .named("ended"),
      where(
        seatedAs({ user, table }),
        no(ended({ table })),
        TimeLimitProposing._proposal({ proposal }).is({ subject: table }),
        no(preparedFor({ user, table })),
      )
        .then(respond({ error: "PLAN_FIRST" }))
        .named("plan-first"),
      where(no(seatedAs({ user, table })))
        .then(respond({ error: "NOT_FOUND" }))
        .named("not-seated"),
    ),
);

// Running the clock

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

/**
 * Expires every table whose time is up, for the timekeeper agent, which asks every half minute. Pages expire a table
 * when its countdown reaches zero, so this catches the tables everyone has left. It answers at once, while the tables
 * expire in the same flow. A person's session is refused by `AgentSessioning.use`.
 */
const ExpireOverdue = endpoint(
  "/timekeeper/expire",
  ({ session, agent, instant, table }) =>
    receive({ session })
      .then(AgentSessioning.use({ session }).responds({ subject: agent }))
      .then(
        where(now(instant), Tabling._overdue({ now: instant }).is({ table }))
          .then(Tabling.expire({ table, now: instant }).responds({}))
          .named("overdue"),
        where(now(instant))
          .then(respond({}))
          .named("answer"),
      ),
  { validators: { input: textInput } },
);

/**
 * Walks away from a negotiation under way, or leaves a table before it begins, such as when a friend never comes.
 * Either way, Tabling records who left, and the table ends without a deal.
 */
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
        where(now(instant), seatedAs({ user, table }), preparing({ table }))
          .then(Tabling.withdraw({ table, negotiator: user, now: instant }).responds({}))
          .then(respond({}))
          .named("preparing"),
        where(now(instant), seatedAs({ user, table }), overdue({ table, instant }))
          .then(Tabling.expire({ table, now: instant }).responds({}))
          .then(respond({ error: "TIME_UP" }))
          .named("time-up"),
        where(seatedAs({ user, table }), ended({ table }))
          .then(respond({ error: "NOT_OPEN" }))
          .named("ended"),
        where(no(seatedAs({ user, table })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-seated"),
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
  access: { seatedAs, began, occupant, openSeats, underWay, overdue, notOpen, ended, preparedFor },
  showing: { ratingsOf, issuesOf, tableAsSeenBy, notesOf, questionsOpenAt, questionsAbout, startTalksAt, linkOf, planOf, ShowTable },
  starting: {
    preparing,
    JoinStartTalksForEachSeat,
    BeginOnceEveryoneAgrees,
    SuggestStart,
    RefuseStart,
    AgreeToStart,
    RefuseAgreement,
  },
  clock: { Expire, ExpireOverdue, Withdraw },
  talking: { Send, WriteNotes },
};
