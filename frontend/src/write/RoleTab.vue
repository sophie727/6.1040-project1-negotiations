<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { api, type Draft, type DraftOption, type DraftRole } from "../api/client.ts";
import InfoTip from "../reusable/ui/InfoTip.vue";
import Markdown from "../table/Markdown.vue";
import { briefFor, narrativeOf } from "./brief.ts";
import { bestOn, pointsOf, type Save, scaleOf, stepOf } from "./draft.ts";
import PayoffChart from "./PayoffChart.vue";

/**
 * A role's tab: who they are, a sentence or two everyone sees before choosing a side, which can change even after
 * publishing; their confidential brief, written as the negotiator playing them will read it; and beside it what each
 * option is worth to them, drawn as a chart for each issue, with their BATNA. The preview shows the whole brief, with
 * the points the page adds below what the author wrote when they publish.
 */
const props = defineProps<{ draft: Draft; role: DraftRole; save: Save; readonly: boolean }>();

const narrative = ref(narrativeOf(props.role.brief, props.role.name));
const showing = ref<"write" | "preview">(props.readonly ? "preview" : "write");
const briefProblem = ref<string | null>(null);
const summary = ref(props.role.summary ?? "");
const summaryProblem = ref<string | null>(null);
const pointsProblem = ref<string | null>(null);

const placeholder = computed(
  () => `## The situation

Who is ${props.role.name}, who are they negotiating with, and what is on the table? What does everyone know?

## Your priorities

What matters most to ${props.role.name}, what matters less, and why? What happens if there's no deal?`,
);

let timer: ReturnType<typeof setTimeout> | undefined;
/** Saves the brief a moment after the author stops typing. */
function soon() {
  clearTimeout(timer);
  timer = setTimeout(writeBrief, 800);
}

/** Saves what the author wrote, unless it is blank, which a brief can't be, or what is saved already. */
async function writeBrief() {
  clearTimeout(timer);
  timer = undefined;
  const written = narrative.value;
  if (props.readonly || written.trim() === "" || written === narrativeOf(props.role.brief, props.role.name)) return;
  briefProblem.value = await props.save("/scenarios/roles/brief", api.scenarios.roles.brief({ role: props.role.role, brief: written }));
}
onBeforeUnmount(() => {
  if (timer !== undefined) void writeBrief();
});

/** Saves who the role is, unless it hasn't changed; a blank summary clears it. */
async function writeSummary() {
  if (summary.value.trim() === (props.role.summary ?? "")) return;
  summaryProblem.value = await props.save("/scenarios/roles/summary", api.scenarios.roles.summary({ role: props.role.role, summary: summary.value }));
}

/** Shows the whole brief, saving what the author wrote first. */
function preview() {
  void writeBrief();
  showing.value = "preview";
}

const points = computed(() => pointsOf(props.role));
const scale = computed(() => scaleOf(props.role.payoffs.map(({ points }) => points)));
const step = computed(() => stepOf(scale.value));
/** The most a deal can be worth to the role: the best option of every issue. */
const best = computed(() => props.draft.issues.reduce((sum, issue) => sum + bestOn(issue, points.value), 0));
const shown = (points: number) => Math.round(points).toLocaleString("en-US");

async function setPoints(option: DraftOption["option"], worth: number) {
  pointsProblem.value = await props.save("/scenarios/payoffs/set", api.scenarios.payoffs.set({ role: props.role.role, option, points: worth }));
}

async function setBatna(event: Event) {
  const box = event.target as HTMLInputElement;
  const batna = box.valueAsNumber;
  if (Number.isNaN(batna)) {
    box.value = String(props.role.batna);
    return;
  }
  if (batna === props.role.batna) return;
  const call = api.scenarios.roles.update({ role: props.role.role, name: props.role.name, batna });
  pointsProblem.value = await props.save("/scenarios/roles/update", call);
}
</script>

