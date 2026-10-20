import { httpPolicy, type HttpPolicy } from "@mit-sdg/sync-engine-http/policy";
import { accountsHttp } from "../compositions/reusable/accounts.ts";
import { passwordsHttp } from "../compositions/reusable/passwords.ts";

/**
 * The HTTP category the server returns for each refusal a person can meet through the compositions in
 * `src/compositions/`. A refusal missing here reaches the browser as INTERNAL_ERROR (500), so each new refusal needs a
 * line. The browser receives only the category; the frontend says what it means for each endpoint.
 */
const publicErrors = {
  NOT_FOUND: "NOT_FOUND",
  NOT_SEATED: "NOT_FOUND",
  INVALID_TIME_LIMIT: "INVALID_REQUEST",
  INVALID_MESSAGE: "INVALID_REQUEST",
  INVALID_TERMS: "INVALID_REQUEST",
  TOO_LONG: "INVALID_REQUEST",
  ALREADY_BEGUN: "CONFLICT",
  TABLE_FULL: "CONFLICT",
  ROLE_TAKEN: "CONFLICT",
  ALREADY_SEATED: "CONFLICT",
  NO_SUCH_SEAT: "NOT_FOUND",
  NOT_WAITING: "CONFLICT",
  LAPSED: "CONFLICT",
  INVALID_SIZE: "INVALID_REQUEST",
  INVALID_STARS: "INVALID_REQUEST",
  SELF_REVIEW: "INVALID_REQUEST",
  ALREADY_REVIEWED: "CONFLICT",
  PLAN_FIRST: "CONFLICT",
  // A table opened before the start handshake existed has roles that never joined its start talks.
  NOT_A_PARTICIPANT: "CONFLICT",
  NO_OTHER_PARTICIPANTS: "CONFLICT",
  NOT_ALL_SEATED: "CONFLICT",
  NOT_ENOUGH_SEATS: "CONFLICT",
  NOT_OPEN: "CONFLICT",
  TIME_UP: "CONFLICT",
  NOT_DUE: "CONFLICT",
  NOT_OVER: "CONFLICT",
  ALREADY_AGREED: "CONFLICT",
  NOT_PENDING_FOR_YOU: "CONFLICT",
  ALREADY_ACCEPTED: "CONFLICT",
  NOT_PENDING_FROM_YOU: "CONFLICT",
} as const;

/** The HTTP settings: the API under /api, each refusal returned as an HTTP category, and the session in an HttpOnly cookie that signing up or in sets and signing out clears. */
export function wholePiePolicy(publicOrigin: string): HttpPolicy {
  return httpPolicy({
    publicOrigin,
    basePath: "/api",
    publicErrors: { ...accountsHttp.publicErrors, ...passwordsHttp.publicErrors, ...publicErrors },
    cookies: { session: accountsHttp.sessionCookie("wholepie-session", passwordsHttp.startingSessions) },
  });
}
