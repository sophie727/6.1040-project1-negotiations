<script setup lang="ts">
import { computed } from "vue";
import { formatPoints } from "../table/format.ts";

/** A pie of points: one slice per entry, sized by its value, with a legend beside it. */
const props = defineProps<{ slices: readonly { label: string; value: number; color: string }[] }>();

const total = computed(() => props.slices.reduce((sum, { value }) => sum + Math.max(0, value), 0));

/** Each slice as an SVG path in a circle of radius 1 around the origin, starting at the top and going clockwise. */
const paths = computed(() => {
  let start = 0;
  return props.slices
    .filter(({ value }) => value > 0)
    .map(({ label, value, color }) => {
      const share = value / total.value;
      const end = start + share;
      const point = (fraction: number) => [Math.sin(2 * Math.PI * fraction), -Math.cos(2 * Math.PI * fraction)] as const;
      const [x1, y1] = point(start);
      const [x2, y2] = point(end);
      const d =
        share >= 0.9999
          ? "M 0 -1 A 1 1 0 1 1 0 1 A 1 1 0 1 1 0 -1 Z"
          : `M 0 0 L ${x1} ${y1} A 1 1 0 ${share > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`;
      start = end;
      return { label, color, d };
    });
});
</script>

<template>
  <figure class="pie">
    <svg viewBox="-1.05 -1.05 2.1 2.1" role="img" :aria-label="slices.map(({ label, value }) => `${label}: ${formatPoints(value)} points`).join(', ')">
      <path v-for="slice in paths" :key="slice.label" :d="slice.d" :fill="slice.color" stroke="#ffffff" stroke-width="0.02" />
    </svg>
    <figcaption>
      <ul class="legend">
        <li v-for="slice in slices" :key="slice.label">
          <span class="swatch" :style="{ background: slice.color }" />
          <span>{{ slice.label }}</span>
          <strong>{{ formatPoints(slice.value) }}</strong>
        </li>
      </ul>
    </figcaption>
  </figure>
</template>

<style scoped>
.pie {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  margin: 0;
}
svg {
  width: min(100%, 300px);
  height: auto;
}
.legend {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: 0;
  list-style: none;
}
.legend li {
  display: grid;
  grid-template-columns: 14px 1fr auto;
  align-items: center;
  gap: var(--space-2);
  min-width: 240px;
}
.swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}
</style>
