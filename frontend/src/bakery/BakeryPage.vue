<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api, type Bakery, type Scenario, type WrittenScenario } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import YourRatings from "../ratings/YourRatings.vue";
import Icon from "../reusable/ui/Icon.vue";
import { useSession } from "../reusable/session.ts";
import { go } from "../router.ts";
import { pastryFor, statusLabels } from "./pastries.ts";
import MatchmakingDialog from "./MatchmakingDialog.vue";
import SpiceLevel from "./SpiceLevel.vue";
import StartDialog from "./StartDialog.vue";
import { DEFAULT_TIME_LIMIT } from "./start.ts";

const { sessionEnded } = useSession();
const bakery = ref<Bakery | null>(null);
const error = ref<string | null>(null);
/** The case whose start dialog is open, where the person picks who to negotiate with; a null scenario is "Surprise me!". */
const choosing = ref<{ scenario: Scenario | null } | null>(null);
/** The case the person is looking for someone new to negotiate; a null scenario is "Surprise me!", for any scenario. */
const matching = ref<{ scenario: Scenario | null } | null>(null);

/** Hands a start dialog over to matchmaking, once the person picks someone new. */
function matchmake() {
  matching.value = choosing.value;
  choosing.value = null;
}

/**
 * The scenarios the person wrote, drafts and published ones, so they can go back to writing them, newest first, with the
 * archived ones last, out of the way.
 */
const written = ref<WrittenScenario[]>([]);
const writtenInOrder = computed(() => [...written.value].sort((one, other) => Number(one.archived) - Number(other.archived)));

