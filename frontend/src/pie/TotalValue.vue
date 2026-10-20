<script setup lang="ts">
import { computed } from "vue";
import type { Issue } from "../api/client.ts";
import { formatPoints } from "../table/format.ts";
import { dealPoints, type Payoffs, rangeOf, type TermSheet } from "../table/points.ts";

/**
 * How the deal compares with every deal the scenario allows: a histogram of the total points of a grid of term sheets,
 * with lines where walking away, the deal, and the best deal fall.
 */
const props = defineProps<{
  issues: readonly Issue[];
  payoffs: readonly Payoffs[];
  noDeal: number;
  deal: number | null;
  best: number | null;
}>();

const BINS = 14;
/** How many values of each continuous issue the grid tries, from its lowest to its highest option. */
const STEPS = 5;

/** The total points of each term sheet in the grid: every option of each discrete issue, and STEPS values of each continuous one. */
const totals = computed(() => {
  const choices = props.issues.map((issue) => {
    if (issue.kind === "DISCRETE") return issue.options.map(({ option }) => option as string | number);
    const { min, max } = rangeOf(issue);
    return Array.from({ length: STEPS }, (_, step) => min + ((max - min) * step) / (STEPS - 1));
  });
  let sheets: TermSheet[] = [{}];
  for (const [index, issue] of props.issues.entries()) {
    sheets = sheets.flatMap((sheet) => (choices[index] ?? []).map((agreed) => ({ ...sheet, [issue.issue]: agreed })));
  }
  return sheets.map((sheet) => props.payoffs.reduce((sum, payoffs) => sum + (dealPoints(props.issues, sheet, payoffs) ?? 0), 0));
});

const WIDTH = 400;
const HEIGHT = 150;
const low = computed(() => Math.min(props.noDeal, ...totals.value));
const high = computed(() => Math.max(props.best ?? 0, ...totals.value));
const x = (points: number) => ((points - low.value) / Math.max(high.value - low.value, 1)) * WIDTH;

const bars = computed(() => {
  const counts = new Array<number>(BINS).fill(0);
  for (const total of totals.value) {
    const bin = Math.min(BINS - 1, Math.floor(((total - low.value) / Math.max(high.value - low.value, 1)) * BINS));
    counts[bin] = (counts[bin] ?? 0) + 1;
  }
  const most = Math.max(...counts, 1);
  const width = WIDTH / BINS;
  return counts.map((count, bin) => ({ x: bin * width + 1, width: width - 2, height: (count / most) * (HEIGHT - 30) }));
});

const markers = computed(() =>
  [
    { label: "No deal", points: props.noDeal, color: "var(--color-text-muted)", dash: "4 3" },
    ...(props.deal === null ? [] : [{ label: "Your deal", points: props.deal, color: "var(--color-accent)", dash: "" }]),
    ...(props.best === null ? [] : [{ label: "Best possible", points: props.best, color: "var(--color-good)", dash: "2 3" }]),
  ].map((marker) => ({ ...marker, x: x(marker.points) })),
);
</script>

<template>
  <figure class="total-value">
    <svg class="chart" :viewBox="`-10 -4 ${WIDTH + 20} ${HEIGHT + 24}`" role="img" aria-label="How the total value of your deal compares with every possible deal">
      <rect
        v-for="(bar, index) in bars"
        :key="index"
        :x="bar.x"
        :y="HEIGHT - bar.height"
        :width="bar.width"
        :height="bar.height"
        rx="3"
        fill="var(--color-left)"
      />
      <line x1="0" :y1="HEIGHT" :x2="WIDTH" :y2="HEIGHT" stroke="var(--color-border)" />
      <line
        v-for="(marker, index) in markers"
        :key="marker.label"
        :x1="marker.x + (index - 1) * 2"
        :x2="marker.x + (index - 1) * 2"
        y1="0"
        :y2="HEIGHT"
        :stroke="marker.color"
        stroke-width="2.5"
        :stroke-dasharray="marker.dash"
      />
      <text :x="0" :y="HEIGHT + 16" font-size="11" fill="var(--color-text-muted)">{{ formatPoints(low) }}</text>
      <text :x="WIDTH" :y="HEIGHT + 16" font-size="11" fill="var(--color-text-muted)" text-anchor="end">{{ formatPoints(high) }}</text>
    </svg>
    <ul class="legend">
      <li v-for="marker in markers" :key="marker.label">
        <svg width="22" height="10" aria-hidden="true">
          <line x1="0" y1="5" x2="22" y2="5" :stroke="marker.color" stroke-width="2.5" :stroke-dasharray="marker.dash" />
        </svg>
        {{ marker.label }} <strong>{{ formatPoints(marker.points) }}</strong>
      </li>
    </ul>
    <figcaption class="muted">
      Each bar counts the possible deals whose points, added up for every side, fall in that range.
    </figcaption>
  </figure>
</template>

<style scoped>
.total-value {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
}
.chart {
  width: 100%;
  height: auto;
  font-family: var(--font-sans);
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-5);
  padding: 0;
  list-style: none;
  font-size: var(--text-sm);
}
.legend li {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
</style>
