import { type Ref, ref } from "vue";
import { api, type TableId } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";

/** How long after the last keystroke the plan is saved. */
const SAVE_AFTER_MS = 700;

export interface PlanParts {
  target: string;
  walkaway: string;
  priorities: string;
}

interface Plan {
  draft: Ref<PlanParts>;
  status: Ref<"saved" | "saving" | "unsaved">;
  error: Ref<string | null>;
  timer?: ReturnType<typeof setTimeout>;
  /** The newest save on its way to the server. Each save waits for the one before it, so saves arrive in order. */
  saving?: Promise<void>;
}

/** Like the notes, the plan is kept per table while the tab is open, so the prep page and the table share one draft. */
const byTable = new Map<TableId, Plan>();

/** The person's prep sheet for `table`, starting from `saved`, the copy the server last returned. */
export function usePlan(table: TableId, saved: { target: string | null; walkaway: string | null; priorities: string | null }) {
  let plan = byTable.get(table);
  if (plan === undefined) {
    plan = {
      draft: ref({ target: saved.target ?? "", walkaway: saved.walkaway ?? "", priorities: saved.priorities ?? "" }),
      status: ref("saved"),
      error: ref(null),
    };
    byTable.set(table, plan);
  }
  const { draft, status, error } = plan;
  const current = plan;

  /**
   * Saves the draft after any save already on its way, and resolves once the server has it, so starting can wait for
   * the plan the person sees. With nothing new to save, it waits for the save on its way, if there is one.
   */
  function save(): Promise<void> {
    clearTimeout(current.timer);
    current.timer = undefined;
    if (status.value !== "unsaved") return current.saving ?? Promise.resolve();
    status.value = "saving";
    const typed = { ...draft.value };
    // Each part is saved without surrounding spaces, so a part with only spaces counts as empty when starting.
    const parts = { target: typed.target.trim(), walkaway: typed.walkaway.trim(), priorities: typed.priorities.trim() };
    const saving = (current.saving ?? Promise.resolve())
      .then(() => api.tables.plan({ table, ...parts }))
      .then((result) => {
        if ("error" in result) {
          if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
          error.value = messageFor("/tables/plan", result.error);
          status.value = "unsaved";
          return;
        }
        error.value = null;
        // More typing while saving leaves the newer draft unsaved, and its own timer saves it.
        if (JSON.stringify(draft.value) === JSON.stringify(typed)) status.value = "saved";
      })
      .finally(() => {
        if (current.saving === saving) current.saving = undefined;
      });
    current.saving = saving;
    return saving;
  }

  /** Records a change to one part and saves the plan once typing pauses. */
  function edit(part: keyof PlanParts, text: string) {
    draft.value = { ...draft.value, [part]: text };
    status.value = "unsaved";
    clearTimeout(current.timer);
    current.timer = setTimeout(save, SAVE_AFTER_MS);
  }

  /** Whether every part has something in it, which the start needs. */
  const complete = () => Object.values(draft.value).every((part) => part.trim() !== "");

  return { draft, status, error, edit, save, complete };
}
