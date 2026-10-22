# Changes since P2

A play-by-play of what changed after P2 was submitted (Sat Oct 17), through Wed Oct 21 (`33bdd33`), by day and commit, with why each change was made.

## Sun Oct 18: Deploying (`3598e88` "deploying?")

- **Prepared the app for 6.1040 Apps:**
  - The server listens on the platform's `HOST`.
  - It uses the database named in the platform's connection string, the only one the platform authorizes.
  - Bun is pinned to 1.4.2 to match the local version.
  - A `preview` script runs a production build locally.
- **Counterpart replies split into messages:** they now arrive one message per paragraph, with long paragraphs split at sentence ends. Before, a reply longer than a message's 2,000-character limit was cut off.
- **Replaced** `AGENTS.md` with `CLAUDE.md`.
- **Challenge:** sign-up and sign-in on the deployed site failed with 403. The server accepts cookie-setting requests only from `PUBLIC_ORIGIN`, which wasn't set on the platform. The fix was setting it, and the server now warns at startup when it's missing (that warning landed in `5952653`).

## Mon Oct 19: Color, navbar, the Table's layout, and the P3 plan

**`5952653` "playing with colors"**

- **New palette:** Lemon Chiffon, Deep Teal, Frosted Mint, Amber Gold, Rusty Spice.
- **Teal-as-main experiment:** Deep Teal was tried as the main color, then reverted. Rusty Spice stays the main color, and teal is kept for the navbar.
- **Sticky navbar:** it matches the page at the top and turns menu-board green once you scroll, like a bakery's menu board.
- **README:** notes that the local MongoDB container has to be restarted (`podman machine start`) after a reboot.

**`ba07cfb`: P3 planning, table and UI work**

- **The Table went from two boxes to three:** chat on the left; brief/notes and a new **Picture a deal** box on the right.
  - **Why:** checking a deal against your BATNA meant opening the Propose popup, closing it to reply, and finding the numbers reset when you reopened it.
  - **What the box does:** it stays on the page and keeps your terms. It shows the deal's worth against your BATNA (e.g. "197 below your BATNA"), can start from the latest proposal, and has Propose at the bottom. The popup and the big "Propose a deal!" button are gone.
- **Resizable boxes:**
  - **What you can drag:** the edge between the chat and the right side, and the edge between brief and deal.
  - **Behavior:** each box has a minimum size, double-click resets, arrow keys work, and sizes are remembered in the browser.
  - **Layout change:** the Table now fills the window, so growing one box shrinks the other.
