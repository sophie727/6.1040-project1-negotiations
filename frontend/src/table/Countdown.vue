<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import Icon from "../reusable/ui/Icon.vue";

/** The time left before `deadline`. Once it reaches zero, it emits `due` every second until the table stops being open. */
const props = defineProps<{ deadline: string }>();
const emit = defineEmits<{ due: [] }>();

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
    if (left.value === 0) emit("due");
  }, 1000);
  if (left.value === 0) emit("due");
});
onUnmounted(() => clearInterval(timer));

const left = computed(() => Math.max(0, Math.ceil((new Date(props.deadline).getTime() - now.value) / 1000)));
const shown = computed(() => {
  const minutes = Math.floor(left.value / 60);
  const seconds = String(left.value % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
});
const urgent = computed(() => left.value <= 5 * 60);
</script>

<template>
  <div class="countdown" :class="{ urgent }" role="timer" :aria-label="`${shown} left`">
    <Icon name="clock" :size="20" />
    <span class="time">{{ shown }}</span>
  </div>
</template>

<style scoped>
.countdown {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 16px;
  border-radius: var(--radius-full);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  font-weight: 700;
}
.time {
  font-size: var(--text-xl);
  font-variant-numeric: tabular-nums;
}
.urgent {
  color: #ffffff;
  background: var(--color-accent);
}
</style>
