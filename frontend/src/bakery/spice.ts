/**
 * How each spice level reads in the bakery: its name, and what it means for negotiating the scenario. The server rates
 * each scenario by how much its whole pie adds to what everyone gets by walking away.
 */
export const spiceLevels: Record<number, { label: string; meaning: string }> = {
  1: { label: "Mild", meaning: "A deal can add a lot to what everyone gets by walking away, so there's plenty of room to agree." },
  2: { label: "Medium", meaning: "A deal can add some to what everyone gets by walking away, so there's room to agree, but little to waste." },
  3: { label: "Hot", meaning: "A deal adds little to what everyone gets by walking away, if anything, so agreeing takes care." },
};

/** The level for `spice`, read as hot when it's one the page doesn't know. */
export const spiceLevelOf = (spice: number) => spiceLevels[spice] ?? spiceLevels[3]!;
