<script setup lang="ts">
/**
 * Who the side a person picked is, from its author's summary, shown under the sides as they choose, so they can tell
 * Manon from Hiro before reading a brief. A side whose author wrote no summary shows nothing.
 */
defineProps<{ name: string; summary: string | null }>();
</script>

<template>
  <p v-if="summary" class="summary" aria-live="polite">
    <strong>{{ name }}:</strong>
    {{ summary }}
  </p>
</template>

<style scoped>
.summary {
  padding: 10px 14px;
  border-left: 3px solid var(--color-accent);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--color-page);
  font-size: var(--text-sm);
  line-height: 1.5;
}
</style>
