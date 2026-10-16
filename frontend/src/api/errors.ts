/**
 * The sentence to show for each HTTP category, by endpoint outside `/auth`. Each refusal is mapped to its category in
 * `src/host/http.ts`, so several refusals can share one sentence here.
 */
const messages: Record<string, Record<string, string>> = {
  "/practice/start": {
    NOT_FOUND: "That scenario or role isn't available.",
    INVALID_REQUEST: "The time limit must be a whole number of minutes from 1 to 180.",
  },
  "/tables/begin": { CONFLICT: "This negotiation has already started." },
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
  "/tables/withdraw": { CONFLICT: "This negotiation isn't under way." },
  "/tables/notes": { INVALID_REQUEST: "Notes can have at most 20,000 characters." },
  "/tables/debrief": { CONFLICT: "This negotiation hasn't ended yet." },
};

/** The sentence to show when the endpoint at `path` returns `error`. */
export function messageFor(path: string, error: string): string {
  const fallback =
    error === "NOT_FOUND"
      ? "This negotiation isn't yours, or doesn't exist."
      : error === "TRANSPORT_ERROR"
        ? "The server couldn't be reached. Check your connection and try again."
        : "Something went wrong. Try again.";
  return messages[path]?.[error] ?? fallback;
}
