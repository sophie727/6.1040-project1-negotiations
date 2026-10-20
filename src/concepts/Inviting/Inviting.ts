import { type Collection, type Db, ObjectId } from "mongodb";

export type Invitation = string & { readonly __brand: "Invitation" };

/** How many random bytes a code has: 128 bits, too many to guess, in 22 characters of a link. */
const CODE_BYTES = 16;

interface InvitationDocument<Subject, Person> {
  _id: Invitation;
  subject: Subject;
  inviter: Person;
  code: string;
}

/** Lets a person invite others into something with a link that can't be guessed. */
export class InvitingConcept<Subject extends string, Person extends string> {
  private readonly invitations: Collection<InvitationDocument<Subject, Person>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Inviting") {
    this.invitations = database.collection(`${name.toLowerCase()}.invitations`);
  }

  /** Creates the unique index once, so no two invitations ever share a code. If creating it fails, the next action tries again. */
  #ready() {
    this.indexes ??= this.invitations.createIndex({ code: 1 }, { unique: true }).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async invite({ subject, inviter }: { subject: Subject; inviter: Person }) {
    const invitation = new ObjectId().toHexString() as Invitation;
    // The code is random, not derived from the invitation or its subject, so knowing either doesn't reveal it.
    const code = Buffer.from(crypto.getRandomValues(new Uint8Array(CODE_BYTES))).toString("base64url");
    await this.#ready();
    await this.invitations.insertOne({ _id: invitation, subject, inviter, code });
    return { invitation, code };
  }

  async _invitation({ code }: { code: string }) {
    const found = await this.invitations.findOne({ code });
    return found === null ? [] : [{ invitation: found._id, subject: found.subject, inviter: found.inviter }];
  }

  async _invitations({ subject }: { subject: Subject }) {
    // Each _id comes from an ObjectId, which starts with the time it was made, so sorting by _id keeps the order of inviting.
    const invitations = await this.invitations.find({ subject }).sort({ _id: 1 }).toArray();
    return invitations.map(({ _id, code, inviter }) => ({ invitation: _id, code, inviter }));
  }
}
