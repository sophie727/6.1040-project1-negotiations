import { api, type Scenario } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import { go } from "../router.ts";

/** The time limit a new table gets when its scenario's author recommended none. */
export const DEFAULT_TIME_LIMIT = 30;

/**
 * Opens a practice table for `scenario`, playing `role`, and goes to it. Returns the sentence to show when the request
 * is refused, or null once the table is open.
 */
export async function startPractice(
  scenario: Scenario,
  role: Scenario["roles"][number]["role"],
  timeLimit: number,
): Promise<string | null> {
  const result = await api.practice.start({ scenario: scenario.scenario, role, timeLimit });
  if ("error" in result) {
    if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
    return messageFor("/practice/start", result.error);
  }
  go(`/tables/${result.table}`);
  return null;
}
