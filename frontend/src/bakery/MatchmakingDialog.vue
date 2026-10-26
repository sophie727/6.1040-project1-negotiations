<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { api, type Scenario } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import Dialog from "../reusable/ui/Dialog.vue";
import InfoTip from "../reusable/ui/InfoTip.vue";
import { go } from "../router.ts";
import { pastryFor } from "./pastries.ts";

/**
 * Looks for others to negotiate with, and goes to the table as soon as there are enough. With a `scenario`, it starts
 * at once, looking for others who want to negotiate it, or who are open to any scenario for as many people. Without
 * one, for "Surprise me!", the person first picks how many people to negotiate with, and then looks with an open mind:
 * they join the first people looking for a negotiation that size, whichever scenario they picked. The page suggests a
 * scenario that size at random, which the group negotiates if everyone in it is open. While it waits, it asks every
 * POLL_MS what became of the search, which also keeps the search counting. Closing the dialog, or leaving the page,
 * stops looking.
 */
const props = defineProps<{ scenario: Scenario | null; scenarios: Scenario[] }>();
const emit = defineEmits<{ close: [] }>();
const POLL_MS = 2000;

type Request = Extract<Awaited<ReturnType<typeof api.matchmaking.find>>, { request: unknown }>["request"];

/** How many people, counting the person, a negotiation can have: as many as some published scenario has roles. */
const sizes = computed(() => [...new Set(props.scenarios.map(({ roles }) => roles.length))].sort((a, b) => a - b));
const size = ref(props.scenario?.roles.length ?? sizes.value[0] ?? 2);
/** What the person looks for, once they've started: the scenario they picked, or the one suggested for a surprise. */
const search = ref<{ scenario: Scenario; open: boolean } | null>(null);
const request = ref<Request | null>(null);
const error = ref<string | null>(null);
const stoppedElsewhere = ref(false);
const elapsed = ref(0);
let timer: ReturnType<typeof setTimeout> | undefined;
let ticker: ReturnType<typeof setInterval> | undefined;
let done = false;

