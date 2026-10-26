import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, former, no, view, whether, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { textInput } from "./reusable/inputs.ts";

const { Briefing, Posting, Registering, Sessioning } = concepts;

/**
 * The username of the admin account. The server registers it on every start, before anyone can sign up, so nobody else
 * can take it, and Registering never changes a username, so whoever has it is the admin.
 */
export const ADMIN = "admin";

// Access

/** (user) is the admin. */
export const isAdmin = view("(user) is the admin", ({ user }) => where(Registering._username({ user }).is({ username: ADMIN }))).holds();

/** The username of whoever archived (scenario), while it is archived. */
export const archivedBy = view("the username of whoever archived (scenario)", ({ scenario }, { username }, { archiver }) =>
  where(Posting._archiver({ item: scenario }).is({ archiver }), Registering._username({ user: archiver }).is({ username })),
).optional();

/** The admin archived (scenario), so only the admin can put it back in the bakery. */
export const archivedByAdmin = view("the admin archived (scenario)", ({ scenario }, _outputs, { archiver }) =>
  where(Posting._archiver({ item: scenario }).is({ archiver }), isAdmin({ user: archiver })),
).holds();

// Overseeing

/**
 * Every posted scenario, archived or not, in the order they were posted, each with its name, its author's username,
 * whether it is archived, and the username of whoever archived it, or null.
 */
const postedScenarios = former(
  "every posted scenario",
  (_input, { scenario, archived, name, author, authorName, archiver }) =>
    each(Posting._posts({}).is({ item: scenario, archived }))
      .where(
        Briefing._scenario({ scenario }).is({ name, author }),
        Registering._username({ user: author }).is({ username: authorName }),
        whether(archivedBy({ scenario }).is({ username: archiver })),
      )
      .form({ scenario, name, author: authorName, archived, archivedBy: archiver }),
);

/** Lists every posted scenario for the admin, so they can archive any of them; anyone else is refused as if it weren't there. */
const ShowPosted = endpoint(
  "/admin/scenarios",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(isAdmin({ user }))
          .then(respond({ scenarios: postedScenarios({}) }))
          .named("admin"),
        where(no(isAdmin({ user })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-admin"),
      ),
  { validators: { input: textInput } },
);

export const composition = {
  access: { isAdmin, archivedBy, archivedByAdmin },
  overseeing: { postedScenarios, ShowPosted },
};
