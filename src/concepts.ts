import { conceptSet } from "@mit-sdg/sync-engine/assembly";
import { applicationComputations } from "./computations.ts";
import { authenticating } from "./concepts/Authenticating/registry.ts";
import { briefing } from "./concepts/Briefing/registry.ts";
import { conversing } from "./concepts/Conversing/registry.ts";
import { commonsFederating } from "./concepts/Federating/registry.ts";
import { inviting } from "./concepts/Inviting/registry.ts";
import { matchmaking } from "./concepts/Matchmaking/registry.ts";
import { rating } from "./concepts/Rating/registry.ts";
import { noting, prioritiesNoting, targetNoting, walkawayNoting } from "./concepts/Noting/registry.ts";
import { posting } from "./concepts/Posting/registry.ts";
import { preferring } from "./concepts/Preferring/registry.ts";
import { proposing, timeLimitProposing } from "./concepts/Proposing/registry.ts";
import { reasoning } from "./concepts/Reasoning/registry.ts";
import { registering } from "./concepts/Registering/registry.ts";
import { reviewing } from "./concepts/Reviewing/registry.ts";
import { agentSessioning, sessioning } from "./concepts/Sessioning/registry.ts";
import { tabling } from "./concepts/Tabling/registry.ts";

export const applicationConceptSet = conceptSet({
  Registering: registering,
  Authenticating: authenticating,
  CommonsFederating: commonsFederating,
  Sessioning: sessioning,
  AgentSessioning: agentSessioning,
  Briefing: briefing,
  Posting: posting,
  Tabling: tabling,
  Conversing: conversing,
  Proposing: proposing,
  TimeLimitProposing: timeLimitProposing,
  Noting: noting,
  Reasoning: reasoning,
  Inviting: inviting,
  Matchmaking: matchmaking,
  Reviewing: reviewing,
  Rating: rating,
  TargetNoting: targetNoting,
  WalkawayNoting: walkawayNoting,
  PrioritiesNoting: prioritiesNoting,
  Preferring: preferring,
}, applicationComputations);

export const { concepts, computations } = applicationConceptSet;
