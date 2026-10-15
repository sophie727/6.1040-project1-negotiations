import { type Collection, type Db, MongoServerError, ObjectId } from "mongodb";

export class ProposalsStarted extends Error {}
export class AlreadyJoined extends Error {}
export class NotAParticipant extends Error {}
export class NoOtherParticipants extends Error {}
export class AlreadyAgreed extends Error {}
export class NotPendingForYou extends Error {}
export class AlreadyAccepted extends Error {}
export class NotPendingFromYou extends Error {}

export type Proposal = string & { readonly __brand: "Proposal" };
export type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "RETRACTED" | "SUPERSEDED";

interface ParticipantDocument<Subject, Party> {
  _id: string;
  subject: Subject;
  party: Party;
}

/** The terms are kept as JSON text, because Proposing never reads them and MongoDB restricts the field names objects may use. */
interface ProposalDocument<Subject, Party> {
  _id: Proposal;
  subject: Subject;
  proposer: Party;
  terms: string;
  status: ProposalStatus;
  proposedAt: Date;
}

interface AcceptanceDocument<Party> {
  _id: string;
  proposal: Proposal;
  party: Party;
}

/** Lets the parties to a negotiation make formal offers, so an agreement exists only once everyone else accepts one. */
export class ProposingConcept<Subject extends string, Party extends string, Terms> {
  private readonly participants: Collection<ParticipantDocument<Subject, Party>>;
  private readonly proposals: Collection<ProposalDocument<Subject, Party>>;
  private readonly acceptances: Collection<AcceptanceDocument<Party>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Proposing") {
    const prefix = name.toLowerCase();
    this.participants = database.collection(`${prefix}.participants`);
    this.proposals = database.collection(`${prefix}.proposals`);
    this.acceptances = database.collection(`${prefix}.acceptances`);
  }

  /**
   * Creates the unique indexes once. They make MongoDB refuse a party joining twice, a second pending or accepted
   * proposal about one subject, and a party accepting one proposal twice, even when two requests arrive at once.
   * If creating them fails, the next action tries again.
   */
  #ready() {
    this.indexes ??= Promise.all([
      this.participants.createIndex({ subject: 1, party: 1 }, { unique: true }),
      this.proposals.createIndex(
        { subject: 1 },
        { name: "one_pending_per_subject", unique: true, partialFilterExpression: { status: "PENDING" } },
      ),
      this.proposals.createIndex(
        { subject: 1 },
        { name: "one_accepted_per_subject", unique: true, partialFilterExpression: { status: "ACCEPTED" } },
      ),
      this.acceptances.createIndex({ proposal: 1, party: 1 }, { unique: true }),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async join({ subject, party }: { subject: Subject; party: Party }) {
    if ((await this.proposals.findOne({ subject })) !== null) {
      throw new ProposalsStarted("Nobody can join once proposals have been made.");
    }
    await this.#ready();
    try {
      await this.participants.insertOne({ _id: newId(), subject, party });
    } catch (error) {
      if (isDuplicate(error)) throw new AlreadyJoined("That party is already part of this negotiation.");
      throw error;
    }
    return {};
  }

  async propose({ subject, proposer, terms, now }: { subject: Subject; proposer: Party; terms: Terms; now: Date }) {
    const participants = await this.participants.find({ subject }).toArray();
    if (!participants.some(({ party }) => party === proposer)) {
      throw new NotAParticipant("Only a party to this negotiation can make a proposal.");
    }
    if (participants.length < 2) throw new NoOtherParticipants("There's nobody else to make a proposal to.");
    await this.#ready();
    const proposal = newId<Proposal>();
    for (let attempt = 1; ; attempt++) {
      if ((await this.proposals.findOne({ subject, status: "ACCEPTED" })) !== null) throw alreadyAgreed();
      await this.proposals.updateMany({ subject, status: "PENDING" }, { $set: { status: "SUPERSEDED" } });
      try {
        const stored = JSON.stringify(terms);
        await this.proposals.insertOne({ _id: proposal, subject, proposer, terms: stored, status: "PENDING", proposedAt: new Date(now) });
        break;
      } catch (error) {
        // Another proposal arrived between superseding the pending one and adding this one; supersede it too.
        if (!isDuplicate(error) || attempt === 3) throw error;
      }
    }
    // If the old pending proposal was accepted while this one was being added, the subject already has its agreement.
    if ((await this.proposals.findOne({ subject, status: "ACCEPTED" })) !== null) {
      await this.proposals.deleteOne({ _id: proposal });
      throw alreadyAgreed();
    }
    return { proposal };
  }

  async accept({ proposal, party }: { proposal: Proposal; party: Party }) {
    const found = await this.proposals.findOne({ _id: proposal });
    if (found === null || found.status !== "PENDING" || !(await this.#answers(found, party))) throw notPendingForYou();
    await this.#ready();
    try {
      await this.acceptances.insertOne({ _id: newId(), proposal, party });
    } catch (error) {
      if (isDuplicate(error)) throw new AlreadyAccepted("You've already accepted this proposal.");
      throw error;
    }
    const answer = { proposal, subject: found.subject, terms: JSON.parse(found.terms) as Terms };
    const [participants, acceptances] = await Promise.all([
      this.participants.find({ subject: found.subject }).toArray(),
      this.acceptances.find({ proposal }).toArray(),
    ]);
    const accepted = new Set(acceptances.map(({ party: accepter }) => accepter));
    const everyone = participants.every(({ party: other }) => other === found.proposer || accepted.has(other));
    if (everyone) {
      await this.proposals.updateOne({ _id: proposal, status: "PENDING" }, { $set: { status: "ACCEPTED" } });
    }
    // Two last acceptances at once both count, whichever marked the proposal ACCEPTED. But if the proposal stopped being
    // pending for another reason while this acceptance was added, the acceptance is taken back, and refused.
    const current = await this.proposals.findOne({ _id: proposal });
    if (current?.status === "ACCEPTED" || current?.status === "PENDING") return { ...answer, status: current.status };
    await this.acceptances.deleteOne({ proposal, party });
    throw notPendingForYou();
  }

  async reject({ proposal, party }: { proposal: Proposal; party: Party }) {
    const found = await this.proposals.findOne({ _id: proposal });
    if (found === null || !(await this.#answers(found, party))) throw notPendingForYou();
    const { matchedCount } = await this.proposals.updateOne(
      { _id: proposal, status: "PENDING" },
      { $set: { status: "REJECTED" } },
    );
    if (matchedCount === 0) throw notPendingForYou();
    return { proposal };
  }

  async retract({ proposal, proposer }: { proposal: Proposal; proposer: Party }) {
    const { matchedCount } = await this.proposals.updateOne(
      { _id: proposal, status: "PENDING", proposer },
      { $set: { status: "RETRACTED" } },
    );
    if (matchedCount === 0) {
      throw new NotPendingFromYou("There is no such proposal of yours waiting for an answer.");
    }
    return { proposal };
  }

  async _participants({ subject }: { subject: Subject }) {
    // Each _id comes from an ObjectId, which starts with the time it was made, so sorting by _id keeps the order of adding.
    const participants = await this.participants.find({ subject }).sort({ _id: 1 }).toArray();
    return participants.map(({ party }) => ({ party }));
  }

  async _proposal({ proposal }: { proposal: Proposal }) {
    const found = await this.proposals.findOne({ _id: proposal });
    if (found === null) return [];
    const { subject, proposer, terms, status, proposedAt } = found;
    return [{ subject, proposer, terms: JSON.parse(terms) as Terms, status, proposedAt }];
  }

  async _proposals({ subject }: { subject: Subject }) {
    const proposals = await this.proposals.find({ subject }).sort({ _id: 1 }).toArray();
    return proposals.map(({ _id, proposer, terms, status, proposedAt }) => ({
      proposal: _id,
      proposer,
      terms: JSON.parse(terms) as Terms,
      status,
      proposedAt,
    }));
  }

  async _acceptances({ proposal }: { proposal: Proposal }) {
    const acceptances = await this.acceptances.find({ proposal }).sort({ _id: 1 }).toArray();
    return acceptances.map(({ party }) => ({ party }));
  }

  async _agreement({ subject }: { subject: Subject }) {
    const found = await this.proposals.findOne({ subject, status: "ACCEPTED" });
    if (found === null) return [];
    return [{ proposal: found._id, proposer: found.proposer, terms: JSON.parse(found.terms) as Terms }];
  }

  /** Whether the party may answer the proposal: a participant in its subject other than its proposer. */
  async #answers(proposal: ProposalDocument<Subject, Party>, party: Party): Promise<boolean> {
    if (proposal.proposer === party) return false;
    return (await this.participants.findOne({ subject: proposal.subject, party })) !== null;
  }
}

const alreadyAgreed = () => new AlreadyAgreed("An agreement has already been reached.");
const notPendingForYou = () => new NotPendingForYou("There is no such proposal waiting for your answer.");
const newId = <T extends string = string>() => new ObjectId().toHexString() as T;

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
