# Plan: P3 beta: playing other people, ratings, the prep sheet, the timekeeper, and spiciness

## Context

P1 defined the beta as "being able to pair people up, adding rooms so that users can negotiate specifically with their friends, and hosting the site online". P1 also defined **TripleRating** (claim, create, relationship, where relationship is "the counterpart's post-session review"), and its journey included a **prep sheet** ("target, walkaway price, and priorities"). The MVP notes say a **server-side timekeeper** "will be needed once two people negotiate each other", and `notes.md` asks for a **spiciness** level.

Today every table is a practice table: the person in one seat and `bot:counterpart` in the other. Most of the machinery already works for several people. Proposing makes every other party accept, Conversing keeps one shared conversation, `seatedAs` gives each person only their own brief, and the counterpart and coach reactions all check `counterpartRole`.

P3 is due **Thursday Oct 22** (your extension).

| P3 requirement                                                                                                                                                      | Where it's covered                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete the app; keep `design/` up to date                                                                                                                         | Parts A–E, each with its concept specs, composition docs and `design/types.md`; `sync-engine check` keeps docs and code in step                                                             |
| Record significant design changes in the design notebook                                                                                                            | I'll draft an entry for you to paste into your private repo: links vs. table ids, grouping as one atomic action, the start handshake, ratings split into two concepts, the spiciness metric |
| Deploy the submitted commit                                                                                                                                         | `bun run check`, then you push and redeploy on 6.1040 Apps (I never push); then re-test on the live URL with two accounts                                                                   |
| Concept tests: the principle, beyond the principle (cancellations, repeated actions, two users at once), errors that change nothing, every action run at least once | **Tests** below. Every existing action is already covered (checked). `TimeLimitProposing` is the Proposing class, whose suite covers every action                                           |
| Saved test output, and README instructions including database setup                                                                                                 | `tests/output.txt`, plus a README "Running the tests" section (no setup: the tests start an in-memory MongoDB)                                                                              |
| Test the journeys in the UI: invalid input; one user can't read or change another's data                                                                            | The **Verification** checklist; the results go in the notebook                                                                                                                              |
| Update the user journey                                                                                                                                             | Draft `design/notes/beta_user_journey.md`                                                                                                                                                   |
| Visual design study, annotated styling, recording of at most 2 minutes                                                                                              | **Yours**. The new UI reuses `frontend/src/styles/tokens.css`                                                                                                                               |

---

## Part A: Playing other people (as agreed)

**What people see.** Above the gallery: **An AI counterpart / Friends / Someone new**.

- **Friends:** you pick a side, and your table shows a Copy link button (`/join/<code>`). Anyone with the link takes an open seat, or picks one if there are several.
- **Someone new:** "Looking for N more people…", with the time waited and a Cancel button. Once enough people are looking, a table opens with random roles, and every page goes to it.
- **Every table** starts with a handshake on the prep page:
    - "Start with 30 minutes" suggests a length and says you're ready.
    - The others agree, or suggest another length, which replaces it.
    - The clock starts once everyone has agreed. The AI agrees at once, so practice is still one click, and the length field moves from the start dialog to the prep page.

### Concepts

- **Inviting [Subject, Person]**: _new._
    - **Purpose:** let a person invite others into something with a link that can't be guessed, so only people given the link can get in.
    - **State:** `Invitations` with a subject, an inviter, and a unique unguessable code.
    - **Action:** `invite(subject, inviter) : (invitation, code)`.
    - **Queries:** `_invitation(code)` and `_invitations(subject)`.
    - **Why it's this small:** Tabling's seats cap how many get in, so one link works for any table size. Table ids are ObjectIds and can be guessed, so the link has to be a separate secret.
- **Matchmaking [Seeker, Pool, Place]**: _new._
    - **Purpose:** gather people looking for others to do the same thing with into groups of the size it needs, first come, first served, so nobody waits while enough people to form a group are waiting, and nobody joins two groups.
    - **State:** Requests (seeker, pool, size, status WAITING/MATCHED/STOPPED, lastSeen, optional match), with one waiting request per seeker; Matches, each with an optional place.
    - **Actions:**
        - `seek(seeker, pool, size, now)` replaces the seeker's waiting request. If `size − 1` other fresh waiting requests share the pool and size, it forms a match **inside this one action**; otherwise the request waits. It refuses `INVALID_SIZE`.
        - `checkIn(request, seeker, now)` refuses `NOT_WAITING` and `LAPSED`; a request lapses after a minute without a check-in.
        - `stop(request, seeker)` refuses `NOT_WAITING`.
        - `meet(request, place)` refuses `NOT_MATCHED` and `ALREADY_MET`.
    - **Queries:** `_request`, `_members` and `_place`.
