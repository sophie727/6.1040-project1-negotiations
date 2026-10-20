<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { api, type DraftRole, type ScenarioId } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { pastryFor } from "../bakery/pastries.ts";
import { useSession } from "../reusable/session.ts";
import Dialog from "../reusable/ui/Dialog.vue";
import { go } from "../router.ts";
import { briefFor, narrativeOf } from "./brief.ts";
import GeneralTab from "./GeneralTab.vue";
import RoleTab from "./RoleTab.vue";
import { stillMissing, useDraft } from "./draft.ts";

/**
 * A scenario its author is writing: a General tab with what everyone at the table shares, and a tab for each role with
 * their brief and points. Every change is saved as the author makes it. Publishing puts it in the bakery for everyone,
 * after which nothing about it can change, so the page then shows it as it was published.
 */
const props = defineProps<{ scenario: ScenarioId }>();
const { draft, trouble, saving, saved, load, save } = useDraft(props.scenario);
onMounted(load);

/** The open tab: "general", or a role's id. */
const tab = ref<"general" | DraftRole["role"]>("general");
const openRole = computed(() => draft.value?.roles.find(({ role }) => role === tab.value));
// A role that was removed has no tab, so its page goes back to General.
watch(openRole, (role) => {
  if (role === undefined) tab.value = "general";
});

const published = computed(() => draft.value?.published ?? false);
const missing = computed(() => (draft.value === null ? [] : stillMissing(draft.value)));
const briefWritten = (role: DraftRole) => narrativeOf(role.brief, role.name).trim() !== "";

// Publishing

const publishing = ref(false);
const working = ref(false);
const publishProblem = ref<string | null>(null);
const justPublished = ref(false);

/** Opens the publish dialog, which lists what's missing, or asks the author to confirm. */
function startPublishing() {
  publishing.value = true;
  justPublished.value = false;
  publishProblem.value = null;
}

/**
 * Publishes the scenario: first every option a role has no points for gets 0 points, then each brief gets its title and
 * the role's points added below what the author wrote, and then Briefing publishes it.
 */
async function publish() {
  const current = draft.value;
  if (current === null || working.value) return;
  working.value = true;
  publishProblem.value = null;
  const steps: { path: string; call: () => Promise<object> }[] = [];
  for (const role of current.roles) {
    const scored = new Set(role.payoffs.map(({ option }) => option));
    for (const issue of current.issues) {
      for (const { option } of issue.options) {
        if (!scored.has(option)) steps.push({ path: "/scenarios/payoffs/set", call: () => api.scenarios.payoffs.set({ role: role.role, option, points: 0 }) });
      }
    }
    const brief = briefFor(role, narrativeOf(role.brief, role.name), current.issues);
    steps.push({ path: "/scenarios/roles/brief", call: () => api.scenarios.roles.brief({ role: role.role, brief }) });
  }
  steps.push({ path: "/scenarios/publish", call: () => api.scenarios.publish({ scenario: current.scenario }) });
  for (const { path, call } of steps) {
    const result = await call();
    if ("error" in result && typeof result.error === "string") {
      if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
      publishProblem.value = messageFor(path, result.error);
      break;
    }
  }
  await load();
  working.value = false;
  if (publishProblem.value === null) justPublished.value = true;
}

async function discard() {
  if (!window.confirm(`Discard ${draft.value?.name ?? "this draft"}? Everything in it goes, and it can't come back.`)) return;
  const problem = await save("/scenarios/discard", api.scenarios.discard({ scenario: props.scenario }));
  if (problem === null) go("/");
}
</script>

<template>
  <section class="page editor">
    <a class="back" href="/" @click.prevent="go('/')">← The bakery</a>

    <div v-if="trouble && !draft" class="notice">
      <h1>{{ trouble }}</h1>
      <a class="button primary" href="/" @click.prevent="go('/')">Back to the bakery</a>
    </div>
    <p v-else-if="!draft" class="notice muted">Opening the scenario…</p>

    <template v-else>
      <header class="head">
        <div class="titles">
          <h1>
            <span aria-hidden="true">{{ pastryFor(draft.name) }}</span>
            {{ draft.name }}
          </h1>
          <p class="state">
            <span class="badge" :class="published ? 'good' : 'warm'">{{ published ? "Published" : "Draft" }}</span>
            <span v-if="published" class="muted">It's in the bakery, and it can't change anymore.</span>
            <span v-else class="muted" aria-live="polite">
              {{ saving > 0 ? "Saving…" : saved ? "Every change is saved." : "Only you can see this draft until you publish it." }}
            </span>
          </p>
        </div>
        <div v-if="!published" class="actions">
          <button type="button" class="text-button" @click="discard">Discard draft</button>
          <button type="button" class="button primary" @click="startPublishing">Publish…</button>
        </div>
      </header>

      <nav class="tabs" role="tablist" aria-label="Parts of the scenario">
        <button type="button" role="tab" :aria-selected="tab === 'general'" @click="tab = 'general'">General</button>
        <button
          v-for="role in draft.roles"
          :key="role.role"
          type="button"
          role="tab"
          :aria-selected="tab === role.role"
          @click="tab = role.role"
        >
          {{ role.name }}
          <span v-if="!briefWritten(role) && !published" class="dot" title="No brief yet" aria-label="(no brief yet)" />
        </button>
      </nav>

      <GeneralTab v-if="tab === 'general' || openRole === undefined" :draft="draft" :save="save" :readonly="published" @open-role="tab = $event" />
      <RoleTab v-else :key="openRole.role" :draft="draft" :role="openRole" :save="save" :readonly="published" />
    </template>

    <Dialog v-if="publishing && draft" :title="justPublished ? 'Published!' : `Publish ${draft.name}?`" @close="publishing = false">
      <div class="publish">
        <template v-if="justPublished">
          <p>{{ draft.name }} is in the bakery now. Anyone can practice it against the AI, play it with friends, or be matched for it.</p>
          <button type="button" class="button primary large" @click="go('/')">Go to the bakery</button>
        </template>
        <template v-else-if="missing.length > 0">
          <p>A few things are missing before people can negotiate it:</p>
          <ul class="missing">
            <li v-for="item in missing" :key="item">{{ item }}</li>
          </ul>
        </template>
        <template v-else>
          <p>
            Everyone will see it in the bakery, and nobody can change it after, you included. Each brief gets its role's points
            and BATNA added below what you wrote, and any option you gave a role no points for is worth 0 to them.
          </p>
          <p v-if="publishProblem" class="refusal" role="alert">{{ publishProblem }}</p>
          <button type="button" class="button primary large" :disabled="working" @click="publish">
            {{ working ? "Publishing…" : "Publish it" }}
          </button>
        </template>
      </div>
    </Dialog>
  </section>
</template>

<style scoped>
.back {
  align-self: flex-start;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}
.back:hover {
  text-decoration: underline;
}
.editor {
  gap: var(--space-4);
}
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}
.head h1 {
  font-size: var(--text-3xl);
}
.state {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
}
.state .muted {
  font-size: var(--text-sm);
}
.actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.tabs {
  flex-wrap: wrap;
}
.tabs button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-base);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-gold);
}
.publish {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 480px;
}
.missing {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-left: 1.25em;
}
</style>
