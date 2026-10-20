<script setup lang="ts">
import { computed } from "vue";
import { spiceLevelOf } from "./spice.ts";

/** How spicy a scenario is: three chilies, as many of them lit as its level, and the level's name. */
const props = defineProps<{ spice: number }>();
const level = computed(() => spiceLevelOf(props.spice));
</script>

<template>
  <span class="spice" :class="`level-${spice}`" :title="`${level.label}: ${level.meaning}`">
    <span class="chilies" aria-hidden="true">
      <span v-for="chili in 3" :key="chili" :class="{ unlit: chili > spice }">🌶️</span>
    </span>
    {{ level.label }}
  </span>
</template>

<style scoped>
.spice {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px 10px 2px 8px;
  border-radius: 999px;
  font-size: var(--text-xs);
  font-weight: 700;
  background: var(--color-danger-soft);
  color: var(--color-danger);
}
.level-1 {
  background: var(--color-gold-soft);
  color: var(--color-accent-strong);
}
.level-2 {
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}
.chilies {
  letter-spacing: -3px;
  margin-right: 3px;
}
.unlit {
  filter: grayscale(1);
  opacity: 0.3;
}
</style>