- **Proposing, reused as `TimeLimitProposing`:** a second instance, like AgentSessioning. In `types.md`: Subject is Table, Party is Role, Terms is a new `concrete TimeLimit`. The spec doesn't change.
- **Tabling**: _changed._
    - `open(scenario)` no longer takes a time limit; `begin(table, timeLimit, now)` does, and refuses `INVALID_TIME_LIMIT`. The rule becomes "a table has a time limit and a deadline exactly when it has begun". `recommendTimeLimit` stays, as the default suggestion.
    - New query `_acceptableTimeLimit`, the same pattern as `Authenticating._acceptable`.
    - `seat(table, negotiator, role?) : (table, role)`: with no role, the negotiator takes a random empty seat. New refusal `TABLE_FULL`.
    - `withdraw` also works on a PREPARING table, so people can leave a table that never filled (Part F).

### Compositions

- **table:**
    - `JoinProposalsWhenSeated` reads the role from `seat`'s output.
    - **New** `JoinStartTalksForEachSeat`: `addSeat` → `TimeLimitProposing.join`.
    - **New** `BeginOnceEveryoneAgrees`: `TimeLimitProposing.accept` responds `ACCEPTED` → `Tabling.begin(table, minutes, now)`.
    - **New** `SuggestStart` at `/tables/start {minutes}` (replaces `/tables/begin`), and `AgreeToStart` at `/tables/agree {proposal}`.
    - New former `startTalksAt`. `tableAsSeenBy` seats gain whether each is taken, and the player's username. `ShowTable` adds `start` and `link`.
- **counterpart:** new `AgreeToAnyStart`. When someone else proposes a start, the AI accepts it.
- **friends** (new):
    - `StartWithFriends` at `/friends/start {scenario, role?}`: open, seat, invite.
    - `ShowInvitation` at `/friends/invitation {code}`.
    - `Join` at `/friends/join {code, role?}`.
    - View `openSeats`, former `linkOf`.
- **matchmaking** (new):
    - `Find` at `/matchmaking/find {scenario}`: `count(Briefing._roles)` gives the size, then `Matchmaking.seek`.
    - `Wait` at `/matchmaking/wait {request}`: polled; runs `checkIn`; responds with the table once you're seated.
    - `Stop` at `/matchmaking/stop`: Cancel, closing the dialog, `pagehide`.
    - Reaction `OpenTableForMatch`: on the seek that completes a group → `Tabling.open` → `Matchmaking.meet`.
    - Reaction `SeatMembers`: after the flow settles, each member → `Tabling.seat` with no role.
- **practice:** `/practice/start` drops `timeLimit`.

---

## Part B: Ratings and reviews (P1's TripleRating)

The three scores have different owners. Relationship comes from what other people say, after the fact, and possibly never. Claim and create are computed from the outcome when the table ends. So P1's TripleRating becomes **two concepts**, which a former shows together as the triple. As the MVP notes say, **games with an AI counterpart never change ratings**.

### Reviewing [Person, Subject]: new

- **Purpose:** let people who dealt with each other say how it went, once each, so everyone's reputation reflects what the people they've dealt with think. _Prevents:_ someone reviews themselves; someone reviews the same person twice for one negotiation; a rating outside the scale.
- **Principle:** after their Job Offer negotiation, Nadia gives Omar 5 stars and Omar gives Nadia 4. When Nadia tries to review Omar again for the same negotiation, she's refused. Omar's standing is the average of the stars he has received.
- **State:** `Reviews` with a subject, a reviewer, a reviewee, and stars, unique per subject, reviewer and reviewee.
- **Action:** `review(subject, reviewer, reviewee, stars)`, refusing `SELF_REVIEW`, `INVALID_STARS` (a whole number from 1 to 5) and `ALREADY_REVIEWED`.
- **Queries:** `_review(subject, reviewer, reviewee) : optional (stars)` and `_standing(reviewee) : one (stars?, reviews)`, which gives the average.

### Rating [Person, Subject]: new

