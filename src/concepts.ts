import { conceptSet } from "@mit-sdg/sync-engine/assembly";
import { authenticating } from "./concepts/Authenticating/registry.ts";
import { briefing } from "./concepts/Briefing/registry.ts";
import { conversing } from "./concepts/Conversing/registry.ts";
import { noting } from "./concepts/Noting/registry.ts";
import { proposing } from "./concepts/Proposing/registry.ts";
import { reasoning } from "./concepts/Reasoning/registry.ts";
import { registering } from "./concepts/Registering/registry.ts";
import { agentSessioning, sessioning } from "./concepts/Sessioning/registry.ts";
import { tabling } from "./concepts/Tabling/registry.ts";

export const applicationConceptSet = conceptSet({
  Registering: registering,
  Authenticating: authenticating,
  Sessioning: sessioning,
  AgentSessioning: agentSessioning,
  Briefing: briefing,
  Tabling: tabling,
  Conversing: conversing,
  Proposing: proposing,
  Noting: noting,
  Reasoning: reasoning,
});

export const { concepts } = applicationConceptSet;
