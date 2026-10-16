<!-- Copied from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng. -->
<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import Icon from "./Icon.vue";

defineProps<{ label: string }>();
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const button = ref<HTMLButtonElement | null>(null);

/** Closes the menu when I click or move the focus outside it. */
function closeIfOutside(event: Event) {
  const target = event instanceof FocusEvent ? event.relatedTarget : event.target;
  if (target instanceof Node && !root.value?.contains(target)) close();
}

/** Pressing Escape closes the menu and moves the focus back to the menu button. */
function escape() {
  close();
  button.value?.focus();
}

function toggle() {
  open.value = !open.value;
  if (open.value) document.addEventListener("click", closeIfOutside);
  else document.removeEventListener("click", closeIfOutside);
}

function close() {
  open.value = false;
  document.removeEventListener("click", closeIfOutside);
}

onUnmounted(close);
</script>

<template>
  <div ref="root" class="menu" @keydown.escape="escape" @focusout="closeIfOutside">
    <button ref="button" type="button" class="icon-button" :aria-label="label" :aria-expanded="open" @click="toggle">
      <slot name="button"><Icon name="more" /></slot>
    </button>
    <div v-if="open" class="items" @click="close">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.menu {
  position: relative;
}
.icon-button[aria-expanded="true"] {
  color: var(--color-text);
  background: var(--color-line);
}
.items {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  width: max-content;
  min-width: 200px;
  max-width: 280px;
  padding: 6px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-popover);
}
/* Each item is a button with an icon and a label, and an optional `.detail` line under the label. */
.items :slotted(button) {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  text-align: left;
}
.items :slotted(button:hover) {
  background: var(--color-page);
}
.items :slotted(svg) {
  flex: none;
  margin-top: 2px;
}
.items :slotted(.detail) {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
