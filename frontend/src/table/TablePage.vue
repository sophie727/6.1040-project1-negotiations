<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { api, type TableId, type TableView } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import WholePie from "../pie/WholePie.vue";
import { useSession } from "../reusable/session.ts";
import { go } from "../router.ts";
import { hasEnded } from "./format.ts";
import TheTable from "./TheTable.vue";
import YourSlice from "./YourSlice.vue";

/**
 * One table, shown as the page for its stage: Your Slice while the person prepares, The Table while they negotiate, and
 * The Whole Pie once it has ended. It asks the server for the table every POLL_MS, so the counterpart's messages and
 * answers appear without a refresh, and stops once the negotiation has ended.
 */
const props = defineProps<{ table: TableId }>();
const POLL_MS = 1500;

const { sessionEnded } = useSession();
const view = ref<TableView | null>(null);
const missing = ref<string | null>(null);
const unreachable = ref(false);
let loading = false;
let timer: ReturnType<typeof setInterval> | undefined;

async function refresh() {
  if (loading) return;
  loading = true;
  const result = await api.tables.show({ table: props.table });
  loading = false;
  if ("error" in result) {
    if (result.error === "UNAUTHORIZED") sessionEnded();
    else if (result.error === "NOT_FOUND") missing.value = messageFor("/tables/show", result.error);
    // Any other failure, such as a lost connection, passes: the next poll tries again.
    else unreachable.value = true;
    return;
  }
  unreachable.value = false;
  view.value = result;
  if (hasEnded(result.table.status)) stop();
}

function stop() {
  clearInterval(timer);
  timer = undefined;
}

onMounted(() => {
  void refresh();
  timer = setInterval(refresh, POLL_MS);
});
onUnmounted(stop);
</script>

<template>
  <section v-if="missing" class="notice">
    <h1>Not found</h1>
    <p>{{ missing }}</p>
    <a class="button primary" href="/" @click.prevent="go('/')">Back to the bakery</a>
  </section>
  <template v-else-if="view">
    <p v-if="unreachable" class="refusal reconnecting" role="status">Reconnecting to the server…</p>
    <YourSlice v-if="view.table.status === 'PREPARING'" :view="view" @changed="refresh" />
    <TheTable v-else-if="view.table.status === 'OPEN'" :view="view" @changed="refresh" />
    <WholePie v-else :view="view" />
  </template>
  <p v-else class="notice muted">Setting the table…</p>
</template>

<style scoped>
.reconnecting {
  max-width: 1168px;
  margin: 0 auto var(--space-3);
}
</style>
