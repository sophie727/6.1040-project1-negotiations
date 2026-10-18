# Design notes

## Plan

The MVP completes one journey: a new user signs up, reads her confidential brief for The Job Offer, negotiates against an AI counterpart by chat and proposals under a countdown, and then, however it ends, sees the whole pie: her score, the best possible deal, and a debrief.

1. **Concepts.** Implement Briefing, Tabling, Conversing, Proposing, and Noting on MongoDB; reuse conceptbox's Reasoning and account concepts. _Check:_ a test suite per concept covering its principle and refusals; `sync-engine check` passes.
2. **Built-in scenario.** Create The Job Offer on startup when no scenario exists. _Check:_ a test that it publishes, with the expected 2,200-point whole pie.
3. **Compositions.** Endpoints, reactions, views, and formers for the journey, with a stand-in counterpart that sends canned replies and accepts any offer worth at least its BATNA (its walkaway point). _Check:_ a test that walks the journey through the endpoints, and tests that outsiders are refused (another role's brief, someone else's table).
4. **AI counterpart.** An agent process answers Reasoning prompts with an LLM: replies in persona, decisions on offers, and the debrief. _Check:_ the journey test still passes, and in manual negotiations it never accepts an offer below its BATNA.
5. **Frontend.** Vue pages to pick a scenario, read the brief, negotiate at the table (chat, countdown, proposals, notes), and see the whole pie, using the generated client. _Check:_ the journey works in the browser from an empty database, with no page refreshes and every error shown.
6. **Demo.** Record the walkthrough, and update these notes with what remains for P3.

## Significant decisions and Challenges

I don't know, I think there weren't that many significant decisions or challenges after I started implementing.

I think the biggest difficulty was in the design stage, when I was trying to figure out what to do with cases (later renamed to the Briefing concept). I spent a LOT of time thinking about how I was going to design the Briefing concept. I wanted something with sufficient flexibility that it could describe many different negotiations, but also with sufficient structure that it would be possible to _grade_ negotiations. It also needed to be able to allow people to agree on concessions and value-creating trades. Eventually, I came up with the "universal value" idea that allows me to define the value and payoff of options without listing out every single option under the sun (that was another thing I was considering--should I, for instance, just list out the values and payoffs of every date between Jan 1 and March 1, for instance? ... it did not seem like a good idea to me.).

Admittedly, I think "universal value" is a really good idea, but I'm not really sure if it's too understandable for the actual case authors... so that's something else we'll have to figure out, later.

## What remains for P3

- I ended up nixxing the "skeletons" thing for P2. This kind of touches on the flexibility/structure thing I was talking about earlier: I wasn't sure how I was going to encode enough structure for an agent to construct a negotiation from the skeleton, but also sufficiently little structure that you could get significantly different negotiations from a given skeleton.

- something interesting that I want to implement (and would also be very easy to add) would be a "spicy-ness" level (i.e. difficulty) to negotiations (displayed in the bakery page). I'd initially been picturing it as another input that the author would have to put in, but it occured to me while playing against the agent that it'd probably be much more sensible to just set it up so that the "spiciness" is based on what percent of possible deals are in the ZOPA (zone of potential agreement).

- I also want to put more thought into what i want the whole pie/debrief page to look like and what information to show on that page.

- Another thing I want to add is being able to throw in a mid-negotiation curveball. I think the way it would work is that the author defines XYZ curveball. Then, (this is the cool part) there's an agent observing the negotiation, and when the negotiation looks like it's going really well, throw that curveball in.

- Of course, we also have to deploy and add human-human interactions; I left it out of the MVP because it was all local and so it didn't make sense for the MVP to have human-human interactions.

- I also want to make the UI cuter. I want the bakery page to actually LOOK like a bakery. (Mainly, I want to add a glass panel, sort of like a bakery display case, and maybe two shelves of baked goods (like, actual baked goods, not negotiations) -- obviously this will require me to do art, however, and I haven't gotten around to that :P)
