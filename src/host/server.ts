/**
 * The HTTP server: the API under /api, a health check, and the built Vue app.
 *
 * Settings come from the environment: PORT, PUBLIC_ORIGIN (the origin browsers use), MONGODB_URI, and MONGODB_DB.
 * Without MONGODB_URI, the data is kept in memory. On its first start with an empty database, the server publishes
 * the built-in scenarios. The counterpart answers with the scripted stand-in until it has a language model.
 */
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createLocalClient } from "@mit-sdg/sync-engine/client";
import type { TheWholePieWire } from "../../generated/wire.ts";
import { createCounterpart, standIn } from "../agents/counterpart.ts";
import { scriptedReasoner } from "../agents/reusable/reasoners.ts";
import { assembleApplication } from "../assembly.ts";
import { seed } from "../seed/seed.ts";
import { connect } from "./database.ts";
import { wholePiePolicy } from "./http.ts";

const port = Number(process.env.PORT ?? 3141);
const publicOrigin = process.env.PUBLIC_ORIGIN ?? `http://localhost:${port}`;
const site = `${import.meta.dir}/../../frontend/dist`;

const { database } = await connect(process.env.MONGODB_URI);
const counterpart = createCounterpart(scriptedReasoner(standIn));
const application = assembleApplication({ database }, { observers: [counterpart.observer] });
await seed(application);
const gateway = createGateway<TheWholePieWire>({ application });
void counterpart.start({ application, api: createLocalClient<TheWholePieWire>({ invoker: gateway }) });
const handleApi = createHttpHandler({ application, gateway, policy: wholePiePolicy(publicOrigin) });

const server = Bun.serve({
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) return handleApi(request);
    if (pathname === "/health") return new Response("ok");
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

    // A path such as /assets/index.js names a file in the built app; every other path is served index.html.
    const asset = Bun.file(site + pathname);
    if (pathname !== "/" && (await asset.exists())) return new Response(asset);
    const page = Bun.file(`${site}/index.html`);
    if (await page.exists()) return new Response(page);
    return new Response("The frontend isn't built yet.", { status: 404 });
  },
});
console.log(`The Whole Pie is listening on ${server.url} for ${publicOrigin}.`);
