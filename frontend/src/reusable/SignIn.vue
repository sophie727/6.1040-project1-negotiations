<!-- Adapted from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng. -->
<script setup lang="ts">
import { useSession } from "./session.ts";

/** A line under the title. Put the ways of signing in the app offers inside, such as `PasswordForm`. */
defineProps<{ lead?: string }>();
const { error } = useSession();
</script>

<template>
  <section class="card form-card">
    <img class="logo" src="/pie.svg" alt="" width="48" height="48" />
    <div>
      <h1>The Whole Pie</h1>
      <p v-if="lead" class="lead">{{ lead }}</p>
    </div>
    <p v-if="error" class="refusal" role="alert">{{ error }}</p>
    <slot />
  </section>
</template>

<style scoped>
.lead {
  margin-top: 6px;
  color: var(--color-text-muted);
}
</style>
