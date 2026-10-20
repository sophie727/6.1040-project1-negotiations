<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";

/**
 * A bar between two panes that the person drags to divide the room between them: `vertical` between panes side by
 * side, and `horizontal` between panes stacked one above the other. `share` is the first pane's part of the room, from
 * 0 to 1, and stays where each pane keeps at least its `min` pixels. The arrow keys move the bar too, and a double-click
 * puts it back at `initial`. The panes are the bar's siblings, and their parent's size is the room they share.
 */
const props = defineProps<{
  orientation: "vertical" | "horizontal";
  initial: number;
  /** The fewest pixels the first pane and the second pane can have. */
  min: readonly [number, number];
  label: string;
  /** The id of the first pane. */
  controls?: string;
}>();
const share = defineModel<number>("share", { required: true });

const bar = ref<HTMLElement | null>(null);
const dragging = ref(false);
/** How far into the bar the pointer pressed it, so the bar keeps its place under the pointer as it moves. */
let grab = 0;

/** The pixels the panes share, where the first pane starts, and the shares that leave each pane its fewest pixels. */
function room() {
  const parent = bar.value!.parentElement!.getBoundingClientRect();
  const own = bar.value!.getBoundingClientRect();
  const across = props.orientation === "vertical";
  const pixels = across ? parent.width - own.width : parent.height - own.height;
  return { pixels, start: across ? parent.left : parent.top, low: props.min[0] / pixels, high: 1 - props.min[1] / pixels };
}

function set(next: number) {
  const { low, high } = room();
  share.value = Math.min(Math.max(next, low), high);
}

function press(event: PointerEvent) {
  if (event.button !== 0) return;
  // Keeps the press from selecting text or starting to drag something else.
  event.preventDefault();
  const own = bar.value!.getBoundingClientRect();
  grab = props.orientation === "vertical" ? event.clientX - own.left : event.clientY - own.top;
  bar.value!.setPointerCapture(event.pointerId);
  dragging.value = true;
}

function drag(event: PointerEvent) {
  if (!dragging.value) return;
  const { pixels, start } = room();
  const at = props.orientation === "vertical" ? event.clientX : event.clientY;
  set((at - grab - start) / pixels);
}

function release() {
  dragging.value = false;
}

/** The arrow keys move the bar a little, or ten times as far with Shift, and Home and End move it all the way. */
function key(event: KeyboardEvent) {
  const step = event.shiftKey ? 0.1 : 0.02;
  const [back, forward] = props.orientation === "vertical" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
  if (event.key === back) set(share.value - step);
  else if (event.key === forward) set(share.value + step);
  else if (event.key === "Home") set(0);
  else if (event.key === "End") set(1);
  else return;
  event.preventDefault();
}

// While the bar is dragged, the whole page shows the resize cursor and selects no text, wherever the pointer goes.
const draggingClass = `dragging-${props.orientation}`;
watch(dragging, (on) => document.documentElement.classList.toggle(draggingClass, on));
onUnmounted(() => document.documentElement.classList.remove(draggingClass));
</script>

<template>
  <div
    ref="bar"
    class="splitter"
    :class="[orientation, { dragging }]"
    role="separator"
    tabindex="0"
    :aria-orientation="orientation"
    :aria-label="label"
    :aria-controls="controls"
    :aria-valuenow="Math.round(share * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
    title="Drag to resize. Double-click to reset."
    @pointerdown="press"
    @pointermove="drag"
    @pointerup="release"
    @pointercancel="release"
    @keydown="key"
    @dblclick="set(initial)"
  />
</template>

<style scoped>
.splitter {
  display: grid;
  place-items: center;
  touch-action: none;
  outline: none;
}
.vertical {
  cursor: col-resize;
}
.horizontal {
  cursor: row-resize;
}
/* The grip in the middle of the bar, which grows and darkens when the person points at it, drags it, or focuses it. */
.splitter::after {
  content: "";
  border-radius: var(--radius-full);
  background: var(--color-border);
  transition:
    background-color 0.15s ease,
    width 0.15s ease,
    height 0.15s ease;
}
.vertical::after {
  width: 4px;
  height: 40px;
}
.horizontal::after {
  width: 40px;
  height: 4px;
}
.splitter:hover::after,
.splitter:focus-visible::after,
.splitter.dragging::after {
  background: var(--color-accent);
}
.vertical:hover::after,
.vertical:focus-visible::after,
.vertical.dragging::after {
  height: 64px;
}
.horizontal:hover::after,
.horizontal:focus-visible::after,
.horizontal.dragging::after {
  width: 64px;
}
.splitter:focus-visible::after {
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}
:global(html.dragging-vertical),
:global(html.dragging-vertical *) {
  cursor: col-resize !important;
  user-select: none;
}
:global(html.dragging-horizontal),
:global(html.dragging-horizontal *) {
  cursor: row-resize !important;
  user-select: none;
}
</style>
