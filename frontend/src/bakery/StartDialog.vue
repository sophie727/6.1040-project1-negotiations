<script setup lang="ts">
import { ref } from "vue";
import type { Scenario } from "../api/client.ts";
import Dialog from "../reusable/ui/Dialog.vue";
import { pastryFor } from "./pastries.ts";
import { DEFAULT_TIME_LIMIT, startPractice } from "./start.ts";

/** Asks which side of `scenario` to play and for how long, then opens the table. */
const props = defineProps<{ scenario: Scenario }>();
const emit = defineEmits<{ close: [] }>();

const role = ref(props.scenario.roles[0]?.role);
const timeLimit = ref(props.scenario.timeLimit ?? DEFAULT_TIME_LIMIT);
const working = ref(false);
const error = ref<string | null>(null);

async function start() {
  if (role.value === undefined) return;
  working.value = true;
  error.value = await startPractice(props.scenario, role.value, Number(timeLimit.value));
  working.value = false;
}
</script>

<template>
  <Dialog :title="`${pastryFor(scenario.name)} ${scenario.name}`" subtitle="An AI counterpart plays the other side." @close="emit('close')">
    <form class="start" @submit.prevent="start">
      <fieldset>
        <legend>Which side do you want to play?</legend>
        <div class="roles">
          <label v-for="option in scenario.roles" :key="option.role" class="role" :class="{ chosen: role === option.role }">
            <input v-model="role" type="radio" name="role" :value="option.role" />
            {{ option.name }}
          </label>
        </div>
      </fieldset>
      <label class="field">
        Time limit, in minutes
        <input v-model.number="timeLimit" type="number" min="1" max="180" step="1" required />
        <span v-if="scenario.timeLimit !== null" class="hint">The author recommends {{ scenario.timeLimit }} minutes.</span>
      </label>
      <p v-if="error" class="refusal" role="alert">{{ error }}</p>
      <button type="submit" class="button primary large" :disabled="working || role === undefined">Read your brief</button>
    </form>
  </Dialog>
</template>

<style scoped>
.start {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
fieldset {
  padding: 0;
  border: 0;
}
legend {
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
}
.roles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-2);
}
.role {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 12px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}
.role.chosen {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}
.role input {
  accent-color: var(--color-accent);
}
</style>
