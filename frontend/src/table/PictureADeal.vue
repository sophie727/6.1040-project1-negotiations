<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from "vue";
import { api, type Table } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import { dateAfter, dayZero, daysBetween, fromIsoDate, isoDate } from "./dates.ts";
import { formatAgreed, formatPoints } from "./format.ts";
import { dealPoints, rangeOf } from "./points.ts";

/**
 * Picture a deal: a term sheet the person can try out while they negotiate, showing what it's worth to them beside their
 * BATNA, and proposing it when they're ready. It stays on the page, so the terms they try are still there whenever they
 * come back to it, and nobody else sees them until they propose. It starts from the latest proposal, when there is one.
 */
const props = defineProps<{ table: Table }>();
const emit = defineEmits<{ changed: [] }>();
const titleId = useId();

const ranges = computed(() =>
  Object.fromEntries(props.table.issues.filter(({ kind }) => kind === "CONTINUOUS").map((issue) => [issue.issue, rangeOf(issue)])),
);
const latest = computed(() => props.table.proposals.at(-1));
const others = computed(() =>
  props.table.seats
    .filter(({ role }) => role !== props.table.role)
    .map(({ name }) => name)
    .join(" and "),
);

/** The term sheet being pictured. A continuous issue starts halfway through its range, and a discrete one on its first option. */
const terms = reactive<Record<string, string | number>>(
  Object.fromEntries(
    props.table.issues.map((issue) => {
      const earlier = latest.value?.terms[issue.issue];
      if (earlier !== undefined) return [issue.issue, earlier];
      const range = ranges.value[issue.issue];
      if (range === undefined) return [issue.issue, issue.options[0]?.option ?? ""];
      return [issue.issue, Math.round((range.min + range.max) / 2 / range.step) * range.step];
    }),
  ),
);

/** Pictures the latest proposal's terms instead, such as to start a counteroffer from the other side's offer. */
function startFromLatest() {
  for (const issue of props.table.issues) {
    const agreed = latest.value?.terms[issue.issue];
    if (agreed !== undefined) terms[issue.issue] = agreed;
  }
}

const worth = computed(() => dealPoints(props.table.issues, terms, props.table.payoffs));
/** How many points the deal is above (positive) or below (negative) the person's BATNA, rounded as the points are shown. */
const margin = computed(() => (worth.value === null ? null : Math.round(worth.value) - Math.round(props.table.batna)));

const working = ref(false);
const error = ref<string | null>(null);
/** Whether the pictured terms were just proposed, until the person changes them. */
const proposed = ref(false);
watch(terms, () => {
  proposed.value = false;
  error.value = null;
});

async function propose() {
  if (working.value) return;
  working.value = true;
  const result = await api.tables.propose({ table: props.table.table, terms: { ...terms } });
  working.value = false;
  if ("error" in result) {
    if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
    error.value = messageFor("/tables/propose", result.error);
    return;
  }
  error.value = null;
  proposed.value = true;
  emit("changed");
}

/**
 * Sets a range's value to what the person typed, once they press Enter or leave the box: a number, or a date for a
 * range of dates, kept within the range. Something that isn't a number or a date leaves the value as it was.
 */
function setTyped(issueId: string, event: Event) {
  const box = event.target as HTMLInputElement;
  const range = ranges.value[issueId];
  const issue = props.table.issues.find(({ issue }) => issue === issueId);
  if (range === undefined || issue === undefined) return;
  const zero = dayZero(issue.unit);
  const date = zero === null ? null : fromIsoDate(box.value);
  const typed = zero === null ? Number(box.value) : date === null ? Number.NaN : daysBetween(zero, date);
  if (box.value.trim() !== "" && Number.isFinite(typed)) terms[issueId] = Math.min(range.max, Math.max(range.min, typed));
  // The box shows the value as it was kept, such as the range's end for a number beyond it.
  box.value = typedValue(issueId);
}

/** A range's value as its box shows it: the number, or the date a date picker holds, such as "2027-02-07". */
function typedValue(issueId: string): string {
  const issue = props.table.issues.find(({ issue }) => issue === issueId);
  const zero = dayZero(issue?.unit ?? null);
  const value = Number(terms[issueId]);
  return zero === null ? String(value) : isoDate(dateAfter(zero, value));
}

/** The first and last dates a range of dates allows, as a date picker takes them, or nulls for a range of numbers. */
function dateBounds(issueId: string): { min: string; max: string } | null {
  const issue = props.table.issues.find(({ issue }) => issue === issueId);
  const zero = dayZero(issue?.unit ?? null);
  const range = ranges.value[issueId];
  if (zero === null || range === undefined) return null;
  return { min: isoDate(dateAfter(zero, range.min)), max: isoDate(dateAfter(zero, range.max)) };
}

/** The option names at either end of a continuous issue, such as "$80K" and "$120K". */
function ends(issueId: string): [string, string] {
  const issue = props.table.issues.find(({ issue }) => issue === issueId);
  const named = [...(issue?.options ?? [])].sort((a, b) => (a.universalValue ?? 0) - (b.universalValue ?? 0));
  return [named[0]?.name ?? "", named[named.length - 1]?.name ?? ""];
}
</script>

