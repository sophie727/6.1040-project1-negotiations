# Design notes

## Plan

The MVP completes one journey: a new user signs up, reads her confidential brief for The Job Offer, negotiates against an AI counterpart by chat and proposals under a countdown, and then, however it ends, sees the whole pie: her score, the best possible deal, and a debrief.

1. **Concepts.** Implement Briefing, Tabling, Conversing, Proposing, and Noting on MongoDB; reuse conceptbox's Reasoning and account concepts. _Check:_ a test suite per concept covering its principle and refusals; `sync-engine check` passes.
2. **Built-in scenario.** Create The Job Offer on startup when no scenario exists. _Check:_ a test that it publishes, with the expected 2,200-point whole pie.
3. **Compositions.** Endpoints, reactions, views, and formers for the journey, with a stand-in counterpart that sends canned replies and accepts any offer worth at least its BATNA (its walkaway point). _Check:_ a test that walks the journey through the endpoints, and tests that outsiders are refused (another role's brief, someone else's table).
4. **AI counterpart.** An agent process answers Reasoning prompts with an LLM: replies in persona, decisions on offers, and the debrief. _Check:_ the journey test still passes, and in manual negotiations it never accepts an offer below its BATNA.
5. **Frontend.** Vue pages to pick a scenario, read the brief, negotiate at the table (chat, countdown, proposals, notes), and see the whole pie, using the generated client. _Check:_ the journey works in the browser from an empty database, with no page refreshes and every error shown.
6. **Demo.** Record the walkthrough, and update these notes with what remains for P3.
