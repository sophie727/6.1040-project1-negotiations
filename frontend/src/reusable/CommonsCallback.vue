<!-- Copied from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng. -->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../api/client.ts";
import CommonsMark from "./CommonsMark.vue";
import { useSession } from "./session.ts";

const emit = defineEmits<{ done: [] }>();
const { enter, error } = useSession();
const choosing = ref(false);
const username = ref("");
const working = ref(false);

onMounted(async () => {
  const query = new URLSearchParams(window.location.search);
  // Clear the code from the address before posting it, so reloading or going back doesn't post it again.
  window.history.replaceState(null, "", "/");
  if (query.get("error") === "access_denied") {
    error.value = "Sign-in cancelled.";
    return emit("done");
  }
  const finish = api.auth.commons.finish({ state: query.get("state") ?? "", code: query.get("code") ?? "" });
  const refused = await enter(finish, {
    CONFLICT: "Your Commons username is taken here.",
    INVALID_REQUEST: "Your Commons username can't be used here.",
    FORBIDDEN: "Signing in with Commons didn't work. Start again.",
  });
  if (refused === "CONFLICT" || refused === "INVALID_REQUEST") choosing.value = true;
  else emit("done");
});

async function choose() {
  working.value = true;
  const refused = await enter(api.auth.commons.choose({ username: username.value.trim() }), {
    CONFLICT: "That username is taken.",
    INVALID_REQUEST: "That username doesn't follow the rule below it.",
    FORBIDDEN: "This sign-in has expired. Start again.",
  });
  working.value = false;
  if (refused === null || refused === "FORBIDDEN") emit("done");
}
</script>

<template>
  <form v-if="choosing" class="card form-card" @submit.prevent="choose">
    <h1>Choose a username</h1>
    <label class="field">
      Username
      <input v-model="username" autocomplete="username" autocapitalize="off" spellcheck="false" required />
      <span class="hint">3 to 32 letters, digits, _ or -</span>
    </label>
    <p v-if="error" class="refusal" role="alert">{{ error }}</p>
    <button type="submit" class="button primary large" :disabled="working">Continue</button>
  </form>
  <p v-else class="card form-card waiting"><CommonsMark :size="32" />Signing in with Commons…</p>
</template>

<style scoped>
.waiting {
  flex-direction: row;
  align-items: center;
  gap: var(--space-3);
}
</style>
