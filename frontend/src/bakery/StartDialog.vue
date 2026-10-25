<script setup lang="ts">
import { computed, ref } from "vue";
import type { Scenario } from "../api/client.ts";
import Dialog from "../reusable/ui/Dialog.vue";
import { pastryFor } from "./pastries.ts";
import { spiceLevelOf } from "./spice.ts";
import SpiceLevel from "./SpiceLevel.vue";
import { DEFAULT_TIME_LIMIT, type Opponents, startPractice, startWithFriends } from "./start.ts";

/**
 * Starting a negotiation from the bakery. First the person picks who to negotiate with: an AI counterpart, friends they
 * invite with a link, or someone new. With the AI or friends, they then pick which side of `scenario` to play, and the
 * table opens. With someone new, the dialog hands over to matchmaking, which picks the sides at random. Without a
 * `scenario`, for "Surprise me!", the AI or friends get a random scenario and side at once, and someone new means joining
 * whoever is looking. How long to negotiate is chosen on the prep page.
 */
const props = defineProps<{ scenario: Scenario | null; scenarios: Scenario[] }>();
const emit = defineEmits<{ close: []; matchmake: [] }>();

/** Who plays the other sides, once the person has picked the AI or friends. */
const opponents = ref<"ai" | "friends" | null>(null);
const role = ref(props.scenario?.roles[0]?.role);
const working = ref(false);
const error = ref<string | null>(null);

const surprise = computed(() => props.scenario === null);
const choices = computed<{ value: Opponents; icon: string; label: string; hint: string }[]>(() => [
  {
    value: "ai",
    icon: "🤖",
    label: "An AI counterpart",
    hint: surprise.value ? "A random scenario and side, any time" : "Practice any time. Games against the AI aren't rated.",
  },
  {
    value: "friends",
    icon: "💌",
    label: "Friends",
    hint: surprise.value ? "A random scenario and side, with a link to send them" : "Get a link to send them",
  },
  {
    value: "strangers",
    icon: "🎲",
    label: "Someone new",
    hint: surprise.value ? "Join whoever's looking, for any scenario" : "Get matched with someone who's looking too",
  },
]);

/** Who plays the other sides: one or more AI counterparts, or friends, in as many seats as the scenario has left. */
const subtitle = computed(() => {
  const scenario = props.scenario;
  if (scenario === null) return "A random scenario";
  if (opponents.value === null) return `${scenario.roles.map(({ name }) => name).join(" or ")} · ${scenario.timeLimit ?? DEFAULT_TIME_LIMIT} minutes`;
  const group = scenario.roles.length > 2;
  if (opponents.value === "ai") return group ? "An AI counterpart plays each of the other sides." : "An AI counterpart plays the other side.";
  return group ? "Friends you invite with a link play the other sides." : "Friends you invite with a link play the other side.";
});

async function choose(choice: Opponents) {
  if (choice === "strangers") return emit("matchmake");
  if (props.scenario !== null) {
    opponents.value = choice;
    return;
  }
  // A surprise: a random scenario and side, at once.
  const scenario = props.scenarios[Math.floor(Math.random() * props.scenarios.length)];
  const side = scenario?.roles[Math.floor(Math.random() * scenario.roles.length)];
  if (scenario === undefined || side === undefined) return;
  working.value = true;
  error.value = choice === "ai" ? await startPractice(scenario, side.role) : await startWithFriends(scenario, side.role);
  working.value = false;
}

async function start() {
  if (props.scenario === null || role.value === undefined) return;
  working.value = true;
  error.value =
    opponents.value === "ai" ? await startPractice(props.scenario, role.value) : await startWithFriends(props.scenario, role.value);
  working.value = false;
}
</script>

<template>
  <Dialog
    :title="scenario ? `${pastryFor(scenario.name)} ${scenario.name}` : '✨ Surprise me!'"
    :subtitle="subtitle"
    @close="emit('close')"
  >
    <div v-if="opponents === null" class="start">
      <p v-if="scenario" class="spice-line">
        <SpiceLevel :spice="scenario.spice" />
        <span class="muted">{{ spiceLevelOf(scenario.spice).meaning }}</span>
      </p>
      <fieldset>
        <legend>Who do you want to negotiate with?</legend>
        <div class="opponents">
          <button
            v-for="choice in choices"
            :key="choice.value"
            type="button"
            class="opponent"
            :disabled="working || (surprise && scenarios.length === 0)"
            @click="choose(choice.value)"
          >
            <span class="icon" aria-hidden="true">{{ choice.icon }}</span>
            <span class="words">
              <strong>{{ choice.label }}</strong>
              <span class="muted">{{ choice.hint }}</span>
            </span>
            <span class="arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </fieldset>
      <p v-if="error" class="refusal" role="alert">{{ error }}</p>
    </div>

    <form v-else class="start" @submit.prevent="start">
      <button type="button" class="text-button back" @click="opponents = null">← Someone else</button>
      <fieldset>
        <legend>Which side do you want to play?</legend>
        <div class="roles">
          <label v-for="option in scenario?.roles ?? []" :key="option.role" class="role" :class="{ chosen: role === option.role }">
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
.spice-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.spice-line .muted {
  font-size: var(--text-sm);
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
.opponents {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.opponent {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  text-align: left;
}
.opponent:hover:not(:disabled),
.opponent:focus-visible {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}
.opponent .icon {
  font-size: 28px;
  line-height: 1;
}
.opponent .words {
  display: flex;
  flex: 1;
  flex-direction: column;
}
.opponent .arrow {
  color: var(--color-accent);
  font-weight: 700;
}
.back {
  align-self: flex-start;
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
