<script setup lang="ts">
import DOMPurify from "dompurify";
import { marked } from "marked";
import { computed } from "vue";

/** Text written in Markdown, such as a brief or a debrief. Authors and models write it, so the HTML is sanitized before it is shown. */
const props = defineProps<{ markdown: string }>();
const html = computed(() => DOMPurify.sanitize(marked.parse(props.markdown, { async: false })));
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- sanitized above -->
  <article class="markdown" v-html="html" />
</template>

<style scoped>
.markdown {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow-wrap: anywhere;
}
.markdown :deep(h1) {
  font-size: var(--text-xl);
}
.markdown :deep(h2),
.markdown :deep(h3) {
  margin-top: var(--space-2);
  font-size: var(--text-lg);
}
.markdown :deep(ul),
.markdown :deep(ol) {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-left: 1.25em;
}
.markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}
.markdown :deep(th),
.markdown :deep(td) {
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-line);
  text-align: left;
}
.markdown :deep(th) {
  color: var(--color-text-muted);
  font-weight: 600;
}
</style>