<template>
  <form class="panel deal" :aria-labelledby="titleId" @submit.prevent="propose">
    <header>
      <h2 :id="titleId">Picture a deal</h2>
      <button v-if="latest" type="button" class="text-button" @click="startFromLatest">Start from the latest proposal</button>
    </header>
    <p class="muted">
      Try out terms to see how they compare to your BATNA of {{ formatPoints(table.batna) }} points. {{ others }}
      won't see them until you propose.
    </p>
    <div class="issues">
      <fieldset v-for="issue in table.issues" :key="issue.issue">
        <legend>{{ issue.name }}</legend>
        <div v-if="issue.kind === 'DISCRETE'" class="choices">
          <label v-for="option in issue.options" :key="option.option" :class="{ chosen: terms[issue.issue] === option.option }">
            <input v-model="terms[issue.issue]" type="radio" :name="issue.issue" :value="option.option" />
            {{ option.name }}
          </label>
        </div>
        <div v-else-if="ranges[issue.issue]" class="range">
          <input
            v-if="dateBounds(issue.issue)"
            class="typed date"
            type="date"
            :min="dateBounds(issue.issue)!.min"
            :max="dateBounds(issue.issue)!.max"
            :value="typedValue(issue.issue)"
            :aria-label="`${issue.name}, as a date`"
            @change="setTyped(issue.issue, $event)"
          />
          <input
            v-else
            class="typed"
            type="number"
            inputmode="decimal"
            step="any"
            :min="ranges[issue.issue]!.min"
            :max="ranges[issue.issue]!.max"
            :value="typedValue(issue.issue)"
            :aria-label="`${issue.name}, as a number${issue.unit ? ` in ${issue.unit}` : ''}`"
            @change="setTyped(issue.issue, $event)"
            @keydown.enter.prevent="setTyped(issue.issue, $event)"
          />
          <input
            v-model.number="terms[issue.issue]"
            type="range"
            :min="ranges[issue.issue]!.min"
            :max="ranges[issue.issue]!.max"
            :step="ranges[issue.issue]!.step"
            :aria-label="issue.name"
            :aria-valuetext="formatAgreed(issue, terms[issue.issue])"
          />
          <div class="ends muted">
            <span>{{ ends(issue.issue)[0] }}</span>
            <strong class="value">{{ formatAgreed(issue, terms[issue.issue]) }}</strong>
            <span>{{ ends(issue.issue)[1] }}</span>
          </div>
        </div>
      </fieldset>
    </div>
    <footer class="summary">
      <p class="worth" aria-live="polite">
        <span>Worth <strong>{{ worth === null ? "—" : formatPoints(worth) }} points</strong> to you</span>
        <span v-if="margin !== null && margin > 0" class="badge good">{{ formatPoints(margin) }} above your BATNA</span>
        <span v-else-if="margin !== null && margin < 0" class="badge bad">{{ formatPoints(-margin) }} below your BATNA</span>
        <span v-else-if="margin === 0" class="badge">Equal to your BATNA</span>
      </p>
      <p v-if="error" class="refusal" role="alert">{{ error }}</p>
      <p v-else-if="proposed" class="muted" role="status">Proposed! You'll see it in the chat.</p>
      <button type="submit" class="button primary large" :disabled="working">Propose this deal</button>
    </footer>
  </form>
</template>

<style scoped>
header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-1) var(--space-3);
}
h2 {
  font-size: var(--text-lg);
}
.text-button {
  font-size: var(--text-sm);
}
/*
 * The issues scroll when the panel is too short to show them all, with a shadow at whichever edge has more to see. The
 * padding gives the controls' focus rings room inside the scrolling area.
 */
.issues {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 0;
  margin: -2px;
  padding: 2px var(--space-2) 2px 2px;
  overflow-y: auto;
  background:
    linear-gradient(var(--color-surface) 30%, transparent) top / 100% 24px no-repeat local,
    linear-gradient(transparent, var(--color-surface) 70%) bottom / 100% 24px no-repeat local,
    radial-gradient(farthest-side at 50% 0, rgba(45, 31, 24, 0.14), transparent) top / 100% 10px no-repeat scroll,
    radial-gradient(farthest-side at 50% 100%, rgba(45, 31, 24, 0.14), transparent) bottom / 100% 10px no-repeat scroll;
}
fieldset {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  padding: 0;
  border: 0;
}
/*
 * The issue's name. Floated, a legend is laid out like the fieldset's other content, at its top, so a range's typed box
 * can line up beside it; the fieldset's gap spaces it from the controls below.
 */
legend {
  float: left;
  padding: 0;
  font-size: var(--text-sm);
  font-weight: 700;
}
/* Beside a typed box, the name's line is as tall as the box, and a long name stops short of it. */
fieldset:has(.typed) legend {
  padding-right: 156px;
  line-height: 32px;
}
.choices {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.choices label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  cursor: pointer;
}
.choices label.chosen {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}
.choices input,
.range input {
  accent-color: var(--color-accent);
}
.range input[type="range"] {
  width: 100%;
}
/* A box to type a range's value into instead of sliding to it, at the right of the issue's name. */
fieldset {
  position: relative;
}
.typed {
  position: absolute;
  top: 0;
  right: 0;
  width: 148px;
  height: 32px;
  padding: 4px 8px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: var(--text-sm);
}
.typed:focus {
  outline: none;
  border-color: var(--color-accent);
}
.ends {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
}
.value {
  color: var(--color-text);
  font-size: var(--text-sm);
}
/*
 * What the deal is worth and the button to propose it, below the issues. Where the page scrolls instead, as on a phone,
 * it stays in view at the bottom of the screen while the panel does.
 */
.summary {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: var(--space-1) calc(-1 * var(--space-5)) calc(-1 * var(--space-5));
  padding: var(--space-3) var(--space-5) var(--space-5);
  border-top: 1px solid var(--color-line);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  background: var(--color-surface);
}
.worth {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1) var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-gold-soft);
}
</style>