onMounted(async () => {
  void api.scenarios.mine().then((mine) => {
    if (!("error" in mine)) written.value = mine.scenarios;
  });
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
</script>

<template>
  <section class="page">
    <header class="page-head head">
      <div>
        <h1>The Bakery</h1>
        <p class="lead">
          Pick a scenario from the case. Next, you'll choose who to negotiate with: an AI counterpart, friends you invite, or
          someone new.
        </p>
      </div>
      <a class="button outline write" href="/write" @click.prevent="go('/write')">
        <span class="plus" aria-hidden="true"><Icon name="plus" :size="16" /></span>
        Write your own scenario
      </a>
    </header>
    <p v-if="error" class="refusal" role="alert">{{ error }}</p>

    <div v-if="bakery" class="case">
      <div class="gallery">
        <button v-for="scenario in scenarios" :key="scenario.scenario" type="button" class="pastry-card" @click="choosing = { scenario }">
          <span class="pastry" aria-hidden="true">{{ pastryFor(scenario.name) }}</span>
          <span class="name display">{{ scenario.name }}</span>
          <span class="muted">
            {{ scenario.roles.map(({ name }) => name).join(" or ") }} · {{ scenario.timeLimit ?? DEFAULT_TIME_LIMIT }} minutes
          </span>
          <SpiceLevel :spice="scenario.spice" />
        </button>
        <button type="button" class="pastry-card surprise" :disabled="scenarios.length === 0" @click="choosing = { scenario: null }">
          <span class="pastry" aria-hidden="true">✨</span>
          <span class="name display">Surprise me!</span>
          <span class="muted">A random scenario and side</span>
        </button>
      </div>
    </div>

    <YourRatings v-if="bakery?.ratings" :ratings="bakery.ratings" />

    <section v-if="tables.length > 0" class="panel">
      <h2>Your negotiations</h2>
      <ul class="tables">
        <li v-for="table in tables" :key="table.table">
          <a :href="`/tables/${table.table}`" @click.prevent="go(`/tables/${table.table}`)">
            <span aria-hidden="true">{{ pastryFor(table.scenarioName) }}</span>
            <strong>{{ table.scenarioName }}</strong>
            <span class="muted">
              as {{ table.roleName }}{{ table.opponents.length > 0 ? ` · with ${table.opponents.join(" and ")}` : "" }}
            </span>
          </a>
          <span class="badge" :class="{ good: table.status === 'SETTLED', warm: table.status === 'OPEN' || table.status === 'PREPARING' }">
            {{ statusLabels[table.status] ?? table.status }}
          </span>
        </li>
      </ul>
    </section>

    <section v-if="written.length > 0" class="panel">
      <h2>Your scenarios</h2>
      <ul class="tables">
        <li v-for="scenario in writtenInOrder" :key="scenario.scenario" :class="{ archived: scenario.archived }">
          <a :href="`/write/${scenario.scenario}`" @click.prevent="go(`/write/${scenario.scenario}`)">
            <span aria-hidden="true">{{ pastryFor(scenario.name) }}</span>
            <strong>{{ scenario.name }}</strong>
          </a>
          <span v-if="scenario.archived" class="badge">Archived</span>
          <span v-else class="badge" :class="scenario.published ? 'good' : 'warm'">{{ scenario.published ? "Published" : "Draft" }}</span>
        </li>
      </ul>
    </section>

    <StartDialog
      v-if="choosing"
      :scenario="choosing.scenario"
      :scenarios="scenarios"
      @close="choosing = null"
      @matchmake="matchmake"
    />
    <MatchmakingDialog v-else-if="matching" :scenario="matching.scenario" :scenarios="scenarios" @close="matching = null" />
  </section>
</template>

<style scoped>
/*
 * The bakery's display case, from one edge of the screen to the other, in two drawings that repeat in step: the shelves
 * of pastries behind the scenarios, and the case's glass outline in front of them. The scenarios stand in the band of
 * glass between the shelves: from 21.8% to 78.7% of the case's height, above the pastries on the bottom shelf. When
 * there are more scenarios than fit, they slide sideways behind the glass.
 */
.case {
  --case-height: 612px;
  position: relative;
  width: 100vw;
  height: var(--case-height);
  margin-inline: calc(50% - 50vw);
  background: url("/display-case-shelves.webp") center top / auto 100% repeat-x;
}
.case::after {
  content: "";
  position: absolute;
  inset: 0;
  background: url("/display-case-glass.webp") center top / auto 100% repeat-x;
  pointer-events: none;
}
.gallery {
  position: absolute;
  top: calc(var(--case-height) * 0.218);
  left: 0;
  right: 0;
  height: calc(var(--case-height) * (0.787 - 0.218));
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 236px;
  align-items: center;
  gap: 30px;
  /* The first window lines up with the page's content. */
  padding-inline: max(var(--space-6), calc((100vw - 1168px) / 2));
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(80, 124, 104, 0.5) transparent;
}
@media (max-width: 600px) {
  .gallery {
    padding-inline: var(--space-4);
  }
}
/* Each scenario in an arched window: a teal hairline, a gold rule inside it, and the pastry on a mint plate. */
.pastry-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  height: 320px;
  padding: 30px 18px 28px;
  border: 1px solid rgba(80, 124, 104, 0.42);
  border-radius: 118px 118px 4px 4px;
  outline: 1px solid rgba(248, 186, 18, 0.75);
  outline-offset: -9px;
  background: var(--color-surface);
  color: var(--color-text);
  text-align: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.pastry-card:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 20px 30px -22px rgba(31, 58, 46, 0.6);
}
/* The gold rule is the window's outline, so a focused window trades it for the usual focus ring. */
.pastry-card:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}
.pastry {
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
  margin-bottom: 10px;
  border-radius: 50%;
  background: var(--color-mint);
  box-shadow: 0 0 0 6px var(--color-surface), 0 0 0 7px rgba(248, 186, 18, 0.75);
  font-size: 54px;
  line-height: 1;
}
/* A long name or list of roles is cut at two lines, so the window holds whatever a scenario's author wrote. */
.name,
.pastry-card > .muted {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.name {
  font-size: 22px;
  font-weight: 700;
}
.pastry-card > .muted {
  color: var(--color-teal);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
/* Surprise me! is the window painted teal. */
.surprise {
  color: var(--color-gold-soft);
  background: var(--color-teal);
  outline-color: rgba(253, 248, 195, 0.55);
}
.surprise .pastry {
  background: rgba(253, 248, 195, 0.16);
  box-shadow: 0 0 0 6px var(--color-teal), 0 0 0 7px rgba(253, 248, 195, 0.55);
}
.surprise > .muted {
  color: var(--color-mint);
}
/* Writing your own scenario is a button above the case, beside the bakery's title. */
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}
.write {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
}
.plus {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-surface);
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
.tables li.archived a {
  color: var(--color-text-muted);
}
</style>
