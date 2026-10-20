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
    ok(await api.tables.start({ session, table, minutes: 30 }));

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
    ok(await api.tables.start({ session, table, minutes: 30 }));

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
    ok(await api.tables.start({ session, table, minutes: 30 }));

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

  test("each line of the counterpart's reply, or of what it says about a proposal, arrives as its own message, in order", async () => {
    const talkative: Reasoner<TableMaterial> = {
      name: "talkative",
      async answer(ask, table, write) {
        if (ask !== DECISION_ASK) return write("Thanks for coming in.\nLet's start with the start date.\nWhat's driving your timing?");
        await write(decision(waitingProposal(table)!, table, false, "Not at that salary.\nCould you move on the bonus?"));
      },
    };
    const { api, practice } = await startWholePie({ counterpart: talkative });
    const { session, table, roles, terms, show } = await practice("nadia");
    ok(await api.tables.start({ session, table, minutes: 30 }));

    ok(await api.tables.send({ session, table, body: "Hello, Manon." }));
    await eventually(async () => expect((await show()).table.messages).toHaveLength(4));
    ok(await api.tables.propose({ session, table, terms: terms(GREEDY) }));
    await eventually(async () => expect((await show()).table.messages).toHaveLength(6));

    const said = (await show()).table.messages.filter(({ sender }) => sender === roles.Manon).map(({ body }) => body);
    expect(said).toEqual([
      "Thanks for coming in.",
      "Let's start with the start date.",
      "What's driving your timing?",
      "Not at that salary.",
      "Could you move on the bonus?",
    ]);
  });

  test("the stand-in replies with a canned message and answers each proposal by its worth to its role", () => {
    const table = {
      role: "manon",
      batna: 1000,
      messages: [],
      proposals: [
        { proposal: "p1", proposer: "hiro", status: "REJECTED", points: 200, acceptedBy: [] },
        { proposal: "p2", proposer: "hiro", status: "PENDING", points: 1100, acceptedBy: [] },
      ],
    } as unknown as TableMaterial;
    expect(standIn(DECISION_ASK, table)).toBe("ACCEPT\np2\nThat works for me. We have a deal.");
    expect(decision(table.proposals[1]!, { ...table, batna: 1200 }, true, "Deal!\n")).toBe("REJECT\np2\nDeal!");
    expect(() => standIn(DECISION_ASK, { ...table, proposals: [] })).toThrow(ReasonerFailure);
  });
});

/** The whole pie of The Launch Room, worth 1,000 points to Mandy, 1,050 to Presley, and 1,100 to Sally. */
const LAUNCH_PIE = {
  "Launch date": 45,
  "Halvorsen integration": "Within 60 days of launch",
  "List price": 60,
  "Halvorsen's discount": 40,
  "Early access": "Exclusive for Halvorsen",
  "Design authority": "Product decides alone",
};
/** Everything Mandy wants, with nothing for Presley: 550 points to him, below his BATNA of 800. */
const MANDYS_WAY = {
  "Launch date": 45,
  "Halvorsen integration": "Not planned",
  "List price": 60,
  "Halvorsen's discount": 0,
  "Early access": "None before launch",
  "Design authority": "Anyone can veto",
};

