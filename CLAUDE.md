# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

NEVER push to GitHub. The user will never ask for it and never wants it.

## What this is

"The Whole Pie": a platform for practicing negotiations ("chess.com for negotiations"), a 6.1040 personal project. People sign in with a password or with Commons (the class's sign-in site). A person picks a scenario (e.g. The Job Offer), takes a role, and negotiates under a countdown against an AI counterpart, friends they invite with a link, or someone new they're matched with. Anyone can also write a scenario of their own and publish it to the bakery. Afterwards, an AI coach writes a debrief that reveals the whole pie. Negotiations between people are rated (claim, create, and stars from reviews). It is built on [sync-engine](https://github.com/mit-sdg/sync-engine) (concepts + reactions/endpoints). [conceptbox](https://github.com/mit-sdg/conceptbox) is the reference app for sync-engine patterns, and some files (e.g. `src/agents/reusable/agent.ts`) were copied from it.

Design deliverables and notes are in `design/notes/`: `P1_design/`, `P2_design/` (the MVP's plan, challenges, and journey), and `P3_design/` (the beta's plan, `claude-plan-p3.md`, and journey).

## P3 Deliverables

- my code and specifications are in this folder.
- the URL of my deployed app is here: https://whole-pie.mit-sdg.dev/
- my automated tests and their saved execution output are in tests/
- my visual design study is in design/notes/P3_design/visual_design_study.pdf. To see my comments and annotations, see this link: https://docs.google.com/presentation/d/1JjVsr007LRz5RLJFWWi-q5-C41KLaWfBwttFwIPfkWY/edit?usp=sharing.
- An updated user journey is in design/notes/P3_design/beta_user_journey.md.
- An updated screen recording is here: https://youtu.be/iAhnsTYcQbI.
- And my updated design notebook is in my private github.

## Commands

Runtime is Bun (backend), plus Vue 3 + Vite in `frontend/` (that folder has its own `package.json` and `bun.lock`).

- `bun run dev`: API server on :3141 with watch, set up for the Vite dev origin. Run `bun run --cwd frontend dev` alongside it for the UI on :5173 (Vite proxies `/api` to :3141).
- `bun run build` builds the frontend into `frontend/dist`, and `bun run start` then serves the API and the built app together on :3141.
- `bun run test` runs all tests. For a single file: `bun test --timeout 60000 tests/concepts/Tabling.test.ts`. Add `-t "<name pattern>"` to filter by test name. `bun run test:save` also writes `tests/output.txt`, a P3 deliverable. Under Claude Code, Bun lists only failures (it sees `CLAUDECODE`); run `env -u CLAUDECODE bun run test:save` so the saved output lists every test.
- `bun run check` runs `sync-engine check` (validates the assembly against the design docs), `sync-engine artifacts check` (checks that `generated/` is up to date), `tsc` and the frontend's `vue-tsc`.
- `bun run generate` regenerates `generated/wire.ts` and `generated/the-whole-pie.md` from the assembly. Run it after changing any endpoint, concept action/query signature or design doc. Never hand-edit `generated/`.
- `bun run models` lists the models the configured Anthropic key/proxy offers.

Environment (`.env`, which Bun reads automatically; see `.env.example`):

- Without `MONGODB_URL`, the server uses an in-memory MongoDB (`mongodb-memory-server`). Tests always use one.
- People can sign in with Commons at `COMMONS_ORIGIN` (`https://class.mit-sdg.dev` unless set), which sends them back to `PUBLIC_ORIGIN` (the dev script sets it to the Vite origin). Tests use a `MemoryProvider` in place of Commons.
- With `ANTHROPIC_API_KEY` set (optionally with `ANTHROPIC_BASE_URL` for MIT's Parley proxy, and `ANTHROPIC_MODEL`), the agents use Claude. Otherwise, with `GEMINI_API_KEY`, they use Gemini. With neither key, they use scripted stand-ins.

## Deployment

Deployed on 6.1040 Apps (`https://<name>.mit-sdg.dev`; guide: https://61040.github.io/fa26/resources/deploying-apps/). The platform builds a chosen GitHub commit and ignores `.env`, so variables are set on the site. Settings: runtime Bun, package directories `.` and `frontend`, build script `build`, start script `start`, port 3000, health check `/health`. The platform sets `PORT`, `HOST`, `NODE_ENV` and the MongoDB address (named `MONGODB_URL`). Set `PUBLIC_ORIGIN` to the app's https address and add the `ANTHROPIC_*` variables there. Leave `MONGODB_DB` unset there, because the platform only authorizes the database its address names. Its install uses frozen lockfiles and `packageManager`'s Bun version, and its build doesn't typecheck, so run `bun run check` before deploying. `bun run preview` runs a production build locally on :3000.

## Architecture

**Design docs are part of the build.** Each concept's spec is `design/concepts/<Name>.md`, imported as text by `src/concepts/<Name>/registry.ts` (via the `@design/*` path alias). Each composition's prose is `design/compositions/*.md`, listed in `generated.config.ts`. Composition docs link to code with references like `reaction:table.seating.AddSeatForEachRole` or `view:table.access.seatedAs`, which follow the key path of the `composition` object exported from `src/compositions/*.ts` and registered in `src/assembly.ts`. `endpoints` code blocks in those docs declare which endpoints each section documents. `sync-engine check` fails when the docs and the code disagree, so renaming or moving a reaction/endpoint means updating the matching `.md`. `design/types.md` declares the app-wide types and the concept instances (e.g. `AgentSessioning` is a second instance of Sessioning).

**Concepts** (`src/concepts/<Name>/`): `<Name>.ts` is a generic, Mongo-backed class that knows nothing about the other concepts. Refusals are `Error` subclasses. `registry.ts` binds the type parameters, maps refusal codes (e.g. `TIME_UP`) to those classes, and registers the `mongo` floor. `src/concepts.ts` collects them into `applicationConceptSet`.

**Compositions** (`src/compositions/`): all cross-concept behavior. They define `reaction`s (when X then Y), `view`/`former` queries, and `endpoint`s (HTTP paths such as `/tables/show`), all written in sync-engine's `language`/`boundary` DSL. Endpoints branch with `where(...).then(...).named(...)` paths, and shared guards are reused across endpoints (e.g. `seatedAs` and `unlessUnderWay` in `table.ts`). Someone without a seat at a table gets `NOT_FOUND`. `src/assembly.ts` (`assembleApplication`) is the single assembly that the server, the tests and `sync-engine check` all use. It takes an optional `clock`, which tests use to move time. Named, pure calculations (e.g. `spiceLevel`, a scenario's spiciness in the bakery) are in `src/computations.ts`, passed to `conceptSet` in `src/concepts.ts`, used in views and formers with `compute(...)`, and declared in a `computations` fence of the composition doc that uses them.

**Agents** (`src/agents/`): the counterpart, the coach, and the timekeeper (which expires overdue tables every 30 seconds through `/timekeeper/expire`) run in-process but act like external clients. Each signs in through `AgentSessioning`, polls the reusable `answering` endpoints (`/answers/open|take|extend|conclude|abandon`) for `Reasoning` prompts whose `ask` text it handles, reads its material through an endpoint (e.g. `/counterpart/table`, which shows the table as each counterpart seat sees it, each with only its own brief), and streams its answer back. At a practice table, `bot:counterpart` takes one seat and `SeatMoreCounterparts` (in `practice.ts`) seats a `bot:counterpart:<role>` player in each other one, so a scenario with three roles is practiced against two counterparts. The counterpart agent answers each question as one of them, and every answer starts with that role's id, which the reactions in `counterpart.ts` read. After a reply, it is asked whether another counterpart adds something, until it answers `PASS`. Reactions in the compositions create the prompts and apply concluded answers. The ask strings (in `compositions/asks.ts`) are matched exactly, so rewording one strands any prompts already waiting. `reusable/models.ts` wraps Claude/Gemini, and `reusable/reasoners.ts` has the scripted stand-ins.

**Starting and ending a table.** Every table starts with a handshake in `TimeLimitProposing` (a second instance of Proposing): someone suggests a length, which also means they're ready, and `BeginOnceEveryoneAgrees` begins the table when everyone accepts; the AI accepts at once. A rule that follows every ending (settle, withdraw, expire) is defined once and registered per ending with `forEachEnding` in `table.ts`; `returned(...)` channel triggers can't do it, because their patterns bind only top-level fields.

**sync-engine gotchas met here.** `.afterFlowSettles()` isn't allowed inside a named sibling branch, so an endpoint that answers after the flow settles keeps its refusals in a second endpoint at the same path (only one of them declares the input validator, and every one must receive `session` if any does). Those refusal endpoints must read only facts the first endpoint's action can't change, or they race it. A concept query must leave an absent optional field out of its row rather than return it as `undefined`, which a read would bind as a value. A view can't open a name it doesn't use; use an output view or an existence read. A `whether` line leaves its names blank when there's no row: a later query reading a blank name drops the case, but `compute(...)` receives it as `null` (the spiciness tests rely on this).

**Signing in** follows conceptbox: `reusable/accounts`, `reusable/passwords`, and `reusable/commons` compositions; `CommonsFederating` (Federating, with the `Provider` in `src/concepts/Federating/provider.ts`) links a Commons account to its user; the HTTP policy keeps a Commons attempt in a second cookie. On the page, `CommonsButton.vue` remembers the page the person started from (`rememberPage` in `router.ts`), and `CommonsCallback.vue` finishes on `/auth/commons/callback`.

**Writing scenarios** (`compositions/authoring.ts`, `design/compositions/authoring.md`): author-only endpoints under `/scenarios/...` over Briefing's draft actions (create, rename, update/remove issues, options, and roles, briefs, payoffs, publish, discard); anyone else gets `NOT_FOUND`. The editor is in `frontend/src/write/` (`/write` and `/write/<scenario>`): a General tab and a tab per role, whose points are drawn by `PayoffChart.vue`. When publishing, the page fills missing payoffs with 0 and appends a "Your points" section to each brief (`brief.ts`), after a marker comment, so the author's own text can be found again.

**Host** (`src/host/`): `server.ts` wires the database, agents, seed data (`src/seed/`: The Job Offer, and The Launch Room, a scenario for three, with their role briefs in `seed/briefs/*.md`; seeding publishes each built-in scenario not yet published under its name, so a new one reaches an existing database), the gateway and the HTTP handler (`http.ts` holds the HTTP policy), and serves `frontend/dist` as an SPA.

**Frontend** (`frontend/src/`): Vue 3 with a typed HTTP client (`api/client.ts`) generated from `generated/wire.ts`. Its types are derived from the endpoint outputs, so backend changes surface as `vue-tsc` errors after `bun run generate`. The table page polls `/tables/show` every second or two, and calls the expire endpoint when the countdown runs out.

**Tests**: `tests/support/app.ts` `startWholePie()` builds a fresh in-memory app with seed data, a frozen clock (`advance(minutes)`) and scripted agents (pass `null` to disable one), and returns a typed local client, with `practice(username, roleName?, scenarioName?)` for a table against the AI and `hostFriends(username)` for a table friends `join` through its link. `tests/support/reusable/results.ts` has `ok()` (unwraps or throws on `{error}`) and `eventually()` (waits for async agent work). The tests are organized by concept, composition and agent.

## Conventions

Doc comments and design prose are full sentences describing behavior in domain terms (the principle examples use Nadia, Hiro, Manon and The Job Offer). Match that style when adding code or specs.
