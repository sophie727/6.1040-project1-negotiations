<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { DraftIssue, DraftOption } from "../api/client.ts";
import { formatAmount } from "../table/format.ts";

/**
 * What one issue is worth to a role, as a chart the author draws. A list's options are bars, and a range's options are
 * points on a line, which shows what every value between two options is worth too. Dragging a bar or a point, pressing
 * the arrow keys on it, or typing in the box under it sets that option's points; every chart of a role shares one scale,
 * so the issues that matter most to the role stand tallest.
 */
const props = defineProps<{
  issue: DraftIssue;
  /** The role's points for each option it has points for; any other is worth 0. */
  points: Map<string, number>;
  scale: { bottom: number; top: number };
  /** How finely dragging, or an arrow key, sets points. */
  step: number;
  readonly: boolean;
}>();
const emit = defineEmits<{ set: [option: DraftOption["option"], points: number] }>();

/** The option being dragged, and the points it would get, shown before they're saved. */
const dragging = ref<{ option: string; points: number } | null>(null);
const pointsOf = (option: string) => (dragging.value?.option === option ? dragging.value.points : (props.points.get(option) ?? 0));

/** How far up the chart `points` stand, as a percentage: 0 at the scale's bottom, and 100 at its top. */
function up(points: number): number {
  const { bottom, top } = props.scale;
  return ((Math.min(top, Math.max(bottom, points)) - bottom) / (top - bottom)) * 100;
}
const zero = computed(() => up(0));

/** The span of a bar from the zero line to `points`, above it or below it. */
function bar(points: number) {
  const level = up(points);
  return { bottom: `${Math.min(level, zero.value)}%`, height: `${Math.abs(level - zero.value)}%` };
}

const shown = (points: number) => Math.round(points).toLocaleString("en-US");

// A range's options sit along it by universal value, inset so the points at either end aren't cut off.
const values = computed(() => props.issue.options.map(({ universalValue }) => universalValue ?? 0));
function across(option: DraftOption): number {
  const lowest = values.value[0] ?? 0;
  const highest = values.value.at(-1) ?? 0;
  if (highest === lowest) return 50;
  return 6 + (((option.universalValue ?? 0) - lowest) / (highest - lowest)) * 88;
}
/** The range's line, and the area under it, in a 100 × 100 box. */
const line = computed(() => props.issue.options.map((option) => `${across(option)},${100 - up(pointsOf(option.option))}`).join(" "));
const area = computed(() => {
  const first = props.issue.options[0];
  const last = props.issue.options.at(-1);
  if (first === undefined || last === undefined) return "";
  return `${across(first)},${100 - zero.value} ${line.value} ${across(last)},${100 - zero.value}`;
});

// Setting points

/** The points at the height of `event` on `plot`, rounded to the step, within the scale. */
function pointsAt(event: PointerEvent, plot: Element): number {
  const { top, height } = plot.getBoundingClientRect();
  const { bottom: lowest, top: highest } = props.scale;
  const raw = lowest + (1 - (event.clientY - top) / height) * (highest - lowest);
  return Math.min(highest, Math.max(lowest, Math.round(raw / props.step) * props.step));
}

/** Follows the pointer from a bar or point until it lets go, then saves the points where it let go. */
function grab(option: DraftOption, event: PointerEvent) {
  if (props.readonly || event.button !== 0) return;
  const handle = event.currentTarget as HTMLElement;
  const plot = handle.closest(".plot");
  if (plot === null) return;
  event.preventDefault();
  handle.setPointerCapture(event.pointerId);
  const before = pointsOf(option.option);
  dragging.value = { option: option.option, points: pointsAt(event, plot) };
  const move = (moved: PointerEvent) => {
    dragging.value = { option: option.option, points: pointsAt(moved, plot) };
  };
  const drop = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", drop);
    handle.removeEventListener("pointercancel", drop);
    const dropped = dragging.value?.points ?? before;
    if (dropped !== before) emit("set", option.option, dropped);
    else dragging.value = null;
  };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", drop);
  handle.addEventListener("pointercancel", drop);
}

