<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "./session.ts";
import Dialog from "./ui/Dialog.vue";

/** The person's settings. For now, one: whether to write a prep sheet before each negotiation. */
const emit = defineEmits<{ close: [] }>();

const prepSheet = ref<boolean | null>(null);
const error = ref<string | null>(null);

function refused(path: string, code: string) {
  if (code === "UNAUTHORIZED") useSession().sessionEnded();
  error.value = messageFor(path, code);
}

onMounted(async () => {
  const result = await api.settings.show();
  if ("error" in result) return refused("/settings/show", result.error);
  prepSheet.value = result.prepSheet;
});

async function toggle(on: boolean) {
  const result = await api.settings["prep-sheet"]({ on });
  if ("error" in result) return refused("/settings/prep-sheet", result.error);
  error.value = null;
  prepSheet.value = result.prepSheet;
}
</script>

<template>
  <Dialog title="Settings" @close="emit('close')">
    <label v-if="prepSheet !== null" class="setting">
      <input type="checkbox" :checked="prepSheet" @change="toggle(($event.target as HTMLInputElement).checked)" />
      <span>
        <strong>Prep sheet before each negotiation</strong>
        <span class="muted">
          Before you can start, write down your target, your walkaway, and your priorities. You'll see your plan during the
          negotiation, too.
        </span>
      </span>
    </label>
    <p v-else-if="!error" class="muted">Loading your settings…</p>
    <p v-if="error" class="refusal" role="alert">{{ error }}</p>
  </Dialog>
</template>

<style scoped>
.setting {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  cursor: pointer;
}
.setting input {
  margin-top: 4px;
  accent-color: var(--color-accent);
  width: 18px;
  height: 18px;
}
.setting > span {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
</style>
