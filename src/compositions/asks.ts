/**
 * The questions the app asks its agents in Reasoning. Reactions and the agents in `src/agents/` match prompts by this
 * exact text, so rewording a question leaves its waiting prompts unanswered. They live here, apart from the
 * compositions that ask them, so the table can tell the counterpart's questions from the coach's without importing
 * either composition.
 */

/** The counterpart's question when someone else sends a message. */
export const REPLY_ASK = "What do you say next to the other side?";

/**
 * The counterpart's question when someone else proposes. The answer's lines are ACCEPT or REJECT, the proposal it
 * answers, and then what the counterpart says about it, one message per line. The agent writes the proposal from what it
 * read, so a decision can't apply to a newer proposal than the one decided on.
 */
export const DECISION_ASK = "Do you accept the proposal waiting for your answer?";

/** The coach's question when a practice negotiation ends: a debrief of the person. */
export const DEBRIEF_ASK = "How did the person negotiate, and what could they do better next time?";

/** The coach's question when a negotiation between people ends: one debrief for everyone at the table, about each side. */
export const JOINT_DEBRIEF_ASK = "How did each side negotiate, and what could each do better next time?";
