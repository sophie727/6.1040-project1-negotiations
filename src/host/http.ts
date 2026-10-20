import { httpPolicy, type HttpPolicy } from "@mit-sdg/sync-engine-http/policy";
import { accountsHttp } from "../compositions/reusable/accounts.ts";
import { commonsHttp } from "../compositions/reusable/commons.ts";
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
  // Writing a scenario.
  INVALID_SCENARIO_NAME: "INVALID_REQUEST",
  NAME_TAKEN: "CONFLICT",
  PUBLISHED: "CONFLICT",
  ALREADY_PUBLISHED: "CONFLICT",
  INCOMPLETE: "CONFLICT",
  INVALID_KIND: "INVALID_REQUEST",
  INVALID_ISSUE_NAME: "INVALID_REQUEST",
  ISSUE_EXISTS: "CONFLICT",
  UNIT_NOT_ALLOWED: "INVALID_REQUEST",
  INVALID_OPTION_NAME: "INVALID_REQUEST",
  OPTION_EXISTS: "CONFLICT",
  VALUE_REQUIRED: "INVALID_REQUEST",
  VALUE_NOT_ALLOWED: "INVALID_REQUEST",
  VALUE_TAKEN: "CONFLICT",
  INVALID_ROLE_NAME: "INVALID_REQUEST",
  ROLE_EXISTS: "CONFLICT",
  INVALID_BRIEF: "INVALID_REQUEST",
  // A draft, or part of one, that another request removed a moment before.
  UNKNOWN_SCENARIO: "NOT_FOUND",
  UNKNOWN_ISSUE: "NOT_FOUND",
  UNKNOWN_OPTION: "NOT_FOUND",
  UNKNOWN_ROLE: "NOT_FOUND",
  UNKNOWN_ROLE_OR_OPTION: "NOT_FOUND",
  DIFFERENT_SCENARIOS: "NOT_FOUND",
} as const;

/**
 * The HTTP settings: the API under /api, each refusal returned as an HTTP category, the session in an HttpOnly cookie
 * that signing up or in, with a password or with Commons, sets and signing out clears, and a Commons sign-in attempt in
 * a second cookie that only the browser that started it holds.
 */
export function wholePiePolicy(publicOrigin: string): HttpPolicy {
  return httpPolicy({
    publicOrigin,
    basePath: "/api",
    publicErrors: { ...accountsHttp.publicErrors, ...passwordsHttp.publicErrors, ...commonsHttp.publicErrors, ...publicErrors },
    cookies: {
      session: accountsHttp.sessionCookie("wholepie-session", [...passwordsHttp.startingSessions, ...commonsHttp.startingSessions]),
      signIn: commonsHttp.signInCookie("wholepie-sign-in"),
    },
  });
}
