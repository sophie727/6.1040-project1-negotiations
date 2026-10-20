<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api, type Invitation } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { pastryFor } from "../bakery/pastries.ts";
import { useSession } from "../reusable/session.ts";
import { go } from "../router.ts";

/**
 * Where a link to a friend's table leads: who sent it, the scenario, and the empty seats. Joining takes one and goes to
 * the table. Someone already at the table, such as the person who sent the link, goes straight there.
 */
const props = defineProps<{ code: string }>();

const invitation = ref<Invitation | null>(null);
const error = ref<string | null>(null);
const role = ref<Invitation["openSeats"][number]["role"] | null>(null);
const joining = ref(false);

function refused(path: string, code: string) {
  if (code === "UNAUTHORIZED") useSession().sessionEnded();
  error.value = messageFor(path, code);
}

onMounted(async () => {
  const result = await api.friends.invitation({ code: props.code });
  if ("error" in result) return refused("/friends/invitation", result.error);
  if ("table" in result) return go(`/tables/${result.table}`);
  invitation.value = result.invitation;
  role.value = result.invitation.openSeats[0]?.role ?? null;
});

const seats = computed(() => invitation.value?.openSeats ?? []);
const chosenName = computed(() => seats.value.find((seat) => seat.role === role.value)?.name);

async function join() {
  if (role.value === null) return;
  joining.value = true;
  const result = await api.friends.join({ code: props.code, role: role.value });
  joining.value = false;
  if ("error" in result) return refused("/friends/join", result.error);
  go(`/tables/${result.table}`);
}
</script>

<template>
  <section class="page join">
    <div v-if="invitation" class="panel invitation">
      <span class="pastry" aria-hidden="true">{{ pastryFor(invitation.scenarioName) }}</span>
      <h1 class="display">You're invited</h1>
      <p class="lead">
        <strong>{{ invitation.inviter }}</strong> invited you to negotiate <strong>{{ invitation.scenarioName }}</strong>.
      </p>
      <fieldset v-if="seats.length > 1">
        <legend>Which side do you want to play?</legend>
        <div class="roles">
          <label v-for="seat in seats" :key="seat.role" class="role" :class="{ chosen: role === seat.role }">
            <input v-model="role" type="radio" name="role" :value="seat.role" />
            {{ seat.name }}
          </label>
        </div>
      </fieldset>
      <p v-else-if="chosenName" class="muted">You'll play {{ chosenName }}.</p>
      <p class="muted">
        You'll read your confidential brief first. The clock starts once everyone agrees how long to negotiate{{
          invitation.recommendedTimeLimit === null ? "" : `; the author recommends ${invitation.recommendedTimeLimit} minutes`
        }}.
      </p>
      <p v-if="error" class="refusal" role="alert">{{ error }}</p>
      <button type="button" class="button primary large" :disabled="joining || role === null" @click="join">Join the table</button>
    </div>
    <div v-else-if="error" class="notice">
      <h1>This link doesn't lead anywhere now</h1>
      <p>{{ error }}</p>
      <a class="button primary" href="/" @click.prevent="go('/')">Go to the bakery</a>
    </div>
    <p v-else class="notice muted">Opening the invitation…</p>
  </section>
</template>

<style scoped>
.invitation {
  max-width: 520px;
  margin: 0 auto;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}
.pastry {
  font-size: 56px;
  line-height: 1;
}
.invitation h1 {
  font-size: var(--text-3xl);
}
.lead {
  font-size: var(--text-lg);
}
fieldset {
  width: 100%;
  padding: 0;
  border: 0;
}
legend {
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
}
.roles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-2);
}
.role {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 12px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}
.role.chosen {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}
.role input {
  accent-color: var(--color-accent);
}
</style>
