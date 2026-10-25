<script setup lang="ts">
import { ref } from "vue";
import { api, type DraftIssue, type DraftOption } from "../api/client.ts";
import HowTo from "../reusable/ui/HowTo.vue";
import Icon from "../reusable/ui/Icon.vue";
import { nextName, type Save } from "./draft.ts";
import { addStarterOptions, type IssueKind, kinds } from "./issues.ts";

/**
 * One issue of a scenario: its name, whether it is a list of options or a range of values, its unit on a range, and its
 * options. On a range, each option is a point: its value, which is its universal value, counted in the unit, and how it is
 * shown to negotiators, which is its name. Each change is saved when the author leaves the box they changed.
 */
const props = defineProps<{ issue: DraftIssue; save: Save; readonly: boolean; removable: boolean }>();
const emit = defineEmits<{ remove: [] }>();
const problem = ref<string | null>(null);
const working = ref(false);

const continuous = () => props.issue.kind === "CONTINUOUS";
const field = (event: Event) => event.target as HTMLInputElement;

async function update({ name = props.issue.name, kind = props.issue.kind, unit = props.issue.unit ?? "" }: { name?: string; kind?: IssueKind; unit?: string }) {
  const call = api.scenarios.issues.update({ issue: props.issue.issue, name: name.trim(), kind, unit: kind === "CONTINUOUS" ? unit.trim() : "" });
  problem.value = await props.save("/scenarios/issues/update", call);
  return problem.value === null;
}

async function rename(event: Event) {
  const name = field(event).value;
  if (name.trim() === props.issue.name) return;
  if (!(await update({ name }))) field(event).value = props.issue.name;
}

async function changeUnit(event: Event) {
  if (field(event).value.trim() === (props.issue.unit ?? "")) return;
  await update({ unit: field(event).value });
}

/** Turns a list into a range or back. The options of one can't belong to the other, so they go, and two starters take their place. */
async function changeKind(kind: IssueKind) {
  if (kind === props.issue.kind || working.value) return;
  const count = props.issue.options.length;
  const becomes = kind === "CONTINUOUS" ? "a range" : "a list";
  if (count > 0 && !window.confirm(`Making ${props.issue.name} ${becomes} removes its ${count} option${count === 1 ? "" : "s"} and every role's points for them.`)) return;
  working.value = true;
  if (await update({ kind })) problem.value = await props.save("/scenarios/options/add", addStarterOptions(props.issue.issue, kind));
  working.value = false;
}

async function renameOption(option: DraftOption, event: Event) {
  const name = field(event).value.trim();
  if (name === option.name) return;
  const call = api.scenarios.options.update({ option: option.option, name, universalValue: option.universalValue ?? 0 });
  problem.value = await props.save("/scenarios/options/update", call);
  if (problem.value !== null) field(event).value = option.name;
}

/** Moves an option of a range to another value. An option still named for its old value is named for its new one too. */
async function moveOption(option: DraftOption, event: Event) {
  const value = field(event).valueAsNumber;
  if (Number.isNaN(value)) {
    field(event).value = String(option.universalValue ?? 0);
    return;
  }
  if (value === option.universalValue) return;
  const name = option.name === String(option.universalValue) ? String(value) : option.name;
  problem.value = await props.save("/scenarios/options/update", api.scenarios.options.update({ option: option.option, name, universalValue: value }));
  if (problem.value !== null) field(event).value = String(option.universalValue ?? 0);
}

/** Adds an option: the next "Option" on a list, or, on a range, one past the highest, as far past it as the last two are apart. */
async function addOption() {
  const { options } = props.issue;
  let name = nextName("Option", options.map(({ name }) => name));
  let value = 0;
  if (continuous()) {
    // Options of a range arrive lowest first.
    const values = options.map(({ universalValue }) => universalValue ?? 0);
    const highest = values.at(-1);
    const gap = values.length >= 2 ? values.at(-1)! - values.at(-2)! : 10;
    value = highest === undefined ? 0 : highest + (gap || 10);
    name = String(value);
  }
  problem.value = await props.save("/scenarios/options/add", api.scenarios.options.add({ issue: props.issue.issue, name, universalValue: value }));
}

async function removeOption(option: DraftOption) {
  problem.value = await props.save("/scenarios/options/remove", api.scenarios.options.remove({ option: option.option }));
}
</script>