- **Text color:** changed from brown to dark green, with a softer green for secondary text; both pass contrast checks on every background.
- **Navbar:** "The Whole Pie" is centered (left-aligned on phones, where it didn't fit).
- **Visual design study, round 1:** four directions (Storefront, Menu Board, Sticker Pop, Patisserie), photographed on the real app with identical content, for A/B comparison ([design/mockups/](../../mockups/)).
- **Notes:** split into `P2_design/` and `P3_design/`. First P3 decision recorded: the time-limit agreement reuses Proposing.

**`2fe9c4f`: the P3 plan** ([claude-plan-p3.md](claude-plan-p3.md)): playing other people, ratings, the prep sheet, a server timekeeper, spiciness, and the build order.

## Tue Oct 20: The beta features

**`18b1399` "added playing with friends"** (most of the plan)

- **Agreeing on how long to negotiate:**
  - **How it works:** the clock starts only once everyone agrees on a length, through a second instance of Proposing, `TimeLimitProposing`.
  - **Why:** its proposals carry nothing but a number, so nobody can start negotiating before the clock runs. The AI agrees at once, so practice is still one click.
  - **Tabling changes:** `begin` now takes the time limit; you can sit without picking a role; `TABLE_FULL` is a new refusal; you can leave a table before it starts.
- **Friends (new Inviting concept):** you share an unguessable `/join/<code>` link, with an "At the table" panel and a Copy button. **Why a separate code:** table ids can be guessed.
- **Someone new (new Matchmaking concept):**
  - **Matching:** a group forms inside one `seek` action, so two people looking at the same moment are matched only once.
  - **Lapsing:** a request lapses a minute after its last check-in.
  - **Dialog:** shows the time waited, with Cancel.
- **Ratings: P1's TripleRating split into two concepts.**
  - **Reviewing:** 1–5 stars for each other person, once per negotiation.
  - **Rating:** claim and create, recorded once when a table between people ends, however it ends.
  - **Why split:** the scores have different owners and timing. Stars come from other people after the fact, maybe never; claim and create are computed at the end.
  - **Where they show:** games against the AI never count. Ratings appear in the bakery and next to other players' seats, as on chess.com.
- **Prep sheet:** off by default, switched on in a new Settings dialog. Once it's on, you can't start until your target, walkaway and priorities are filled in, and the Table gets a Plan tab.
- **Server timekeeper:** a third agent that ends overdue tables every 30 seconds, so a table ends even when everyone has closed the page.
- **Coach:** one debrief for everyone at tables between people.
- **Bakery:** "Your negotiations" lists whom you played.
- **Tests and docs:** suites for every new concept and journey, output saved to [tests/output.txt](../../../tests/output.txt), a README "Running the tests" section, and the [beta user journey](beta_user_journey.md) drafted.

**`a0868ae` "some ui things"**

- **Prep sheet redesigned:** the Preparing concept is gone.
  - Its on/off setting moved to a generic **Preferring** concept, which holds per-person feature switches.
  - Each part of a plan is now a note kept by its own instance of Noting: `TargetNoting`, `WalkawayNoting`, `PrioritiesNoting`.
  - **Why:** existing concepts are reused instead of keeping one that only served prep sheets.
- **"Surprise me!" with strangers:**
  - You pick how many people, and join anyone looking for a negotiation that size. This uses an `open` flag in Matchmaking.
  - **Which scenario:** whatever the non-open members asked for, or the earliest seeker's suggestion if everyone is open.
  - **Which group:** among the possible groups, the one whose members have waited longest.
  - **New "prevents":** a group does something one of its members didn't want.
- **Spiciness (🌶) on every scenario card:**
  - **Measured in points:** what the whole pie adds over walking away, as a share of the joint BATNA.
  - **Levels:** mild at ≥40%, medium at ≥15%, hot below that (or when no deal is possible).
  - **Why points, not term sheets:** the count of acceptable term sheets changes with options nobody would agree to.
  - **Privacy:** only the level reaches the browser, because the numbers would leak BATNAs.
  - **Example:** The Job Offer is 10%, so it's hot.
- **Transcript after a negotiation:** the debrief has "The whole pie" and "Transcript" tabs. The transcript also shows what each proposal was worth to the other side.
- **New case drafted:** the [inter-team dynamics case](../example_cases/inter-team-dynamics.md), in `example_cases/` alongside the Job Offer.

**`71d5f6d`: The Launch Room case fleshed out.** Mandy (marketing), Presley (product) and Sally (sales) negotiate a product launch. It's built so that splitting the difference on every issue leaves value on the table.

**`3085d2f` "added logging in through commons, as well as ui for creating scenarios"**

- **Sign in with Commons:** a new Federating concept (as `CommonsFederating`), adapted from conceptbox. It uses PKCE, keeps the sign-in attempt in a cookie that expires after 10 minutes, and asks you to pick a username if your Commons one is taken.
- **Write your own scenario:**
  - **Editor:** anyone can draft and publish, in a step-by-step editor (general info, issues, roles) with payoff charts.
  - **Drafts:** Briefing gained draft editing, and payoffs are removed along with their option or role.
  - **Publishing:** incomplete scenarios are refused, and published scenarios never change.
  - **Briefs:** at publish, each brief gets a "Your points" section generated from its payoffs. **Why:** the brief can never disagree with how deals are scored.
- **More than one AI counterpart:**
  - In scenarios with more than two roles, the AI plays every seat you don't.
  - **Who replies:** whoever you asked a question, else whoever you named first, else whoever has been quietest.
  - **Proposals:** a proposal needs every counterpart's answer.
- **The Launch Room** added to the bakery (three roles, 45 minutes).
- **Visual design study, round 2:** three toned-down storefront navbars (sage, terracotta, painted shopfront) with Patisserie's arched cards, plus four new directions (Maison, Evening, Bistro, Cookbook) ([design/mockups/round-2/](../../mockups/round-2/)).

**`eb08371` "new ui -- shop awning vibes"**

- **Painted shopfront chosen:** a teal cornice and a mint awning lettered "the whole pie" in lowercase Fraunces, with a scalloped valance edged in teal. It folds down to a slimmer awning on scroll.
- **Arched windows:** scenario cards became arched windows (teal outline, gold inner line, each pastry on a mint plate). "Surprise me!" is the teal window.

## Wed Oct 21: The display case (`33bdd33` "display case art added")

- **Hand-drawn display case:** the drawing became the bakery's gallery, with scenario cards standing in the glass between two shelves of pastries.
- **Iterations:**
  1. The drawing went behind the cards.
  2. The cards moved behind the glass, so the case's outline crosses in front of them. The case now runs edge to edge, repeating as needed, and extra cards slide sideways behind the glass.
  3. The drawing was split into a shelves layer (behind) and a simplified glass layer (in front), because the curves crossed too much card text.
- **Seamless wood:** the grain repeats every ~495px, but the drawing is 2,360px wide, so copies didn't line up. The grain near each edge was shifted gradually (up to 57px) using the drawing's own wood, so copies meet without a seam.
- **Color grade:** the art read as washed out, so it got more color (most for muted colors), slight warmth, and deeper midtones. The plates stay cream and the teal frosting stays on-palette.
- **Card fixes:** fixed height to fit between the shelves, long names cut at two lines, and the keyboard focus ring restored (the gold inner line had replaced it).
