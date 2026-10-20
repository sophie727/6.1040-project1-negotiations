<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from "vue";
import { api, type Message, type Proposal, type TableView } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import Dialog from "../reusable/ui/Dialog.vue";
import Icon from "../reusable/ui/Icon.vue";
import Splitter from "../reusable/ui/Splitter.vue";
import { storedShare } from "../reusable/ui/splitter.ts";
import Markdown from "./Markdown.vue";
import Countdown from "./Countdown.vue";
import { formatTime } from "./format.ts";
import Notes from "./Notes.vue";
import PictureADeal from "./PictureADeal.vue";
import PrepSheet from "./PrepSheet.vue";
import { hasCounterpart, othersAt } from "./players.ts";
import ProposalCard from "./ProposalCard.vue";

/**
 * The Table: the countdown and the conversation, with its proposals, on the left; on the right, the person's brief and
 * notes, and below them a deal they can picture and propose. Together they fill the screen, and the person drags the
 * bars between them to give the chat, the brief, or the deal more room.
 */
const props = defineProps<{ view: TableView }>();
const emit = defineEmits<{ changed: [] }>();
const { sessionEnded } = useSession();

const table = computed(() => props.view.table);
const names = computed(() => new Map(table.value.seats.map(({ role, name }) => [role, name])));
/** The other seats, as a sentence: the AI by its role's name, and each person by their username and role. */
const others = computed(() => othersAt(table.value));
const withCounterpart = computed(() => hasCounterpart(table.value));

/** Messages and proposals together, oldest first. */
type Entry = { kind: "message"; at: string; message: Message } | { kind: "proposal"; at: string; proposal: Proposal };
const timeline = computed<Entry[]>(() =>
  [
    ...table.value.messages.map((message): Entry => ({ kind: "message", at: message.sentAt, message })),
    ...table.value.proposals.map((proposal): Entry => ({ kind: "proposal", at: proposal.proposedAt, proposal })),
  ].sort((a, b) => a.at.localeCompare(b.at)),
);

/** Why the counterpart couldn't answer the newest question, if it couldn't: the reason the agent gave when it abandoned it. */
const trouble = computed(() => {
  const newest = props.view.questions.at(-1);
  return newest?.stage === "ABANDONED" ? (newest.reason ?? "Something went wrong.") : null;
});

// The chat follows new entries, unless the person has scrolled up to read.
const scroller = ref<HTMLElement | null>(null);
watch(
  () => [timeline.value.length, props.view.openQuestions, table.value.proposals.map(({ status }) => status).join(), trouble.value],
  async () => {
    const box = scroller.value;
    const following = box === null || box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    await nextTick();
    if (following && scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
  },
  { immediate: true },
);

// Talking

const draft = ref("");
const sending = ref(false);
const error = ref<string | null>(null);

function refused(path: string, code: string) {
  if (code === "UNAUTHORIZED") sessionEnded();
  error.value = messageFor(path, code);
}

async function send() {
  const body = draft.value.trim();
  if (body === "" || sending.value) return;
  sending.value = true;
  const result = await api.tables.send({ table: table.value.table, body });
  sending.value = false;
  if ("error" in result) return refused("/tables/send", result.error);
  error.value = null;
  draft.value = "";
  emit("changed");
}

function sendOnEnter(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    void send();
  }
}

// The clock and walking away

let expiring = false;
/** When the countdown reaches zero, the table expires; the server checks the deadline itself. */
async function due() {
  if (expiring) return;
  expiring = true;
  await api.tables.expire({ table: table.value.table });
  expiring = false;
  emit("changed");
}

const confirmingWalkAway = ref(false);
async function walkAway() {
  const result = await api.tables.withdraw({ table: table.value.table });
  confirmingWalkAway.value = false;
  if ("error" in result) return refused("/tables/withdraw", result.error);
  emit("changed");
}

const tab = ref<"brief" | "notes" | "plan">("brief");

// Sharing the room

