<script setup lang="ts">
import { ref } from "vue";
import { api, type TableView } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { pastryFor } from "../bakery/pastries.ts";
import { useSession } from "../reusable/session.ts";
import Markdown from "./Markdown.vue";
import Notes from "./Notes.vue";

/** Your Slice: the person reads their confidential brief and takes notes, and starts the clock when they're ready. */
const props = defineProps<{ view: TableView }>();
const emit = defineEmits<{ changed: [] }>();

const working = ref(false);
const error = ref<string | null>(null);

async function begin() {
    working.value = true;
    const result = await api.tables.begin({ table: props.view.table.table });
    working.value = false;
    if ("error" in result) {
        if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
        error.value = messageFor("/tables/begin", result.error);
        return;
    }
    emit("changed");
}
</script>

<template>
    <section class="page">
        <header class="page-head">
            <h1>Your Slice</h1>
            <p class="lead">Preparing for your negotiation</p>
        </header>
        <div class="banner panel">
            <span class="pastry" aria-hidden="true">{{
                pastryFor(view.table.scenarioName)
            }}</span>
            <div>
                <h2 class="display">{{ view.table.scenarioName }}</h2>
                <p class="muted">
                    You're playing {{ view.table.roleName }}. Once you start,
                    you'll have {{ view.table.timeLimit }} minutes.
                </p>
            </div>
        </div>
        <div class="columns">
            <section class="panel" aria-label="Confidential brief">
                <Markdown :markdown="view.table.brief" />
            </section>
            <div class="side">
                <section class="panel">
                    <h2>Notes</h2>
                    <Notes
                        :table="view.table.table"
                        :saved="view.notes.body"
                        :rows="14"
                    />
                </section>
                <p v-if="error" class="refusal" role="alert">{{ error }}</p>
                <button
                    type="button"
                    class="button primary large start"
                    :disabled="working"
                    @click="begin"
                >
                    Start cooking!
                </button>
                <p class="muted center">
                    The clock starts when you do. Your counterpart is waiting at
                    the table.
                </p>
            </div>
        </div>
    </section>
</template>

<style scoped>
.banner {
    flex-direction: row;
    align-items: center;
    gap: var(--space-4);
}
.banner h2 {
    font-size: var(--text-2xl);
}
.pastry {
    font-size: 48px;
    line-height: 1;
}
.columns {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: var(--space-6);
    align-items: start;
}
.side {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    position: sticky;
    top: calc(var(--topbar-height) + var(--space-4));
}
.start {
    font-size: var(--text-lg);
}
.center {
    text-align: center;
}
@media (max-width: 800px) {
    .columns {
        grid-template-columns: 1fr;
    }
    .side {
        position: static;
    }
}
</style>