- **Purpose:** keep each person's results from every rated negotiation (the share of the value they claimed, and how much of the possible value the deal created) so their skill shows as averages over time. _Prevents:_ one negotiation counting twice for someone.
- **Principle:** in Nadia's first rated negotiation, the deal created all of the possible value and she claimed half of it. In her second, it created 60% and she claimed 70%. Her ratings are now create 80%, claim 60%, over 2 negotiations. A negotiation without a deal creates nothing and has nothing to claim, so it lowers create and leaves claim alone.
- **State:** `Results` with a person, a subject, optional claim, optional create, and recordedAt, unique per person and subject.
- **Action:** `record(person, subject, claim?, create?, now)`, refusing `ALREADY_RECORDED`.
- **Queries:** `_ratings(person) : one (claim?, create?, negotiations)` and `_results(person)` (oldest first, for a later "am I improving?" chart).

### Composition: `ratings.ts` / `ratings.md` (new)

- **Computations** `claimShare` and `createShare`, declared in `ratings.md`, use the same formulas the Whole Pie page uses today:
    - claim = (mine − my BATNA) / (joint − joint BATNA), null when the deal added nothing;
    - create = (joint − joint BATNA) / (whole pie − joint BATNA), null when no deal could add anything.
    - Without a deal, each role's points are its BATNA.
    - These need a small new **Briefing** query, `_jointBatna(scenario)`, because `_wholePie` has no row when there was no ZOPA.
- **One reaction, `RecordRatingsWhenEnded`:** `when(returned({ concept: "Tabling", action: ending, input: { table } }))`, `where is.among(ending, ["settle", "withdraw", "expire"])`, at a table **without a counterpart** that began, for each seat → `Rating.record(the seat's person, table, claim, create, now)`.
    - `returned(...)` is sync-engine's trigger for any action's success; the pattern binds the action name, which this filters.
    - The action names are strings, so the ratings tests check each of the three endings.
    - If ordinary assembly turns out to reject the channel trigger in an application reaction, the fallback is a helper that defines the reaction once and registers it for each ending.
- **Endpoint `Review` at `/tables/review {table, role, stars}`:** you must be seated at an ended table without a counterpart, and the role must be another person's seat. It runs `Reviewing.review(table, you, them, stars)`. Anyone else gets `NOT_FOUND`.
- **Former `ratingsOf(user)`:** claim, create, relationship (`_standing`) and the number of rated negotiations. It's added to `/bakery` (yours) and to each seat in `tableAsSeenBy` (other players'), so people can see who they're up against, as on chess.com.
- `/tables/debrief` adds which of the other people you've already reviewed.

---

## Part C: The prep sheet, turned on in Settings

### Preparing [Author, Subject]: new

The opt-in belongs to this concept, so there's no generic settings concept.

- **Purpose:** help people who choose to prepare deliberately: before a negotiation starts, they write down what they aim for, the least they'd accept, and what matters most, so they negotiate to a plan and can compare the outcome with it. _Prevents:_ someone who chose to plan starts a negotiation without a complete plan; one person ends up with two plans for one negotiation.
- **Principle:** Nadia turns on prep sheets. Before her Job Offer negotiation, she writes her target ("$115K and a January start"), her walkaway ("anything worth at least my 1,000-point BATNA"), and her priorities ("salary, then title"). Her plan is complete, so she can start. Omar hasn't turned prep sheets on, so he starts without one.
- **State:**
    - `a set of Planners`: the people who turned prep sheets on.
    - `Plans` with an author, a subject, a target, a walkaway and priorities, unique per author and subject.
- **Actions:**
    - `turnOn(person)` and `turnOff(person)`.
    - `plan(author, subject, target, walkaway, priorities)` replaces the plan, so drafts can be saved. It refuses `TOO_LONG`.
- **Queries:**
    - `_planner(person) : one (on: Flag)`.
    - `_plan(author, subject) : optional (target, walkaway, priorities)`.
    - `_complete(author, subject) : one (complete: Flag)`: true when every field is filled in.

### Composition: `preparing.ts` / `preparing.md` (new)

- Endpoints `/settings/show` and `/settings/prep-sheet {on}`. A new `flag` kind in `inputs.ts` lets a request field be true or false.
- Endpoint `/tables/plan {table, target, walkaway, priorities}`, for people seated at a PREPARING table.
- **The gate:** `/tables/start` and `/tables/agree` get a `plan-first` path. If you're a planner and your plan for this table isn't complete, you're refused with `PLAN_FIRST`.
- `ShowTable` adds your `plan` and whether you `mustPlan`.

