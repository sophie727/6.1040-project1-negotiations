<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { api, type Table } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import Dialog from "../reusable/ui/Dialog.vue";
import { formatAgreed, formatPoints } from "./format.ts";
import { dealPoints, rangeOf, type TermSheet } from "./points.ts";

/**
 * The form for a proposal: an option for each discrete issue, and a value for each continuous one, starting from
 * `from`, the latest proposal, when there is one. It shows what the deal is worth to the person as they change it.
 */
const props = defineProps<{ table: Table; from?: TermSheet }>();
const emit = defineEmits<{ close: []; changed: [] }>();

const ranges = computed(() =>
  Object.fromEntries(props.table.issues.filter(({ kind }) => kind === "CONTINUOUS").map((issue) => [issue.issue, rangeOf(issue)])),
);

/** The term sheet being written. A continuous issue starts halfway through its range, and a discrete one on its first option. */
const terms = reactive<Record<string, string | number>>(
  Object.fromEntries(
    props.table.issues.map((issue) => {
      const earlier = props.from?.[issue.issue];
      if (earlier !== undefined) return [issue.issue, earlier];
      const range = ranges.value[issue.issue];
      if (range === undefined) return [issue.issue, issue.options[0]?.option ?? ""];
      return [issue.issue, Math.round((range.min + range.max) / 2 / range.step) * range.step];
    }),
  ),
);

const worth = computed(() => dealPoints(props.table.issues, terms, props.table.payoffs));
const working = ref(false);
const error = ref<string | null>(null);

async function propose() {
  working.value = true;
  const result = await api.tables.propose({ table: props.table.table, terms: { ...terms } });
  working.value = false;
  if ("error" in result) {
    if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
    error.value = messageFor("/tables/propose", result.error);
    return;
  }
  emit("changed");
  emit("close");
}

/** The option names at either end of a continuous issue, such as "$80K" and "$120K". */
function ends(issueId: string): [string, string] {
  const issue = props.table.issues.find(({ issue }) => issue === issueId);
  const named = [...(issue?.options ?? [])].sort((a, b) => (a.universalValue ?? 0) - (b.universalValue ?? 0));
  return [named[0]?.name ?? "", named[named.length - 1]?.name ?? ""];
}
</script>

<template>
  <Dialog title="Propose a deal" subtitle="Agree on every issue. The other side can accept or reject it." @close="emit('close')">
    <form class="proposal-form" @submit.prevent="propose">
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
            v-model.number="terms[issue.issue]"
            type="range"
            :min="ranges[issue.issue]!.min"
            :max="ranges[issue.issue]!.max"
            :step="ranges[issue.issue]!.step"
            :aria-label="issue.name"
          />
          <div class="ends muted">
            <span>{{ ends(issue.issue)[0] }}</span>
            <strong class="value">{{ formatAgreed(issue, terms[issue.issue]) }}</strong>
            <span>{{ ends(issue.issue)[1] }}</span>
          </div>
        </div>
      </fieldset>
      <p class="worth">
        This deal is worth <strong>{{ worth === null ? "—" : formatPoints(worth) }} points</strong> to you.
        <span class="muted">Your BATNA is {{ formatPoints(table.batna) }}.</span>
      </p>
      <p v-if="error" class="refusal" role="alert">{{ error }}</p>
      <button type="submit" class="button primary large" :disabled="working">Propose this deal</button>
    </form>
  </Dialog>
</template>

<style scoped>
.proposal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
fieldset {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0;
  border: 0;
}
legend {
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 700;
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
.range input {
  width: 100%;
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
.worth {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-gold-soft);
}
</style>
