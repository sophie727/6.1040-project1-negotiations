// Adapted from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng.
// The Whole Pie adds fields that hold a number, such as a time limit, a term sheet, or a flag, such as a setting.
import type { EndpointValidator } from "@mit-sdg/sync-engine/boundary";

/** What a field of a request body may hold instead of text. */
export type FieldKind = "number" | "terms" | "flag";

const fits: Record<FieldKind, (value: unknown) => boolean> = {
  number: (value) => typeof value === "number" && Number.isFinite(value),
  flag: (value) => typeof value === "boolean",
  // A term sheet agrees on an option of each discrete issue, by its identity, and a universal value on each continuous one.
  terms: (value) =>
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((agreed) => typeof agreed === "string" || (typeof agreed === "number" && Number.isFinite(agreed))),
};

/**
 * Accepts a request body whose fields are all strings, except the fields named in `kinds`, which hold that kind of value.
 * `session` and `attempt` are null when the browser sent no cookie. The endpoint's receive clause names the required fields.
 */
export function inputOf(kinds: Readonly<Record<string, FieldKind>> = {}): EndpointValidator {
  return (value) => {
    const ok =
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.entries(value).every(([name, field]) =>
        Object.hasOwn(kinds, name)
          ? fits[kinds[name]!](field)
          : typeof field === "string" || (field === null && (name === "session" || name === "attempt")),
      );
    return ok ? { ok: true } : { ok: false, detail: "expected text fields, and numbers, term sheets, or flags where named" };
  };
}

/** Accepts a request body whose fields are all strings; `session` and `attempt` are null when the browser sent no cookie. */
export const textInput = inputOf();