const others = computed(() => size.value - 1);
const waitingFor = computed(() => (others.value === 1 ? "1 more person" : `${others.value} more people`));
const clock = computed(() => {
  const seconds = Math.floor(elapsed.value / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
});

function refused(path: string, code: string) {
  if (code === "UNAUTHORIZED") useSession().sessionEnded();
  error.value = messageFor(path, code);
  finish();
}

/** Stops polling, and puts the tab's title back. */
function finish() {
  done = true;
  clearTimeout(timer);
  clearInterval(ticker);
  document.title = "The Whole Pie";
}

function arrive(table: string) {
  finish();
  go(`/tables/${table}`);
}

/** Starts looking: for the scenario the person picked, or, for a surprise, with an open mind and a suggestion that size. */
function look() {
  if (props.scenario !== null) {
    search.value = { scenario: props.scenario, open: false };
  } else {
    const fitting = props.scenarios.filter(({ roles }) => roles.length === size.value);
    const suggestion = fitting[Math.floor(Math.random() * fitting.length)];
    if (suggestion === undefined) return;
    search.value = { scenario: suggestion, open: true };
  }
  document.title = "Looking for someone… · The Whole Pie";
  const startedAt = Date.now();
  ticker = setInterval(() => (elapsed.value = Date.now() - startedAt), 1000);
  void find();
}

async function find() {
  if (search.value === null) return;
  const result = await api.matchmaking.find({ scenario: search.value.scenario.scenario, open: search.value.open });
  if (done) return;
  if ("error" in result) return refused("/matchmaking/find", result.error);
  request.value = result.request;
  if (result.table !== null) return arrive(result.table);
  timer = setTimeout(check, POLL_MS);
}

async function check() {
  if (done || request.value === null) return;
  const result = await api.matchmaking.wait({ request: request.value });
  if (done) return;
  if ("error" in result) {
    if (result.error === "UNAUTHORIZED" || result.error === "NOT_FOUND") return refused("/matchmaking/wait", result.error);
    // A passing failure, such as a lost connection or a match that landed mid-check, is checked again.
  } else if (result.status === "MATCHED" && result.table !== null) {
    return arrive(result.table);
  } else if (result.status === "LAPSED") {
    // The page stopped asking for a while, such as while the computer slept, so the search no longer counts: look again.
    return find();
  } else if (result.status === "STOPPED") {
    stoppedElsewhere.value = true;
    return finish();
  }
  timer = setTimeout(check, POLL_MS);
}

/** Stops looking; the search is only waiting, so a match that just landed is kept, and the page goes there next time. */
function stop() {
  if (request.value !== null && !done) void api.matchmaking.stop({ request: request.value });
  finish();
}

/** Leaving the page stops looking too: the browser sends the request even as the page goes away. */
function stopOnLeave() {
  if (request.value === null || done) return;
  const body = new Blob([JSON.stringify({ request: request.value })], { type: "application/json" });
  navigator.sendBeacon("/api/matchmaking/stop", body);
}

function cancel() {
  stop();
  emit("close");
}

onMounted(() => {
  window.addEventListener("pagehide", stopOnLeave);
  if (props.scenario !== null) look();
});
onUnmounted(() => {
  window.removeEventListener("pagehide", stopOnLeave);
  stop();
});
</script>

<template>
  <Dialog
    :title="scenario ? `${pastryFor(scenario.name)} ${scenario.name}` : '✨ Surprise me!'"
    subtitle="Negotiating with someone new"
    @close="cancel"
  >
    <div class="looking">
      <template v-if="error">
        <p class="refusal" role="alert">{{ error }}</p>
        <button type="button" class="button outline" @click="emit('close')">Close</button>
      </template>
      <template v-else-if="stoppedElsewhere">
        <p>You started looking somewhere else, such as in another tab, so this search stopped.</p>
        <button type="button" class="button outline" @click="emit('close')">Close</button>
      </template>
      <form v-else-if="search === null" class="choose" @submit.prevent="look">
        <fieldset>
          <legend>How many people do you want to negotiate with, counting you?</legend>
          <div class="sizes">
            <label v-for="option in sizes" :key="option" class="size" :class="{ chosen: size === option }">
              <input v-model="size" type="radio" name="size" :value="option" />
              {{ option }} people
            </label>
          </div>
        </fieldset>
        <p class="muted">
          You'll join the first people looking for a negotiation that size, whichever scenario they picked, each with a side
          chosen at random.
        </p>
        <button type="submit" class="button primary large" :disabled="sizes.length === 0">Start looking</button>
      </form>
      <template v-else>
        <div class="spinner" aria-hidden="true">{{ scenario ? pastryFor(scenario.name) : "✨" }}</div>
        <p class="status" role="status">Looking for {{ waitingFor }}… <span class="muted">{{ clock }}</span></p>
        <p class="muted">
          Keep this open; you can read other tabs while you wait. Each of you gets a side chosen at random.
          <InfoTip label="How matching works">
            <template v-if="scenario">
              As soon as someone else wants to negotiate {{ scenario.name }}, or is up for any scenario for {{ size }} people,
              you'll go to a new table together.
            </template>
            <template v-else>
              You'll join the first people looking for a negotiation for {{ size }} people, whichever scenario they picked. If
              they're up for anything too, you'll get a scenario at random.
            </template>
          </InfoTip>
        </p>
        <button type="button" class="button outline" @click="cancel">Stop looking</button>
      </template>
    </div>
  </Dialog>
</template>

<style scoped>
.looking {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
}
.choose {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
  text-align: left;
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
.sizes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--space-2);
}
.size {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 12px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}
.size.chosen {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}
.size input {
  accent-color: var(--color-accent);
}
.choose .muted {
  font-size: var(--text-sm);
}
.spinner {
  font-size: 48px;
  line-height: 1;
  animation: bob 1.6s ease-in-out infinite;
}
.status {
  font-size: var(--text-lg);
  font-weight: 600;
}
@keyframes bob {
  0%,
  100% {
    transform: translateY(0) rotate(-6deg);
  }
  50% {
    transform: translateY(-8px) rotate(6deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
