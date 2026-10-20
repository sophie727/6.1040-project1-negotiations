This is my personal project for 6.1040! I'm creating a platform to practice negotiations with other people--I've been describing it as "chess.com for negotiations".

The design deliverables for P2 are in ./design/notes/P2_design. MVP user journey is in mvp_user_journey.md, and the notes (including the plan, challenges, and what I need to implement next) are in notes.md. The video of the MVP is mvp.mov. The other document in ./design/notes, example_cases.md, is an example case I wrote up (the job offer one).

The design deliverables for P3 are in ./design/notes/P3_design: the beta user journey is in beta_user_journey.md, and the plan for the beta is in claude-plan-p3.md.

The stuff I submitted from P1 is in ./design/notes/P1_design.

This is the demo video: https://youtu.be/LbMD6UagjHQ

After I restart, if I want to run locally, I need to pull up mongoDB again by running `podman machine start`.

## Running the tests

The tests need no database setup: each test starts from an empty in-memory MongoDB (`mongodb-memory-server`, which downloads a MongoDB binary the first time it runs), and the AI agents answer with scripted stand-ins, so no API key is needed either.

```sh
bun install
bun run test         # every test
bun run test:save    # every test, saving the output to tests/output.txt
bun test --timeout 60000 tests/concepts/Matchmaking.test.ts   # one file
```

The saved output of the latest run is in [tests/output.txt](tests/output.txt). There's a suite for each concept in `tests/concepts/`, and suites for the compositions (the journeys through the endpoints) in `tests/compositions/`.
