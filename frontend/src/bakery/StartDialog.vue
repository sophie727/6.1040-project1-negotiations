<script setup lang="ts">
import { ref } from "vue";
import type { Scenario } from "../api/client.ts";
import Dialog from "../reusable/ui/Dialog.vue";
import { pastryFor } from "./pastries.ts";
import { startPractice, startWithFriends } from "./start.ts";

/**
 * Asks which side of `scenario` to play, then opens the table: with the AI counterpart in the other seat, or with the
 * other seats waiting for friends. How long to negotiate is chosen on the prep page.
 */
const props = defineProps<{ scenario: Scenario; opponents: "ai" | "friends" }>();
const emit = defineEmits<{ close: [] }>();

const role = ref(props.scenario.roles[0]?.role);
const working = ref(false);
const error = ref<string | null>(null);

async function start() {
  if (role.value === undefined) return;
  working.value = true;
  error.value =
    props.opponents === "ai" ? await startPractice(props.scenario, role.value) : await startWithFriends(props.scenario, role.value);
  working.value = false;
}
</script>

<template>
  <Dialog
    :title="`${pastryFor(scenario.name)} ${scenario.name}`"
    :subtitle="opponents === 'ai' ? 'An AI counterpart plays the other side.' : 'Friends you invite with a link play the other side.'"
    @close="emit('close')"
  >
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
      <p v-if="error" class="refusal" role="alert">{{ error }}</p>
      <button type="submit" class="button primary large" :disabled="working || role === undefined">
        {{ opponents === "ai" ? "Read your brief" : "Open the table and get a link" }}
      </button>
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