describe("several counterparts", () => {
  test("at The Launch Room, a counterpart takes each seat Mandy doesn't, and both agree to start at once", async () => {
    const { api, application, practice } = await startWholePie();
    const { session, table, roles, show } = await practice("mandy", "Mandy", "The Launch Room");

    const preparing = (await show()).table;
    expect(preparing.seats).toMatchObject([
      { name: "Mandy", player: "mandy" },
      { name: "Presley", player: null },
      { name: "Sally", player: null },
    ]);
    expect(preparing.openSeats).toEqual([]);
    // Tabling seats each player once at a table, so the second counterpart is a player of its own, named for its role.
    const players = (await application.concepts.Tabling._seats({ table })).filter(({ role }) => role !== roles.Mandy);
    const second = players.find(({ negotiator }) => negotiator !== "bot:counterpart")!;
    expect(players.map(({ negotiator }) => negotiator)).toContain("bot:counterpart");
    expect(second.negotiator).toBe(`bot:counterpart:${second.role}`);

    ok(await api.tables.start({ session, table, minutes: 45 }));
    expect((await show()).table).toMatchObject({ status: "OPEN", timeLimit: 45 });
  });

  test("the counterpart Mandy names replies first, the other adds to it, and then the round ends", async () => {
    const { api, practice } = await startWholePie();
    const { session, table, roles, show } = await practice("mandy", "Mandy", "The Launch Room");
    ok(await api.tables.start({ session, table, minutes: 45 }));

    ok(await api.tables.send({ session, table, body: "Sally, what does Halvorsen need from this launch?" }));
    await eventually(async () => {
      const shown = await show();
      expect(shown.table.messages.map(({ sender }) => sender)).toEqual([roles.Mandy, roles.Sally, roles.Presley]);
      // The reply, Presley's addition, and the question that found nobody else with anything to add.
      expect(shown).toMatchObject({ openQuestions: 0, questions: [{ stage: "CONCLUDED" }, { stage: "CONCLUDED" }, { stage: "CONCLUDED" }] });
    });

    // A message that names nobody is answered first by whoever has gone longest without speaking.
    ok(await api.tables.send({ session, table, body: "What about the launch date?" }));
    await eventually(async () => {
      const shown = await show();
      expect(shown.table.messages.map(({ sender }) => sender)).toEqual([
        roles.Mandy,
        roles.Sally,
        roles.Presley,
        roles.Mandy,
        roles.Sally,
        roles.Presley,
      ]);
      expect(shown).toMatchObject({ openQuestions: 0 });
      expect(shown.questions).toHaveLength(6);
    });
  });

  test("a proposal needs both counterparts: they accept it in turn, and Mandy sees whose answer it waits for", async () => {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Sally takes her time deciding, so Mandy can see that Presley has accepted already.
    const sallyTakesHerTime: Reasoner<TableMaterial> = {
      name: "sally-takes-her-time",
      async answer(ask, table, write) {
        if (ask === DECISION_ASK && table.roleName === "Sally") await held;
        await write(standIn(ask, table));
      },
    };
    const { api, practice } = await startWholePie({ counterpart: sallyTakesHerTime });
    const { session, table, roles, terms, show } = await practice("mandy", "Mandy", "The Launch Room");
    ok(await api.tables.start({ session, table, minutes: 45 }));

    const { proposal } = ok(await api.tables.propose({ session, table, terms: terms(LAUNCH_PIE) }));
    await eventually(async () =>
      expect((await show()).table.proposals).toMatchObject([{ proposal, status: "PENDING", acceptedBy: [roles.Presley] }]),
    );
    release();
    await eventually(async () => expect((await show()).table.status).toBe("SETTLED"));
    expect((await show()).table.proposals).toMatchObject([{ proposal, status: "ACCEPTED", acceptedBy: [roles.Presley, roles.Sally] }]);

    // The debrief reveals all three sides, and the coach writes to Mandy alone, as at any practice table.
    const { debrief } = ok(await api.tables.debrief({ session, table }));
    expect(debrief).toMatchObject({ bestJointPoints: 3150, jointBatna: 2400 });
    expect(debrief.roles.map(({ name, points }) => [name, points])).toEqual([
      ["Mandy", 1000],
      ["Presley", 1050],
      ["Sally", 1100],
    ]);
    await eventually(async () =>
      expect(ok(await api.tables.debrief({ session, table })).coaching).toMatchObject([
        { stage: "CONCLUDED", answer: expect.stringContaining("to the three of you together") },
      ]),
    );
  });

  test("a rejection from either counterpart rejects the proposal, and nobody else has to answer it", async () => {
    const { api, practice } = await startWholePie();
    const { session, table, roles, terms, show } = await practice("mandy", "Mandy", "The Launch Room");
    ok(await api.tables.start({ session, table, minutes: 45 }));

    const { proposal } = ok(await api.tables.propose({ session, table, terms: terms(MANDYS_WAY) }));
    await eventually(async () => {
      const shown = await show();
      expect(shown.table.proposals).toMatchObject([{ proposal, status: "REJECTED", acceptedBy: [] }]);
      expect(shown.table.messages).toMatchObject([{ sender: roles.Presley, body: "I can't agree to that. Can you do better?" }]);
      expect(shown).toMatchObject({ openQuestions: 0, questions: [{ stage: "CONCLUDED" }] });
    });
  });
});
