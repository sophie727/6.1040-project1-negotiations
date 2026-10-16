import { type Ref, ref } from "vue";
import { api, type TableId } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";

/** How long after the last keystroke the notes are saved. */
const SAVE_AFTER_MS = 700;

interface Notes {
  draft: Ref<string>;
  status: Ref<"saved" | "saving" | "unsaved">;
  error: Ref<string | null>;
  timer?: ReturnType<typeof setTimeout>;
}

/**
 * The notes are kept per table for as long as the tab is open, so the brief page and the table page, which each show
 * them, share one draft: switching pages never loses what was typed, or shows an older copy than the one being saved.
 */
const byTable = new Map<TableId, Notes>();

/** The person's notes about `table`, starting from `saved`, the copy the server last returned. */
export function useNotes(table: TableId, saved: string | null) {
  let notes = byTable.get(table);
  if (notes === undefined) {
    notes = { draft: ref(saved ?? ""), status: ref("saved"), error: ref(null) };
    byTable.set(table, notes);
  }
  const { draft, status, error } = notes;
  const current = notes;

  async function save() {
    clearTimeout(current.timer);
    current.timer = undefined;
    if (status.value === "saved") return;
    status.value = "saving";
    const body = draft.value;
    const result = await api.tables.notes({ table, body });
    if ("error" in result) {
      if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
      error.value = messageFor("/tables/notes", result.error);
      status.value = "unsaved";
      return;
    }
    error.value = null;
    // More typing while saving leaves the newer draft unsaved, and its own timer saves it.
    if (draft.value === body) status.value = "saved";
  }

  /** Records a change and saves it once typing pauses. */
  function edit(text: string) {
    draft.value = text;
    status.value = "unsaved";
    clearTimeout(current.timer);
    current.timer = setTimeout(save, SAVE_AFTER_MS);
  }

  return { draft, status, error, edit, save };
}
