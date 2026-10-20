<script setup lang="ts">
import { ref } from "vue";
import { api } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import { go } from "../router.ts";
import { addIssue } from "./issues.ts";
import Stepper from "./Stepper.vue";

/**
 * Starting a scenario: its name, and how many roles and issues it has. Starting makes a draft with that many roles and
 * issues, named "Role 1", "Issue 1", and so on, each issue with two options to rename, and opens the editor on it, where
 * each role has a tab of its own. Nothing is shared until the author publishes it.
 */
const { sessionEnded } = useSession();
const name = ref("");
const roles = ref(2);
const issues = ref(3);
const working = ref(false);
const error = ref<string | null>(null);

async function start() {
  if (working.value) return;
  working.value = true;
  error.value = null;
  const created = await api.scenarios.create({ name: name.value.trim() });
  if ("error" in created) {
    if (created.error === "UNAUTHORIZED") sessionEnded();
    error.value = messageFor("/scenarios/create", created.error);
    working.value = false;
    return;
  }
  const { scenario } = created;
  for (let number = 1; number <= roles.value; number++) await api.scenarios.roles.add({ scenario, name: `Role ${number}`, batna: 0 });
  for (let number = 1; number <= issues.value; number++) await addIssue(scenario, `Issue ${number}`);
  go(`/write/${scenario}`);
}
</script>

<template>
  <section class="page start">
    <header class="page-head">
      <a class="back" href="/" @click.prevent="go('/')">← The bakery</a>
      <h1>Write a scenario</h1>
      <p class="lead">
        Name it, and say how many sides and issues it has. Next, you'll describe the issues and write each side's brief and
        points. Nobody else sees it until you publish it.
      </p>
    </header>
    <form class="panel" @submit.prevent="start">
      <label class="field">
        Name
        <input v-model="name" maxlength="100" placeholder="The Lease" required autofocus />
        <span class="hint">What people pick in the bakery, such as The Job Offer.</span>
      </label>
      <Stepper v-model="roles" label="Roles" hint="The sides at the table, each with a brief of its own" :min="2" :max="6" />
      <Stepper v-model="issues" label="Issues" hint="What they negotiate over, such as the salary" :min="1" :max="8" />
      <p v-if="error" class="refusal" role="alert">{{ error }}</p>
      <button type="submit" class="button primary large" :disabled="working || name.trim() === ''">
        {{ working ? "Setting the table…" : "Start writing" }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.start {
  max-width: 560px;
}
.back {
  display: inline-block;
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}
.back:hover {
  text-decoration: underline;
}
form {
  gap: var(--space-4);
}
</style>
