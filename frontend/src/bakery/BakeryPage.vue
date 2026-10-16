<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api, type Bakery, type Scenario } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import { go } from "../router.ts";
import { pastryFor, statusLabels } from "./pastries.ts";
import StartDialog from "./StartDialog.vue";
import { DEFAULT_TIME_LIMIT, startPractice } from "./start.ts";

const { sessionEnded } = useSession();
const bakery = ref<Bakery | null>(null);
const error = ref<string | null>(null);
/** The scenario whose start dialog is open. */
const choosing = ref<Scenario | null>(null);
const surprising = ref(false);

onMounted(async () => {
  const result = await api.bakery();
  if ("error" in result) {
    if (result.error === "UNAUTHORIZED") sessionEnded();
    error.value = messageFor("/bakery", result.error);
    return;
  }
  bakery.value = result;
});

const scenarios = computed(() => bakery.value?.scenarios ?? []);
const tables = computed(() => bakery.value?.tables ?? []);

/** "Surprise me!": a random scenario and side, with the recommended time limit. */
async function surprise() {
  const scenario = scenarios.value[Math.floor(Math.random() * scenarios.value.length)];
  const role = scenario?.roles[Math.floor(Math.random() * scenario.roles.length)];
  if (scenario === undefined || role === undefined) return;
  surprising.value = true;
  error.value = await startPractice(scenario, role.role, scenario.timeLimit ?? DEFAULT_TIME_LIMIT);
  surprising.value = false;
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <h1>The Bakery</h1>
      <p class="lead">Pick a scenario to practice. You'll play one side, and an AI counterpart will play the other.</p>
    </header>
    <p v-if="error" class="refusal" role="alert">{{ error }}</p>

    <div v-if="bakery" class="gallery">
      <button v-for="scenario in scenarios" :key="scenario.scenario" type="button" class="pastry-card" @click="choosing = scenario">
        <span class="pastry" aria-hidden="true">{{ pastryFor(scenario.name) }}</span>
        <span class="name display">{{ scenario.name }}</span>
        <span class="muted">
          {{ scenario.roles.map(({ name }) => name).join(" or ") }} · {{ scenario.timeLimit ?? DEFAULT_TIME_LIMIT }} minutes
        </span>
      </button>
      <button type="button" class="pastry-card surprise" :disabled="surprising || scenarios.length === 0" @click="surprise">
        <span class="pastry" aria-hidden="true">✨</span>
        <span class="name display">Surprise me!</span>
        <span class="muted">A random scenario and side</span>
      </button>
    </div>

    <section v-if="tables.length > 0" class="panel">
      <h2>Your negotiations</h2>
      <ul class="tables">
        <li v-for="table in tables" :key="table.table">
          <a :href="`/tables/${table.table}`" @click.prevent="go(`/tables/${table.table}`)">
            <span aria-hidden="true">{{ pastryFor(table.scenarioName) }}</span>
            <strong>{{ table.scenarioName }}</strong>
            <span class="muted">as {{ table.roleName }}</span>
          </a>
          <span class="badge" :class="{ good: table.status === 'SETTLED', warm: table.status === 'OPEN' || table.status === 'PREPARING' }">
            {{ statusLabels[table.status] ?? table.status }}
          </span>
        </li>
      </ul>
    </section>

    <StartDialog v-if="choosing" :scenario="choosing" @close="choosing = null" />
  </section>
</template>

<style scoped>
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-4);
}
.pastry-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  min-height: 200px;
  justify-content: center;
  padding: var(--space-6) var(--space-4);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  text-align: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.pastry-card:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-popover);
}
.pastry {
  font-size: 56px;
  line-height: 1;
}
.name {
  font-size: var(--text-xl);
  font-weight: 700;
}
.surprise {
  border-style: dashed;
  background: var(--color-gold-soft);
}
.tables {
  display: flex;
  flex-direction: column;
  padding: 0;
  list-style: none;
}
.tables li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-line);
}
.tables li:first-child {
  border-top: 0;
}
.tables a {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  color: inherit;
  text-decoration: none;
}
.tables a:hover strong {
  text-decoration: underline;
}
</style>
