/**
 * The HTTP server: the API under /api, a health check, and the built Vue app.
 *
 * Settings come from the environment, which Bun reads from `.env`: PORT, HOST (the address to listen at, which 6.1040
 * Apps sets to 0.0.0.0), PUBLIC_ORIGIN (the origin browsers use, which Commons sends people back to after they sign in
 * there), COMMONS_ORIGIN (the Commons people sign in with; https://class.mit-sdg.dev unless set), MONGODB_URL (or
 * MONGODB_URI), and MONGODB_DB (unset on 6.1040 Apps, whose address names the database). Without a MongoDB address, the
 * data is kept in memory. On each start, the server publishes any built-in scenario the database doesn't have yet.
 *
 * With ANTHROPIC_API_KEY (and optionally ANTHROPIC_MODEL), the counterpart and the coach write with Claude, through
 * ANTHROPIC_BASE_URL when it is set, such as MIT's Parley at https://parley.api.mit.edu; otherwise, with GEMINI_API_KEY
 * (and optionally GEMINI_MODEL), with Gemini. Without either key, they answer with scripted stand-ins.
 */
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createLocalClient } from "@mit-sdg/sync-engine/client";
import type { TheWholePieWire } from "../../generated/wire.ts";
import { createCoach, modelCoach, scriptedDebrief } from "../agents/coach.ts";
import { createCounterpart, modelCounterpart, standIn } from "../agents/counterpart.ts";
import { listModels, modelFromEnvironment } from "../agents/reusable/models.ts";
import { scriptedReasoner } from "../agents/reusable/reasoners.ts";
import { createTimekeeper } from "../agents/timekeeper.ts";
import { assembleApplication } from "../assembly.ts";
import { CommonsProvider } from "../concepts/Federating/provider.ts";
import { seed } from "../seed/seed.ts";
import { connect } from "./database.ts";
import { wholePiePolicy } from "./http.ts";

const port = Number(process.env.PORT ?? 3141);
const publicOrigin = process.env.PUBLIC_ORIGIN ?? `http://localhost:${port}`;
const site = `${import.meta.dir}/../../frontend/dist`;

const { database } = await connect(process.env.MONGODB_URL || process.env.MONGODB_URI);
const model = modelFromEnvironment();
const counterpart = createCounterpart(model ? modelCounterpart(model) : scriptedReasoner(standIn));
const coach = createCoach(model ? modelCoach(model) : scriptedReasoner(scriptedDebrief));
const commons = new CommonsProvider({ origin: process.env.COMMONS_ORIGIN ?? "https://class.mit-sdg.dev", app: publicOrigin });
const application = assembleApplication({ database, commons }, { observers: [counterpart.observer, coach.observer] });
await seed(application);
const gateway = createGateway<TheWholePieWire>({ application });
const api = createLocalClient<TheWholePieWire>({ invoker: gateway });
void counterpart.start({ application, api });
void coach.start({ application, api });
// Every half minute, the timekeeper expires the tables whose time is up, even when nobody has their page open.
void createTimekeeper().start({ application, api });
const handleApi = createHttpHandler({ application, gateway, policy: wholePiePolicy(publicOrigin) });

const NO_REFERRER = { "Referrer-Policy": "no-referrer" };

const server = Bun.serve({
  port,
  hostname: process.env.HOST,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) return handleApi(request);
    if (pathname === "/health") return new Response("ok");
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

    // A path such as /assets/index.js names a file in the built app; every other path is served index.html.
    // Every page is served with Referrer-Policy: no-referrer, so a browser on /auth/commons/callback?code=…
    // sends no Referer header with the code in it.
    const asset = Bun.file(site + pathname);
    if (pathname !== "/" && (await asset.exists())) return new Response(asset, { headers: NO_REFERRER });
    const page = Bun.file(`${site}/index.html`);
    if (await page.exists()) return new Response(page, { headers: NO_REFERRER });
    return new Response("The frontend isn't built yet: run `bun run build`.", { status: 404 });
  },
});
console.log(
  `The Whole Pie is listening on ${server.url} for ${publicOrigin}. ` +
    (model ? `The counterpart and the coach write with ${model.name}.` : "No model API key is set, so the counterpart and the coach are scripted."),
);
// Signing up and in are refused (403) unless the browser's origin is exactly PUBLIC_ORIGIN, so a deployment needs it.
if (!process.env.PUBLIC_ORIGIN && process.env.NODE_ENV === "production") {
  console.warn(`PUBLIC_ORIGIN isn't set, so only pages at ${publicOrigin} can sign in. Set it to the app's https:// address.`);
}
// A proxy such as Parley may offer only some models, so say so at once when the chosen one isn't among them.
void listModels().then((offered) => {
  if (model && offered !== undefined && offered.length > 0 && !offered.includes(model.name)) {
    console.warn(`${model.name} isn't among the models your Anthropic key can use. Run \`bun run models\` and set ANTHROPIC_MODEL in .env.`);
  }
});
