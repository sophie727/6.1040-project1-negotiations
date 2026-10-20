<!-- Copied from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng. -->
<script setup lang="ts">
import { ref } from "vue";
import { api } from "../api/client.ts";
import CommonsMark from "./CommonsMark.vue";
import { useSession } from "./session.ts";

const { error } = useSession();
const working = ref(false);

async function start() {
  working.value = true;
  const result = await api.auth.commons.start();
  if ("error" in result) {
    error.value = "Commons sign-in isn't available right now. Try again.";
    working.value = false;
    return;
  }
  window.location.assign(result.address);
}
</script>

<template>
  <button type="button" class="commons-button" :disabled="working" @click="start">
    <CommonsMark :size="26" />
    {{ working ? "Opening Commons…" : "Sign in with Commons" }}
  </button>
</template>

<!-- Commons' orange, a shade darker so the light text has enough contrast. -->
<style scoped>
.commons-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 var(--space-4);
  border: 0;
  border-radius: var(--radius-md);
  background: #b44900;
  color: #fefcf4;
  font-weight: 700;
}
.commons-button:hover:not(:disabled) {
  background: #a03f00;
}
.commons-button:focus-visible {
  outline-color: #b44900;
}
.commons-button svg {
  border-radius: 7px;
  box-shadow: 0 0 0 1.5px rgba(254, 252, 244, 0.35);
}
</style>
