import { type Collection, type Db, MongoServerError, ObjectId } from "mongodb";

export class InvalidTimeLimit extends Error {}
export class UnknownTable extends Error {}
export class AlreadyBegun extends Error {}
export class SeatExists extends Error {}
export class NoSuchSeat extends Error {}
export class RoleTaken extends Error {}
export class AlreadySeated extends Error {}
export class TableFull extends Error {}
export class NotEnoughSeats extends Error {}
export class NotAllSeated extends Error {}
export class NotOpen extends Error {}
export class TimeUp extends Error {}
export class NotSeated extends Error {}
export class NotDue extends Error {}

export type Table = string & { readonly __brand: "Table" };
export type TableStatus = "PREPARING" | "OPEN" | "SETTLED" | "WITHDRAWN" | "EXPIRED";

const MINUTE = 60_000;
const LONGEST = 180;

interface ScenarioDocument<Scenario> {
  _id: Scenario;
  recommendedTimeLimit: number;
}

interface TableDocument<Scenario, Negotiator> {
  _id: Table;
  scenario: Scenario;
  /** Set when the table begins, with its deadline. */
  timeLimit?: number;
  deadline?: Date;
  status: TableStatus;
  withdrawnBy?: Negotiator;
}

interface SeatDocument<Role, Negotiator> {
  _id: string;
  table: Table;
  role: Role;
  negotiator?: Negotiator;
}

