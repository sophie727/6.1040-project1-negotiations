import { type Collection, type Db, MongoServerError, ObjectId } from "mongodb";

export class SelfReview extends Error {}
export class InvalidStars extends Error {}
export class AlreadyReviewed extends Error {}

export type Review = string & { readonly __brand: "Review" };

interface ReviewDocument<Subject, Person> {
  _id: Review;
  subject: Subject;
  reviewer: Person;
  reviewee: Person;
  stars: number;
}

/** Lets people who dealt with each other say how it went, once each, so everyone's reputation reflects what others think. */
export class ReviewingConcept<Subject extends string, Person extends string> {
  private readonly reviews: Collection<ReviewDocument<Subject, Person>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Reviewing") {
    this.reviews = database.collection(`${name.toLowerCase()}.reviews`);
  }

  /**
   * Creates the indexes once. The unique one makes MongoDB refuse a second review of one person by another about one
   * subject, even when two arrive at once. If creating them fails, the next action tries again.
   */
  #ready() {
    this.indexes ??= Promise.all([
      this.reviews.createIndex({ subject: 1, reviewer: 1, reviewee: 1 }, { unique: true }),
      this.reviews.createIndex({ reviewee: 1 }),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async review({ subject, reviewer, reviewee, stars }: { subject: Subject; reviewer: Person; reviewee: Person; stars: number }) {
    if (reviewer === reviewee) throw new SelfReview("You can't review yourself.");
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new InvalidStars("A review gives 1 to 5 stars.");
    await this.#ready();
    const review = new ObjectId().toHexString() as Review;
    try {
      await this.reviews.insertOne({ _id: review, subject, reviewer, reviewee, stars });
    } catch (error) {
      if (isDuplicate(error)) throw new AlreadyReviewed("You've already reviewed them for this.");
      throw error;
    }
    return { review };
  }

  async _review({ subject, reviewer, reviewee }: { subject: Subject; reviewer: Person; reviewee: Person }) {
    const found = await this.reviews.findOne({ subject, reviewer, reviewee });
    return found === null ? [] : [{ stars: found.stars }];
  }

  async _standing({ reviewee }: { reviewee: Person }) {
    const received = await this.reviews.find({ reviewee }).toArray();
    // The average is left out, rather than undefined, when nobody has reviewed the person yet.
    const row: { stars?: number; reviews: number } = { reviews: received.length };
    if (received.length > 0) row.stars = received.reduce((total, { stars }) => total + stars, 0) / received.length;
    return row;
  }
}

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
