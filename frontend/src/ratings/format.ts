import type { Ratings } from "../api/client.ts";

/** A share of value as a whole percentage, or a dash when there was nothing to share. */
export function percent(share: number | null): string {
  return share === null ? "—" : `${Math.round(share * 100)}%`;
}

/** An average of stars to one decimal place, such as "4.5". */
export function averageStars(stars: number): string {
  return (Math.round(stars * 10) / 10).toFixed(1);
}

/** Someone's ratings in a few words for beside their name: their stars and how many rated negotiations they've had. */
export function ratingsInBrief(ratings: Ratings): string {
  const parts: string[] = [];
  if (ratings.stars !== null) parts.push(`★ ${averageStars(ratings.stars)}`);
  const negotiations = ratings.negotiations ?? 0;
  parts.push(negotiations === 1 ? "1 rated negotiation" : `${negotiations} rated negotiations`);
  return parts.join(" · ");
}
