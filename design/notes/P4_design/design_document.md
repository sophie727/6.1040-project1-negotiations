# The Whole Pie: Design Document

The Whole Pie is a place to practice negotiating, like chess.com for negotiation. You pick a scenario from the bakery, take a role, and negotiate under a countdown against an AI counterpart, friends you invite, or someone new. Afterwards, a debrief shows you the whole pie: the most value the negotiators could have created together, next to what you actually agreed.

This document summarizes how the final app differs from the [P1 concept design](../P1_design/og_design.md) and the [P3 visual design](../P3_design/changes_since_p2.md), and explains the significant decisions behind it. Commit links point to [the repository](https://github.com/sophie727/6.1040-project1-negotiations).

## What stayed the same

- **The core loop:** pick a case, negotiate under a clock, and see the whole pie afterwards.
- **The two scores from P1:** _claim_ (your share of what the deal added over walking away) and _create_ (the deal's joint value as a share of the most possible), plus a relationship rating from the people you negotiated with.
- **The bad situation it answers:** people who haggle think they won, because in a real negotiation you never see the other side's numbers. The debrief makes the value they left behind visible.

## How the concepts changed since P1

P1 had four concepts. The final app has seventeen, plus instances of some of them, because several P1 concepts mixed concerns that turned out to have different owners or timing.

- **Case Bank became Briefing and Posting.**
    - **No skeletons:** P1 planned scenario _skeletons_ that an agent would fill in with random weights. Instead, authors write concrete scenarios, and anyone can write one in the in-app editor.
    - **Briefing** holds a scenario's issues, options, roles, payoffs and briefs. It scores any agreement and finds the whole pie. A range (such as a salary) lets a deal land anywhere between its options, with points interpolated between them.
    - **Briefs always match the scoring:** when a scenario is published, each brief gets a "Your points" section generated from its payoffs. So a brief can never disagree with how deals are scored, a risk the skeleton design had.
    - **Posting** (new in P4, [`18ff3ea`](https://github.com/sophie727/6.1040-project1-negotiations/commit/18ff3ea)) holds whether a scenario is published or archived. See [Publishing and archiving](#publishing-and-archiving) below.
- **NegotiationTable became Tabling, Conversing and Proposing.**
    - **Tabling** handles seats and the clock, and **Conversing** handles messages.
    - **Proposing** handles proposals: someone offers a term sheet, and it holds once everyone else accepts.
    - **Reuse for the clock:** a second instance of Proposing (TimeLimitProposing) lets the people at a table agree on how long to negotiate before the clock starts. Its proposals carry only a number, so nobody can start negotiating early.
- **CounterpartAgent is no longer a concept.**
    - **Agents act like users:** the counterpart and the coach run as clients of the app. They sign in, take questions recorded in a **Reasoning** concept, and answer through the same kinds of endpoints a person uses.
    - **What the counterpart can see:** it reads only its own role's brief, so it can't see the other side's numbers.
    - **BATNA check:** the app refuses to let it accept a deal worth less than its BATNA, even if the model says yes.
    - **Personas aren't built yet:** for now, the counterpart's character comes from its role's brief (see [Next steps](#next-steps)).
- **TripleRating split into Rating and Reviewing.**
    - **Different sources and timing:** claim and create are computed when a negotiation ends. Stars come from other people afterwards, and maybe never.
    - **Only negotiations with people count:** practice against the AI never changes your ratings.
- **New concepts for the beta and beyond:**
    - **Inviting:** unguessable links to bring friends to a table.
    - **Matchmaking:** finds strangers, including "Surprise me!".
    - **Noting and Preferring:** an optional prep sheet.
    - **Typing:** shows when someone else at the table is writing a message.
    - **Accounts:** Registering, Authenticating, Sessioning and Federating handle signing in with a password or with Commons.

## How the visual design changed since P3

P3 settled on a painted shopfront, scenarios shown as arched windows, and a hand-drawn display case with two shelves of pastries. P4 kept that identity and changed how it reads to someone new.

- **Choosing who to negotiate with moved into each scenario** ([`3b62a95`](https://github.com/sophie727/6.1040-project1-negotiations/commit/3b62a95)).
    - **Before:** an AI / Friends / Someone-new switch sat at the top of the bakery.
    - **Now:** clicking a scenario asks who you want to negotiate with, then which side to take.
    - **Why:** people pick what to negotiate first, so the bakery no longer leads with a setting they have to understand before anything else. Also, I showed Alisa my app and she made this suggestion, which I think is pretty valid.
- **"Write your own scenario" left the display case** ([`8309f13`](https://github.com/sophie727/6.1040-project1-negotiations/commit/8309f13)). It was an arched window that looked like a scenario you could play, so it's now a (+) button beside the bakery's title.
- **The display case was resized** ([`57d68c0`](https://github.com/sophie727/6.1040-project1-negotiations/commit/57d68c0)).
    - **Smaller:** the case is shown at 80% scale, with smaller windows, so it no longer dominates the page.
    - **Even spacing:** the gap above the top shelf now equals the gap below the bottom one.
    - I A/B tested the design with a couple of people and we concluded that, while the double shelves were charming, something about the spacing made it feel very awkward, so this is what we tried.
- **Long lists scroll:** "Your negotiations" and "Your scenarios" scroll inside their boxes and show a count, so a frequent user doesn't scroll past dozens of rows.
- **At the table:**
    - **Typing sign:** when you negotiate with people, you see "Manon is typing…" while someone else writes, as in a messaging app, so you know to wait for their reply.
    - **Typed values:** Picture a deal has a box beside each range's slider, so you can type an exact value, such as a salary of 105,000, or pick a date.

## Teaching the metrics in context

P2's feedback said that an all-in-one metric like the whole pie needs small flows that teach people how to think about it. The P4 changes follow one rule: an explanation goes in an (i) tip next to the term it explains, and only instructions everyone needs appear as visible small text ([`8309f13`](https://github.com/sophie727/6.1040-project1-negotiations/commit/8309f13)).

- **(i) tips** explain:
    - BATNA;
    - the start "handshake" on a time limit;
    - star reviews and the relationship rating;
    - dragging points to set them in the editor;
    - how matching works;
    - the "Value" and "Shown as" columns of a range.
- **Role summaries:** when you pick a side, you see a one-line public summary of each role (for example, Hiro is "Fernwood Analytics' top choice to lead client operations…"). Unlike the confidential brief, an author can edit a summary after publishing, since it changes nothing a deal is worth.
- **Dates read as dates:** a range of dates is stored as days counted from a first day. It now shows as "February 7" rather than "37 days after January 1", both on the page and in what the AI counterpart and coach read. The editor offers "A range of dates" with date pickers.
- **Typing indicator:** when a user is typing, the other user can see the typing indicator.
- **Picture a Deal:** in "Picture a Deal", for ranges, you can input a numerical value (instead of only being able to use a slider).

## Significant P4 decisions

### Publishing and archiving

- **Why a separate concept:** publishing and archiving aren't specific to negotiation scenarios, and they had made Briefing long. So they moved into **Posting**, a generic concept ([`18ff3ea`](https://github.com/sophie727/6.1040-project1-negotiations/commit/18ff3ea), [Posting spec](https://github.com/sophie727/6.1040-project1-negotiations/blob/18ff3ea/design/concepts/Posting.md)).
- **What Briefing does now:** it no longer enforces that a published scenario never changes. That rule moved to the scenario-writing endpoints, which refuse any change to a posted scenario. The guarantee is the same: a scenario can't change under the people negotiating it.
- **Archiving hides without deleting.** An archived scenario leaves the bakery, so nobody can start it, but tables already opened for it keep working: the negotiation, the transcript and the debrief. Deleting it would have erased other people's negotiations.

### An admin account

- **What the admin can do** ([`302af44`](https://github.com/sophie727/6.1040-project1-negotiations/commit/302af44)): the admin can archive anyone's scenario, such as a forgotten test scenario. Only the admin can put back a scenario the admin archived. The author still sees it, marked "Archived by admin".
- **Who the admin is:** the account named `admin`. The server registers that username on every start, before anyone can sign up, so nobody else can take it. Its password comes from the server's settings.
- This allows the admin (me) to experiment on the website and then hide that experimentation after I'm done. Perhaps I should've added a deleting option, as well, but I thought that was too much power that I didn't want to give a single person.

### Access control

- **People:** anyone without a seat at a table is told the table doesn't exist (`NOT_FOUND`), so a table's address alone reveals nothing. Drafts are visible only to their author.
- **Agents:** each agent's session reaches only the tables of questions it took.
- **Tests:** these rules are covered by the access, authoring, admin, friends and agent test suites.

## Testing and validation

- **Automated tests:** 210 tests cover each concept, each composition (end-to-end journeys through the endpoints), the agents and the seed data. They run on an in-memory database with scripted stand-ins for the AI. The saved output is in [tests/output.txt](../../../tests/output.txt).
- **The deployed app** at <https://whole-pie.mit-sdg.dev/>:
    - I checked that negotiations and scenarios persist across a refresh and a redeploy.
    - Also, archiving works for admin.
    - I also checked how wrong passwords and full tables are reported.
    - I also checked access control
    - I did find and correct some UI issues in the process of testing user journeys in the deployed app (the BATNA informational button, for instance, was bothering me, as well as the display case spacing and some errors with the Propose a Deal input.)

## Next steps

- **Side conversations in negotiations of three or more.** In a real multi-party negotiation, people step aside to build a coalition before they speak to the whole room. Today, everything at a table of three, such as The Launch Room, is said to everyone. A negotiator should be able to start a private conversation with a few of the others, which only its members can read.
    - **Concepts:** a new concept would keep each side conversation's members. A second instance of Conversing would hold its messages, so the main conversation stays as it is.
    - **Agents:** at a practice table, the AI counterparts would answer in a side conversation only if they're in it, and read only the side conversations they belong to. Otherwise a counterpart could learn what was said behind its back.
    - **Debrief:** afterwards, the transcript would show every side conversation, so everyone learns what was said behind their back.
- **AI personas.** P1 planned counterparts with personalities, such as rash and easy to anger, quiet and shy, obstinate, or collaborative, so a negotiator could practice against the kinds of people they find hard. Today, every counterpart plays its role's brief the same way.
    - **Choosing one:** a negotiator would pick a persona when starting against the AI, or get one at random. The debrief does not say which persona they're facing.
