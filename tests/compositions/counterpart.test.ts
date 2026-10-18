import { describe, expect, test } from "bun:test";
import { decision, standIn, type TableMaterial, waitingProposal } from "../../src/agents/counterpart.ts";
import { type Reasoner, ReasonerFailure } from "../../src/agents/reusable/agent.ts";
import { DECISION_ASK } from "../../src/compositions/counterpart.ts";
import { startWholePie } from "../support/app.ts";
import { eventually, ok } from "../support/reusable/results.ts";

const WHOLE_PIE = { "Start date": 0, Salary: 120000, "Health Insurance": "Full Coverage", Bonus: 0, "Position title": "Director" };
const GREEDY = { "Start date": 59, Salary: 120000, "Health Insurance": "Full Coverage", Bonus: 10000, "Position title": "Director" };

/** A reasoner that agrees to everything, writing its answer without the agent's BATNA check, as a careless model might. */
const pushover: Reasoner<TableMaterial> = {
  name: "pushover",
  async answer(ask, table, write) {
    if (ask !== DECISION_ASK) return write("Sure, whatever you like.");
    const proposal = waitingProposal(table);
    if (proposal === undefined) throw new ReasonerFailure("No proposal was waiting for an answer.");
    await write(`ACCEPT\n${proposal.proposal}\nDeal!`);
  },
};

describe("the counterpart", () => {
  test("it never accepts a proposal worth less than its BATNA, even when its answer says to", async () => {
    const { api, practice } = await startWholePie({ counterpart: pushover });
    const { session, table, terms, show } = await practice("nadia");
    ok(await api.tables.begin({ session, table }));

    const { proposal } = ok(await api.tables.propose({ session, table, terms: terms(GREEDY) }));
    await eventually(async () => expect((await show()).table.proposals).toMatchObject([{ proposal, status: "REJECTED" }]));
    expect((await show()).table.status).toBe("OPEN");

    ok(await api.tables.propose({ session, table, terms: terms(WHOLE_PIE) }));
    await eventually(async () => expect((await show()).table.status).toBe("SETTLED"));
  });

  test("a decision applies only to the proposal it decided on, not to a newer one", async () => {
    let decided = () => {};
    const deciding = new Promise<void>((resolve) => {
      decided = resolve;
    });
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Decides on the proposal it read, then waits while Nadia replaces it.
    const slow: Reasoner<TableMaterial> = {
      name: "slow",
      async answer(ask, table, write) {
        const answer = standIn(ask, table);
        if (ask === DECISION_ASK) {
          decided();
          await held;
        }
        await write(answer);
      },
    };
    const { api, practice } = await startWholePie({ counterpart: slow });
    const { session, table, terms, show } = await practice("nadia");
    ok(await api.tables.begin({ session, table }));

    const { proposal: greedy } = ok(await api.tables.propose({ session, table, terms: terms(GREEDY) }));
    await deciding;
    const { proposal: fair } = ok(await api.tables.propose({ session, table, terms: terms(WHOLE_PIE) }));
    release();

    await eventually(async () => expect((await show()).table.status).toBe("SETTLED"));
    expect((await show()).table.proposals).toMatchObject([
      { proposal: greedy, status: "SUPERSEDED" },
      { proposal: fair, status: "ACCEPTED" },
    ]);
  });

  test("when the counterpart can't answer, the table says why, and the next message asks again", async () => {
    let reachable = false;
    const flaky: Reasoner<TableMaterial> = {
      name: "flaky",
      async answer(ask, table, write) {
        if (!reachable) throw new ReasonerFailure("The model couldn't be reached.");
        await write(standIn(ask, table));
      },
    };
    const { api, practice } = await startWholePie({ counterpart: flaky });
    const { session, table, show } = await practice("nadia");
    ok(await api.tables.begin({ session, table }));

    ok(await api.tables.send({ session, table, body: "Hello, Manon." }));
    await eventually(async () =>
      expect(await show()).toMatchObject({ openQuestions: 0, questions: [{ stage: "ABANDONED", reason: "The model couldn't be reached." }] }),
    );

    reachable = true;
    ok(await api.tables.send({ session, table, body: "Are you there?" }));
    await eventually(async () =>
      expect(await show()).toMatchObject({ questions: [{ stage: "ABANDONED" }, { stage: "CONCLUDED", reason: null }] }),
    );
    expect((await show()).table.messages).toHaveLength(3);
  });

  test("the stand-in replies with a canned message and answers each proposal by its worth to its role", () => {
    const table = {
      role: "manon",
      batna: 1000,
      messages: [],
      proposals: [
        { proposal: "p1", proposer: "hiro", status: "REJECTED", points: 200 },
        { proposal: "p2", proposer: "hiro", status: "PENDING", points: 1100 },
      ],
    } as unknown as TableMaterial;
    expect(standIn(DECISION_ASK, table)).toBe("ACCEPT\np2\nThat works for me. We have a deal.");
    expect(decision(table.proposals[1]!, { ...table, batna: 1200 }, true, "Deal!\n")).toBe("REJECT\np2\nDeal!");
    expect(() => standIn(DECISION_ASK, { ...table, proposals: [] })).toThrow(ReasonerFailure);
  });
});
