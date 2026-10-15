import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Tabling.md" with { type: "text" };
import type { Db } from "mongodb";
import type { Role, Scenario } from "../Briefing/Briefing.ts";
import {
  AlreadyBegun,
  AlreadySeated,
  InvalidTimeLimit,
  NoSuchSeat,
  NotAllSeated,
  NotDue,
  NotEnoughSeats,
  NotOpen,
  NotSeated,
  NoTimeLimit,
  RoleTaken,
  SeatExists,
  TablingConcept,
  TimeUp,
  UnknownTable,
} from "./Tabling.ts";

/** Whoever sits at a table: a person's Registering user, or the name of an AI counterpart, such as `bot:obstinate`. */
export type Player = string;

class Tabling extends TablingConcept<Scenario, Role, Player> {}

export const tabling = registerConcept({
  class: Tabling,
  spec,
  refusals: {
    INVALID_TIME_LIMIT: InvalidTimeLimit,
    NO_TIME_LIMIT: NoTimeLimit,
    UNKNOWN_TABLE: UnknownTable,
    ALREADY_BEGUN: AlreadyBegun,
    SEAT_EXISTS: SeatExists,
    NO_SUCH_SEAT: NoSuchSeat,
    ROLE_TAKEN: RoleTaken,
    ALREADY_SEATED: AlreadySeated,
    NOT_ENOUGH_SEATS: NotEnoughSeats,
    NOT_ALL_SEATED: NotAllSeated,
    NOT_OPEN: NotOpen,
    TIME_UP: TimeUp,
    NOT_SEATED: NotSeated,
    NOT_DUE: NotDue,
  },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Tabling(database, name) },
});
