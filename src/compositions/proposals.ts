import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, now, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { inputOf, textInput } from "./reusable/inputs.ts";
import { seatedAs, underWay, unlessUnderWay } from "./table.ts";

const { Briefing, Proposing, Sessioning, Tabling } = concepts;

// Proposing

const Propose = endpoint(
  "/tables/propose",
  ({ session, table, terms, user, role, instant, scenario, proposal }) =>
    receive({ session, table, terms })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(
          now(instant),
          seatedAs({ user, table }).is({ role }),
          underWay({ table, instant }),
          Tabling._table({ table }).is({ scenario }),
          no(Briefing._dealValidity({ scenario, terms })),
        )
          .then(Proposing.propose({ subject: table, proposer: role, terms, now: instant }).responds({ proposal }))
          .then(respond({ proposal }))
          .named("valid"),
        where(
          now(instant),
          seatedAs({ user, table }),
          underWay({ table, instant }),
          Tabling._table({ table }).is({ scenario }),
          Briefing._dealValidity({ scenario, terms }),
        )
          .then(respond({ error: "INVALID_TERMS" }))
          .named("invalid"),
        ...unlessUnderWay({ user, table, instant }),
      ),
  { validators: { input: inputOf({ terms: "terms" }) } },
);

// Answering

const Accept = endpoint(
  "/tables/accept",
  ({ session, table, proposal, user, role, instant, status }) =>
    receive({ session, table, proposal })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(
          now(instant),
          seatedAs({ user, table }).is({ role }),
          underWay({ table, instant }),
          Proposing._proposal({ proposal }).is({ subject: table }),
        )
          .then(Proposing.accept({ proposal, party: role }).responds({ status }))
          .then(respond({ status }))
          .named("under-way"),
        where(
          now(instant),
          seatedAs({ user, table }),
          underWay({ table, instant }),
          no(Proposing._proposal({ proposal }).is({ subject: table })),
        )
          .then(respond({ error: "NOT_FOUND" }))
          .named("elsewhere"),
        ...unlessUnderWay({ user, table, instant }),
      ),
  { validators: { input: textInput } },
);

const Reject = endpoint(
  "/tables/reject",
  ({ session, table, proposal, user, role, instant }) =>
    receive({ session, table, proposal })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(
          now(instant),
          seatedAs({ user, table }).is({ role }),
          underWay({ table, instant }),
          Proposing._proposal({ proposal }).is({ subject: table }),
        )
          .then(Proposing.reject({ proposal, party: role }).responds({}))
          .then(respond({}))
          .named("under-way"),
        where(
          now(instant),
          seatedAs({ user, table }),
          underWay({ table, instant }),
          no(Proposing._proposal({ proposal }).is({ subject: table })),
        )
          .then(respond({ error: "NOT_FOUND" }))
          .named("elsewhere"),
        ...unlessUnderWay({ user, table, instant }),
      ),
  { validators: { input: textInput } },
);

const Retract = endpoint(
  "/tables/retract",
  ({ session, table, proposal, user, role, instant }) =>
    receive({ session, table, proposal })
      .then(Sessioning.use({ session }).responds({ subject: user }))
      .then(
        where(
          now(instant),
          seatedAs({ user, table }).is({ role }),
          underWay({ table, instant }),
          Proposing._proposal({ proposal }).is({ subject: table }),
        )
          .then(Proposing.retract({ proposal, proposer: role }).responds({}))
          .then(respond({}))
          .named("under-way"),
        where(
          now(instant),
          seatedAs({ user, table }),
          underWay({ table, instant }),
          no(Proposing._proposal({ proposal }).is({ subject: table })),
        )
          .then(respond({ error: "NOT_FOUND" }))
          .named("elsewhere"),
        ...unlessUnderWay({ user, table, instant }),
      ),
  { validators: { input: textInput } },
);

// Agreeing

/** Once every party has accepted a proposal, the negotiation at its table is settled. */
const SettleOnAgreement = reaction(({ table, instant }) =>
  when(Proposing.accept({}).responds({ subject: table, status: "ACCEPTED" }))
    .where(now(instant))
    .then(Tabling.settle({ table, now: instant })),
);

export const composition = {
  proposing: { Propose },
  answering: { Accept, Reject, Retract },
  agreeing: { SettleOnAgreement },
};