<template>
  <div class="role">
    <section class="panel brief">
      <label class="field">
        Who {{ role.name }} is
        <textarea
          v-model="summary"
          class="box"
          rows="2"
          maxlength="300"
          :placeholder="`Such as: the head of operations at a data company, hiring someone to lead a team.`"
          @blur="writeSummary"
        />
        <span class="hint">
          Everyone sees this in the bakery when they choose a side, so keep secrets for the brief. You can change it even
          after you publish.
        </span>
      </label>
      <p v-if="summaryProblem" class="refusal" role="alert">{{ summaryProblem }}</p>
      <header>
        <h2>{{ role.name }}'s brief</h2>
        <div class="tabs" role="tablist" aria-label="Write or preview the brief">
          <button v-if="!readonly" type="button" role="tab" :aria-selected="showing === 'write'" @click="showing = 'write'">Write</button>
          <button type="button" role="tab" :aria-selected="showing === 'preview'" @click="preview">Preview</button>
        </div>
      </header>
      <template v-if="showing === 'write'">
        <textarea
          v-model="narrative"
          class="box narrative"
          rows="20"
          maxlength="15000"
          :placeholder="placeholder"
          :aria-label="`${role.name}'s brief`"
          @input="soon"
          @blur="writeBrief"
        />
        <p class="muted">
          Write what {{ role.name }} knows and wants, in Markdown: # for a heading, **bold**, and - for a list. Only the
          negotiator playing {{ role.name }} reads it. When you publish, {{ role.name }}'s points and BATNA are added below it,
          as the preview shows.
        </p>
      </template>
      <div v-else class="preview">
        <Markdown :markdown="briefFor(role, narrative, draft.issues)" />
      </div>
      <p v-if="briefProblem" class="refusal" role="alert">{{ briefProblem }}</p>
    </section>

    <section class="panel worth">
      <h2>
        What each option is worth to {{ role.name }}
        <InfoTip label="How points work">
          <span>
            Points are how {{ role.name }} keeps score. Only whoever plays {{ role.name }} sees them, and the coach uses every
            role's to reveal the whole pie afterward.
          </span>
          <span>
            A deal is worth the points of what it settles on every issue, added up. Give the issues {{ role.name }} cares about
            most the most points, and give each role different priorities, so there's something to trade.
          </span>
        </InfoTip>
      </h2>
      <p v-if="readonly" class="muted">
        A deal is worth the points of what it settles on every issue, added up, so the issues that matter most to {{ role.name }}
        stand tallest.
      </p>
      <p v-else class="muted">
        Drag a bar or a point up or down, or type a number under it, to set an option's points.
        <InfoTip label="More ways to set points">
          <span>
            You can also click a bar or point and press the arrow keys to move it a step, or Page Up and Page Down to move it ten.
            Typing lets you set any number, including a negative one, for an outcome {{ role.name }} would hate.
          </span>
          <span>
            Every chart of {{ role.name }}'s shares one scale, so the issues that matter most to them stand tallest. On a range,
            the line shows what every value between two points is worth.
          </span>
        </InfoTip>
      </p>
      <div class="sums">
        <div class="field batna">
          <span class="batna-label">
            <label :for="`batna-${role.role}`">BATNA</label>
            <InfoTip label="What's a BATNA?">
              {{ role.name }}'s Best Alternative To a Negotiated Agreement: the points {{ role.name }} gets with no deal, if
              someone walks away or time runs out. Set it above {{ role.name }}'s worst deal and below their best, so some deals
              are worth taking and some aren't.
            </InfoTip>
          </span>
          <span class="with-unit">
            <input :id="`batna-${role.role}`" type="number" :value="role.batna" :disabled="readonly" @change="setBatna" />
            <span class="muted">points</span>
          </span>
          <span class="hint">What {{ role.name }} gets by walking away, with no deal.</span>
        </div>
        <div class="best">
          <span class="muted">The best deal for {{ role.name }}</span>
          <strong class="display">{{ shown(best) }} points</strong>
        </div>
      </div>
      <p v-if="role.batna > best" class="warning" role="status">
        No deal can beat {{ role.name }}'s BATNA, so they'd be right to walk away from any. Lower it, or give them more
        points.
      </p>
      <PayoffChart
        v-for="issue in draft.issues"
        :key="issue.issue"
        :issue="issue"
        :points="points"
        :scale="scale"
        :step="step"
        :readonly="readonly"
        @set="setPoints"
      />
      <p v-if="pointsProblem" class="refusal" role="alert">{{ pointsProblem }}</p>
    </section>
  </div>
</template>

<style scoped>
.role {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--space-5);
  align-items: start;
}
.brief header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.brief h2 {
  font-size: var(--text-lg);
}
.batna-label {
  display: flex;
  align-items: center;
}
.brief .narrative {
  min-height: 420px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--text-sm);
  line-height: 1.6;
}
.preview {
  padding: var(--space-4);
  border: 1.5px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-page);
}
.sums {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}
.batna input {
  width: 120px;
}
.with-unit {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.best {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.best strong {
  font-size: var(--text-2xl);
  color: var(--color-accent);
}
.warning {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-gold-soft);
  color: #6b4e07;
  font-size: var(--text-sm);
}
@media (max-width: 900px) {
  .role {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
