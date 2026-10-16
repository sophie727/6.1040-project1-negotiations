import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { TheWholePieWireHttp } from "../../../generated/wire.ts";

/** A typed client for every endpoint, built from `generated/wire.ts`. */
export const api = createHttpClient<TheWholePieWireHttp>({ baseUrl: "/api" });

type Output<Path extends keyof TheWholePieWireHttp> = TheWholePieWireHttp[Path]["output"];

/** What `/bakery` responds with: the published scenarios, and the person's tables. */
export type Bakery = Output<"/bakery">;
export type Scenario = Bakery["scenarios"][number];
export type TableSummary = Bakery["tables"][number];

/** What `/tables/show` responds with: the table as the person's role sees it, their notes, and the counterpart's open questions. */
export type TableView = Output<"/tables/show">;
export type Table = TableView["table"];
export type TableId = Table["table"];
export type Issue = Table["issues"][number];
export type Message = Table["messages"][number];
export type Proposal = Table["proposals"][number];
export type Terms = Proposal["terms"];

/** What `/tables/debrief` responds with: the person's role and the whole pie. */
export type DebriefView = Output<"/tables/debrief">;
export type Debrief = DebriefView["debrief"];
