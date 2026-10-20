import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { TheWholePieWireHttp } from "../../../generated/wire.ts";

/** A typed client for every endpoint, built from `generated/wire.ts`. */
export const api = createHttpClient<TheWholePieWireHttp>({ baseUrl: "/api" });

type Output<Path extends keyof TheWholePieWireHttp> = TheWholePieWireHttp[Path]["output"];

/** What `/bakery` responds with: the published scenarios, and the person's tables. */
export type Bakery = Output<"/bakery">;
export type Scenario = Bakery["scenarios"][number];
/**
 * A person's ratings: averages over their rated negotiations, and the stars others gave them. Every field can be null,
 * as for the ratings of an empty seat, which has nobody to rate.
 */
export type Ratings = {
  [Field in keyof NonNullable<Bakery["ratings"]>]: NonNullable<Bakery["ratings"]>[Field] | null;
};
export type TableSummary = Bakery["tables"][number];

/** What `/tables/show` responds with: the table as the person's role sees it, their notes, and the counterpart's open questions. */
export type TableView = Output<"/tables/show">;
export type Table = TableView["table"];
export type TableId = Table["table"];
export type Issue = Table["issues"][number];
export type Message = Table["messages"][number];
export type Proposal = Table["proposals"][number];
export type Terms = Proposal["terms"];
/** A suggestion of how long to negotiate, waiting for everyone else to agree. */
export type StartSuggestion = TableView["start"][number];

/** What `/friends/invitation` responds with: the invitation as someone invited sees it, or the table when they're already there. */
export type InvitationView = Output<"/friends/invitation">;
export type Invitation = Extract<InvitationView, { invitation: unknown }>["invitation"];

/** A scenario the person wrote, as `/scenarios/mine` lists it: a draft, or published. */
export type WrittenScenario = Output<"/scenarios/mine">["scenarios"][number];
/** What `/scenarios/show` responds with: a scenario as its author writes it, with every role's brief and points. */
export type Draft = Output<"/scenarios/show">["draft"];
export type ScenarioId = Draft["scenario"];
export type DraftIssue = Draft["issues"][number];
export type DraftOption = DraftIssue["options"][number];
export type DraftRole = Draft["roles"][number];

/** What `/tables/debrief` responds with: the person's role and the whole pie. */
export type DebriefView = Output<"/tables/debrief">;
export type Debrief = DebriefView["debrief"];
/** Another person at the table the person can review, with the stars they gave them once they have. */
export type ReviewTarget = DebriefView["reviews"][number];
