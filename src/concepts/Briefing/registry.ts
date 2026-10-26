import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import spec from "@design/concepts/Briefing.md" with { type: "text" };
import type { Db } from "mongodb";
import type { User } from "../Registering/Registering.ts";
import {
  BriefingConcept,
  DifferentScenarios,
  InvalidBrief,
  InvalidIssueName,
  InvalidOptionName,
  InvalidRoleName,
  InvalidScenarioName,
  InvalidSummary,
  IssueExists,
  NameTaken,
  OptionExists,
  RoleExists,
  UnitNotAllowed,
  UnknownIssue,
  UnknownOption,
  UnknownRole,
  UnknownRoleOrOption,
  UnknownScenario,
  ValueNotAllowed,
  ValueRequired,
  ValueTaken,
} from "./Briefing.ts";

/** Scenarios are written by people with accounts. */
class Briefing extends BriefingConcept<User> {}

export const briefing = registerConcept({
  class: Briefing,
  spec,
  refusals: {
    INVALID_SCENARIO_NAME: InvalidScenarioName,
    NAME_TAKEN: NameTaken,
    UNKNOWN_SCENARIO: UnknownScenario,
    INVALID_ISSUE_NAME: InvalidIssueName,
    ISSUE_EXISTS: IssueExists,
    UNIT_NOT_ALLOWED: UnitNotAllowed,
    UNKNOWN_ISSUE: UnknownIssue,
    UNKNOWN_OPTION: UnknownOption,
    INVALID_OPTION_NAME: InvalidOptionName,
    OPTION_EXISTS: OptionExists,
    VALUE_REQUIRED: ValueRequired,
    VALUE_NOT_ALLOWED: ValueNotAllowed,
    VALUE_TAKEN: ValueTaken,
    INVALID_ROLE_NAME: InvalidRoleName,
    ROLE_EXISTS: RoleExists,
    UNKNOWN_ROLE_OR_OPTION: UnknownRoleOrOption,
    DIFFERENT_SCENARIOS: DifferentScenarios,
    UNKNOWN_ROLE: UnknownRole,
    INVALID_BRIEF: InvalidBrief,
    INVALID_SUMMARY: InvalidSummary,
  },
  floors: { mongo: ({ database }: { database: Db }, name: string) => new Briefing(database, name) },
});
