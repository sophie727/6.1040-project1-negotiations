<script setup lang="ts">
import { ref } from "vue";
import { api, type TableView } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { pastryFor } from "../bakery/pastries.ts";
import { useSession } from "../reusable/session.ts";
import Dialog from "../reusable/ui/Dialog.vue";
import AtTheTable from "./AtTheTable.vue";
import Markdown from "./Markdown.vue";
import Notes from "./Notes.vue";
import PrepSheet from "./PrepSheet.vue";
import StartPanel from "./StartPanel.vue";

/**
 * Your Slice: the person reads their confidential brief and takes notes, sees who else sits at the table, or the link
 * to invite friends, and when they're ready, suggests how long to negotiate, or agrees to the length someone suggested.
 */
const props = defineProps<{ view: TableView }>();
const emit = defineEmits<{ changed: [] }>();

/** Leaving before the clock starts, such as when a friend never comes: the table ends, with nothing negotiated. */
const confirmingLeave = ref(false);
const leaveError = ref<string | null>(null);
async function leave() {
    const result = await api.tables.withdraw({ table: props.view.table.table });
    confirmingLeave.value = false;
    if ("error" in result) {
        if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
        leaveError.value = messageFor("/tables/withdraw", result.error);
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
                    You're playing {{ view.table.roleName }}. The clock doesn't
                    run until everyone agrees how long to negotiate.
                </p>
            </div>
        </div>
        <div class="columns">
            <section class="panel" aria-label="Confidential brief">
                <Markdown :markdown="view.table.brief" />
            </section>
            <div class="side">
                <AtTheTable :view="view" />
                <PrepSheet v-if="view.plan.on" :view="view" />
                <section class="panel">
                    <h2>Notes</h2>
                    <Notes
                        :table="view.table.table"
                        :saved="view.notes.body"
                        :rows="10"
                    />
                </section>
                <StartPanel :view="view" @changed="emit('changed')" />
                <p v-if="leaveError" class="refusal" role="alert">{{ leaveError }}</p>
                <button type="button" class="text-button leave" @click="confirmingLeave = true">Leave this table</button>
            </div>
        </div>

        <Dialog v-if="confirmingLeave" title="Leave this table?" @close="confirmingLeave = false">
            <p>
                Nobody has started negotiating yet, so leaving just closes the table. Everyone else at it will see that
                you left.
            </p>
            <div class="dialog-actions">
                <button type="button" class="button outline" @click="confirmingLeave = false">Stay</button>
                <button type="button" class="button danger" @click="leave">Leave</button>
            </div>
        </Dialog>
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
.leave {
    align-self: center;
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
