import { type Collection, type Db, MongoServerError, ObjectId, type Sort } from "mongodb";

export class InvalidScenarioName extends Error {}
export class NameTaken extends Error {}
export class UnknownScenario extends Error {}
export class Published extends Error {}
export class InvalidIssueName extends Error {}
export class IssueExists extends Error {}
export class UnitNotAllowed extends Error {}
export class UnknownIssue extends Error {}
export class UnknownOption extends Error {}
export class InvalidOptionName extends Error {}
export class OptionExists extends Error {}
export class ValueRequired extends Error {}
export class ValueNotAllowed extends Error {}
export class ValueTaken extends Error {}
export class InvalidRoleName extends Error {}
export class RoleExists extends Error {}
export class UnknownRoleOrOption extends Error {}
export class DifferentScenarios extends Error {}
export class UnknownRole extends Error {}
export class InvalidBrief extends Error {}
export class InvalidSummary extends Error {}
export class AlreadyPublished extends Error {}
export class Incomplete extends Error {}

export type Scenario = string & { readonly __brand: "Scenario" };
export type Issue = string & { readonly __brand: "Issue" };
export type Option = string & { readonly __brand: "Option" };
export type Role = string & { readonly __brand: "Role" };
export type IssueKind = "CONTINUOUS" | "DISCRETE";

/**
 * What was agreed on each issue, keyed by the issue's identity: the identity of the agreed option on a discrete issue,
 * or the agreed universal value on a continuous one.
 */
export type TermSheet = Readonly<Record<string, string | number>>;

const MAX_NAME = 100;
const MAX_BRIEF = 20_000;
const MAX_SUMMARY = 300;
/** Slack for comparing points that come out of interpolation, which can carry rounding error. */
const EPSILON = 1e-7;

interface ScenarioDocument<Author> {
  _id: Scenario;
  author: Author;
  name: string;
  published: boolean;
}

interface IssueDocument {
  _id: Issue;
  scenario: Scenario;
  name: string;
  kind: IssueKind;
  unit?: string;
}

/** An option also records its scenario, so a payoff can be checked against its role's scenario in one read. */
interface OptionDocument {
  _id: Option;
  issue: Issue;
  scenario: Scenario;
  name: string;
  universalValue?: number;
}

interface RoleDocument {
  _id: Role;
  scenario: Scenario;
  name: string;
  batna: number;
  brief?: string;
  summary?: string;
}

interface PayoffDocument {
  role: Role;
  option: Option;
  points: number;
}

/** A published scenario, read once, in the shape the scoring functions below work on. */
interface Model {
  /** In the order they were added, each with its options in the order `_options` gives. */
  issues: { id: Issue; name: string; kind: IssueKind; options: { id: Option; value?: number }[] }[];
  roles: { id: Role; batna: number; points: Map<Option, number> }[];
}

type WholePie = { terms: TermSheet; jointPoints: number; jointBatna: number };

/** Gives each side of a negotiation scenario a confidential brief, so any agreement can be scored for each side. */
export class BriefingConcept<Author extends string> {
  private readonly scenarios: Collection<ScenarioDocument<Author>>;
  private readonly issues: Collection<IssueDocument>;
  private readonly options: Collection<OptionDocument>;
  private readonly roles: Collection<RoleDocument>;
  private readonly payoffs: Collection<PayoffDocument>;
  private indexes: Promise<unknown> | undefined;

  constructor(database: Db, name = "Briefing") {
    const prefix = name.toLowerCase();
    this.scenarios = database.collection(`${prefix}.scenarios`);
    this.issues = database.collection(`${prefix}.issues`);
    this.options = database.collection(`${prefix}.options`);
    this.roles = database.collection(`${prefix}.roles`);
    this.payoffs = database.collection(`${prefix}.payoffs`);
  }

