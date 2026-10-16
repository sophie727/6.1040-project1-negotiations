<!-- Copied from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng. -->
<script setup lang="ts">
import { onMounted, ref, useId } from "vue";
import Icon from "./Icon.vue";

/** A modal dialog, opened with `showModal` when it mounts. Set `dark` to show a picture on a dark backdrop that fills the screen. */
defineProps<{ title: string; subtitle?: string; dark?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
const titleId = useId();

onMounted(() => dialog.value?.showModal());
</script>

<template>
  <dialog
    ref="dialog"
    :class="{ dark }"
    :aria-labelledby="titleId"
    @close="emit('close')"
    @click.self="dialog?.close()"
  >
    <div class="body">
      <header>
        <div class="titles">
          <h2 :id="titleId">{{ title }}</h2>
          <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
        </div>
        <slot name="actions" />
        <button type="button" class="icon-button close" aria-label="Close" @click="dialog?.close()">
          <Icon name="close" />
        </button>
      </header>
      <slot />
    </div>
  </dialog>
</template>

<style scoped>
dialog {
  width: min(480px, calc(100vw - 32px));
  max-height: calc(100vh - 64px);
  margin: 12vh auto auto;
  padding: 0;
  border: 0;
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-dialog);
}
dialog::backdrop {
  background: rgba(30, 31, 43, 0.42);
}
.body {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-6);
}
header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}
.titles {
  flex: 1;
  min-width: 0;
}
h2 {
  overflow-wrap: anywhere;
}
.subtitle {
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.close {
  width: 40px;
  height: 40px;
  background: var(--color-page);
}

dialog.dark {
  width: 100vw;
  max-width: none;
  height: 100vh;
  max-height: none;
  margin: 0;
  border-radius: 0;
  background: #16171f;
  color: #f3f4f9;
}
dialog.dark .body {
  height: 100%;
  padding: var(--space-4) var(--space-6) var(--space-6);
}
dialog.dark h2 {
  font-size: var(--text-lg);
}
dialog.dark .subtitle {
  color: #a9abbf;
}
dialog.dark .close {
  color: #f3f4f9;
  background: #2a2b38;
}
@media (max-width: 600px) {
  dialog:not(.dark) {
    width: 100vw;
    max-width: none;
    margin: auto 0 0;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }
}
</style>
