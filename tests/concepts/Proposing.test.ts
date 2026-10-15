import { describe, expect, test } from "bun:test";
import {
  AlreadyAccepted,
  AlreadyAgreed,
  AlreadyJoined,
  NoOtherParticipants,
  NotAParticipant,
  NotPendingForYou,
  NotPendingFromYou,
  type Proposal,
  ProposalsStarted,
  ProposingConcept,
} from "../../src/concepts/Proposing/Proposing.ts";
import { testDatabase } from "../support/reusable/mongo.ts";
import { expectOneWinner } from "../support/reusable/race.ts";

type Terms = { bigRoom: string; extraRent: number };
type Proposing = ProposingConcept<string, string, Terms>;

async function setup() {
  return { proposing: new ProposingConcept<string, string, Terms>(await testDatabase()) };
}

const now = new Date("2026-10-15T14:00:00.000Z");

async function joinAll(proposing: Proposing, subject: string, parties: string[]) {
  for (const party of parties) await proposing.join({ subject, party });
}

async function expectRefusal(attempt: Promise<unknown>, refusal: new (message?: string) => Error, message: string) {
  await expect(attempt).rejects.toThrow(refusal);
  await expect(attempt).rejects.toThrow(message);
}

describe("Proposing", () => {
  test("its principle: Ana, Ben, and Cal agree only once everyone but the proposer accepts, and then no new proposal is allowed", async () => {
    const { proposing } = await setup();
    await joinAll(proposing, "lease", ["Ana", "Ben", "Cal"]);

    const first = { bigRoom: "Ben", extraRent: 100 };
    const { proposal: anas } = await proposing.propose({ subject: "lease", proposer: "Ana", terms: first, now });
    expect(await proposing.accept({ proposal: anas, party: "Ben" })).toEqual({
      proposal: anas,
      subject: "lease",
      terms: first,
      status: "PENDING",
    });
    expect(await proposing._agreement({ subject: "lease" })).toEqual([]);

    // Ana's new terms supersede the first proposal, so Ben's acceptance no longer counts.
    const second = { bigRoom: "Ben", extraRent: 150 };
    const { proposal: anasSecond } = await proposing.propose({ subject: "lease", proposer: "Ana", terms: second, now });
    await expect(proposing.accept({ proposal: anas, party: "Cal" })).rejects.toThrow(NotPendingForYou);
    expect(await proposing.reject({ proposal: anasSecond, party: "Cal" })).toEqual({ proposal: anasSecond });

    const cals = { bigRoom: "Cal", extraRent: 120 };
    const { proposal: calsProposal } = await proposing.propose({ subject: "lease", proposer: "Cal", terms: cals, now });
    await proposing.accept({ proposal: calsProposal, party: "Ana" });
    expect((await proposing.accept({ proposal: calsProposal, party: "Ben" })).status).toBe("ACCEPTED");
    expect(await proposing._agreement({ subject: "lease" })).toEqual([{ proposal: calsProposal, proposer: "Cal", terms: cals }]);
    expect((await proposing._proposals({ subject: "lease" })).map(({ status }) => status)).toEqual([
      "SUPERSEDED",
      "REJECTED",
      "ACCEPTED",
    ]);

    await expectRefusal(
      proposing.propose({ subject: "lease", proposer: "Ana", terms: first, now }),
      AlreadyAgreed,
      "An agreement has already been reached.",
    );
    await expectRefusal(
      proposing.accept({ proposal: calsProposal, party: "Cal" }),
      NotPendingForYou,
      "There is no such proposal waiting for your answer.",
    );
    await expectRefusal(
      proposing.join({ subject: "lease", party: "Dee" }),
      ProposalsStarted,
      "Nobody can join once proposals have been made.",
    );
  });

  test("with two parties, one acceptance is an agreement", async () => {
    const { proposing } = await setup();
    await joinAll(proposing, "job-offer", ["Hiro", "Manon"]);
    const terms = { bigRoom: "n/a", extraRent: 0 };
    const { proposal } = await proposing.propose({ subject: "job-offer", proposer: "Hiro", terms, now });
    expect(await proposing._proposal({ proposal })).toEqual([
      { subject: "job-offer", proposer: "Hiro", terms, status: "PENDING", proposedAt: now },
    ]);
    expect((await proposing.accept({ proposal, party: "Manon" })).status).toBe("ACCEPTED");
    expect(await proposing._acceptances({ proposal })).toEqual([{ party: "Manon" }]);
  });

  test("only a participant can propose, and only to someone else", async () => {
    const { proposing } = await setup();
    const terms = { bigRoom: "Ana", extraRent: 0 };
    await proposing.join({ subject: "lease", party: "Ana" });
    await expectRefusal(proposing.join({ subject: "lease", party: "Ana" }), AlreadyJoined, "That party is already part of this negotiation.");
    await expectRefusal(
      proposing.propose({ subject: "lease", proposer: "Ana", terms, now }),
      NoOtherParticipants,
      "There's nobody else to make a proposal to.",
    );
    await proposing.join({ subject: "lease", party: "Ben" });
    await expectRefusal(
      proposing.propose({ subject: "lease", proposer: "Dee", terms, now }),
      NotAParticipant,
      "Only a party to this negotiation can make a proposal.",
    );
    expect(await proposing._participants({ subject: "lease" })).toEqual([{ party: "Ana" }, { party: "Ben" }]);
  });

  test("a proposal is answered only by a participant other than its proposer, and accepted by each at most once", async () => {
    const { proposing } = await setup();
    await joinAll(proposing, "lease", ["Ana", "Ben", "Cal"]);
    const { proposal } = await proposing.propose({ subject: "lease", proposer: "Ana", terms: { bigRoom: "Ana", extraRent: 0 }, now });
    await expect(proposing.accept({ proposal, party: "Ana" })).rejects.toThrow(NotPendingForYou);
    await expect(proposing.accept({ proposal, party: "Dee" })).rejects.toThrow(NotPendingForYou);
    await expect(proposing.reject({ proposal, party: "Ana" })).rejects.toThrow(NotPendingForYou);
    await expect(proposing.accept({ proposal: "nothing" as Proposal, party: "Ben" })).rejects.toThrow(NotPendingForYou);
    await proposing.accept({ proposal, party: "Ben" });
    await expectRefusal(proposing.accept({ proposal, party: "Ben" }), AlreadyAccepted, "You've already accepted this proposal.");
  });

  test("only its proposer can retract a pending proposal", async () => {
    const { proposing } = await setup();
    await joinAll(proposing, "lease", ["Ana", "Ben"]);
    const { proposal } = await proposing.propose({ subject: "lease", proposer: "Ana", terms: { bigRoom: "Ana", extraRent: 0 }, now });
    await expectRefusal(
      proposing.retract({ proposal, proposer: "Ben" }),
      NotPendingFromYou,
      "There is no such proposal of yours waiting for an answer.",
    );
    expect(await proposing.retract({ proposal, proposer: "Ana" })).toEqual({ proposal });
    await expect(proposing.retract({ proposal, proposer: "Ana" })).rejects.toThrow(NotPendingFromYou);
    await expect(proposing.accept({ proposal, party: "Ben" })).rejects.toThrow(NotPendingForYou);
  });

  test("of two last acceptances at once, both count, and the proposal is accepted", async () => {
    const { proposing } = await setup();
    await joinAll(proposing, "lease", ["Ana", "Ben", "Cal"]);
    const { proposal } = await proposing.propose({ subject: "lease", proposer: "Ana", terms: { bigRoom: "Ana", extraRent: 0 }, now });
    const outcomes = await Promise.all([proposing.accept({ proposal, party: "Ben" }), proposing.accept({ proposal, party: "Cal" })]);
    expect(outcomes.some(({ status }) => status === "ACCEPTED")).toBe(true);
    expect((await proposing._proposal({ proposal }))[0]?.status).toBe("ACCEPTED");
  });

  test("of two proposals at once, both are made, and only the later one is still pending", async () => {
    const { proposing } = await setup();
    await joinAll(proposing, "lease", ["Ana", "Ben"]);
    await Promise.all([
      proposing.propose({ subject: "lease", proposer: "Ana", terms: { bigRoom: "Ana", extraRent: 0 }, now }),
      proposing.propose({ subject: "lease", proposer: "Ben", terms: { bigRoom: "Ben", extraRent: 0 }, now }),
    ]);
    const statuses = (await proposing._proposals({ subject: "lease" })).map(({ status }) => status);
    expect(statuses.filter((status) => status === "PENDING")).toHaveLength(1);
  });

  test("of an acceptance and a rejection at once, Proposing takes one and refuses the other", async () => {
    const { proposing } = await setup();
    await joinAll(proposing, "lease", ["Ana", "Ben"]);
    const { proposal } = await proposing.propose({ subject: "lease", proposer: "Ana", terms: { bigRoom: "Ana", extraRent: 0 }, now });
    await expectOneWinner(
      [proposing.accept({ proposal, party: "Ben" }), proposing.reject({ proposal, party: "Ben" })],
      NotPendingForYou,
    );
  });
});
