<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import type { TableView } from "../api/client.ts";
import { formatPoints } from "./format.ts";
import { type PlanParts, usePlan } from "./plan.ts";

/**
 * The prep sheet, for someone who turned it on: their target, their walkaway, and their priorities, saved as they type.
 * They can't start until every part is filled in. During the negotiation, it shows what they planned, read-only.
 */
const props = defineProps<{ view: TableView; readonly?: boolean }>();
const { draft, status, error, edit, save } = usePlan(props.view.table.table, props.view.plan);
onBeforeUnmount(() => void save());

const parts: { part: keyof PlanParts; label: string; hint: string }[] = [
  {
    part: "target",
    label: "Your target",
    hint: "What would a great deal look like for you? Aim high, but stay within what you could justify.",
  },
  {
    part: "walkaway",
    label: "Your walkaway",
    hint: `The least you'd accept. Your BATNA is worth ${formatPoints(props.view.table.batna)} points: what deals beat it?`,
  },
  {
    part: "priorities",
    label: "Your priorities",
    hint: "Which issues matter most to you, and which could you trade away? What might matter most to them?",
  },
];
</script>

<template>
  <section :class="readonly ? 'plan' : 'panel plan'" aria-label="Your plan">
    <h2 v-if="!readonly">Your plan</h2>
    <template v-if="readonly">
      <div v-for="{ part, label } in parts" :key="part" class="read">
        <h3>{{ label }}</h3>
        <p>{{ draft[part] || "—" }}</p>
      </div>
    </template>
    <template v-else>
      <label v-for="{ part, label, hint } in parts" :key="part" class="field">
        {{ label }}
        <textarea
          class="box"
          rows="2"
          maxlength="20000"
          :value="draft[part]"
          @input="edit(part, ($event.target as HTMLTextAreaElement).value)"
          @blur="save"
        />
        <span class="hint">{{ hint }}</span>
      </label>
      <p v-if="error" class="refusal" role="alert">{{ error }}</p>
      <p v-else class="muted" aria-live="polite">{{ status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Not saved yet" }}</p>
    </template>
  </section>
</template>

<style scoped>
.plan {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.read h3 {
  font-size: var(--text-sm);
  font-weight: 600;
}
.read p {
  white-space: pre-wrap;
}
</style>
