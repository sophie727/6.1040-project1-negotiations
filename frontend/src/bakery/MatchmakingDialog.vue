<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { api, type Scenario } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import Dialog from "../reusable/ui/Dialog.vue";
import { go } from "../router.ts";
import { pastryFor } from "./pastries.ts";

/**
 * Looks for others who want to negotiate `scenario`, and goes to the table as soon as there are enough. While it waits,
 * it asks every POLL_MS what became of the search, which also keeps the search counting. Closing the dialog, or
 * leaving the page, stops looking.
 */
const props = defineProps<{ scenario: Scenario }>();
const emit = defineEmits<{ close: [] }>();
const POLL_MS = 2000;

type Request = Extract<Awaited<ReturnType<typeof api.matchmaking.find>>, { request: unknown }>["request"];

const request = ref<Request | null>(null);
const error = ref<string | null>(null);
const stoppedElsewhere = ref(false);
const startedAt = Date.now();
const elapsed = ref(0);
let timer: ReturnType<typeof setTimeout> | undefined;
let ticker: ReturnType<typeof setInterval> | undefined;
let done = false;

const others = computed(() => props.scenario.roles.length - 1);
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

async function find() {
  const result = await api.matchmaking.find({ scenario: props.scenario.scenario });
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
  document.title = "Looking for someone… · The Whole Pie";
  ticker = setInterval(() => (elapsed.value = Date.now() - startedAt), 1000);
  window.addEventListener("pagehide", stopOnLeave);
  void find();
});
onUnmounted(() => {
  window.removeEventListener("pagehide", stopOnLeave);
  stop();
});
</script>

<template>
  <Dialog :title="`${pastryFor(scenario.name)} ${scenario.name}`" subtitle="Negotiating with someone new" @close="cancel">
    <div class="looking">
      <template v-if="error">
        <p class="refusal" role="alert">{{ error }}</p>
        <button type="button" class="button outline" @click="emit('close')">Close</button>
      </template>
      <template v-else-if="stoppedElsewhere">
        <p>You started looking somewhere else, such as in another tab, so this search stopped.</p>
        <button type="button" class="button outline" @click="emit('close')">Close</button>
      </template>
      <template v-else>
        <div class="spinner" aria-hidden="true">{{ pastryFor(scenario.name) }}</div>
        <p class="status" role="status">Looking for {{ waitingFor }}… <span class="muted">{{ clock }}</span></p>
        <p class="muted">
          As soon as someone else wants to negotiate {{ scenario.name }}, you'll both go to a new table, each with a side
          chosen at random. Keep this open; you can read other tabs while you wait.
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
