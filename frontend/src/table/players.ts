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

/** How the other seats read in a sentence: "omar (Manon)" for a person, the role's name for the AI, and "and" between them. */
export function othersAt(table: Table): string {
  return table.seats
    .filter(({ role }) => role !== table.role)
    .map((seat) => (seat.player === null ? seat.name : `${seat.player} (${seat.name})`))
    .join(" and ");
}
