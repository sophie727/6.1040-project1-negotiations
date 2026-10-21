<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api, type Bakery, type Scenario, type WrittenScenario } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import YourRatings from "../ratings/YourRatings.vue";
import { useSession } from "../reusable/session.ts";
import { go } from "../router.ts";
import { pastryFor, statusLabels } from "./pastries.ts";
import MatchmakingDialog from "./MatchmakingDialog.vue";
import SpiceLevel from "./SpiceLevel.vue";
import StartDialog from "./StartDialog.vue";
import { DEFAULT_TIME_LIMIT, type Opponents, rememberOpponents, rememberedOpponents, startPractice, startWithFriends } from "./start.ts";

const { sessionEnded } = useSession();
const bakery = ref<Bakery | null>(null);
const error = ref<string | null>(null);
/** The scenario whose start dialog is open. */
const choosing = ref<Scenario | null>(null);
const surprising = ref(false);
/** Whether "Surprise me!" is open for someone new, where the person picks how many people to negotiate with. */
const surprisingStrangers = ref(false);

/** Who the person wants to negotiate against, which decides what picking a scenario does. */
const opponents = ref<Opponents>(rememberedOpponents());
function choose(choice: Opponents) {
  opponents.value = choice;
  rememberOpponents(choice);
}
const choices: { value: Opponents; icon: string; label: string; hint: string }[] = [
  { value: "ai", icon: "🤖", label: "An AI counterpart", hint: "Practice any time" },
  { value: "friends", icon: "💌", label: "Friends", hint: "Get a link to send them" },
  { value: "strangers", icon: "🎲", label: "Someone new", hint: "Get matched with someone who's looking too" },
];
const leads: Record<Opponents, string> = {
  ai: "Pick a scenario to practice. You'll play one side, and AI counterparts will play the rest.",
  friends: "Pick a scenario and a side, and you'll get a link to send your friends. Whoever follows it plays another side.",
  strangers: "Pick a scenario, and we'll find someone else who wants to practice it. Or pick Surprise me! to join whoever's looking.",
};
const surpriseHints: Record<Opponents, string> = {
  ai: "A random scenario and side",
  friends: "A random scenario and side",
  strangers: "Join whoever's looking, for any scenario",
};

/** The scenarios the person wrote, drafts and published ones, so they can go back to writing them. */
const written = ref<WrittenScenario[]>([]);

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

/**
 * "Surprise me!": a random scenario and side, or, with someone new, joining the first people looking for a negotiation
 * as large as the person picks, whichever scenario they want.
 */
async function surprise() {
  if (opponents.value === "strangers") {
    surprisingStrangers.value = true;
    return;
  }
  const scenario = scenarios.value[Math.floor(Math.random() * scenarios.value.length)];
  const role = scenario?.roles[Math.floor(Math.random() * scenario.roles.length)];
  if (scenario === undefined || role === undefined) return;
  surprising.value = true;
  error.value = opponents.value === "friends" ? await startWithFriends(scenario, role.role) : await startPractice(scenario, role.role);
  surprising.value = false;
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <h1>The Bakery</h1>
      <p class="lead">{{ leads[opponents] }}</p>
    </header>
    <div class="opponents" role="radiogroup" aria-label="Who do you want to negotiate with?">
      <button
        v-for="choice in choices"
        :key="choice.value"
        type="button"
        role="radio"
        class="opponent"
        :aria-checked="opponents === choice.value"
        @click="choose(choice.value)"
      >
        <span class="icon" aria-hidden="true">{{ choice.icon }}</span>
        <span>
          <strong>{{ choice.label }}</strong>
          <span class="muted">{{ choice.hint }}</span>
        </span>
      </button>
    </div>
    <p v-if="error" class="refusal" role="alert">{{ error }}</p>

    <div v-if="bakery" class="case">
      <div class="gallery">
        <button v-for="scenario in scenarios" :key="scenario.scenario" type="button" class="pastry-card" @click="choosing = scenario">
          <span class="pastry" aria-hidden="true">{{ pastryFor(scenario.name) }}</span>
          <span class="name display">{{ scenario.name }}</span>
          <span class="muted">
            {{ scenario.roles.map(({ name }) => name).join(" or ") }} · {{ scenario.timeLimit ?? DEFAULT_TIME_LIMIT }} minutes
          </span>
          <SpiceLevel :spice="scenario.spice" />
        </button>
        <button type="button" class="pastry-card surprise" :disabled="surprising || scenarios.length === 0" @click="surprise">
          <span class="pastry" aria-hidden="true">✨</span>
          <span class="name display">Surprise me!</span>
          <span class="muted">{{ surpriseHints[opponents] }}</span>
        </button>
        <a class="pastry-card write" href="/write" @click.prevent="go('/write')">
          <span class="pastry" aria-hidden="true">🧑‍🍳</span>
          <span class="name display">Write your own</span>
          <span class="muted">A scenario of yours, for everyone to negotiate</span>
        </a>
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
        <li v-for="scenario in written" :key="scenario.scenario">
          <a :href="`/write/${scenario.scenario}`" @click.prevent="go(`/write/${scenario.scenario}`)">
            <span aria-hidden="true">{{ pastryFor(scenario.name) }}</span>
            <strong>{{ scenario.name }}</strong>
          </a>
          <span class="badge" :class="scenario.published ? 'good' : 'warm'">{{ scenario.published ? "Published" : "Draft" }}</span>
        </li>
      </ul>
    </section>

    <MatchmakingDialog v-if="choosing && opponents === 'strangers'" :scenario="choosing" :scenarios="scenarios" @close="choosing = null" />
    <MatchmakingDialog v-else-if="surprisingStrangers" :scenario="null" :scenarios="scenarios" @close="surprisingStrangers = false" />
    <StartDialog
      v-else-if="choosing"
      :scenario="choosing"
      :opponents="opponents === 'friends' ? 'friends' : 'ai'"
      @close="choosing = null"
    />
  </section>
</template>

<style scoped>
.opponents {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
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
.opponent > span:last-child {
  display: flex;
  flex-direction: column;
}
.opponent .icon {
  font-size: 28px;
  line-height: 1;
}
.opponent[aria-checked="true"] {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  box-shadow: var(--shadow-card);
}
.opponent:hover:not([aria-checked="true"]) {
  border-color: var(--color-accent);
}
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
/* Writing your own is an empty window, waiting to be filled. */
.write {
  border-style: dashed;
  border-color: rgba(80, 124, 104, 0.6);
  text-decoration: none;
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
