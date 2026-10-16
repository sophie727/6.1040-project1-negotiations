<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import type { TableId } from "../api/client.ts";
import { useNotes } from "./notes.ts";

/** The person's private notes about a table, saved as they type. */
const props = defineProps<{ table: TableId; saved: string | null; rows?: number }>();
const { draft, status, error, edit, save } = useNotes(props.table, props.saved);
onBeforeUnmount(() => void save());
</script>

<template>
  <div class="notes">
    <textarea
      class="box"
      :rows="rows ?? 12"
      :value="draft"
      maxlength="20000"
      placeholder="Only you can see your notes. Try writing your target, your walkaway point, and your priorities."
      aria-label="Your notes"
      @input="edit(($event.target as HTMLTextAreaElement).value)"
      @blur="save"
    />
    <p v-if="error" class="refusal" role="alert">{{ error }}</p>
    <p v-else class="muted" aria-live="polite">{{ status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Not saved yet" }}</p>
  </div>
</template>

<style scoped>
.notes {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