/** The arrow keys move a bar or point one step, Page Up and Page Down ten, and Home and End to the bottom and top of the scale. */
function nudge(option: DraftOption, event: KeyboardEvent) {
  if (props.readonly) return;
  const now = pointsOf(option.option);
  const moves: Record<string, number> = {
    ArrowUp: now + props.step,
    ArrowRight: now + props.step,
    ArrowDown: now - props.step,
    ArrowLeft: now - props.step,
    PageUp: now + props.step * 10,
    PageDown: now - props.step * 10,
    Home: props.scale.bottom,
    End: props.scale.top,
  };
  const next = moves[event.key];
  if (next === undefined) return;
  event.preventDefault();
  emit("set", option.option, Math.round(next * 100) / 100);
}

function typed(option: DraftOption, event: Event) {
  const box = event.target as HTMLInputElement;
  const points = box.valueAsNumber;
  if (Number.isNaN(points)) {
    box.value = String(props.points.get(option.option) ?? 0);
    return;
  }
  if (points !== (props.points.get(option.option) ?? 0) || !props.points.has(option.option)) emit("set", option.option, points);
}

// A bar stays where the pointer let go until the saved points arrive, and then shows them.
watch(
  () => props.points,
  () => (dragging.value = null),
);
/** An option of a range, with its value when its name doesn't say it, such as "March 1, at 0 days after March 1". */
function described(option: DraftOption): string {
  if (option.universalValue === null) return option.name;
  const amount = formatAmount(option.universalValue, props.issue.unit);
  return amount === option.name || String(option.universalValue) === option.name ? option.name : `${option.name}, at ${amount}`;
}
</script>

<template>
  <figure class="chart">
    <figcaption>
      <strong>{{ issue.name }}</strong>
      <span class="muted">{{ issue.kind === "CONTINUOUS" ? `A range${issue.unit ? ` in ${issue.unit}` : ""}` : "A list of options" }}</span>
    </figcaption>
    <p v-if="issue.options.length === 0" class="muted">Give this issue options on the General tab first.</p>

    <!-- A list: a bar for each option. -->
    <div v-else-if="issue.kind === 'DISCRETE'" class="bars">
      <div v-for="option in issue.options" :key="option.option" class="column">
        <div class="plot" :class="{ readonly }">
          <span class="zero" :style="{ bottom: `${zero}%` }" />
          <span
            class="bar"
            :class="{ unset: !points.has(option.option) }"
            :style="bar(pointsOf(option.option))"
            @pointerdown="grab(option, $event)"
          />
          <span
            v-if="!readonly"
            class="handle grip"
            role="slider"
            tabindex="0"
            :aria-label="`Points for ${option.name}`"
            :aria-valuemin="scale.bottom"
            :aria-valuemax="scale.top"
            :aria-valuenow="pointsOf(option.option)"
            :aria-readonly="readonly"
            :style="{ bottom: `${up(pointsOf(option.option))}%` }"
            @pointerdown="grab(option, $event)"
            @keydown="nudge(option, $event)"
          />
          <span class="value" :style="{ bottom: `${Math.max(up(pointsOf(option.option)), zero)}%` }">{{ shown(pointsOf(option.option)) }}</span>
        </div>
        <span class="option-name" :title="option.name">{{ option.name }}</span>
        <input
          type="number"
          class="points"
          :value="points.get(option.option) ?? 0"
          :aria-label="`Points for ${option.name}`"
          :disabled="readonly"
          @change="typed(option, $event)"
        />
      </div>
    </div>

    <!-- A range: a point for each option on a line, which also shows the points of every value between them. -->
    <template v-else>
      <div class="plot range" :class="{ readonly }">
        <span class="zero" :style="{ bottom: `${zero}%` }" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon class="area" :points="area" />
          <polyline class="line" :points="line" vector-effect="non-scaling-stroke" />
        </svg>
        <template v-for="option in issue.options" :key="option.option">
          <span
            class="handle dot"
            :class="{ unset: !points.has(option.option) }"
            role="slider"
            :tabindex="readonly ? -1 : 0"
            :aria-label="`Points for ${described(option)}`"
            :aria-valuemin="scale.bottom"
            :aria-valuemax="scale.top"
            :aria-valuenow="pointsOf(option.option)"
            :aria-readonly="readonly"
            :style="{ left: `${across(option)}%`, bottom: `${up(pointsOf(option.option))}%` }"
            @pointerdown="grab(option, $event)"
            @keydown="nudge(option, $event)"
          />
          <span class="value" :style="{ left: `${across(option)}%`, bottom: `${up(pointsOf(option.option))}%` }">
            {{ shown(pointsOf(option.option)) }}
          </span>
        </template>
      </div>
      <div class="axis" aria-hidden="true">
        <span v-for="option in issue.options" :key="option.option" :style="{ left: `${across(option)}%` }">{{ option.name }}</span>
      </div>
      <div class="boxes">
        <label v-for="option in issue.options" :key="option.option">
          <span class="muted" :title="described(option)">{{ option.name }}</span>
          <input
            type="number"
            class="points"
            :value="points.get(option.option) ?? 0"
            :aria-label="`Points for ${described(option)}`"
            :disabled="readonly"
            @change="typed(option, $event)"
          />
        </label>
      </div>
    </template>
  </figure>
