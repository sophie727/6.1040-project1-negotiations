<script setup lang="ts">
import DOMPurify from "dompurify";
import { marked } from "marked";
import { computed } from "vue";

/** A confidential brief, written in Markdown. Authors write briefs, so the HTML is sanitized before it is shown. */
const props = defineProps<{ markdown: string }>();
const html = computed(() => DOMPurify.sanitize(marked.parse(props.markdown, { async: false })));
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- sanitized above -->
  <article class="brief" v-html="html" />
</template>

<style scoped>
.brief {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow-wrap: anywhere;
}
.brief :deep(h1) {
  font-size: var(--text-xl);
}
.brief :deep(h2) {
  margin-top: var(--space-2);
  font-size: var(--text-lg);
}
.brief :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}
.brief :deep(th),
.brief :deep(td) {
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-line);
  text-align: left;
}
.brief :deep(th) {
  color: var(--color-text-muted);
  font-weight: 600;
}
</style>
