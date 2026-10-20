# Inter-team Dynamics

## Overview

Mandy, Presley, and Sally work at Solidum, a big enterprise software company, where they are the heads of marketing, product, and sales, respectively. Solidum is launching Solidum Atlas, an AI analytics assistant that could be game-changing for the company, and the CEO, Sandra Reyes, has told the three of them to agree on a launch plan together. Solidum has a long history of departments working in silos, and these three have clashed before. If they can't agree, Sandra will impose a plan herself, and none of them wants to be the person who made that happen.

Each of them wants something different from the launch:

- **Mandy (marketing)** wants a big launch. Ascend, the industry's biggest conference, is on April 15, and she has a keynote slot there if Atlas is ready. She also wants Atlas priced as a premium product, and she'd rather the public sees it for the first time on stage than in a quiet beta.
- **Presley (product)** wants to keep control over what Atlas looks like. He's tired of marketing's and sales' "crazy ideas" turning into features, and he wants as much time as possible to get it right. Above all, he doesn't want to build a custom integration for one customer before launch: that's a waste of time that could be spent on making the product as a whole better.
- **Sally (sales)** is thinking about Halvorsen Logistics, her biggest customer, whose contract comes up for renewal on March 31. She wants Halvorsen to see Atlas early, to get the integration they've been asking for, and to get a good price.

The case is built so that the obvious move, splitting the difference on every issue, leaves a lot on the table. Each person cares most about different things: Mandy about the date and the price, Presley about control and the integration, and Sally about Halvorsen's discount and early access. Giving Halvorsen an exclusive early look also solves Sally's renewal problem without moving the launch away from Mandy's conference. The best deal comes from trading across issues.

## The Case

**Author:** Sophie Liu
**Case Name:** The Launch Room

**Issues:**

- Launch date (continuous)
    - option name: March 1; universal value: 0 (0 days after the first date option)
    - option name: April 15; universal value: 45 (45 days after the first date option)
    - option name: May 1; universal value: 61 (61 days after the first date option)
    - option name: June 1; universal value: 92 (92 days after the first date option)
- Halvorsen integration (discrete, so no universal values)
    - option name: Not planned
    - option name: Within 60 days of launch
    - option name: Ready at launch
- List price, per seat per month (continuous)
    - option name: $30; universal value: 30
    - option name: $60; universal value: 60
- Halvorsen's discount (continuous)
    - option name: 0%; universal value: 0
    - option name: 40%; universal value: 40
- Early access (discrete, no universal values)
    - option name: Exclusive for Halvorsen (8 weeks of exclusive early access)
    - option name: Open beta (for all customers)
    - option name: None before launch (the public reveal is the launch)
- Design authority (discrete, no universal values)
    - option name: Product decides alone
    - option name: Shared sign-off (product decides, with marketing and sales signing off on what customers see at launch)
    - option name: Anyone can veto (any of the three)

**Roles:**

- Mandy, the head of marketing
    - With the payoffs:
        - for launch date, Mandy weights March 1 at 100, April 15 at 500, May 1 at 0, and June 1 at 0.
        - for Halvorsen integration, Mandy weights them all the same (0).
        - for list price, Mandy weights $30 at 0 and $60 at 400.
        - for Halvorsen's discount, Mandy weights 0% at 100 and 40% at 0.
        - for early access, Mandy weights exclusive early access at 100, open beta at 50, and no early access at 300.
        - for design authority, Mandy weights product decides alone at 0, sign-off at 150, and veto at 200.
    - And a BATNA of 750: the plan she expects Sandra to impose (June 1, no integration, $60, 20% off, no early access, and product deciding alone).
- Presley, the head of product
    - With the payoffs:
        - for launch date, Presley weights March 1 at 0, April 15 at 150, May 1 at 235, and June 1 at 400.
        - for Halvorsen integration, Presley weights not planned at 400, within 60 days at 250, and ready at launch at 0.
        - for list price, Presley weights them all the same (0).
        - for Halvorsen's discount, Presley weights them all the same (0).
        - for early access, Presley weights exclusive early access at 150, open beta at 250, and no early access at 0.
        - for design authority, Presley weights product decides alone at 500, sign-off at 200, and veto at 0.
    - And a BATNA of 800: the plan he expects Sandra to impose (June 1, the integration within 60 days, $45, 20% off, early access for Halvorsen, and a veto for everyone).