### Frontend

- An account menu item, **Settings**, opens a dialog with a "Prep sheet before each negotiation" switch.
- When it's on, Your Slice shows the prep sheet, with short guidance (for example, "Your BATNA is 1,000 points; what deal gets you there?"), and the Start panel says "Fill in your plan first".
- The Table gets a **Plan** tab next to Brief and Notes.

---

## Part D: The server timekeeper

- **A new agent, `timekeeper`:** `src/agents/timekeeper.ts`, started in `server.ts` like the counterpart and the coach. It signs in through AgentSessioning and calls `/timekeeper/expire` every 30 seconds.
- **The endpoint**, in table's `clock`: `AgentSessioning.use`, then `now(instant)`. It reads `Tabling._overdue({now: instant})` (a new query: OPEN tables at or past their deadline) and runs `Tabling.expire(table, instant)` for each, so the coach and ratings reactions fire as usual.
- **The `Agent` type** in `types.md` gains `timekeeper`.
- Pages still call expire at zero, so the timekeeper is only a backstop, for tables everyone has left.

---

## Part E: Spiciness (a metric to settle before building)

**Your critique:** the share of term sheets inside the ZOPA depends on option ranges nobody would agree to, so raising an issue's upper bound would wrongly look harder. A smaller ZOPA, though, should look harder.

**Proposal:** measure in **points, not term sheets**. Use the whole pie's surplus relative to what walking away gives everyone:

> spice = (whole pie − joint BATNA) / joint BATNA

- Options outside the ZOPA don't change the whole pie or the BATNAs, so they don't change the spiciness. Your upper-bound case stays the same.
- Anything that shrinks the ZOPA shrinks the surplus, so it reads hotter. Raising a BATNA does too.
- If a new range does add a better deal, the ZOPA really did grow, so it reads milder.
- Point scales cancel, so authors' different scales don't matter.

The Job Offer is 200 / 2,000 = **10%**.

**Levels** (thresholds to calibrate once there are more scenarios):

| Spice       | Condition                      |
| ----------- | ------------------------------ |
| 🌶 mild     | at least 40%                   |
| 🌶🌶 medium | 15–40%                         |
| 🌶🌶🌶 hot  | under 15%, or no deal possible |

When no deal is possible, the card doesn't say so, because that would spoil learning when to walk away.

**What it misses:** how _hidden_ the value is (how much of the surplus needs trades across issues), and how many acceptable deals there are. A second factor such as "hidden value" could come later.

**Building it:** a named computation `spiceLevel(jointPoints, jointBatna)` in the bakery's former. Only the level (1–3) is sent to the browser, never the numbers, since they would leak the other side's BATNA. Published scenarios never change, so the result can be cached per scenario.

---

## Part F: Smaller pieces (lower priority)

- **Joint coach debrief at tables without a bot:** `JOINT_DEBRIEF_ASK`; `ReadDebrief` gains a `joint` path; the coach agent gets a second prompt.
    - `CoachWhenSettled`, `…Withdrawn` and `…Expired` merge into one `CoachWhenEnded`, with the same `returned(...)` trigger as `RecordRatingsWhenEnded`.
    - It has two paths: `practice` (a counterpart is seated, so it asks `DEBRIEF_ASK`) and `between-people` (`JOINT_DEBRIEF_ASK`).
    - Neither path asks for a debrief of a table that never began.
- **Leaving before the clock starts:** `withdraw` on a PREPARING table, a Leave button, no coach, no rating.
- **Opponents in "Your negotiations":** "as Hiro · vs omar".

## Frontend summary

| Area                             | Changes                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `bakery/`                        | The three-way picker; StartDialog (choose a side, no length); a new MatchmakingDialog; spice chilies on cards; a "Your ratings" panel |
| New `join/JoinPage.vue`          | The `/join/<code>` route in `router.ts` and `App.vue`                                                                                 |
| `table/YourSlice.vue`            | An "At the table" panel (seats, players with their ratings, the link), the prep sheet when it's on, and the Start panel               |
| `table/TheTable.vue`             | "negotiating with omar (Manon)"; a Plan tab; a hint for tables without a bot                                                          |
| `pie/WholePie.vue`               | Star reviews of each other person; the joint coach heading                                                                            |
| Settings                         | A dialog from the account menu                                                                                                        |
| `api/client.ts`, `api/errors.ts` | New types and messages for each refusal (`PLAN_FIRST`, `TABLE_FULL`, `ALREADY_REVIEWED`…)                                             |

