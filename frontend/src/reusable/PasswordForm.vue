<!-- Copied from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { api } from "../api/client.ts";
import { useSession } from "./session.ts";

const { enter, error } = useSession();
const creating = ref(false);
const username = ref("");
const password = ref("");
const working = ref(false);
const words = computed(() =>
  creating.value
    ? { action: "Create account", other: "Have an account?", switchTo: "Sign in" }
    : { action: "Sign in", other: "New here?", switchTo: "Create an account" },
);

async function submit() {
  working.value = true;
  const name = username.value.trim();
  if (creating.value) {
    await enter(api.auth.register({ username: name, password: password.value }), {
      CONFLICT: "That username is taken.",
      INVALID_REQUEST: "That username or password doesn't follow the rules under each box.",
    });
  } else {
    await enter(api.auth.login({ username: name, password: password.value }), {
      UNAUTHORIZED: "The username or password is incorrect.",
    });
  }
  working.value = false;
}

function switchMode() {
  creating.value = !creating.value;
  error.value = null;
}
</script>

<template>
  <form class="password-form" @submit.prevent="submit">
    <label class="field">
      Username
      <!-- Browsers compile `pattern` with the v flag, which needs the hyphen escaped. -->
      <input
        v-model="username"
        autocomplete="username"
        autocapitalize="off"
        spellcheck="false"
        required
        :pattern="creating ? '[A-Za-z0-9_\\-]{3,32}' : undefined"
      />
      <span v-if="creating" class="hint">3 to 32 letters, digits, _ or -</span>
    </label>
    <label class="field">
      Password
      <input
        v-model="password"
        type="password"
        :autocomplete="creating ? 'new-password' : 'current-password'"
        required
        :minlength="creating ? 8 : undefined"
      />
      <span v-if="creating" class="hint">8 to 128 characters</span>
    </label>
    <button type="submit" class="button outline large" :disabled="working">{{ words.action }}</button>
    <p class="switch">
      {{ words.other }} <button type="button" class="text-button" @click="switchMode">{{ words.switchTo }}</button>
    </p>
  </form>
</template>

<style scoped>
.password-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.switch {
  text-align: center;
  color: var(--color-text-muted);
}
</style>
