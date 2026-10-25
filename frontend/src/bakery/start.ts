import { api, type Scenario } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import { go } from "../router.ts";

/** The time limit the bakery shows for a scenario whose author recommended none; the prep page suggests it too. */
export const DEFAULT_TIME_LIMIT = 30;

/** Who the person negotiates against: the AI counterpart, friends they invite with a link, or someone new. */
export type Opponents = "ai" | "friends" | "strangers";

/**
 * Opens a practice table for `scenario`, playing `role`, and goes to it. Returns the sentence to show when the request
 * is refused, or null once the table is open. How long to negotiate is chosen on the prep page.
 */
export async function startPractice(scenario: Scenario, role: Scenario["roles"][number]["role"]): Promise<string | null> {
  const result = await api.practice.start({ scenario: scenario.scenario, role });
  if ("error" in result) {
    if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
    return messageFor("/practice/start", result.error);
  }
  go(`/tables/${result.table}`);
  return null;
}

/**
 * Opens a table for `scenario` where the person plays `role` and invites friends, and goes to it, where the link to
 * share is. Returns the sentence to show when the request is refused, or null once the table is open.
 */
export async function startWithFriends(scenario: Scenario, role: Scenario["roles"][number]["role"]): Promise<string | null> {
  const result = await api.friends.start({ scenario: scenario.scenario, role });
  if ("error" in result) {
    if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
    return messageFor("/friends/start", result.error);
  }
  go(`/tables/${result.table}`);
  return null;
}
