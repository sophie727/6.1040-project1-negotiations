import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, no, view, whether, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { playable } from "./practice.ts";
import { textInput } from "./reusable/inputs.ts";
import { openSeats, preparing, seatedAs } from "./table.ts";

const { Briefing, Inviting, Registering, Sessioning, Tabling } = concepts;

// Starting

/**
 * Opens a table to negotiate with friends. The person takes the role they chose and gets an invitation to share; the
 * table's other seats wait for whoever follows its link.
 */
const StartWithFriends = endpoint(
  "/friends/start",
  ({ session, scenario, role, user, table }) =>
    receive({ session, scenario, role })
      .where(playable({ scenario, role }))
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Tabling.open({ scenario }).responds({ table }))
      // A reaction in the table composition adds a seat for each role; once it has, take the chosen one.
      .afterFlowSettles()
      .then(Tabling.seat({ table, negotiator: user, role }).responds({}))
      .then(Inviting.invite({ subject: table, inviter: user }).responds({}))
      .then(respond({ table })),
  { validators: { input: textInput } },
);

const RefuseUnplayable = endpoint("/friends/start", ({ session, scenario, role }) =>
  receive({ session, scenario, role })
    .where(no(playable({ scenario, role })))
    .then(respond({ error: "NOT_FOUND" })),
);

// Joining

/** The table that the invitation with (code) lets people into. */
const invitedTo = view("the table the invitation (code) lets people into", ({ code }, { table }) =>
  where(Inviting._invitation({ code }).is({ subject: table })),
).optional();

/** (table) is waiting for someone: it hasn't begun, and one of its seats is empty. */
const waitingForSomeone = view("(table) is waiting for someone", ({ table }) =>
  where(preparing({ table }), openSeats({ table })),
).holds();

/**
 * The invitation to (table) from (inviter), as someone invited sees it: the scenario and its recommended time limit,
 * the username of the person who sent it, and the empty seats they could take.
 */
const invitationTo = former(
  "the invitation to (table) from (inviter)",
  ({ table, inviter }, { scenario, scenarioName, username, timeLimit, role, name }) =>
    where(
      Tabling._table({ table }).is({ scenario }),
      Briefing._scenario({ scenario }).is({ name: scenarioName }),
      Registering._username({ user: inviter }).is({ username }),
      whether(Tabling._recommendedTimeLimit({ scenario }).is({ timeLimit })),
    ).form({
      scenarioName,
      inviter: username,
      recommendedTimeLimit: timeLimit,
      openSeats: each(openSeats({ table }).is({ role }))
        .where(Briefing._role({ role }).is({ name }))
        .form({ role, name }),
    }),
);

const ShowInvitation = endpoint(
  "/friends/invitation",
  ({ session, code, user, table, inviter }) =>
    receive({ session, code })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(
          Inviting._invitation({ code }).is({ subject: table, inviter }),
          no(seatedAs({ user, table })),
          waitingForSomeone({ table }),
        )
          .then(respond({ invitation: invitationTo({ table, inviter }) }))
          .named("open"),
        where(invitedTo({ code }).is({ table }), seatedAs({ user, table }))
          .then(respond({ table }))
          .named("joined"),
        where(invitedTo({ code }).is({ table }), no(seatedAs({ user, table })), no(waitingForSomeone({ table })))
          .then(respond({ error: "TABLE_FULL" }))
          .named("full"),
        where(no(invitedTo({ code })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("unknown"),
      ),
  { validators: { input: textInput } },
);

/**
 * Takes the seat for (role) at the table the invitation lets people into, and answers once the new seat has joined the
 * table's proposals. Tabling refuses a seat someone already took with ROLE_TAKEN, someone already at the table with
 * ALREADY_SEATED, and a table that has begun or ended with ALREADY_BEGUN.
 */
const Join = endpoint(
  "/friends/join",
  ({ session, code, role, user, table }) =>
    receive({ session, code, role })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(where(invitedTo({ code }).is({ table })).then(Tabling.seat({ table, negotiator: user, role }).responds({})))
      .afterFlowSettles()
      .then(respond({ table })),
  { validators: { input: textInput } },
);

/** Refuses a code that no invitation has. */
const RefuseUnknownCode = endpoint("/friends/join", ({ session, code, role }) =>
  receive({ session, code, role })
    .where(no(invitedTo({ code })))
    .then(respond({ error: "NOT_FOUND" })),
);

export const composition = {
  starting: { StartWithFriends, RefuseUnplayable },
  joining: { invitedTo, waitingForSomeone, invitationTo, ShowInvitation, Join, RefuseUnknownCode },
};
