<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, type PostedScenario } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import InfoTip from "../reusable/ui/InfoTip.vue";
import { ADMIN } from "./admin.ts";
import { pastryFor } from "./pastries.ts";

/**
 * Every posted scenario, for the admin, with a button to archive it or put it back. For anyone else, `/admin/scenarios`
 * is refused, and the panel shows nothing.
 */
const emit = defineEmits<{ changed: [] }>();

/** The posted scenarios, or null for anyone but the admin. */
const posted = ref<PostedScenario[] | null>(null);
const problem = ref<string | null>(null);
const working = ref<string | null>(null);

async function load() {
  const result = await api.admin.scenarios();
  posted.value = "error" in result ? null : result.scenarios;
}
onMounted(load);

/** What the badge says: in the bakery, or archived, and by whom. */
function stateOf(scenario: PostedScenario): string {
  if (!scenario.archived) return "In the bakery";
  return scenario.archivedBy === ADMIN ? "Archived by admin" : "Archived by author";
}

async function archive(scenario: PostedScenario) {
  const question = `Archive ${scenario.name} by ${scenario.author}? It leaves the bakery, and only you can put it back.`;
  if (scenario.author !== ADMIN && !window.confirm(question)) return;
  await change(scenario, "/scenarios/archive", () => api.scenarios.archive({ scenario: scenario.scenario }));
}

async function unarchive(scenario: PostedScenario) {
  await change(scenario, "/scenarios/unarchive", () => api.scenarios.unarchive({ scenario: scenario.scenario }));
}

async function change(scenario: PostedScenario, path: string, call: () => Promise<object>) {
  working.value = scenario.scenario;
  problem.value = null;
  const result = await call();
  if ("error" in result && typeof result.error === "string") problem.value = messageFor(path, result.error);
  await load();
  working.value = null;
  emit("changed");
}
</script>

<template>
  <section v-if="posted" class="panel admin">
    <h2>
      Every posted scenario
      <InfoTip label="What the admin can do">
        As the admin, you can archive anyone's scenario. It leaves the bakery, and its author can't put it back, though
        it stays in their scenarios, marked "Archived by admin". Negotiations already started over it carry on.
      </InfoTip>
    </h2>
    <p class="muted hint">Only you see this list, because you're signed in as the admin.</p>
    <p v-if="problem" class="refusal" role="alert">{{ problem }}</p>
    <ul class="posted">
      <li v-for="scenario in posted" :key="scenario.scenario" :class="{ archived: scenario.archived }">
        <span class="name">
          <span aria-hidden="true">{{ pastryFor(scenario.name) }}</span>
          <strong>{{ scenario.name }}</strong>
          <span class="muted">by {{ scenario.author }}</span>
        </span>
        <span class="controls">
          <span class="badge" :class="{ good: !scenario.archived }">{{ stateOf(scenario) }}</span>
          <button
            v-if="scenario.archived"
            type="button"
            class="button outline"
            :disabled="working === scenario.scenario"
            @click="unarchive(scenario)"
          >
            Put back
          </button>
          <button v-else type="button" class="button outline" :disabled="working === scenario.scenario" @click="archive(scenario)">
            Archive
          </button>
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.hint {
  font-size: var(--text-sm);
}
.posted {
  display: flex;
  flex-direction: column;
  max-height: 420px;
  padding: 0 var(--space-2) 0 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(80, 124, 104, 0.5) transparent;
}
.posted li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-line);
}
.posted li:first-child {
  border-top: 0;
}
.posted li.archived .name {
  color: var(--color-text-muted);
}
.name {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
}
.controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
</style>
