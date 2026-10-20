/**
 * The sentence to show for each HTTP category, by endpoint outside `/auth`. Each refusal is mapped to its category in
 * `src/host/http.ts`, so several refusals can share one sentence here.
 */
const messages: Record<string, Record<string, string>> = {
  "/practice/start": { NOT_FOUND: "That scenario or role isn't available." },
  "/friends/start": { NOT_FOUND: "That scenario or role isn't available." },
  "/friends/invitation": {
    NOT_FOUND: "This invitation link doesn't work. Check that you copied all of it.",
    CONFLICT: "Every seat at this table is taken, or its negotiation has already started.",
  },
  "/matchmaking/find": { NOT_FOUND: "That scenario isn't available." },
  "/matchmaking/wait": { NOT_FOUND: "That search isn't yours, or doesn't exist." },
  "/friends/join": {
    NOT_FOUND: "This invitation link doesn't work. Check that you copied all of it.",
    CONFLICT: "Someone took that seat a moment ago, or the negotiation has already started.",
  },
  "/tables/start": {
    INVALID_REQUEST: "Choose a whole number of minutes from 1 to 180.",
    CONFLICT: "You can't start now: fill in your plan first, or the negotiation has already started or ended.",
  },
  "/tables/agree": {
    NOT_FOUND: "That suggestion isn't from this negotiation.",
    CONFLICT: "You can't agree now: fill in your plan first, or that suggestion was replaced, or the negotiation started.",
  },
  "/tables/plan": { INVALID_REQUEST: "Each part of your plan can have at most 20,000 characters." },
  "/tables/send": {
    INVALID_REQUEST: "A message must have 1 to 2,000 characters.",
    CONFLICT: "This negotiation is over.",
  },
  "/tables/propose": {
    INVALID_REQUEST: "Agree on every issue, within its range.",
    CONFLICT: "You can't propose now: the negotiation is over, or you've already reached a deal.",
  },
  "/tables/accept": {
    CONFLICT: "That proposal is no longer waiting for your answer.",
    NOT_FOUND: "That proposal isn't from this negotiation.",
  },
  "/tables/reject": {
    CONFLICT: "That proposal is no longer waiting for your answer.",
    NOT_FOUND: "That proposal isn't from this negotiation.",
  },
  "/tables/retract": {
    CONFLICT: "That proposal is no longer waiting for an answer.",
    NOT_FOUND: "That proposal isn't from this negotiation.",
  },
  "/tables/withdraw": { CONFLICT: "This negotiation has already ended." },
  "/tables/review": {
    INVALID_REQUEST: "Give 1 to 5 stars.",
    CONFLICT: "You've already reviewed them for this negotiation.",
    NOT_FOUND: "There's nobody to review in that seat.",
  },
  "/tables/notes": { INVALID_REQUEST: "Notes can have at most 20,000 characters." },
  "/tables/debrief": { CONFLICT: "This negotiation hasn't ended yet." },
  "/scenarios/show": { NOT_FOUND: "This scenario isn't yours, or doesn't exist." },
  "/scenarios/create": {
    INVALID_REQUEST: "A name must have 1 to 100 characters.",
    CONFLICT: "A scenario with that name already exists.",
  },
  "/scenarios/rename": {
    INVALID_REQUEST: "A name must have 1 to 100 characters.",
    CONFLICT: "A scenario with that name already exists.",
  },
  "/scenarios/limit": {
    INVALID_REQUEST: "Choose a whole number of minutes from 1 to 180.",
    CONFLICT: "A published scenario can't change.",
  },
  "/scenarios/discard": { CONFLICT: "A published scenario can't be discarded." },
  "/scenarios/publish": {
    CONFLICT: "It isn't ready yet: it needs an issue, two options for every issue, two roles, and a brief for every role.",
  },
  "/scenarios/issues/add": {
    INVALID_REQUEST: "An issue name must have 1 to 100 characters.",
    CONFLICT: "This scenario already has an issue with that name.",
  },
  "/scenarios/issues/update": {
    INVALID_REQUEST: "An issue name must have 1 to 100 characters.",
    CONFLICT: "This scenario already has an issue with that name.",
  },
  "/scenarios/issues/remove": { CONFLICT: "A published scenario can't change." },
  "/scenarios/options/add": {
    INVALID_REQUEST: "An option name must have 1 to 100 characters.",
    CONFLICT: "This issue already has an option with that name or value.",
  },
  "/scenarios/options/update": {
    INVALID_REQUEST: "An option name must have 1 to 100 characters.",
    CONFLICT: "This issue already has an option with that name or value.",
  },
  "/scenarios/options/remove": { CONFLICT: "A published scenario can't change." },
  "/scenarios/roles/add": {
    INVALID_REQUEST: "A role name must have 1 to 100 characters.",
    CONFLICT: "This scenario already has a role with that name.",
  },
  "/scenarios/roles/update": {
    INVALID_REQUEST: "A role name must have 1 to 100 characters.",
    CONFLICT: "This scenario already has a role with that name.",
  },
  "/scenarios/roles/remove": { CONFLICT: "A published scenario can't change." },
  "/scenarios/roles/brief": { INVALID_REQUEST: "A brief must have 1 to 20,000 characters." },
  "/scenarios/payoffs/set": { CONFLICT: "A published scenario can't change." },
};

/** The sentence to show when the endpoint at `path` returns `error`. */
export function messageFor(path: string, error: string): string {
  const fallback =
    error === "NOT_FOUND"
      ? path.startsWith("/scenarios/")
        ? "This scenario isn't yours, or doesn't exist."
        : "This negotiation isn't yours, or doesn't exist."
      : error === "TRANSPORT_ERROR"
        ? "The server couldn't be reached. Check your connection and try again."
        : "Something went wrong. Try again.";
  return messages[path]?.[error] ?? fallback;
}
