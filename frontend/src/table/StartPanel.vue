<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { api, type TableView } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import InfoTip from "../reusable/ui/InfoTip.vue";
import { usePlan } from "./plan.ts";

/**
 * How a negotiation starts: someone suggests how long to negotiate, which also says they're ready, and the clock starts
 * once everyone else agrees. Anyone can suggest a different length instead, which replaces the suggestion waiting for
 * answers. At a practice table, the AI agrees at once, so suggesting starts the clock.
 */
const props = defineProps<{ view: TableView }>();
const emit = defineEmits<{ changed: [] }>();

/** The time limit a table suggests when its scenario's author recommended none. */
const DEFAULT_MINUTES = 30;

const table = computed(() => props.view.table);
const names = computed(() => new Map(table.value.seats.map(({ role, name }) => [role, name])));
/** The suggestion waiting for answers, if there is one. */
const pending = computed(() => props.view.start[0]);
const mine = computed(() => pending.value?.proposer === table.value.role);
const agreed = computed(() => pending.value?.agreed.includes(table.value.role) ?? false);
/** Everyone the suggestion still waits for, by role name. */
const waitingFor = computed(() => {
  const suggestion = pending.value;
  if (suggestion === undefined) return "";
  return table.value.seats
    .filter(({ role }) => role !== suggestion.proposer && !suggestion.agreed.includes(role))
    .map(({ role, name }) => (role === table.value.role ? "you" : name))
    .join(" and ");
});

const minutes = ref<number>(pending.value?.minutes ?? table.value.recommendedTimeLimit ?? DEFAULT_MINUTES);
// When someone suggests a length, the field shows it, so suggesting "another" starts from theirs.
watch(
  () => pending.value?.minutes,
  (suggested) => {
    if (suggested !== undefined) minutes.value = suggested;
  },
);

const working = ref(false);
const error = ref<string | null>(null);

/** With prep sheets on, the person can't suggest or agree to a start until every part of their plan is filled in. */
const plan = usePlan(props.view.table.table, props.view.plan);
const planFirst = computed(() => props.view.plan.on && !plan.complete());

function refused(path: string, code: string) {
  if (code === "UNAUTHORIZED") useSession().sessionEnded();
  error.value = messageFor(path, code);
}

async function suggest() {
  working.value = true;
  // The start reads the saved plan, so a part typed a moment ago is saved first.
  await plan.save();
  const result = await api.tables.start({ table: table.value.table, minutes: Number(minutes.value) });
  working.value = false;
  if ("error" in result) return refused("/tables/start", result.error);
  error.value = null;
  emit("changed");
}

async function agree() {
  const proposal = pending.value?.proposal;
  if (proposal === undefined) return;
  working.value = true;
  await plan.save();
  const result = await api.tables.agree({ table: table.value.table, proposal });
  working.value = false;
  if ("error" in result) return refused("/tables/agree", result.error);
  error.value = null;
  emit("changed");
}
</script>

<template>
  <section class="panel start" aria-label="Starting the negotiation">
    <h2>
      Ready to start?
      <InfoTip label="How starting works">
        <span>
          Whoever is ready first suggests how long to negotiate, which also says they're ready. Everyone else agrees, or suggests
          a different length, which replaces it and waits for the others in turn.
        </span>
        <span>
          The clock starts the moment everyone agrees, and not before, so take your time reading your brief. An AI
          counterpart agrees to any length at once.
        </span>
      </InfoTip>
    </h2>
    <template v-if="pending && !mine && !agreed">
      <p class="suggestion">
        <strong>{{ names.get(pending.proposer) }}</strong> is ready to start with
        <strong>{{ pending.minutes }} minutes</strong>.
      </p>
      <button type="button" class="button primary large" :disabled="working || planFirst" @click="agree">
        Start with {{ pending.minutes }} minutes
      </button>
      <p class="muted">Or suggest a different length:</p>
    </template>
    <template v-else-if="pending">
      <p class="suggestion">
        {{ mine ? "You're" : "You agreed and are" }} ready to start with <strong>{{ pending.minutes }} minutes</strong>.
        Waiting for {{ waitingFor }}…
      </p>
      <p class="muted">Changed your mind? Suggest a different length:</p>
    </template>
    <p v-else class="muted">When you've read your brief, suggest how long to negotiate. The clock starts once everyone agrees.</p>
    <p v-if="planFirst" class="plan-first">Fill in your plan first: your target, your walkaway, and your priorities.</p>

    <form class="length" @submit.prevent="suggest">
      <label class="field">
        Minutes
        <input v-model.number="minutes" type="number" min="1" max="180" step="1" required />
      </label>
      <button type="submit" class="button" :class="pending && !mine && !agreed ? 'outline' : 'primary large'" :disabled="working || planFirst">
        {{ pending ? "Suggest" : `Start with ${minutes} minutes` }}
      </button>
    </form>
    <p v-if="table.recommendedTimeLimit !== null" class="hint muted">
      The author recommends {{ table.recommendedTimeLimit }} minutes.
    </p>
    <p v-if="error" class="refusal" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.start {
  gap: var(--space-3);
}
.suggestion {
  font-size: var(--text-lg);
}
.length {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
}
.length .field {
  flex: 0 0 110px;
}
.length .button {
  flex: 1;
}
.hint {
  font-size: var(--text-sm);
}
.plan-first {
  font-weight: 600;
  color: var(--color-accent);
}
</style>
