import { type Collection, type Db, ObjectId } from "mongodb";

export class AlreadyPosted extends Error {}
export class NotPosted extends Error {}
export class AlreadyArchived extends Error {}
export class NotArchived extends Error {}

interface PostDocument<Item, Person> {
  /** An ObjectId's hex string, which starts with the time it was made, so posts sort in the order they were posted. */
  _id: string;
  item: Item;
  archived: boolean;
  /** Who archived the item, or null while it isn't archived. */
  archiver: Person | null;
}

/** Lets someone put something up where everyone can find it, and take it down again without undoing what people did with it. */
export class PostingConcept<Item extends string, Person extends string> {
  private readonly posts: Collection<PostDocument<Item, Person>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Posting") {
    this.posts = database.collection(`${name.toLowerCase()}.posts`);
  }

  /** Creates the unique index once, so an item is posted only once, even when two requests arrive at once. If creating it fails, the next action tries again. */
  #ready() {
    this.indexes ??= this.posts.createIndex({ item: 1 }, { unique: true }).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async post({ item }: { item: Item }) {
    await this.#ready();
    const alreadyPosted = new AlreadyPosted("This is already posted.");
    if ((await this.posts.findOne({ item })) !== null) throw alreadyPosted;
    try {
      await this.posts.insertOne({ _id: new ObjectId().toHexString(), item, archived: false, archiver: null });
    } catch (error) {
      // Another request posted the item a moment before, and the unique index kept this one out.
      if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) throw alreadyPosted;
      throw error;
    }
    return {};
  }

  async archive({ item, archiver }: { item: Item; archiver: Person }) {
    if ((await this.posts.findOne({ item })) === null) throw new NotPosted("Only something posted can be archived.");
    const { matchedCount } = await this.posts.updateOne({ item, archived: false }, { $set: { archived: true, archiver } });
    if (matchedCount === 0) throw new AlreadyArchived("This is already archived.");
    return {};
  }

  async unarchive({ item }: { item: Item }) {
    const { matchedCount } = await this.posts.updateOne({ item, archived: true }, { $set: { archived: false, archiver: null } });
    if (matchedCount === 0) throw new NotArchived("This isn't archived.");
    return {};
  }

  async _posts() {
    const posts = await this.posts.find().sort({ _id: 1 }).toArray();
    return posts.map(({ item, archived }) => ({ item, archived }));
  }

  async _post({ item }: { item: Item }) {
    const found = await this.posts.findOne({ item });
    return { posted: found !== null, archived: found?.archived === true };
  }

  async _archiver({ item }: { item: Item }) {
    const found = await this.posts.findOne({ item, archived: true });
    // A post from before Posting kept archivers has none, like one that isn't archived.
    return found?.archiver == null ? [] : [{ archiver: found.archiver }];
  }
}
