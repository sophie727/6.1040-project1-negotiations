<script setup lang="ts">
import { computed, ref } from "vue";
import { api, type Draft, type DraftIssue, type DraftRole } from "../api/client.ts";
import { DEFAULT_TIME_LIMIT } from "../bakery/start.ts";
import Icon from "../reusable/ui/Icon.vue";
import { nextName, type Save } from "./draft.ts";
import IssueCard from "./IssueCard.vue";
import { addIssue } from "./issues.ts";
import Stepper from "./Stepper.vue";

/**
 * The first tab of a scenario's editor: what everyone at the table shares. Its name and how long to negotiate it, its
 * roles, which each get a tab of their own for their brief and points, and its issues with their options.
 */
const props = defineProps<{ draft: Draft; save: Save; readonly: boolean }>();
const emit = defineEmits<{ openRole: [role: DraftRole["role"]] }>();

const problem = ref<string | null>(null);
/** Whether a role or an issue is being added or removed, so a second click waits for the first. */
const working = ref(false);
const field = (event: Event) => event.target as HTMLInputElement;
const scenario = computed(() => props.draft.scenario);

async function rename(event: Event) {
  const name = field(event).value.trim();
  if (name === props.draft.name) return;
  problem.value = await props.save("/scenarios/rename", api.scenarios.rename({ scenario: scenario.value, name }));
  if (problem.value !== null) field(event).value = props.draft.name;
}

async function setLength(event: Event) {
  const minutes = field(event).valueAsNumber;
  if (Number.isNaN(minutes) || minutes === props.draft.timeLimit) return;
  problem.value = await props.save("/scenarios/limit", api.scenarios.limit({ scenario: scenario.value, minutes }));
}

// Roles

/** Whether the author has written anything for `role` yet, which removing it would lose. */
const writtenFor = (role: DraftRole) => role.brief !== null || role.payoffs.some(({ points }) => points !== 0);

async function setRoleCount(count: number) {
  if (working.value) return;
  working.value = true;
  const { roles } = props.draft;
  if (count > roles.length) {
    const name = nextName("Role", roles.map(({ name }) => name));
    problem.value = await props.save("/scenarios/roles/add", api.scenarios.roles.add({ scenario: scenario.value, name, batna: 0 }));
  } else if (count < roles.length) {
    const last = roles.at(-1);
    if (last !== undefined) await removeRole(last);
  }
  working.value = false;
}

async function removeRole(role: DraftRole) {
  if (writtenFor(role) && !window.confirm(`Remove ${role.name}, with their brief and points?`)) return;
  problem.value = await props.save("/scenarios/roles/remove", api.scenarios.roles.remove({ role: role.role }));
}

async function renameRole(role: DraftRole, event: Event) {
  const name = field(event).value.trim();
  if (name === role.name) return;
  const call = api.scenarios.roles.update({ role: role.role, name, batna: role.batna });
  problem.value = await props.save("/scenarios/roles/update", call);
  if (problem.value !== null) field(event).value = role.name;
}

// Issues

/** Whether any role has points for `issue` yet, which removing it would lose. */
const scored = (issue: DraftIssue) =>
  props.draft.roles.some(({ payoffs }) => payoffs.some(({ option, points }) => points !== 0 && issue.options.some((each) => each.option === option)));

async function setIssueCount(count: number) {
  if (working.value) return;
  working.value = true;
  const { issues } = props.draft;
  if (count > issues.length) {
    problem.value = await props.save("/scenarios/issues/add", addIssue(scenario.value, nextName("Issue", issues.map(({ name }) => name))));
  } else if (count < issues.length) {
    const last = issues.at(-1);
    if (last !== undefined) await removeIssue(last);
  }
  working.value = false;
}

async function removeIssue(issue: DraftIssue) {
  if (scored(issue) && !window.confirm(`Remove ${issue.name}, with its options and every role's points for them?`)) return;
  problem.value = await props.save("/scenarios/issues/remove", api.scenarios.issues.remove({ issue: issue.issue }));
}
</script>

<template>
  <div class="general">
    <section class="panel">
      <h2>The scenario</h2>
      <div class="row">
        <label class="field grow">
          Name
          <input :value="draft.name" maxlength="100" :disabled="readonly" @change="rename" />
        </label>
        <label class="field length">
          Suggested length
          <span class="with-unit">
            <input
              type="number"
              min="1"
              max="180"
              step="1"
              :value="draft.timeLimit ?? ''"
              :placeholder="String(DEFAULT_TIME_LIMIT)"
              :disabled="readonly"
              @change="setLength"
            />
            <span class="muted">minutes</span>
          </span>
        </label>
      </div>
      <p v-if="problem" class="refusal" role="alert">{{ problem }}</p>
    </section>

    <section class="panel">
      <h2>Roles</h2>
      <p class="muted">The sides at the table. Each has a tab of its own, where you write their brief and what each option is worth to them.</p>
      <Stepper
        :model-value="draft.roles.length"
        label="How many roles"
        :min="2"
        :max="6"
        :disabled="readonly || working"
        @update:model-value="setRoleCount"
      />
      <ol class="roles">
        <li v-for="role in draft.roles" :key="role.role">
          <input :value="role.name" :aria-label="`Name of ${role.name}`" maxlength="100" :disabled="readonly" @change="renameRole(role, $event)" />
          <button type="button" class="button soft" @click="emit('openRole', role.role)">Brief and points →</button>
          <button
            v-if="!readonly && draft.roles.length > 2"
            type="button"
            class="icon-button"
            :aria-label="`Remove ${role.name}`"
            @click="removeRole(role)"
          >
            <Icon name="close" />
          </button>
        </li>
      </ol>
    </section>

    <section class="panel">
      <h2>Issues</h2>
      <p class="muted">What the roles negotiate over. An agreement settles every issue, on one of its options, or anywhere along a range.</p>
      <Stepper
        :model-value="draft.issues.length"
        label="How many issues"
        :min="1"
        :max="12"
        :disabled="readonly || working"
        @update:model-value="setIssueCount"
      />
      <div class="issues">
        <IssueCard
          v-for="issue in draft.issues"
          :key="issue.issue"
          :issue="issue"
          :save="save"
          :readonly="readonly"
          :removable="draft.issues.length > 1"
          @remove="removeIssue(issue)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.general {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}
.grow {
  flex: 1 1 280px;
}
.length input {
  width: 96px;
}
.with-unit {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.roles {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0;
  list-style: none;
}
.roles li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.roles input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font: inherit;
  font-weight: 600;
  color: inherit;
}
.roles input:focus {
  outline: none;
  border-color: var(--color-accent);
}
.issues {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
  gap: var(--space-4);
}
</style>