`App.vue` and `TheTable.vue` have your uncommitted edits; the implementation builds on them. HTTP categories for the new refusals go in `src/host/http.ts`, and the new docs go in `generated.config.ts`, followed by `bun run generate`.

## Tests

Each concept suite follows P3's list: the principle, beyond it, errors checked to leave state unchanged, and every action run.

- **Inviting:** the principle; the codes differ; one link, several people; an unknown code.
- **Matchmaking:** groups of 2 and 3; two people seeking at once are grouped once; seeking again replaces; `stop`; lapsing; `meet`; the errors `INVALID_SIZE`, `NOT_WAITING`, `LAPSED`, `NOT_MATCHED` and `ALREADY_MET`.
- **Tabling:** `begin` with a time limit and `INVALID_TIME_LIMIT`; sitting without a role, with two people at once getting different seats, and `TABLE_FULL`; leaving while preparing; `_overdue`; `_acceptableTimeLimit`.
- **Reviewing:** the principle; a repeat is refused; a self-review is refused; invalid stars; the averages.
- **Rating:** the principle; the averages skip missing claims; `ALREADY_RECORDED`.
- **Preparing:** turning on and off; replacing a plan; completeness; `TOO_LONG`.
- **Briefing:** `_jointBatna`.
- **Composition tests:**
    - **Friends:** a link, a start handshake with a counter-suggestion, a deal, both whole pies, reviews.
    - **Matchmaking:** two people at one table, a lapsed request, stopping.
    - **Ratings:** recorded at a table between people with the expected claim and create, once for each of the three endings (a deal, walking away, time running out); nothing recorded at a practice table; reviews refused for yourself, at an unfinished table, or to an outsider.
    - **Prep sheet:** the gate when it's on, no gate when it's off.
    - **Timekeeper:** the clock moves past the deadline, a sweep runs, the table is EXPIRED and the coach is asked.
    - **Spice levels:** for The Job Offer.
    - **Access:** strangers still `NOT_FOUND`.
- **Existing tests:** a `start` helper replaces `api.tables.begin`.

## Decisions to discuss (my recommendation first)

1. **The spiciness metric and thresholds** (Part E). Your call before I build it.
2. **Prep sheet default:** _off_, since you said you "can turn [it] on in a setting". P1 had it on for new accounts.
3. **Prep sheet fields:** _three free-text fields_ with guidance. Alternative: priorities as a drag-to-rank list of the issues, which the coach could later compare with your real payoffs.
4. **Reviews:** _stars only, 1–5_, shown only as an average. No written comments, so there's nothing to moderate.
5. **Coach at tables without a bot:** _one joint debrief for everyone_ (Part F).
6. **The start handshake:** _one step_ (suggesting a length means you're ready), as discussed.

## Build order (each step keeps the app working and the tests passing)

1. The Tabling changes, `TimeLimitProposing`, and the start handshake on practice tables.
2. Friends: Inviting, the join page, the YourSlice panels.
3. Matchmaking, its dialog, and the bakery picker.
4. The timekeeper.
5. Ratings and reviews.
6. The prep sheet and Settings.
7. Spiciness, once we've settled the metric.
8. Part F.
9. Deliverables: `tests/output.txt`, the README section, the beta journey, the notebook draft. Then `bun run check`, and you push and redeploy.

If time runs short, cut from the bottom: Part F first, then spiciness.

## Verification

- Run `bun run generate`, `bun run check` and `bun run test`, and save the output to `tests/output.txt`.
- Run `bun run dev` with `bun run --cwd frontend dev`, sign in as two users in a normal window and a private window, and repeat on the deployed URL:
    - **Friends:** follow the link; suggest 30 minutes, counter with 45, agree, and check that the clock reads 45. Reach a deal; review each other; check that both ratings panels update.
    - **Someone new:** both windows land at one table, on different sides.
    - **AI:** one click starts; the ratings don't change.
    - **Prep sheet:** turn it on; Start is blocked until the plan is filled in; the Plan tab shows at the table.
    - **Timekeeper:** close both windows during a short (1-minute) negotiation; it shows "Time ran out" in the bakery list afterwards.
    - **Invalid input:** a length of 0 or 500, 6 stars, a made-up join code.
    - **Access:** a third user can't join a full table, see it, review its players, or stop someone else's search.
