// Adapted from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng.
// Only the scripted reasoner, for now; the counterpart's language model comes with the next step of the plan.
import type { Reasoner } from "./agent.ts";

/** A reasoner for tests and for working offline; it writes whatever `script` returns, one word at a time. */
export function scriptedReasoner<Material>(script: (ask: string, material: Material) => string): Reasoner<Material> {
  return {
    name: "scripted",
    async answer(ask, material, write) {
      for (const piece of script(ask, material).match(/\S+\s*/g) ?? []) await write(piece);
    },
  };
}
