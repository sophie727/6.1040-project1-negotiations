<script setup lang="ts">
import { computed } from "vue";
import type { Debrief, Proposal, Table } from "../api/client.ts";
import Conversation from "../table/Conversation.vue";
import type { Worth } from "../table/conversation.ts";
import { dealPoints } from "../table/points.ts";

/**
 * The transcript of a negotiation that has ended: everything said and proposed, oldest first, and then how it ended.
 * Each proposal also shows what it was worth to the other sides, against their BATNAs, which the debrief has revealed.
 */
const props = defineProps<{ table: Table; debrief: Debrief; ending: string }>();

const said = computed(() => props.table.messages.length + props.table.proposals.length);
const others = computed(() => props.debrief.roles.filter(({ role }) => role !== props.table.role));
const worthToOthers = (proposal: Proposal): Worth[] =>
  others.value.map(({ name, batna, payoffs }) => ({ name, batna, points: dealPoints(props.debrief.issues, proposal.terms, payoffs) }));
</script>

<template>
  <section class="panel transcript" aria-label="Transcript">
    <h2>Transcript</h2>
    <div class="timeline">
      <p v-if="said === 0" class="muted">Nothing was said or proposed before the negotiation ended.</p>
      <Conversation v-else :table="table" transcript :worth-to-others="worthToOthers" />
      <p class="ending muted">{{ ending }}</p>
    </div>
  </section>
</template>

<style scoped>
.transcript {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.ending {
  align-self: center;
  margin-top: var(--space-2);
  padding: var(--space-1) var(--space-4);
  border-radius: 999px;
  background: var(--color-line);
  text-align: center;
}
</style>
