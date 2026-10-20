import type { Table } from "../api/client.ts";

type Seat = Table["seats"][number];

/** Whether nobody has taken `seat` yet. */
export function isOpen(table: Table, seat: Seat): boolean {
  return table.openSeats.includes(seat.role);
}

/** Whether the AI counterpart sits in `seat`: someone has taken it, and it isn't a person with a username. */
export function isCounterpart(table: Table, seat: Seat): boolean {
  return seat.player === null && !isOpen(table, seat);
}

/** Whether the AI counterpart plays at `table`, rather than only people. */
export function hasCounterpart(table: Table): boolean {
  return table.seats.some((seat) => isCounterpart(table, seat));
}

/** `names` in a sentence: "Presley", "Presley and Sally", or "Mandy, Presley, and Sally". */
export function inWords(names: readonly string[]): string {
  return names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

/** How the other seats read in a sentence: "omar (Manon)" for a person, and the role's name for the AI. */
export function othersAt(table: Table): string {
  return inWords(
    table.seats.filter(({ role }) => role !== table.role).map((seat) => (seat.player === null ? seat.name : `${seat.player} (${seat.name})`)),
  );
}

/** Whether more than one other side sits at `table`, so a sentence about them takes a plural verb. */
export function severalOthers(table: Table): boolean {
  return table.seats.length > 2;
}
