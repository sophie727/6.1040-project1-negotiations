# The Whole Pie

A place to practice negotiating, like chess.com for negotiation: pick a scenario, negotiate it under a countdown against an AI counterpart, friends, or someone new, and afterwards see the whole pie, the most value you could have created together. A 6.1040 personal project.

**Try it:** <https://whole-pie.mit-sdg.dev/>

## Project materials

**Final design (P4)**

- [Design document](design/notes/P4_design/design_document.md): how the final app differs from the P1 concept design and the P3 visual design, and why.
- Demo video: *[link to add]*

**Specifications**

- [Concept specifications](design/concepts/): one file per concept, such as [Briefing](design/concepts/Briefing.md) and [Posting](design/concepts/Posting.md).
- [Compositions](design/compositions/): how the concepts work together, in prose, with the endpoints each part provides.
- [Types and concept instances](design/types.md).
- [The whole specification in one file](generated/the-whole-pie.md), generated from the code and the documents above.

**Earlier milestones**

- **P1, concept design:** [problem, pitch, concepts and sketches](design/notes/P1_design/og_design.md).
- **P2, MVP:** [user journey](design/notes/P2_design/mvp_user_journey.md) and [demo video](https://youtu.be/LbMD6UagjHQ).
- **P3, beta:**
  - [user journey](design/notes/P3_design/beta_user_journey.md);
  - [changes since P2](design/notes/P3_design/changes_since_p2.md);
  - [visual design study](design/notes/P3_design/visual_design_study.pdf) ([annotated slides](https://docs.google.com/presentation/d/1JjVsr007LRz5RLJFWWi-q5-C41KLaWfBwttFwIPfkWY/edit?usp=sharing));
  - [demo video](https://youtu.be/iAhnsTYcQbI).

**Working notes:** plans and in-progress thinking, kept apart from the design above.

- [P2 notes](design/notes/P2_design/notes.md)
- [P3 notes](design/notes/P3_design/notes.md) and [plan](design/notes/P3_design/claude-plan-p3.md)
- [Draft cases](design/notes/example_cases/)

## Running it locally

You need [Bun](https://bun.sh) 1.4.2. MongoDB is optional: without one, the server keeps its data in memory until it stops.

```sh
bun install && bun install --cwd frontend
cp .env.example .env         # optional: a database, an AI key, the admin's password
bun run dev                  # the API, on http://localhost:3141
bun run --cwd frontend dev   # the app, on http://localhost:5173 (in a second terminal)
```

To serve a production build instead, run `bun run build`, then `bun run start` (on port 3141), or `bun run preview` for both (on port 3000).

[.env.example](.env.example) describes each setting:

- `MONGODB_URL`: a MongoDB to keep data in.
- `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`: for the AI counterpart and coach. Without either, they answer with scripted stand-ins.
- `ADMIN_PASSWORD`: the password of the `admin` account, which can archive any scenario.

The app comes with two scenarios, The Job Offer and The Launch Room, and adds them to an empty database on start.

## Testing

The tests need no setup. Each one starts from an empty in-memory MongoDB, which downloads a MongoDB binary the first time it runs, and the AI agents answer with scripted stand-ins, so no API key is needed.

```sh
bun run test         # every test
bun run test:save    # every test, saving the output to tests/output.txt
bun test --timeout 60000 tests/concepts/Matchmaking.test.ts   # one file
bun run check        # check the code against the specifications, and typecheck the server and the app
```

The [saved output of the latest run](tests/output.txt) lists every test. `tests/concepts/` has a suite for each concept, `tests/compositions/` covers the journeys through the endpoints, and `tests/agents/` covers the counterpart and the coach.

## How the code is organized

- `src/concepts/`: each concept, independent of the others.
- `src/compositions/`: everything that crosses concepts. These are the reactions, and the endpoints the app calls.
- `src/agents/`: the AI counterpart, the coach, and the timekeeper that ends overdue negotiations.
- `src/seed/`: the built-in scenarios.
- `src/host/`: the server.
- `frontend/`: the Vue app.
- `design/`: the specifications and design documents. The concept and composition documents are part of the build, and `bun run check` fails when they disagree with the code.
