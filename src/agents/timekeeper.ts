/**
 * The timekeeper, the third agent here. It answers no questions: every half minute, it asks the app to expire the
 * tables whose time is up, so a table ends even when everyone at it has closed the page.
 */

/** How often the timekeeper asks. */
const EVERY_MS = 30_000;

type Result<T> = Promise<T | { error: string }>;

/** The endpoint the timekeeper calls. The generated client has it, and tsc checks that it does. */
interface TimekeeperClient {
  timekeeper: {
    expire(input: { session: string }): Result<object>;
  };
}

/** The assembled app, where the timekeeper starts its session. */
interface AgentApplication {
  concepts: {
    AgentSessioning: { start(input: { subject: string }): Promise<{ session: string } | { error: string }> };
  };
}

export function createTimekeeper({ every = EVERY_MS }: { every?: number } = {}) {
  /** Asks the app to expire overdue tables, then waits `every`, and repeats until the server stops. */
  async function start({ application, api }: { application: AgentApplication; api: TimekeeperClient }) {
    let session: string | undefined;

    async function signIn() {
      const started = await application.concepts.AgentSessioning.start({ subject: "timekeeper" });
      if ("error" in started) throw new Error(`The timekeeper couldn't sign in: ${started.error}`);
      session = started.session;
      return session;
    }

    for (;;) {
      try {
        const swept = await api.timekeeper.expire({ session: session ?? (await signIn()) });
        // A session that ended, such as after a week of the server being off, is started again.
        if ("error" in swept && swept.error === "NOT_SIGNED_IN") await api.timekeeper.expire({ session: await signIn() });
      } catch (error) {
        console.error("The timekeeper couldn't reach its endpoint, and will try again:", error);
      }
      await new Promise((resolve) => setTimeout(resolve, every));
    }
  }

  return { start };
}