/** The fewest pixels the chat and the side beside it can have across, and the brief and the deal can have down. */
const LEAST = { chat: 360, side: 320, brief: 150, deal: 300 } as const;
const CHAT_SHARE = 0.6;
const BRIEF_SHARE = 0.35;
/** How much of the width the chat takes, and how much of the side's height the brief and notes take. */
const chatShare = storedShare("wholepie-chat-share", CHAT_SHARE);
const briefShare = storedShare("wholepie-brief-share", BRIEF_SHARE);
const columnsStyle = computed(() => ({
  "--columns": `minmax(${LEAST.chat}px, ${chatShare.value * 100}fr) var(--space-6) minmax(${LEAST.side}px, ${(1 - chatShare.value) * 100}fr)`,
}));
const sideStyle = computed(() => ({
  "--brief-share": briefShare.value,
  "--brief-least": `${LEAST.brief}px`,
  "--deal-least": `${LEAST.deal}px`,
}));
const chatId = useId();
const materialsId = useId();
</script>

<template>
  <section class="page">
    <div class="columns" :style="columnsStyle">
      <div :id="chatId" class="main">
        <header class="top">
          <div>
            <h1>The Table</h1>
            <p class="muted">{{ table.scenarioName }} · You're {{ table.roleName }}, negotiating with {{ others }}</p>
          </div>
          <div class="controls">
            <Countdown v-if="table.deadline" :deadline="table.deadline" @due="due" />
            <button type="button" class="button outline" @click="confirmingWalkAway = true">
              <Icon name="door" />
              Walk away
            </button>
          </div>
        </header>

        <section class="panel chat" aria-label="Chat">
          <h2>Chat</h2>
          <div ref="scroller" class="timeline" aria-live="polite">
            <p v-if="timeline.length === 0" class="empty muted">
              <template v-if="withCounterpart">
                The clock is running. Say hello, ask a question, or make an offer: {{ others }} is waiting for you to open.
              </template>
              <template v-else>The clock is running. Say hello, ask a question, or make an offer.</template>
            </p>
            <template v-for="entry in timeline" :key="entry.kind === 'message' ? entry.message.message : entry.proposal.proposal">
              <div v-if="entry.kind === 'message'" class="message" :class="{ mine: entry.message.sender === table.role }">
                <span class="who muted">
                  {{ entry.message.sender === table.role ? "You" : names.get(entry.message.sender) }} · {{ formatTime(entry.message.sentAt) }}
                </span>
                <p class="bubble">{{ entry.message.body }}</p>
              </div>
              <ProposalCard v-else :proposal="entry.proposal" :table="table" @changed="emit('changed')" />
            </template>
            <p v-if="view.openQuestions > 0" class="thinking muted">
              {{ others }} is thinking<span class="dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
            </p>
            <p v-else-if="trouble" class="trouble" role="status">
              {{ others }} couldn't answer: {{ trouble }} Send another message, or propose again, to try again.
            </p>
          </div>
          <form class="composer" @submit.prevent="send">
            <textarea
              v-model="draft"
              class="box"
              rows="2"
              maxlength="2000"
              placeholder="Write a message. Press Enter to send."
              aria-label="Message"
              @keydown="sendOnEnter"
            />
            <button type="submit" class="button primary" :disabled="sending || draft.trim() === ''" aria-label="Send">
              <Icon name="send" />
            </button>
          </form>
          <p v-if="error" class="refusal" role="alert">{{ error }}</p>
        </section>
      </div>

      <Splitter
        v-model:share="chatShare"
        orientation="vertical"
        :initial="CHAT_SHARE"
        :min="[LEAST.chat, LEAST.side]"
        label="Resize the chat"
        :controls="chatId"
      />

      <div class="side" :style="sideStyle">
        <section :id="materialsId" class="panel materials">
          <div class="tabs" role="tablist">
            <button type="button" role="tab" :aria-selected="tab === 'brief'" @click="tab = 'brief'">Brief</button>
            <button type="button" role="tab" :aria-selected="tab === 'notes'" @click="tab = 'notes'">Notes</button>
            <button v-if="view.plan.on || view.plan.target !== null" type="button" role="tab" :aria-selected="tab === 'plan'" @click="tab = 'plan'">
              Plan
            </button>
          </div>
          <div class="tab-body">
            <Markdown v-if="tab === 'brief'" :markdown="table.brief" />
            <PrepSheet v-else-if="tab === 'plan'" :view="view" readonly />
            <Notes v-else :table="table.table" :saved="view.notes.body" :rows="9" />
          </div>
        </section>
        <Splitter
          v-model:share="briefShare"
          orientation="horizontal"
          :initial="BRIEF_SHARE"
          :min="[LEAST.brief, LEAST.deal]"
          label="Resize the brief and the deal"
          :controls="materialsId"
        />
        <PictureADeal :table="table" @changed="emit('changed')" />
      </div>
    </div>

    <Dialog v-if="confirmingWalkAway" title="Walk away?" @close="confirmingWalkAway = false">
      <p>If you walk away, the negotiation ends without a deal, and each side gets its BATNA. Then you'll see the whole pie.</p>
      <div class="dialog-actions">
        <button type="button" class="button outline" @click="confirmingWalkAway = false">Keep negotiating</button>
        <button type="button" class="button danger" @click="walkAway">Walk away</button>
      </div>
    </Dialog>
  </section>
