<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId } from "vue";

/**
 * A small ⓘ button that explains something, such as what a BATNA is, in a bubble that opens while the pointer rests on it
 * or the button has focus, and stays open after a click or a tap until the next one, Escape, or a click elsewhere. It
 * follows the button when the page scrolls. Only
 * explanations that people can do without belong in it: instructions everyone needs stay on the page as text. `label`
 * names what it explains, for screen readers, such as "About BATNAs".
 */
defineProps<{ label: string }>();

const WIDTH = 288;
const GAP = 8;
const id = useId();
const button = ref<HTMLButtonElement | null>(null);
const bubble = ref<HTMLElement | null>(null);
const open = ref(false);
/** Whether a click or tap is holding the bubble open. */
const pinned = ref(false);
const position = ref({ top: 0, left: 0 });

/**
 * Places the bubble under the button, or over it when there's no room below, and within the screen's edges. It is
 * fixed to the screen rather than teleported, so it stays in a dialog's top layer and outside any box that clips.
 */
async function place() {
  open.value = true;
  await nextTick();
  const anchor = button.value?.getBoundingClientRect();
  if (anchor === undefined) return;
  const height = bubble.value?.offsetHeight ?? 0;
  const width = Math.min(WIDTH, window.innerWidth - 2 * GAP);
  const left = Math.min(Math.max(GAP, anchor.left + anchor.width / 2 - width / 2), window.innerWidth - width - GAP);
  const below = anchor.bottom + GAP;
  const top = below + height > window.innerHeight - GAP && anchor.top - GAP - height > GAP ? anchor.top - GAP - height : below;
  position.value = { top, left };
}

/** Hiding waits a moment, so the pointer can cross the gap from the button to the bubble without closing it. */
let hiding: ReturnType<typeof setTimeout> | undefined;

function show() {
  clearTimeout(hiding);
  if (!open.value) void place();
}

function hide() {
  clearTimeout(hiding);
  hiding = setTimeout(() => {
    if (!pinned.value) open.value = false;
  }, 150);
}

function toggle() {
  pinned.value = !pinned.value || !open.value;
  if (pinned.value) void place();
  else open.value = false;
}

function close() {
  clearTimeout(hiding);
  pinned.value = false;
  open.value = false;
}

function clickedElsewhere(event: PointerEvent) {
  if (pinned.value && !button.value?.contains(event.target as Node) && !bubble.value?.contains(event.target as Node)) close();
}
document.addEventListener("pointerdown", clickedElsewhere);
function follow() {
  if (open.value) void place();
}
window.addEventListener("scroll", follow, true);
window.addEventListener("resize", follow);
onBeforeUnmount(() => {
  clearTimeout(hiding);
  document.removeEventListener("pointerdown", clickedElsewhere);
  window.removeEventListener("scroll", follow, true);
  window.removeEventListener("resize", follow);
});
</script>

<template>
  <span class="info" @mouseenter="show" @mouseleave="hide">
    <button
      ref="button"
      type="button"
      class="mark"
      :aria-label="label"
      :aria-describedby="open ? id : undefined"
      :aria-expanded="open"
      @focus="show"
      @blur="hide"
      @click="toggle"
      @keydown.escape="close"
    >
      i
    </button>
    <span
      v-show="open"
      :id="id"
      ref="bubble"
      class="bubble"
      role="tooltip"
      :style="{ top: `${position.top}px`, left: `${position.left}px`, width: `min(${WIDTH}px, calc(100vw - ${2 * GAP}px))` }"
    >
      <slot />
    </span>
  </span>
</template>

<style scoped>
/* It sits in a line of text, such as after a heading, a little apart from the word before it. */
.info {
  display: inline-flex;
  margin-left: 0.25em;
  vertical-align: middle;
}
.mark {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1.5px solid currentColor;
  border-radius: 50%;
  background: transparent;
  color: var(--color-teal);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 12px;
  font-style: italic;
  font-weight: 700;
  line-height: 1;
  cursor: help;
}
.mark:hover,
.mark[aria-expanded="true"] {
  background: var(--color-teal);
  border-color: var(--color-teal);
  color: var(--color-surface);
}
.bubble {
  position: fixed;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--color-tip);
  color: #f6f3df;
  box-shadow: var(--shadow-popover);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-style: normal;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: normal;
  text-align: left;
  text-transform: none;
  white-space: normal;
}
.bubble :deep(strong) {
  color: #ffffff;
}
</style>
