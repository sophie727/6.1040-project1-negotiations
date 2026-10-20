<script setup lang="ts">
import { computed } from "vue";
import type { Proposal, Table } from "../api/client.ts";
import { conversationAt, type Worth } from "./conversation.ts";
import { formatTime } from "./format.ts";
import ProposalCard from "./ProposalCard.vue";

/**
 * Everything said and proposed at a table, oldest first: the person's messages on the right, everyone else's on the
 * left, and the proposals among them. During the negotiation, the person answers proposals here. In the transcript of
 * one that has ended, it's only for reading, and each proposal also shows what it was worth to the other sides.
 */
const props = defineProps<{
  table: Table;
  /** Whether this is the transcript of a negotiation that has ended, rather than one going on. */
  transcript?: boolean;
  /** What a proposal was worth to each other side, which the debrief reveals once the negotiation has ended. */
  worthToOthers?: (proposal: Proposal) => Worth[];
}>();
const emit = defineEmits<{ changed: [] }>();

const entries = computed(() => conversationAt(props.table));
const names = computed(() => new Map(props.table.seats.map(({ role, name }) => [role, name])));
</script>

<template>
  <template v-for="entry in entries" :key="entry.kind === 'message' ? entry.message.message : entry.proposal.proposal">
    <div v-if="entry.kind === 'message'" class="message" :class="{ mine: entry.message.sender === table.role }">
      <span class="who muted">
        {{ entry.message.sender === table.role ? "You" : names.get(entry.message.sender) }} · {{ formatTime(entry.message.sentAt) }}
      </span>
      <p class="bubble">{{ entry.message.body }}</p>
    </div>
    <ProposalCard
      v-else
      :proposal="entry.proposal"
      :table="table"
      :transcript="transcript"
      :others="worthToOthers?.(entry.proposal)"
      @changed="emit('changed')"
    />
  </template>
</template>

<style scoped>
.message {
  display: flex;
  flex-direction: column;
  align-self: flex-start;
  align-items: flex-start;
  gap: 2px;
  max-width: 78%;
}
.message.mine {
  align-self: flex-end;
  align-items: flex-end;
}
.bubble {
  padding: 10px 14px;
  border-radius: 16px 16px 16px 4px;
  background: var(--color-line);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.mine .bubble {
  border-radius: 16px 16px 4px 16px;
  color: #ffffff;
  background: var(--color-accent);
}
</style>