</template>

<style scoped>
.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
.top h1 {
  font-size: var(--text-3xl);
}
.controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
/*
 * The chat on the left, and the brief and the deal on the right, fill the screen down to the page's bottom padding. The
 * bar between the two sides, in the middle column, shares the width between them as the person drags it.
 */
.columns {
  display: grid;
  grid-template-columns: var(--columns);
  height: calc(100vh - var(--topbar-height) - var(--space-8) - var(--space-12));
  min-height: 480px;
}
.main {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 0;
}
.chat {
  flex: 1;
  min-height: 0;
}
.timeline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow-y: auto;
  padding-right: var(--space-1);
}
.empty {
  margin: auto;
  max-width: 320px;
  text-align: center;
}
.message {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 78%;
}
.message.mine {
  align-self: flex-end;
  align-items: flex-end;
}
.bubble {
  padding: 10px 14px;
  border-radius: 16px 16px 16px 4px;
  background: var(--color-line);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.mine .bubble {
  border-radius: 16px 16px 4px 16px;
  color: #ffffff;
  background: var(--color-accent);
}
.trouble {
  align-self: center;
  max-width: 420px;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-danger-soft);
  color: var(--color-danger);
  font-size: var(--text-sm);
  text-align: center;
}
.thinking .dots span {
  animation: blink 1.2s infinite;
}
.thinking .dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.thinking .dots span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes blink {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 1;
  }
}
.composer {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
}
.composer .button {
  min-height: 44px;
}
/*
 * The bar between the brief and the deal shares the side's height between them as the person drags it: the brief takes
 * its share of the height beside the bar, and the deal the rest. When the screen gets shorter, the brief gives way first.
 */
.side {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.side > .splitter {
  flex: none;
  height: var(--space-6);
}
.materials {
  flex: 0 1 auto;
  height: calc((100% - var(--space-6)) * var(--brief-share));
  min-height: var(--brief-least);
}
.side > .deal {
  flex: 1 1 0;
  min-height: var(--deal-least);
}
.tab-body {
  flex: 1;
  overflow-y: auto;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
/* On a narrow screen, the boxes stack at their own heights, and the page scrolls. */
@media (max-width: 800px) {
  .columns {
    grid-template-columns: 1fr;
    gap: var(--space-6);
    height: auto;
    min-height: 0;
  }
  .columns .splitter {
    display: none;
  }
  .side {
    gap: var(--space-6);
  }
  .materials,
  .side > .deal {
    flex: none;
    height: auto;
    min-height: 0;
  }
  .chat,
  .materials {
    max-height: 70vh;
  }
}
</style>
