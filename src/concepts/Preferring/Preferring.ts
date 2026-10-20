import { type Collection, type Db, MongoServerError, ObjectId } from "mongodb";

interface PreferenceDocument<Person> {
  _id: string;
  person: Person;
  feature: string;
}

/** Lets each person turn the app's optional features on or off for themselves. */
export class PreferringConcept<Person extends string> {
  private readonly preferences: Collection<PreferenceDocument<Person>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Preferring") {
    this.preferences = database.collection(`${name.toLowerCase()}.preferences`);
  }

  /** Creates the unique index once, so one person has one preference for a feature, even when two arrive at once. */
  #ready() {
    this.indexes ??= this.preferences.createIndex({ person: 1, feature: 1 }, { unique: true }).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async turnOn({ person, feature }: { person: Person; feature: string }) {
    await this.#ready();
    try {
      await this.preferences.updateOne(
        { person, feature },
        { $setOnInsert: { _id: new ObjectId().toHexString(), person, feature } },
        { upsert: true },
      );
    } catch (error) {
      // Two requests turning the feature on at once both succeed: the second finds the first's preference.
      if (!isDuplicate(error)) throw error;
    }
    return {};
  }

  async turnOff({ person, feature }: { person: Person; feature: string }) {
    await this.preferences.deleteOne({ person, feature });
    return {};
  }

  async _on({ person, feature }: { person: Person; feature: string }) {
    return { on: (await this.preferences.findOne({ person, feature })) !== null };
  }
}

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
