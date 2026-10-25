<script setup lang="ts">
/**
 * Directions for something that takes explaining, such as how a range of values works, folded under a question the
 * person can open, so they're there for whoever needs them and out of the way of whoever doesn't.
 */
defineProps<{ question: string; open?: boolean }>();
</script>

<template>
  <details class="how-to" :open="open">
    <summary>
      <span class="mark" aria-hidden="true">?</span>
      {{ question }}
    </summary>
    <div class="answer">
      <slot />
    </div>
  </details>
</template>

<style scoped>
.how-to {
  border-radius: var(--radius-md);
  background: var(--color-mint);
  color: var(--color-tip);
  font-size: var(--text-sm);
}
summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
}
summary::-webkit-details-marker {
  display: none;
}
summary::after {
  content: "▸";
  margin-left: auto;
  transition: transform 0.12s ease;
}
.how-to[open] summary::after {
  transform: rotate(90deg);
}
.mark {
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-teal);
  color: var(--color-surface);
  font-size: 12px;
  font-weight: 700;
}
.answer {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0 12px 12px 40px;
  line-height: 1.55;
}
.answer :deep(ul) {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-left: 1.1em;
}
@media (prefers-reduced-motion: reduce) {
  summary::after {
    transition: none;
  }
}
</style>
