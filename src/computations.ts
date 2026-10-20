/**
 * The named, pure calculations that compositions use with `compute`. The concept set registers them alongside the
 * concepts, and each is declared, with what it means, in the design document of the composition that uses it.
 */

/** The share of the joint BATNA a whole pie must add for a scenario to be mild, or at least medium. */
const MILD = 0.4;
const MEDIUM = 0.15;

/**
 * How spicy a scenario is, from 1 (mild) to 3 (hot): how much its whole pie, `jointPoints`, adds to what its roles get
 * together by walking away, `jointBatna`, as a share of that. It's hot when no deal is possible, so `jointPoints` is
 * null. It counts points rather than the term sheets everyone would accept, so options nobody would agree to don't
 * change it, and only a pie that grows or shrinks does.
 */
export function spiceLevel({ jointPoints, jointBatna }: { jointPoints?: number | null; jointBatna: number }): number {
  if (jointPoints === undefined || jointPoints === null) return 3;
  const surplus = jointPoints - jointBatna;
  // When walking away is worth nothing in all, any deal that adds something adds a lot.
  if (jointBatna <= 0) return surplus > 0 ? 1 : 3;
  const share = surplus / jointBatna;
  return share >= MILD ? 1 : share >= MEDIUM ? 2 : 3;
}

export const applicationComputations = { spiceLevel };
