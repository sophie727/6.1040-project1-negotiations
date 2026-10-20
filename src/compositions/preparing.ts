import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { inputOf, textInput } from "./reusable/inputs.ts";
import { PREP_SHEET, seatedAs } from "./table.ts";

const { Preferring, PrioritiesNoting, Sessioning, TargetNoting, WalkawayNoting } = concepts;

// Settings

/** The person's settings: for now, only whether they write a prep sheet before each negotiation. */
const ShowSettings = endpoint(
  "/settings/show",
  ({ session, user, on }) =>
    receive({ session })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(where(Preferring._on({ person: user, feature: PREP_SHEET }).is({ on })).then(respond({ prepSheet: on }))),
  { validators: { input: textInput } },
);

/** Turns prep sheets on. */
const TurnPrepSheetsOn = endpoint(
  "/settings/prep-sheet",
  ({ session, user }) =>
    receive({ session, on: true })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(Preferring.turnOn({ person: user, feature: PREP_SHEET }).responds({}))
      .then(respond({ prepSheet: true })),
  { validators: { input: inputOf({ on: "flag" }) } },
);

/** Turns prep sheets off. */
const TurnPrepSheetsOff = endpoint("/settings/prep-sheet", ({ session, user }) =>
  receive({ session, on: false })
    .then(Sessioning.use({ session }).responds({ subject: user }))
    .then(Preferring.turnOff({ person: user, feature: PREP_SHEET }).responds({}))
    .then(respond({ prepSheet: false })),
);

// Planning

/**
 * Saves the person's plan for a table where they sit: their target, their walkaway, and their priorities, each as a
 * note about the table that replaces the one before.
 */
const WritePlan = endpoint(
  "/tables/plan",
  ({ session, table, target, walkaway, priorities, user }) =>
    receive({ session, table, target, walkaway, priorities })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(seatedAs({ user, table }))
          .then(TargetNoting.write({ author: user, subject: table, body: target }).responds({}))
          .then(WalkawayNoting.write({ author: user, subject: table, body: walkaway }).responds({}))
          .then(PrioritiesNoting.write({ author: user, subject: table, body: priorities }).responds({}))
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
