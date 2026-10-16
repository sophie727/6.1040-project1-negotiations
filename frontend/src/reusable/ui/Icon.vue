<!-- Adapted from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng. -->
<script setup lang="ts">
/** Line icons, each drawn as the paths of a 24×24 outline. */
const paths = {
  close: ["M6 6l12 12M18 6 6 18"],
  more: ["M5 12h.01M12 12h.01M19 12h.01"],
  send: ["M4 12 20 4l-4 16-4-7z", "M12 13l8-9"],
  clock: ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18", "M12 7v5l3 2"],
  back: ["M19 12H5", "m11 6-6 6 6 6"],
  check: ["m5 12 5 5 9-10"],
  door: ["M14 4H6v16h8", "M10 12h10", "m17 9 3 3-3 3"],
} as const;

export type IconName = keyof typeof paths;

withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 18 });
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="name === 'more' ? 3.5 : 1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="d in paths[name]" :key="d" :d="d" />
  </svg>
</template>
