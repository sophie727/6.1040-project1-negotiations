/** The pastry on each scenario's card, as in the bakery sketch; a scenario without one gets a cupcake. */
const pastries: Record<string, string> = {
  "The Job Offer": "🥐",
  "The Launch Room": "🥨",
  "Joint Venture": "🍰",
  "House Sale": "🥖",
  "Legal Dispute": "🥧",
};

export function pastryFor(scenarioName: string): string {
  return pastries[scenarioName] ?? "🧁";
}

/** How a table's status reads in a list of negotiations. */
export const statusLabels: Record<string, string> = {
  PREPARING: "Preparing",
  OPEN: "Under way",
  SETTLED: "Deal reached",
  WITHDRAWN: "Walked away",
  EXPIRED: "Time ran out",
};
