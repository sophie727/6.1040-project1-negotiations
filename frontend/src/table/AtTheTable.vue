<script setup lang="ts">
import { computed, ref } from "vue";
import type { TableView } from "../api/client.ts";
import { ratingsInBrief } from "../ratings/format.ts";
import { isCounterpart, isOpen } from "./players.ts";

/**
 * Who sits at the table: each seat's role and the person in it, the AI counterpart, or nobody yet. While a seat is
 * empty, the table's link is here to copy and send to friends; whoever follows it takes an empty seat.
 */
const props = defineProps<{ view: TableView }>();

const table = computed(() => props.view.table);
const link = computed(() => (props.view.link === null ? null : `${window.location.origin}/join/${props.view.link}`));
const waiting = computed(() => table.value.openSeats.length);

const copied = ref(false);
async function copy() {
  if (link.value === null) return;
  try {
    await navigator.clipboard.writeText(link.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    // Without clipboard access, the person can still select the link and copy it.
    copied.value = false;
  }
}

function who(seat: TableView["table"]["seats"][number]): string {
  if (seat.role === table.value.role) return "You";
  if (isOpen(table.value, seat)) return "Waiting for someone…";
  if (isCounterpart(table.value, seat)) return "AI counterpart";
  return seat.player ?? "";
}
</script>

<template>
  <section class="panel seats" aria-label="At the table">
    <h2>At the table</h2>
    <ul>
      <li v-for="seat in table.seats" :key="seat.role" :class="{ open: isOpen(table, seat) }">
        <span class="role">{{ seat.name }}</span>
        <span class="player" :class="{ muted: isOpen(table, seat) }">
          {{ who(seat) }}
          <span v-if="seat.player !== null && seat.role !== table.role" class="muted standing">{{ ratingsInBrief(seat.ratings) }}</span>
        </span>
      </li>
    </ul>
    <div v-if="link !== null && waiting > 0" class="share">
      <p class="muted">
        Send this link to {{ waiting === 1 ? "a friend" : `${waiting} friends` }}. Whoever follows it takes
        {{ waiting === 1 ? "the empty seat" : "an empty seat" }}.
      </p>
      <div class="link">
        <input :value="link" readonly aria-label="Invitation link" @focus="($event.target as HTMLInputElement).select()" />
        <button type="button" class="button primary" @click="copy">{{ copied ? "Copied!" : "Copy" }}</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.seats ul {
  display: flex;
  flex-direction: column;
  padding: 0;
  list-style: none;
}
.seats li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--color-line);
}
.seats li:first-child {
  border-top: 0;
}
.role {
  font-weight: 600;
}
.open .player {
  font-style: italic;
}
.player {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.standing {
  font-size: var(--text-xs);
}
.share {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.link {
  display: flex;
  gap: var(--space-2);
}
.link input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-page);
  font-size: var(--text-sm);
}
</style>
