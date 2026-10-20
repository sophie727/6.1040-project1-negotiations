import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { inputOf, textInput } from "./reusable/inputs.ts";
import { seatedAs } from "./table.ts";

const { Preparing, Sessioning } = concepts;

// Settings

/** The person's settings: for now, only whether they write a prep sheet before each negotiation. */
const ShowSettings = endpoint(
  "/settings/show",
  ({ session, user, on }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(where(Preparing._planner({ author: user }).is({ on })).then(respond({ prepSheet: on }))),
  { validators: { input: textInput } },
);

/** Turns prep sheets on. */
const TurnPrepSheetsOn = endpoint(
  "/settings/prep-sheet",
  ({ session, user }) =>
    receive({ session, on: true })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Preparing.turnOn({ author: user }).responds({}))
      .then(respond({ prepSheet: true })),
  { validators: { input: inputOf({ on: "flag" }) } },
);

/** Turns prep sheets off. */
const TurnPrepSheetsOff = endpoint("/settings/prep-sheet", ({ session, user }) =>
  receive({ session, on: false })
    .then(Sessioning.use({ session }).responds({ subject: user }))
    .then(Preparing.turnOff({ author: user }).responds({}))
    .then(respond({ prepSheet: false })),
);

// Planning

/** Saves the person's plan for a table where they sit: their target, their walkaway, and their priorities. */
const WritePlan = endpoint(
  "/tables/plan",
  ({ session, table, target, walkaway, priorities, user }) =>
    receive({ session, table, target, walkaway, priorities })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(seatedAs({ user, table }))
          .then(Preparing.plan({ author: user, subject: table, target, walkaway, priorities }).responds({}))
          .then(respond({}))
          .named("seated"),
        where(no(seatedAs({ user, table })))
          .then(respond({ error: "NOT_FOUND" }))
          .named("not-seated"),
      ),
  { validators: { input: textInput } },
);

export const composition = {
  settings: { ShowSettings, TurnPrepSheetsOn, TurnPrepSheetsOff },
  planning: { WritePlan },
};