  /**
   * Creates the unique indexes once. They make MongoDB refuse a second scenario, issue, option, or role with the same
   * name, and a second option at the same universal value, even when two requests arrive at once. If creating them
   * fails, the next action tries again.
   */
  #ready() {
    this.indexes ??= Promise.all([
      this.scenarios.createIndex({ name: 1 }, { unique: true }),
      this.issues.createIndex({ scenario: 1, name: 1 }, { unique: true }),
      this.options.createIndex({ issue: 1, name: 1 }, { unique: true }),
      this.options.createIndex(
        { issue: 1, universalValue: 1 },
        { unique: true, partialFilterExpression: { universalValue: { $exists: true } } },
      ),
      this.roles.createIndex({ scenario: 1, name: 1 }, { unique: true }),
      this.payoffs.createIndex({ role: 1, option: 1 }, { unique: true }),
    ]).catch((error: unknown) => {
      this.indexes = undefined;
      throw error;
    });
    return this.indexes;
  }

  async create({ author, name }: { author: Author; name: string }) {
    const stored = name.trim();
    if (!acceptableName(stored)) throw new InvalidScenarioName("A scenario name must have 1 to 100 characters.");
    const scenario = newId<Scenario>();
    await this.#ready();
    try {
      await this.scenarios.insertOne({ _id: scenario, author, name: stored, published: false });
    } catch (error) {
      if (isDuplicate(error)) throw new NameTaken("A scenario with that name already exists.");
      throw error;
    }
    return { scenario };
  }

  async addIssue({ scenario, name, kind, unit }: { scenario: Scenario; name: string; kind: IssueKind; unit?: string }) {
    const found = await this.scenarios.findOne({ _id: scenario });
    if (found === null) throw new UnknownScenario("There is no such scenario.");
    if (found.published) throw new Published("A published scenario can't be changed.");
    const stored = name.trim();
    if (!acceptableName(stored)) throw new InvalidIssueName("An issue name must have 1 to 100 characters.");
    const issueExists = new IssueExists("This scenario already has an issue with that name.");
    if ((await this.issues.findOne({ scenario, name: stored })) !== null) throw issueExists;
    const storedUnit = unit?.trim() || undefined;
    if (kind === "DISCRETE" && storedUnit !== undefined) throw new UnitNotAllowed("Only a continuous issue has a unit.");
    const issue = newId<Issue>();
    await this.#ready();
    try {
      await this.issues.insertOne({
        _id: issue,
        scenario,
        name: stored,
        kind,
        ...(storedUnit === undefined ? {} : { unit: storedUnit }),
      });
    } catch (error) {
      if (isDuplicate(error)) throw issueExists;
      throw error;
    }
    return { issue };
  }

  async addOption({ issue, name, universalValue }: { issue: Issue; name: string; universalValue?: number }) {
    const found = await this.issues.findOne({ _id: issue });
    if (found === null) throw new UnknownIssue("There is no such issue.");
    if (await this.#isPublished(found.scenario)) throw new Published("A published scenario can't be changed.");
    const stored = name.trim();
    if (!acceptableName(stored)) throw new InvalidOptionName("An option name must have 1 to 100 characters.");
    const optionExists = new OptionExists("This issue already has an option with that name.");
    if ((await this.options.findOne({ issue, name: stored })) !== null) throw optionExists;
    // A request that leaves out the universal value may still carry it as null.
    const value = universalValue ?? undefined;
    if (found.kind === "CONTINUOUS" && value === undefined) {
      throw new ValueRequired("An option of a continuous issue needs a universal value.");
    }
    if (found.kind === "DISCRETE" && value !== undefined) {
      throw new ValueNotAllowed("An option of a discrete issue has no universal value.");
    }
    const valueTaken = new ValueTaken("This issue already has an option at that universal value.");
    if (value !== undefined && (await this.options.findOne({ issue, universalValue: value })) !== null) throw valueTaken;
    const option = newId<Option>();
    await this.#ready();
    try {
      await this.options.insertOne({
        _id: option,
        issue,
        scenario: found.scenario,
        name: stored,
        ...(value === undefined ? {} : { universalValue: value }),
      });
    } catch (error) {
      if (!isDuplicate(error)) throw error;
      throw (await this.options.findOne({ issue, name: stored })) === null ? valueTaken : optionExists;
    }
    return { option };
  }

  async addRole({ scenario, name, batna }: { scenario: Scenario; name: string; batna: number }) {
    const found = await this.scenarios.findOne({ _id: scenario });
    if (found === null) throw new UnknownScenario("There is no such scenario.");
    if (found.published) throw new Published("A published scenario can't be changed.");
    const stored = name.trim();
    if (!acceptableName(stored)) throw new InvalidRoleName("A role name must have 1 to 100 characters.");
    const role = newId<Role>();
    await this.#ready();
    try {
      await this.roles.insertOne({ _id: role, scenario, name: stored, batna });
    } catch (error) {
      if (isDuplicate(error)) throw new RoleExists("This scenario already has a role with that name.");
      throw error;
    }
    return { role };
  }

  async setPayoff({ role, option, points }: { role: Role; option: Option; points: number }) {
    const [foundRole, foundOption] = await Promise.all([
      this.roles.findOne({ _id: role }),
      this.options.findOne({ _id: option }),
    ]);
    if (foundRole === null || foundOption === null) throw new UnknownRoleOrOption("There is no such role or option.");
    if (foundRole.scenario !== foundOption.scenario) {
      throw new DifferentScenarios("The role and the option belong to different scenarios.");
    }
    if (await this.#isPublished(foundRole.scenario)) throw new Published("A published scenario can't be changed.");
    await this.#ready();
    await retryingDuplicates(() => this.payoffs.updateOne({ role, option }, { $set: { points } }, { upsert: true }));
    return {};
  }

  async setBrief({ role, brief }: { role: Role; brief: string }) {
    const found = await this.roles.findOne({ _id: role });
    if (found === null) throw new UnknownRole("There is no such role.");
    if (await this.#isPublished(found.scenario)) throw new Published("A published scenario can't be changed.");
    if (brief.trim() === "" || brief.length > MAX_BRIEF) throw new InvalidBrief("A brief must have 1 to 20,000 characters.");
    await this.roles.updateOne({ _id: role }, { $set: { brief } });
    return {};
  }

  /**
   * Sets who `role` is, in a sentence or two everyone may read before choosing a side, or clears it when `summary` is
   * blank. It changes nothing a deal is worth, so, unlike the rest of a scenario, it can change after publishing.
   */
  async describeRole({ role, summary }: { role: Role; summary: string }) {
    const found = await this.roles.findOne({ _id: role });
    if (found === null) throw new UnknownRole("There is no such role.");
    const stored = summary.trim();
    if (stored.length > MAX_SUMMARY) throw new InvalidSummary("A role's summary must have at most 300 characters.");
    await this.roles.updateOne({ _id: role }, stored === "" ? { $unset: { summary: "" } } : { $set: { summary: stored } });
    return {};
  }

  async rename({ scenario, name }: { scenario: Scenario; name: string }) {
    const found = await this.#draft(scenario);
    const stored = name.trim();
    if (!acceptableName(stored)) throw new InvalidScenarioName("A scenario name must have 1 to 100 characters.");
    if (stored === found.name) return {};
    await this.#ready();
    try {
      const { matchedCount } = await this.scenarios.updateOne({ _id: scenario, published: false }, { $set: { name: stored } });
      if (matchedCount === 0) throw new Published("A published scenario can't be changed.");
    } catch (error) {
      if (isDuplicate(error)) throw new NameTaken("A scenario with that name already exists.");
      throw error;
    }
    return {};
  }

  async discard({ scenario }: { scenario: Scenario }) {
    await this.#draft(scenario);
    const roles = await this.roles.find({ scenario }).toArray();
    await this.payoffs.deleteMany({ role: { $in: roles.map(({ _id }) => _id) } });
    await Promise.all([this.roles.deleteMany({ scenario }), this.options.deleteMany({ scenario }), this.issues.deleteMany({ scenario })]);
    await this.scenarios.deleteOne({ _id: scenario, published: false });
    return {};
  }

  async updateIssue({ issue, name, kind, unit }: { issue: Issue; name: string; kind: IssueKind; unit?: string }) {
    const found = await this.issues.findOne({ _id: issue });
    if (found === null) throw new UnknownIssue("There is no such issue.");
    if (await this.#isPublished(found.scenario)) throw new Published("A published scenario can't be changed.");
    const stored = name.trim();
    if (!acceptableName(stored)) throw new InvalidIssueName("An issue name must have 1 to 100 characters.");
    const issueExists = new IssueExists("This scenario already has an issue with that name.");
    if ((await this.issues.findOne({ scenario: found.scenario, name: stored, _id: { $ne: issue } })) !== null) throw issueExists;
    const storedUnit = unit?.trim() || undefined;
    if (kind === "DISCRETE" && storedUnit !== undefined) throw new UnitNotAllowed("Only a continuous issue has a unit.");
    // An option of a range has a universal value that an option of a list can't have, and the other way around.
    if (kind !== found.kind) await this.#removeOptions({ issue });
    try {
      await this.issues.updateOne(
        { _id: issue },
        storedUnit === undefined ? { $set: { name: stored, kind }, $unset: { unit: "" } } : { $set: { name: stored, kind, unit: storedUnit } },
      );
    } catch (error) {
      if (isDuplicate(error)) throw issueExists;
      throw error;
    }
    return {};
  }

  async removeIssue({ issue }: { issue: Issue }) {
    const found = await this.issues.findOne({ _id: issue });
    if (found === null) throw new UnknownIssue("There is no such issue.");
    if (await this.#isPublished(found.scenario)) throw new Published("A published scenario can't be changed.");
    await this.#removeOptions({ issue });
    await this.issues.deleteOne({ _id: issue });
    return {};
  }

  async updateOption({ option, name, universalValue }: { option: Option; name: string; universalValue?: number }) {
    const found = await this.options.findOne({ _id: option });
    if (found === null) throw new UnknownOption("There is no such option.");
    if (await this.#isPublished(found.scenario)) throw new Published("A published scenario can't be changed.");
    const stored = name.trim();
    if (!acceptableName(stored)) throw new InvalidOptionName("An option name must have 1 to 100 characters.");
    const optionExists = new OptionExists("This issue already has an option with that name.");
    const others = { issue: found.issue, _id: { $ne: option } };
    if ((await this.options.findOne({ ...others, name: stored })) !== null) throw optionExists;
    const kind = (await this.issues.findOne({ _id: found.issue }))?.kind;
    // A request that leaves out the universal value may still carry it as null.
    const value = universalValue ?? undefined;
    if (kind === "CONTINUOUS" && value === undefined) throw new ValueRequired("An option of a continuous issue needs a universal value.");
    if (kind === "DISCRETE" && value !== undefined) throw new ValueNotAllowed("An option of a discrete issue has no universal value.");
    const valueTaken = new ValueTaken("This issue already has an option at that universal value.");
    if (value !== undefined && (await this.options.findOne({ ...others, universalValue: value })) !== null) throw valueTaken;
    try {
      await this.options.updateOne({ _id: option }, { $set: { name: stored, ...(value === undefined ? {} : { universalValue: value }) } });
    } catch (error) {
      if (!isDuplicate(error)) throw error;
      throw (await this.options.findOne({ ...others, name: stored })) === null ? valueTaken : optionExists;
    }
    return {};
  }

  async removeOption({ option }: { option: Option }) {
    const found = await this.options.findOne({ _id: option });
    if (found === null) throw new UnknownOption("There is no such option.");
    if (await this.#isPublished(found.scenario)) throw new Published("A published scenario can't be changed.");
    await this.payoffs.deleteMany({ option });
    await this.options.deleteOne({ _id: option });
    return {};
  }

  async updateRole({ role, name, batna }: { role: Role; name: string; batna: number }) {
    const found = await this.roles.findOne({ _id: role });
    if (found === null) throw new UnknownRole("There is no such role.");
    if (await this.#isPublished(found.scenario)) throw new Published("A published scenario can't be changed.");
    const stored = name.trim();
    if (!acceptableName(stored)) throw new InvalidRoleName("A role name must have 1 to 100 characters.");
    const roleExists = new RoleExists("This scenario already has a role with that name.");
    if ((await this.roles.findOne({ scenario: found.scenario, name: stored, _id: { $ne: role } })) !== null) throw roleExists;
    try {
      await this.roles.updateOne({ _id: role }, { $set: { name: stored, batna } });
    } catch (error) {
      if (isDuplicate(error)) throw roleExists;
      throw error;
    }
    return {};
  }

  async removeRole({ role }: { role: Role }) {
    const found = await this.roles.findOne({ _id: role });
    if (found === null) throw new UnknownRole("There is no such role.");
    if (await this.#isPublished(found.scenario)) throw new Published("A published scenario can't be changed.");
    await this.payoffs.deleteMany({ role });
    await this.roles.deleteOne({ _id: role });
    return {};
  }

  async publish({ scenario }: { scenario: Scenario }) {
    const found = await this.scenarios.findOne({ _id: scenario });
    if (found === null) throw new UnknownScenario("There is no such scenario.");
    const alreadyPublished = new AlreadyPublished("This scenario is already published.");
    if (found.published) throw alreadyPublished;
    if (!(await this.#complete(scenario))) {
      throw new Incomplete(
        "A scenario needs an issue, at least two roles, at least two options for every issue, and every payoff and brief before it can be published.",
      );
    }
    const { matchedCount } = await this.scenarios.updateOne({ _id: scenario, published: false }, { $set: { published: true } });
    if (matchedCount === 0) throw alreadyPublished;
    return { scenario };
  }

  async _published() {
    const published = await this.scenarios.find({ published: true }).sort({ name: 1 }).toArray();
    return published.map(({ _id, name }) => ({ scenario: _id, name }));
  }

  async _scenario({ scenario }: { scenario: Scenario }) {
    const found = await this.scenarios.findOne({ _id: scenario });
    return found === null ? [] : [{ name: found.name, author: found.author, published: found.published }];
  }

  async _authoredBy({ author }: { author: Author }) {
    // Each _id comes from an ObjectId, which starts with the time it was made, so sorting by _id backwards puts the newest first.
    const authored = await this.scenarios.find({ author }).sort({ _id: -1 }).toArray();
    return authored.map(({ _id, name, published }) => ({ scenario: _id, name, published }));
  }

  async _issue({ issue }: { issue: Issue }) {
    const found = await this.issues.findOne({ _id: issue });
    if (found === null) return [];
    const { scenario, name, kind, unit } = found;
    return [{ scenario, name, kind, ...(unit === undefined ? {} : { unit }) }];
  }

  async _option({ option }: { option: Option }) {
    const found = await this.options.findOne({ _id: option });
    if (found === null) return [];
    const { scenario, issue, name, universalValue } = found;
    return [{ scenario, issue, name, ...(universalValue === undefined ? {} : { universalValue }) }];
  }

  async _issues({ scenario }: { scenario: Scenario }) {
    // Each _id comes from an ObjectId, which starts with the time it was made, so sorting by _id keeps the order of adding.
    const issues = await this.issues.find({ scenario }).sort({ _id: 1 }).toArray();
    return issues.map(({ _id, name, kind, unit }) => ({ issue: _id, name, kind, unit }));
  }

  async _options({ issue }: { issue: Issue }) {
    const found = await this.issues.findOne({ _id: issue });
    if (found === null) return [];
    const options = await this.options.find({ issue }).sort(optionOrder(found.kind)).toArray();
    return options.map(({ _id, name, universalValue }) => ({ option: _id, name, universalValue }));
  }

  async _roles({ scenario }: { scenario: Scenario }) {
    const roles = await this.roles.find({ scenario }).sort({ _id: 1 }).toArray();
    return roles.map(({ _id, name }) => ({ role: _id, name }));
  }

  async _role({ role }: { role: Role }) {
    const found = await this.roles.findOne({ _id: role });
    if (found === null) return [];
    const { scenario, name, batna, brief, summary } = found;
    // A role without a brief or summary yet has no such field, rather than an undefined one, which a read would bind as a value.
    return [{ scenario, name, batna, ...(brief === undefined ? {} : { brief }), ...(summary === undefined ? {} : { summary }) }];
  }

  async _payoffs({ role }: { role: Role }) {
    const found = await this.roles.findOne({ _id: role });
    if (found === null) return [];
    const model = await this.#model(found.scenario);
    const points = model.roles.find(({ id }) => id === role)?.points ?? new Map<Option, number>();
    return model.issues.flatMap(({ id: issue, options }) =>
      options.flatMap(({ id: option }) => {
        const worth = points.get(option);
        return worth === undefined ? [] : [{ issue, option, points: worth }];
      }),
    );
  }

  async _dealValidity({ scenario, terms }: { scenario: Scenario; terms: TermSheet }): Promise<{ issue?: string; problem: string }[]> {
    if (!(await this.#isPublished(scenario))) return [{ problem: "This scenario doesn't exist or isn't published." }];
    return problemsWith(await this.#model(scenario), terms);
  }

  async _dealPayoff({ role, terms }: { role: Role; terms: TermSheet }) {
    const found = await this.roles.findOne({ _id: role });
    if (found === null || !(await this.#isPublished(found.scenario))) return [];
    const model = await this.#model(found.scenario);
    const scored = model.roles.find(({ id }) => id === role);
    if (scored === undefined || problemsWith(model, terms).length > 0) return [];
    return [{ points: pointsFor(model, scored, terms) }];
  }

  async _dealJointPayoff({ scenario, terms }: { scenario: Scenario; terms: TermSheet }) {
    if (!(await this.#isPublished(scenario))) return [];
    const model = await this.#model(scenario);
    if (problemsWith(model, terms).length > 0) return [];
    return [{ jointPoints: sum(model.roles.map((role) => pointsFor(model, role, terms))) }];
  }

  async _jointBatna({ scenario }: { scenario: Scenario }) {
    if ((await this.scenarios.findOne({ _id: scenario })) === null) return [];
    const roles = await this.roles.find({ scenario }).toArray();
    return [{ jointBatna: sum(roles.map(({ batna }) => batna)) }];
  }

  async _wholePie({ scenario }: { scenario: Scenario }): Promise<WholePie[]> {
    if (!(await this.#isPublished(scenario))) return [];
    const best = wholePie(await this.#model(scenario));
    return best === undefined ? [] : [best];
  }

  /** The unpublished scenario `scenario`, or the refusal for an unknown or published one. */
  async #draft(scenario: Scenario) {
    const found = await this.scenarios.findOne({ _id: scenario });
    if (found === null) throw new UnknownScenario("There is no such scenario.");
    if (found.published) throw new Published("A published scenario can't be changed.");
    return found;
  }

  /** Removes the options of `issue`, and every role's payoffs for them. */
  async #removeOptions({ issue }: { issue: Issue }) {
    const options = await this.options.find({ issue }).toArray();
    await this.payoffs.deleteMany({ option: { $in: options.map(({ _id }) => _id) } });
    await this.options.deleteMany({ issue });
  }

  async #isPublished(scenario: Scenario): Promise<boolean> {
    return (await this.scenarios.findOne({ _id: scenario }))?.published === true;
  }

  /** Whether the scenario has everything publishing requires. */
  async #complete(scenario: Scenario): Promise<boolean> {
    const model = await this.#model(scenario);
    const briefed = await this.roles.countDocuments({ scenario, brief: { $exists: true } });
    const options = model.issues.flatMap(({ options }) => options);
    return (
      model.issues.length >= 1 &&
      model.roles.length >= 2 &&
      model.issues.every(({ options }) => options.length >= 2) &&
      briefed === model.roles.length &&
      model.roles.every(({ points }) => options.every(({ id }) => points.has(id)))
    );
  }

  async #model(scenario: Scenario): Promise<Model> {
    const [issues, options, roles] = await Promise.all([
      this.issues.find({ scenario }).sort({ _id: 1 }).toArray(),
      this.options.find({ scenario }).sort({ _id: 1 }).toArray(),
      this.roles.find({ scenario }).sort({ _id: 1 }).toArray(),
    ]);
    const payoffs = await this.payoffs.find({ role: { $in: roles.map(({ _id }) => _id) } }).toArray();
    return {
      issues: issues.map(({ _id, name, kind }) => {
        const own = options.filter(({ issue }) => issue === _id).map(({ _id: id, universalValue }) => ({ id, value: universalValue }));
        // Options already arrive in the order they were added, which is the order of a discrete issue.
        if (kind === "CONTINUOUS") own.sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
        return { id: _id, name, kind, options: own };
      }),
      roles: roles.map(({ _id, batna }) => ({
        id: _id,
        batna,
        points: new Map(payoffs.filter(({ role }) => role === _id).map(({ option, points }) => [option, points])),
      })),
    };
  }
}

/** The problems `_dealValidity` reports, issue by issue, then for the issues the scenario doesn't have. */
function problemsWith(model: Model, terms: TermSheet): { issue?: string; problem: string }[] {
  const agreed: Record<string, unknown> = typeof terms === "object" && terms !== null && !Array.isArray(terms) ? terms : {};
  const problems: { issue?: string; problem: string }[] = [];
  for (const { id, name, kind, options } of model.issues) {
    const value = agreed[id];
    if (value === undefined) {
      problems.push({ issue: name, problem: "Nothing is agreed on this issue." });
    } else if (kind === "DISCRETE") {
      if (!options.some(({ id }) => id === value)) problems.push({ issue: name, problem: "This issue has no such option." });
    } else {
      const lowest = options[0]?.value ?? 0;
      const highest = options.at(-1)?.value ?? 0;
      if (typeof value !== "number" || !Number.isFinite(value) || value < lowest || value > highest) {
        problems.push({ issue: name, problem: `The value must be a number from ${lowest} to ${highest}.` });
      }
    }
  }
  const known = new Set<string>(model.issues.map(({ id }) => id));
  for (const key of Object.keys(agreed)) {
    if (!known.has(key)) problems.push({ issue: key, problem: "This scenario has no such issue." });
  }
  return problems;
}

/** A role's total points for a valid term sheet. */
function pointsFor(model: Model, role: Model["roles"][number], terms: TermSheet): number {
  return sum(
    model.issues.map(({ id, kind, options }) => {
      const agreed = terms[id];
      if (kind === "DISCRETE") return role.points.get(agreed as Option) ?? 0;
      return blend(options, role.points, agreed as number);
    }),
  );
}

/** A role's points at a value of a continuous issue: the straight-line blend of the options on either side of it. */
function blend(options: Model["issues"][number]["options"], points: Map<Option, number>, value: number): number {
  for (let index = 0; index + 1 < options.length; index++) {
    const low = options[index]!;
    const high = options[index + 1]!;
    const lowValue = low.value ?? 0;
    const highValue = high.value ?? 0;
    if (value < lowValue || value > highValue) continue;
    const lowPoints = points.get(low.id) ?? 0;
    const highPoints = points.get(high.id) ?? 0;
    return lowPoints + ((value - lowValue) / (highValue - lowValue)) * (highPoints - lowPoints);
  }
  return points.get(options[0]?.id as Option) ?? 0;
}

/**
 * The term sheet with the most joint points among those worth at least its BATNA to every role.
 *
 * Every role's points are linear in each continuous value between two neighbouring options, so the search tries every
 * combination of one option per discrete issue and one stretch between neighbouring options per continuous issue. Within
 * a combination, the best point is a linear program, solved by checking each vertex of its feasible region. Candidates
 * are tried in a fixed order and only a strictly better one replaces the best so far, so ties always resolve the same way.
 */
function wholePie(model: Model): WholePie | undefined {
  const jointBatna = sum(model.roles.map(({ batna }) => batna));
  const discrete = model.issues.filter(({ kind }) => kind === "DISCRETE");
  const continuous = model.issues.filter(({ kind }) => kind === "CONTINUOUS");
  let best: WholePie | undefined;
  for (const choices of product(discrete.map(({ options }) => options))) {
    for (const stretches of product(continuous.map(({ options }) => neighbours(options)))) {
      // Each role's points with every continuous value at the low end of its stretch...
      const base = model.roles.map(
        ({ points }) =>
          sum(choices.map(({ id }) => points.get(id) ?? 0)) + sum(stretches.map(([low]) => points.get(low.id) ?? 0)),
      );
      // ...and what each role gains as each value moves to the high end.
      const gains = model.roles.map(({ points }) =>
        stretches.map(([low, high]) => (points.get(high.id) ?? 0) - (points.get(low.id) ?? 0)),
      );
      const position = bestPosition(base, gains, model.roles.map(({ batna }) => batna), stretches.length);
      if (position === undefined) continue;
      const jointPoints = sum(base) + sum(gains.map((roleGains) => sum(roleGains.map((gain, i) => gain * position[i]!))));
      if (best !== undefined && jointPoints <= best.jointPoints + EPSILON) continue;
      const terms: Record<string, string | number> = {};
      discrete.forEach(({ id }, i) => (terms[id] = choices[i]!.id));
      continuous.forEach(({ id }, i) => {
        const [low, high] = stretches[i]!;
        const lowValue = low.value ?? 0;
        terms[id] = tidy(lowValue + position[i]! * ((high.value ?? 0) - lowValue));
      });
      best = { terms, jointPoints: tidy(jointPoints), jointBatna };
    }
  }
  return best;
}

/**
 * Where to put each continuous value in its stretch, from 0 (the low end) to 1 (the high end), to get the most joint
 * points while every role keeps at least its BATNA; or nothing when no position does. The constraints are each role's
 * BATNA and the ends of each stretch; with `size` values, every vertex of the feasible region is where `size` of them meet.
 */
function bestPosition(base: number[], gains: number[][], batnas: number[], size: number): number[] | undefined {
  // Each constraint reads `coefficients · position ≥ bound`.
  const constraints: { coefficients: number[]; bound: number }[] = [
    ...range(size).map((i) => ({ coefficients: unit(size, i, 1), bound: 0 })),
    ...range(size).map((i) => ({ coefficients: unit(size, i, -1), bound: -1 })),
    ...batnas.map((batna, role) => ({ coefficients: gains[role]!, bound: batna - base[role]! })),
  ];
  const objective = range(size).map((i) => sum(gains.map((roleGains) => roleGains[i]!)));
  let best: { position: number[]; value: number } | undefined;
  for (const chosen of subsets(constraints.length, size)) {
    const position = solve(
      chosen.map((index) => constraints[index]!.coefficients),
      chosen.map((index) => constraints[index]!.bound),
    );
    if (position === undefined) continue;
    const feasible = constraints.every(
      ({ coefficients, bound }) => dot(coefficients, position) >= bound - EPSILON * (1 + Math.abs(bound)),
    );
    if (!feasible) continue;
    const value = dot(objective, position);
    if (best === undefined || value > best.value + EPSILON) best = { position: position.map(clampUnit), value };
  }
  return best?.position;
}

/** Solves a square system of linear equations by Gaussian elimination, or returns nothing when it has no single answer. */
function solve(matrix: number[][], rhs: number[]): number[] | undefined {
  const size = rhs.length;
  const rows = matrix.map((row, i) => [...row, rhs[i]!]);
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(rows[row]![column]!) > Math.abs(rows[pivot]![column]!)) pivot = row;
    }
    if (Math.abs(rows[pivot]![column]!) < 1e-12) return undefined;
    [rows[column], rows[pivot]] = [rows[pivot]!, rows[column]!];
    for (let row = 0; row < size; row++) {
      if (row === column) continue;
      const factor = rows[row]![column]! / rows[column]![column]!;
      for (let k = column; k <= size; k++) rows[row]![k] = rows[row]![k]! - factor * rows[column]![k]!;
    }
  }
  return rows.map((row, i) => row[size]! / row[i]!);
}

function* product<T>(lists: T[][]): Generator<T[]> {
  if (lists.length === 0) {
    yield [];
    return;
  }
  const [first, ...rest] = lists;
  for (const item of first!) for (const tail of product(rest)) yield [item, ...tail];
}

/** Every way to choose `size` of `count` indexes, in lexicographic order. */
function* subsets(count: number, size: number, start = 0): Generator<number[]> {
  if (size === 0) {
    yield [];
    return;
  }
  for (let first = start; first <= count - size; first++) {
    for (const rest of subsets(count, size - 1, first + 1)) yield [first, ...rest];
  }
}

function neighbours<T>(items: T[]): [T, T][] {
  return range(items.length - 1).map((i) => [items[i]!, items[i + 1]!]);
}

const range = (length: number) => Array.from({ length }, (_, i) => i);
const unit = (size: number, index: number, value: number) => range(size).map((i) => (i === index ? value : 0));
const dot = (a: number[], b: number[]) => sum(a.map((value, i) => value * b[i]!));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const clampUnit = (value: number) => Math.min(1, Math.max(0, value));
/** Rounds away the tiny errors elimination leaves, such as 99999.99999999999 for 100000. */
const tidy = (value: number) => Math.round(value * 1e9) / 1e9;

const acceptableName = (name: string) => name.length >= 1 && name.length <= MAX_NAME;
const optionOrder = (kind: IssueKind): Sort => (kind === "CONTINUOUS" ? { universalValue: 1, _id: 1 } : { _id: 1 });
const newId = <T extends string>() => new ObjectId().toHexString() as T;

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