</template>

<style scoped>
.chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-4);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-page);
}
figcaption {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}
.bars {
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  padding-top: var(--space-5);
}
.column {
  display: flex;
  flex: 1 0 72px;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  min-width: 72px;
  max-width: 140px;
}
.plot {
  position: relative;
  width: 100%;
  height: 140px;
  touch-action: none;
  user-select: none;
}
.range {
  margin-top: var(--space-5);
}
.zero {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1.5px solid var(--color-border);
}
.bar {
  position: absolute;
  left: 18%;
  right: 18%;
  border-radius: 8px 8px 3px 3px;
  background: var(--color-accent);
  cursor: ns-resize;
}
.bar.unset {
  background: repeating-linear-gradient(-45deg, var(--color-border), var(--color-border) 4px, transparent 4px, transparent 8px);
}
.handle {
  position: absolute;
  cursor: ns-resize;
}
.handle:focus-visible {
  outline: 2.5px solid var(--color-gold);
  outline-offset: 2px;
}
.grip {
  left: 14%;
  right: 14%;
  height: 10px;
  transform: translateY(50%);
  border-radius: var(--radius-full);
  background: var(--color-accent-strong);
  box-shadow: 0 0 0 2px var(--color-surface);
}
.dot {
  width: 18px;
  height: 18px;
  transform: translate(-50%, 50%);
  border: 3px solid var(--color-accent);
  border-radius: 50%;
  background: var(--color-surface);
}
.dot.unset {
  border-style: dashed;
}
.value {
  position: absolute;
  left: 0;
  right: 0;
  margin-bottom: 8px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-align: center;
  pointer-events: none;
}
.range .value {
  right: auto;
  transform: translateX(-50%);
  margin-bottom: 14px;
  white-space: nowrap;
}
.readonly .bar,
.readonly .handle {
  cursor: default;
}
svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.area {
  fill: var(--color-accent-soft);
}
.line {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 2.5;
}
.axis {
  position: relative;
  height: 1.4em;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
.axis span {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}
.option-name {
  max-width: 100%;
  overflow: hidden;
  font-size: var(--text-xs);
  font-weight: 600;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.boxes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: var(--space-2);
}
.boxes label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.boxes .muted {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.points {
  width: 100%;
  max-width: 110px;
  padding: 6px 8px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font: inherit;
  font-size: var(--text-sm);
  color: inherit;
  text-align: center;
}
.points:focus {
  outline: none;
  border-color: var(--color-accent);
}
</style>