/** Seats someone in every role of a negotiation and runs its clock, so each negotiation ends exactly once. */
export class TablingConcept<Scenario extends string, Role extends string, Negotiator extends string> {
  private readonly scenarios: Collection<ScenarioDocument<Scenario>>;
  private readonly tables: Collection<TableDocument<Scenario, Negotiator>>;
  private readonly seats: Collection<SeatDocument<Role, Negotiator>>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Tabling") {
    const prefix = name.toLowerCase();
    this.scenarios = database.collection(`${prefix}.scenarios`);
    this.tables = database.collection(`${prefix}.tables`);
    this.seats = database.collection(`${prefix}.seats`);
  }

  /**
   * Creates the unique indexes once. They make MongoDB refuse a second seat for one role at a table, and a negotiator
   * in two seats at one table, even when two requests arrive at once. If creating them fails, the next action tries again.
   */
  #ready() {
    this.indexes ??= Promise.all([
      this.seats.createIndex({ table: 1, role: 1 }, { unique: true }),
      this.seats.createIndex(
        { table: 1, negotiator: 1 },
        { unique: true, partialFilterExpression: { negotiator: { $exists: true } } },
      ),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async recommendTimeLimit({ scenario, timeLimit }: { scenario: Scenario; timeLimit: number }) {
    if (!acceptableLimit(timeLimit)) throw invalidTimeLimit();
    await retryingDuplicates(() =>
      this.scenarios.updateOne({ _id: scenario }, { $set: { recommendedTimeLimit: timeLimit } }, { upsert: true }),
    );
    return {};
  }

  async open({ scenario }: { scenario: Scenario }) {
    const table = newId<Table>();
    await this.tables.insertOne({ _id: table, scenario, status: "PREPARING" });
    return { table };
  }

  async addSeat({ table, role }: { table: Table; role: Role }) {
    await this.#preparing(table);
    await this.#ready();
    try {
      await this.seats.insertOne({ _id: newId(), table, role });
    } catch (error) {
      if (isDuplicate(error)) throw new SeatExists("This table already has a seat for that role.");
      throw error;
    }
    return { table };
  }

  async seat({ table, negotiator, role }: { table: Table; negotiator: Negotiator; role?: Role }) {
    await this.#preparing(table);
    // A request that leaves out the role may still carry it as null.
    const chosen = role ?? undefined;
    let candidates: SeatDocument<Role, Negotiator>[];
    if (chosen !== undefined) {
      const seat = await this.seats.findOne({ table, role: chosen });
      if (seat === null) throw new NoSuchSeat("This table has no seat for that role.");
      candidates = [seat];
    } else {
      candidates = shuffled(await this.seats.find({ table, negotiator: { $exists: false } }).toArray());
      if (candidates.length === 0) throw tableFull();
    }
    await this.#ready();
    for (const seat of candidates) {
      let matchedCount: number;
      try {
        // Taking only an empty seat means two negotiators taking the same seat at once can't both succeed.
        ({ matchedCount } = await this.seats.updateOne(
          { _id: seat._id, negotiator: { $exists: false } },
          { $set: { negotiator } },
        ));
      } catch (error) {
        if (isDuplicate(error)) throw new AlreadySeated("You already have a seat at this table.");
        throw error;
      }
      if (matchedCount === 1) return { table, role: seat.role };
    }
    // Every seat tried was taken in the meantime: the chosen one, or, without a choice, every empty one.
    if (chosen !== undefined) throw new RoleTaken("Someone already has that role at this table.");
    throw tableFull();
  }

  async begin({ table, timeLimit, now }: { table: Table; timeLimit: number; now: Date }) {
    if (!acceptableLimit(timeLimit)) throw invalidTimeLimit();
    await this.#preparing(table);
    const seats = await this.seats.find({ table }).toArray();
    if (seats.length < 2) throw new NotEnoughSeats("A negotiation needs seats for at least two roles.");
    if (seats.some(({ negotiator }) => negotiator === undefined)) {
      throw new NotAllSeated("Not every role has a negotiator yet.");
    }
    const deadline = new Date(new Date(now).getTime() + timeLimit * MINUTE);
    const { matchedCount } = await this.tables.updateOne(
      { _id: table, status: "PREPARING" },
      { $set: { status: "OPEN", timeLimit, deadline } },
    );
    if (matchedCount === 0) throw alreadyBegun();
    return { table, deadline };
  }

  async settle({ table, now }: { table: Table; now: Date }) {
    const at = new Date(now);
    // Every way of ending a table changes only an OPEN one, so of two endings at once, exactly one wins.
    const { matchedCount } = await this.tables.updateOne(
      { _id: table, status: "OPEN", deadline: { $gt: at } },
      { $set: { status: "SETTLED" } },
    );
    if (matchedCount === 0) throw await this.#endRefusal(table);
    return { table };
  }

  async withdraw({ table, negotiator, now }: { table: Table; negotiator: Negotiator; now: Date }) {
    if ((await this.tables.findOne({ _id: table })) === null) throw unknownTable();
    if ((await this.seats.findOne({ table, negotiator })) === null) {
      throw new NotSeated("You don't have a seat at this table.");
    }
    // Someone can leave a table before it begins, or walk away from one under way before its time is up.
    const { matchedCount } = await this.tables.updateOne(
      { _id: table, $or: [{ status: "PREPARING" }, { status: "OPEN", deadline: { $gt: new Date(now) } }] },
      { $set: { status: "WITHDRAWN", withdrawnBy: negotiator } },
    );
    if (matchedCount === 0) throw await this.#endRefusal(table);
    return { table };
  }

  async expire({ table, now }: { table: Table; now: Date }) {
    const { matchedCount } = await this.tables.updateOne(
      { _id: table, status: "OPEN", deadline: { $lte: new Date(now) } },
      { $set: { status: "EXPIRED" } },
    );
    if (matchedCount === 0) {
      const found = await this.tables.findOne({ _id: table });
      if (found === null) throw unknownTable();
      if (found.status !== "OPEN") throw notOpen();
      throw new NotDue("Time isn't up for this negotiation yet.");
    }
    return { table };
  }

  async _recommendedTimeLimit({ scenario }: { scenario: Scenario }) {
    const found = await this.scenarios.findOne({ _id: scenario });
    return found === null ? [] : [{ timeLimit: found.recommendedTimeLimit }];
  }

  async _acceptableTimeLimit({ timeLimit }: { timeLimit: number }) {
    return { acceptable: acceptableLimit(timeLimit) };
  }

  async _table({ table }: { table: Table }) {
    const found = await this.tables.findOne({ _id: table });
    if (found === null) return [];
    const { scenario, status, timeLimit, deadline, withdrawnBy } = found;
    // An optional field is left out, rather than undefined, so that a read of it finds nothing until it is set.
    const row: { scenario: Scenario; status: TableStatus; timeLimit?: number; deadline?: Date; withdrawnBy?: Negotiator } = {
      scenario,
      status,
    };
    if (timeLimit !== undefined) row.timeLimit = timeLimit;
    if (deadline !== undefined) row.deadline = deadline;
    if (withdrawnBy !== undefined) row.withdrawnBy = withdrawnBy;
    return [row];
  }

  async _seats({ table }: { table: Table }) {
    // Each _id comes from an ObjectId, which starts with the time it was made, so sorting by _id keeps the order of adding.
    const seats = await this.seats.find({ table }).sort({ _id: 1 }).toArray();
    // An empty seat has no negotiator field at all, so that a read of the negotiator finds nothing there.
    return seats.map(({ role, negotiator }) => {
      const row: { role: Role; negotiator?: Negotiator } = { role };
      if (negotiator !== undefined) row.negotiator = negotiator;
      return row;
    });
  }

  async _tablesOf({ negotiator }: { negotiator: Negotiator }) {
    const seats = await this.seats.find({ negotiator }).toArray();
    const tables = await this.tables
      .find({ _id: { $in: seats.map(({ table }) => table) } })
      .sort({ _id: -1 })
      .toArray();
    return tables.map(({ _id, scenario, status }) => ({
      table: _id,
      role: seats.find(({ table }) => table === _id)!.role,
      scenario,
      status,
    }));
  }

  async _overdue({ now }: { now: Date }) {
    const overdue = await this.tables
      .find({ status: "OPEN", deadline: { $lte: new Date(now) } })
      .sort({ deadline: 1 })
      .toArray();
    return overdue.map(({ _id }) => ({ table: _id }));
  }

  /** The table, when it exists and is still PREPARING; otherwise the refusal that applies. */
  async #preparing(table: Table) {
    const found = await this.tables.findOne({ _id: table });
    if (found === null) throw unknownTable();
    if (found.status !== "PREPARING") throw alreadyBegun();
    return found;
  }

  /** After a write to settle or withdraw matched nothing, reads the table once and returns the refusal that applies. */
  async #endRefusal(table: Table): Promise<Error> {
    const found = await this.tables.findOne({ _id: table });
    if (found === null) return unknownTable();
    if (found.status !== "OPEN") return notOpen();
    return new TimeUp("Time is up for this negotiation.");
  }
}

const acceptableLimit = (minutes: number) => Number.isInteger(minutes) && minutes >= 1 && minutes <= LONGEST;
const invalidTimeLimit = () => new InvalidTimeLimit("The time limit must be a whole number of minutes from 1 to 180.");
const unknownTable = () => new UnknownTable("There is no such negotiation.");
const alreadyBegun = () => new AlreadyBegun("This negotiation has already started.");
const notOpen = () => new NotOpen("This negotiation isn't under way.");
const tableFull = () => new TableFull("Every seat at this table is taken.");
const newId = <T extends string>() => new ObjectId().toHexString() as T;

/** The items in a random order, so that someone who sits down without choosing a role gets a seat at random. */
function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

/** Runs an upsert again when another upsert of the same document got there first and broke a unique index. */
async function retryingDuplicates<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (!isDuplicate(error)) throw error;
    return write();
  }
}

/** 11000 is the code MongoDB gives a write that breaks a unique index. */
const isDuplicate = (error: unknown) => error instanceof MongoServerError && error.code === 11000;
