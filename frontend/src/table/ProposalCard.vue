<script setup lang="ts">
import { computed, ref } from "vue";
import { api, type Proposal, type Table } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import type { Worth } from "./conversation.ts";
import { formatAgreed, formatPoints, formatTime } from "./format.ts";
import { inWords } from "./players.ts";

/**
 * A proposal in the chat: its terms, what it's worth to the person, its status, and the answers they can give. In the
 * transcript of a negotiation that has ended, there's nothing to answer, and it also shows what it was worth to `others`.
 */
const props = defineProps<{ proposal: Proposal; table: Table; transcript?: boolean; others?: Worth[] }>();
const emit = defineEmits<{ changed: [] }>();

const mine = computed(() => props.proposal.proposer === props.table.role);
const proposer = computed(() => (mine.value ? "You" : props.table.seats.find(({ role }) => role === props.proposal.proposer)?.name));
const pending = computed(() => props.proposal.status === "PENDING");
const statuses: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "Waiting for an answer", tone: "warm" },
  ACCEPTED: { label: "Accepted", tone: "good" },
  REJECTED: { label: "Rejected", tone: "bad" },
  RETRACTED: { label: "Taken back", tone: "" },
  SUPERSEDED: { label: "Replaced by a newer proposal", tone: "" },
};
const status = computed(() =>
  // A proposal still waiting when the negotiation ended was never answered.
  props.transcript && pending.value
    ? { label: "Never answered", tone: "" }
    : (statuses[props.proposal.status] ?? { label: props.proposal.status, tone: "" }),
);
const belowBatna = computed(() => props.proposal.points !== null && props.proposal.points < props.table.batna);
const accepted = computed(() => props.proposal.acceptedBy.includes(props.table.role));

/**
 * At a table of three or more, who has accepted a proposal that is still waiting, and whose answer it waits for, since
 * it holds only once everyone but its proposer accepts it.
 */
const answers = computed(() => {
  if (!pending.value || props.transcript || props.table.seats.length <= 2) return null;
  const answerers = props.table.seats.filter(({ role }) => role !== props.proposal.proposer);
  const named = (seats: typeof answerers) => inWords(seats.map(({ role, name }) => (role === props.table.role ? "you" : name)));
  const yes = answerers.filter(({ role }) => props.proposal.acceptedBy.includes(role));
  const waiting = `Waiting for ${named(answerers.filter((seat) => !yes.includes(seat)))}.`;
  return yes.length === 0 ? waiting : `Accepted by ${named(yes)}. ${waiting}`;
});

const working = ref(false);
const error = ref<string | null>(null);

async function answer(path: "/tables/accept" | "/tables/reject" | "/tables/retract") {
  working.value = true;
  const input = { table: props.table.table, proposal: props.proposal.proposal };
  const result =
    path === "/tables/accept" ? await api.tables.accept(input) : path === "/tables/reject" ? await api.tables.reject(input) : await api.tables.retract(input);
  working.value = false;
  if ("error" in result) {
    if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
    error.value = messageFor(path, result.error);
    return;
  }
  error.value = null;
  emit("changed");
}
</script>

<template>
  <article class="proposal" :class="{ mine }">
    <header>
      <strong>{{ proposer }} proposed a deal</strong>
      <span class="muted">{{ formatTime(proposal.proposedAt) }}</span>
    </header>
    <dl class="terms">
      <template v-for="issue in table.issues" :key="issue.issue">
        <dt>{{ issue.name }}</dt>
        <dd>{{ formatAgreed(issue, proposal.terms[issue.issue]) }}</dd>
      </template>
    </dl>
    <p class="worth">
      Worth <strong>{{ proposal.points === null ? "—" : formatPoints(proposal.points) }} points</strong> to you
      <span class="muted">(your BATNA {{ transcript ? "was" : "is" }} {{ formatPoints(table.batna) }})</span>
      <span v-if="belowBatna" class="badge bad">Below your BATNA</span>
    </p>
    <p v-for="other in others ?? []" :key="other.name" class="worth">
      Worth <strong>{{ other.points === null ? "—" : formatPoints(other.points) }} points</strong> to {{ other.name }}
      <span class="muted">(their BATNA was {{ formatPoints(other.batna) }})</span>
      <span v-if="other.points !== null && other.points < other.batna" class="badge bad">Below their BATNA</span>
    </p>
    <footer>
      <span class="badge" :class="status.tone">{{ status.label }}</span>
      <div v-if="pending && !transcript" class="actions">
        <template v-if="!mine && !accepted">
          <button type="button" class="button outline" :disabled="working" @click="answer('/tables/reject')">Reject</button>
          <button type="button" class="button good" :disabled="working" @click="answer('/tables/accept')">Accept</button>
        </template>
        <button v-else-if="mine" type="button" class="button outline" :disabled="working" @click="answer('/tables/retract')">Take it back</button>
      </div>
    </footer>
    <p v-if="answers" class="muted answers">{{ answers }}</p>
    <p v-if="error" class="refusal" role="alert">{{ error }}</p>
  </article>
</template>

<style scoped>
.proposal {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 440px;
  padding: var(--space-4);
  border: 1.5px solid var(--color-gold);
  border-radius: var(--radius-lg);
  background: var(--color-gold-soft);
}
.proposal.mine {
  align-self: flex-end;
}
header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}
.terms {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px var(--space-4);
  font-size: var(--text-sm);
}
dt {
  color: var(--color-text-muted);
}
dd {
  margin: 0;
  font-weight: 600;
}
.worth {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}
footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.actions {
  display: flex;
  gap: var(--space-2);
}
.answers {
  font-size: var(--text-sm);
}
</style>