- Sally, the head of sales
    - With the payoffs:
        - for launch date, Sally weights March 1 at 300, April 15 at 200, May 1 at 130, and June 1 at 0.
        - for Halvorsen integration, Sally weights not planned at 0, within 60 days at 250, and ready at launch at 450.
        - for list price, Sally weights $30 at 200 and $60 at 0.
        - for Halvorsen's discount, Sally weights 0% at 0 and 40% at 350.
        - for early access, Sally weights exclusive early access at 300, open beta at 100, and no early access at 0.
        - for design authority, Sally weights product decides alone at 0, sign-off at 100, and veto at 150.
    - And a BATNA of 850: the plan she expects Sandra to impose (June 1, the integration ready at launch, $60, no discount, early access for Halvorsen, and shared sign-off).

## Facts every brief must share

The briefs should give each role this same backstory, so that they agree with one another:

- Solidum Atlas is an AI analytics assistant for enterprise operations teams. Engineering says it could ship as early as March 1, but every extra week makes it more polished.
- Ascend is on April 15. Mandy has a keynote slot there, but only if Atlas launches that day. Only Mandy's brief needs to say how much the slot matters to her.
- Halvorsen Logistics is Solidum's biggest customer, and its contract renews on March 31. Halvorsen has been asking for an integration with its warehouse system for a year, and Presley's team estimates it would take most of a quarter to build.
- Sandra Reyes, the CEO, asked the three of them to bring her a launch plan they all agree on. If they don't, she'll decide herself, and she has a reputation for plans that leave everyone unhappy. That's where each of their BATNAs comes from: each of them can only guess at how Sandra would decide.
- The three have clashed before. Last year, sales promised a customer a feature that product never agreed to build, and marketing announced a release date that product then missed. Every brief should mention this history, told from that role's point of view.

## Notes for the author (not for players)

**The whole pie** is April 15, integration within 60 days of launch, a $60 list price, a 40% discount for Halvorsen, exclusive early access for Halvorsen, and product deciding alone. It's worth 3,150 points together: 1,000 to Mandy, 1,050 to Presley, and 1,100 to Sally, against BATNAs that add up to 2,400. Each person clears their BATNA by exactly 250 points, so there's no single obvious winner.

The payoffs just add up issue by issue, so the whole pie takes the best option on each issue separately:

| Issue                | Best for the group      | Joint points | Why                                                                                    |
| -------------------- | ----------------------- | ------------ | -------------------------------------------------------------------------------------- |
| Launch date          | April 15                | 850          | Mandy's conference matters more than Presley's extra polish or Sally's early date.     |
| Integration          | Within 60 days          | 500          | A compromise works here: Presley loses less than Sally gains.                          |
| List price           | $60                     | 400          | Mandy cares about premium pricing twice as much as Sally cares about a low price.      |
| Halvorsen's discount | 40%                     | 350          | Sally cares far more than Mandy. This trades against the list price.                   |
| Early access         | Exclusive for Halvorsen | 550          | Sally gets Halvorsen in before renewal without pulling the date earlier.               |
| Design authority     | Product decides alone   | 500          | Presley's top priority, and the others give up little. Shared sign-off (450) is close. |

**Traps the debrief can point out:**

- Splitting the difference on price and discount ($45 and 20%) is worth 525 points together instead of 750. The trade is a high list price _and_ a deep discount for Halvorsen.
- If Mandy hides how much the conference matters, the others may compromise on a date between March and June, which loses up to 485 points (on May 1, where Mandy gets nothing from the date).
- Sally can push for the integration at launch (450 together) instead of within 60 days (500), but only if Presley gets very little in return.
- Splitting everything down the middle (April 15, within 60 days, $45, 20%, open beta, shared sign-off) clears every BATNA but is worth only 2,725 together. That adds 325 points over the BATNAs, out of the 750 the best deal adds, so its create score is about 43%.
- Three people need to agree, and every BATNA is real: a deal that gives Presley a June launch and full control leaves Mandy below her BATNA.

**On the platform:** the case is seeded as a built-in scenario (`src/seed/theLaunchRoom.ts`, with the briefs in `src/seed/briefs/mandy.md`, `presley.md`, and `sally.md`), with a recommended time limit of 45 minutes. Proposals need everyone to accept, invite links work for three, and matchmaking waits for three people. When someone practices it against the AI, a counterpart takes each of the other two seats, each reading only its own brief.