<template>
  <article class="issue">
    <header>
      <input class="title display" :value="issue.name" aria-label="Issue name" maxlength="100" :disabled="readonly" @change="rename" />
      <button
        v-if="!readonly && removable"
        type="button"
        class="icon-button"
        :aria-label="`Remove ${issue.name}`"
        @click="emit('remove')"
      >
        <Icon name="close" />
      </button>
    </header>

    <div class="kinds" role="radiogroup" :aria-label="`What kind of issue ${issue.name} is`">
      <button
        v-for="kind in ['DISCRETE', 'CONTINUOUS'] as const"
        :key="kind"
        type="button"
        role="radio"
        :aria-checked="issue.kind === kind"
        :disabled="readonly || working"
        @click="changeKind(kind)"
      >
        {{ kinds[kind].label }}
      </button>
    </div>
    <p class="muted">{{ kinds[issue.kind].hint }}</p>

    <template v-if="issue.kind === 'CONTINUOUS'">
      <HowTo question="How does a range work?">
        <p>
          A deal can land anywhere along a range, such as any salary from $80,000 to $120,000. Each row below is a point on
          it, with two parts:
        </p>
        <ul>
          <li><strong>Value</strong> is where the point sits, counted in the unit. It's the number a deal agrees on.</li>
          <li>
            <strong>Shown as</strong> is what negotiators read for that point, such as "$80K" for 80000, or "March 1" for 59
            days after January 1. It can just be the number.
          </li>
        </ul>
        <p>
          The lowest and highest values are the ends of the range: a deal can land on any value between them, but not past
          them. On each role's tab, you give each point its points, and a value between two points earns points between
          theirs, along a straight line.
        </p>
        <p>
          Add a point in the middle when what the issue is worth bends there, such as a start date that's fine until March
          and costly after.
        </p>
      </HowTo>
      <label class="field unit">
        Unit
        <input :value="issue.unit ?? ''" placeholder="dollars" maxlength="100" :disabled="readonly" @change="changeUnit" />
        <span class="hint">
          What the values count, such as dollars, percent, or days after January 1. "dollars" shows values as money, such as
          $95,000. Leave it blank for plain numbers.
        </span>
      </label>
    </template>

    <div v-if="issue.kind === 'CONTINUOUS' && issue.options.length > 0" class="columns" aria-hidden="true">
      <span>Value{{ issue.unit ? ` (${issue.unit})` : "" }}</span>
      <span>Shown as</span>
    </div>
    <ol class="options" :class="{ range: issue.kind === 'CONTINUOUS' }">
      <li v-for="option in issue.options" :key="option.option">
        <input
          v-if="issue.kind === 'CONTINUOUS'"
          class="value"
          type="number"
          :value="option.universalValue ?? 0"
          :aria-label="`Value of ${option.name}${issue.unit ? `, in ${issue.unit}` : ''}`"
          :disabled="readonly"
          @change="moveOption(option, $event)"
        />
        <input
          class="name"
          :value="option.name"
          :aria-label="issue.kind === 'CONTINUOUS' ? `How the value ${option.universalValue ?? 0} is shown` : 'Option name'"
          maxlength="100"
          :disabled="readonly"
          @change="renameOption(option, $event)"
        />
        <button
          v-if="!readonly"
          type="button"
          class="icon-button"
          :aria-label="`Remove ${option.name}`"
          @click="removeOption(option)"
        >
          <Icon name="close" :size="16" />
        </button>
      </li>
    </ol>
    <p v-if="issue.options.length < 2" class="muted">
      {{ issue.kind === "CONTINUOUS" ? "A range needs at least two points, its ends," : "An issue needs at least two options" }}
      before the scenario can be published.
    </p>
    <button v-if="!readonly" type="button" class="text-button add" @click="addOption">
      {{ issue.kind === "CONTINUOUS" ? "+ Add a point" : "+ Add an option" }}
    </button>
    <p v-if="problem" class="refusal" role="alert">{{ problem }}</p>
  </article>
</template>

<style scoped>
.issue {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-page);
}
header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.title {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  margin-left: -8px;
  border: 1.5px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: var(--text-lg);
  font-weight: 700;
  color: inherit;
}
.title:hover:not(:disabled),
.title:focus {
  border-color: var(--color-border);
  background: var(--color-surface);
  outline: none;
}
.title:focus {
  border-color: var(--color-accent);
}
.kinds {
  display: inline-flex;
  align-self: flex-start;
  padding: 3px;
  border-radius: var(--radius-full);
  background: var(--color-line);
}
.kinds button {
  padding: 6px 14px;
  border: 0;
  border-radius: var(--radius-full);
  background: none;
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.kinds button[aria-checked="true"] {
  background: var(--color-surface);
  color: var(--color-accent);
  box-shadow: var(--shadow-card);
}
.unit input {
  max-width: 260px;
}
.options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0;
  list-style: none;
}
.options li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.options input {
  padding: 8px 10px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font: inherit;
  color: inherit;
}
.options input:focus {
  outline: none;
  border-color: var(--color-accent);
}
.options .name {
  flex: 1;
  min-width: 0;
}
/* On a range, the values and how they're shown line up in two columns under their headings. */
.columns,
.range li {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr) 36px;
  gap: var(--space-2);
  align-items: center;
}
.columns {
  margin-bottom: calc(-1 * var(--space-2));
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}
.columns span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.range .value {
  width: 100%;
  min-width: 0;
}
.add {
  align-self: flex-start;
}
</style>
