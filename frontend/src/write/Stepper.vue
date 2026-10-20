<script setup lang="ts">
/** A count the person sets with − and + buttons, such as how many roles a scenario has. */
defineProps<{ label: string; hint?: string; min: number; max: number; disabled?: boolean }>();
const count = defineModel<number>({ required: true });
</script>

<template>
  <div class="stepper">
    <span class="what">
      <strong>{{ label }}</strong>
      <span v-if="hint" class="muted">{{ hint }}</span>
    </span>
    <span class="controls">
      <button
        type="button"
        class="step"
        :disabled="disabled || count <= min"
        :aria-label="`Fewer ${label.toLowerCase()}`"
        @click="count = count - 1"
      >
        −
      </button>
      <output class="display" aria-live="polite">{{ count }}</output>
      <button
        type="button"
        class="step"
        :disabled="disabled || count >= max"
        :aria-label="`More ${label.toLowerCase()}`"
        @click="count = count + 1"
      >
        +
      </button>
    </span>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}
.what {
  display: flex;
  flex-direction: column;
}
.controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.step {
  width: 36px;
  height: 36px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-page);
  font-size: var(--text-lg);
  font-weight: 700;
  line-height: 1;
  color: var(--color-accent);
}
.step:hover:not(:disabled) {
  border-color: var(--color-accent);
}
output {
  min-width: 2ch;
  font-size: var(--text-2xl);
  font-weight: 700;
  text-align: center;
}
</style>
