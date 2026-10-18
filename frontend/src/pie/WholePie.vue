<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { api, type DebriefView, type TableView } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import { go } from "../router.ts";
import { formatAgreed, formatPoints } from "../table/format.ts";
import Markdown from "../table/Markdown.vue";
import { issuePoints } from "../table/points.ts";
import PieChart from "./PieChart.vue";
import TotalValue from "./TotalValue.vue";

/**
 * The Whole Pie: how the negotiation ended, each side's slice of the most the two could have shared, the coach's
 * debrief, how the deal compares with every possible deal, and, issue by issue, how it differs from the best deal.
 * While the coach is writing, the page asks again every POLL_MS, so the debrief appears as it's written.
 */
const props = defineProps<{ view: TableView }>();
const POLL_MS = 1500;
const debriefView = ref<DebriefView | null>(null);
const error = ref<string | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let gone = false;

async function load() {
  const result = await api.tables.debrief({ table: props.view.table.table });
  if (gone) return;
  if ("error" in result) {
    if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
    // A passing failure while the coach writes is retried; a first load that fails shows why.
    if (debriefView.value === null) error.value = messageFor("/tables/debrief", result.error);
  } else {
    debriefView.value = result;
  }
  if (debriefView.value === null || coachWriting.value) timer = setTimeout(load, POLL_MS);
}

onMounted(load);
onUnmounted(() => {
  gone = true;
  clearTimeout(timer);
});

/** The coach's latest debrief, if the coach was asked for one. */
const coaching = computed(() => debriefView.value?.coaching.at(-1));
const coachWriting = computed(() => coaching.value?.stage === "WAITING" || coaching.value?.stage === "FORMING");

const debrief = computed(() => debriefView.value?.debrief);
const me = computed(() => debrief.value?.roles.find(({ role }) => role === debriefView.value?.role));
const others = computed(() => debrief.value?.roles.filter(({ role }) => role !== debriefView.value?.role) ?? []);
const otherNames = computed(() => others.value.map(({ name }) => name).join(" and "));
const rolesYouFirst = computed(() => (me.value ? [me.value, ...others.value] : others.value));

/** What each role ends up with: its points from the agreement, or, without one, its BATNA. */
const got = (role: { points: number | null; batna: number }) => role.points ?? role.batna;
const mine = computed(() => (me.value ? got(me.value) : 0));
const theirs = computed(() => others.value.reduce((sum, role) => sum + got(role), 0));
const joint = computed(() => mine.value + theirs.value);

const headline = computed(() => {
  const outcome = debrief.value?.outcome;
  if (outcome === "SETTLED") return `You and ${otherNames.value} reached a deal.`;
  if (outcome === "WITHDRAWN") {
    const quitter = debrief.value?.walkedAway === me.value?.role ? "You" : otherNames.value;
    return `${quitter} walked away, so each side gets its BATNA.`;
  }
  return "Time ran out before you reached a deal, so each side gets its BATNA.";
});

const slices = computed(() => {
  const best = debrief.value?.bestJointPoints ?? null;
  return [
    { label: "Your value", value: mine.value, color: "var(--color-yours)" },
    { label: `${otherNames.value}'s value`, value: theirs.value, color: "var(--color-theirs)" },
    ...(best === null ? [] : [{ label: "Left on the table", value: Math.max(0, best - joint.value), color: "var(--color-left)" }]),
  ];
});

/**
 * How much of the value a deal could add over walking away this one added, and how much of what it added went to the
 * person. Null when there was nothing to add, or nothing was added.
 */
const scores = computed(() => {
  const best = debrief.value?.bestJointPoints ?? null;
  const noDeal = debrief.value?.jointBatna ?? null;
  if (best === null || noDeal === null || me.value === undefined) return null;
  const created = best > noDeal ? (joint.value - noDeal) / (best - noDeal) : null;
  const claimed = joint.value > noDeal ? (mine.value - me.value.batna) / (joint.value - noDeal) : null;
  return { created, claimed };
});

const percent = (share: number | null) => (share === null ? "—" : `${Math.round(share * 100)}%`);

/** Each issue as the deal and the best deal settled it, with what that was worth to each role. */
const comparison = computed(() => {
  const value = debrief.value;
  if (value === undefined) return [];
  return value.issues.map((issue) => {
    const agreed = value.agreed?.[issue.issue];
    const best = value.best?.[issue.issue];
    const pointsFor = (agreedValue: string | number | undefined) =>
      rolesYouFirst.value.map(({ name, role, payoffs }) => ({
        name: role === me.value?.role ? "You" : name,
        points: agreedValue === undefined ? null : issuePoints(issue, agreedValue, payoffs),
      }));
    return {
      issue,
      deal: value.agreed === null ? "No deal" : formatAgreed(issue, agreed),
      dealPoints: value.agreed === null ? [] : pointsFor(agreed),
      best: formatAgreed(issue, best),
      bestPoints: pointsFor(best),
      differs: value.agreed === null || agreed !== best,
    };
  });
});

/** The issue where moving to the best deal adds the most points for everyone together, as a sentence. */
const lesson = computed(() => {
  const value = debrief.value;
  if (value?.agreed === null || value?.best === null || value === undefined) return null;
  let biggest: { name: string; from: string; to: string; gain: number; changes: string } | null = null;
  for (const row of comparison.value) {
    if (!row.differs) continue;
    const changes = row.bestPoints.map((after, index) => ({ name: after.name, change: (after.points ?? 0) - (row.dealPoints[index]?.points ?? 0) }));
    const gain = changes.reduce((sum, { change }) => sum + change, 0);
    if (gain > (biggest?.gain ?? 0)) {
      const described = changes
        .filter(({ change }) => Math.round(change) !== 0)
        .map(({ name, change }) => `${name === "You" ? "you" : name} ${change > 0 ? "+" : "−"}${formatPoints(Math.abs(change))}`)
        .join(", ");
      biggest = { name: row.issue.name, from: row.deal, to: row.best, gain, changes: described };
    }
  }
  return biggest;
});
</script>

<template>
  <section class="page">
    <header class="page-head">
      <h1>The Whole Pie</h1>
      <p class="lead">{{ view.table.scenarioName }} · You played {{ view.table.roleName }}</p>
    </header>
    <p v-if="error" class="refusal" role="alert">{{ error }}</p>

    <template v-if="debrief && me">
      <p class="headline display">{{ headline }}</p>

      <div class="columns">
        <div class="left">
          <section class="panel">
            <h2>Your slice</h2>
            <PieChart :slices="slices" />
            <p v-if="debrief.bestJointPoints === null" class="muted">
              No deal could have given both of you at least your BATNAs, so there was no pie to share: walking away was right.
            </p>
            <p v-else class="muted">
              The whole pie is {{ formatPoints(debrief.bestJointPoints) }} points: the most you and {{ otherNames }} could have
              gotten together with a deal that beat both your BATNAs.
            </p>
            <dl v-if="scores" class="scores">
              <div>
                <dt>Value created</dt>
                <dd class="display">{{ percent(scores.created) }}</dd>
                <p v-if="scores.created !== null && scores.created < 0" class="muted">
                  The deal was worth less to the two of you than walking away.
                </p>
                <p v-else class="muted">of what a deal could add over walking away</p>
              </div>
              <div>
                <dt>Value claimed</dt>
                <dd class="display">{{ percent(scores.claimed) }}</dd>
                <p v-if="scores.claimed !== null && scores.claimed < 0" class="muted">You got less than your BATNA.</p>
                <p v-else class="muted">of the value created went to you</p>
              </div>
            </dl>
          </section>

          <section v-if="coaching" class="panel coach" aria-live="polite">
            <h2>Your coach's debrief</h2>
            <p v-if="coaching.stage === 'WAITING'" class="muted">Your coach is reading through your negotiation…</p>
            <p v-else-if="coaching.stage === 'ABANDONED'" class="refusal">
              Your coach couldn't write a debrief this time: {{ coaching.reason ?? "something went wrong." }}
            </p>
            <template v-else>
              <Markdown :markdown="coaching.answer" />
              <p v-if="coaching.stage === 'FORMING'" class="muted">Writing…</p>
            </template>
          </section>
        </div>

        <div class="right">
          <section class="panel">
            <h2>Total value</h2>
            <TotalValue
              :issues="debrief.issues"
              :payoffs="debrief.roles.map(({ payoffs }) => payoffs)"
              :no-deal="debrief.jointBatna ?? debrief.roles.reduce((sum, { batna }) => sum + batna, 0)"
              :deal="debrief.agreed === null ? null : joint"
              :best="debrief.bestJointPoints"
            />
          </section>

          <section class="panel">
            <h2>What you could've done</h2>
            <p v-if="lesson">
              The biggest difference was <strong>{{ lesson.name }}</strong>: moving from {{ lesson.from }} to {{ lesson.to }} would
              have added {{ formatPoints(lesson.gain) }} points to the pie ({{ lesson.changes }}).
            </p>
            <p v-else-if="debrief.outcome === 'SETTLED' && debrief.bestJointPoints !== null && joint >= debrief.bestJointPoints - 0.5">
              Your deal was as big as the pie gets. Nothing was left on the table.
            </p>
            <table class="compare">
              <thead>
                <tr>
                  <th scope="col">Issue</th>
                  <th scope="col">Your deal</th>
                  <th scope="col">Best deal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in comparison" :key="row.issue.issue" :class="{ differs: row.differs }">
                  <th scope="row">{{ row.issue.name }}</th>
                  <td>
                    {{ row.deal }}
                    <span v-if="row.dealPoints.length > 0" class="muted points">
                      {{ row.dealPoints.map(({ name, points }) => `${name} ${points === null ? "—" : formatPoints(points)}`).join(" · ") }}
                    </span>
                  </td>
                  <td>
                    {{ row.best }}
                    <span class="muted points">
                      {{ row.bestPoints.map(({ name, points }) => `${name} ${points === null ? "—" : formatPoints(points)}`).join(" · ") }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td>
                    <span class="points">
                      {{ rolesYouFirst.map((role) => `${role.role === me?.role ? "You" : role.name} ${formatPoints(got(role))}`).join(" · ") }}
                    </span>
                  </td>
                  <td>
                    <span class="points">
                      {{ rolesYouFirst.map((role) => `${role.role === me?.role ? "You" : role.name} ${role.bestPoints === null ? "—" : formatPoints(role.bestPoints)}`).join(" · ") }}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <p class="muted">
              BATNAs: {{ rolesYouFirst.map((role) => `${role.role === me?.role ? "yours" : role.name + "'s"} was ${formatPoints(role.batna)}`).join(", ") }}.
            </p>
          </section>
        </div>
      </div>

      <a class="button primary large again" href="/" @click.prevent="go('/')">Back to the bakery</a>
    </template>
    <p v-else-if="!error" class="notice muted">Slicing the pie…</p>
  </section>
</template>

<style scoped>
.headline {
  font-size: var(--text-2xl);
  font-weight: 600;
}
.columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: var(--space-6);
  align-items: start;
}
.coach :deep(.markdown h2),
.coach :deep(.markdown h3) {
  font-size: var(--text-base);
}
.left,
.right {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.scores {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  margin-top: var(--space-2);
}
.scores dt {
  font-weight: 600;
  font-size: var(--text-sm);
}
.scores dd {
  margin: 0;
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--color-accent);
}
.compare {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}
.compare th,
.compare td {
  padding: 8px;
  border-bottom: 1px solid var(--color-line);
  text-align: left;
  vertical-align: top;
}
.compare thead th {
  color: var(--color-text-muted);
  font-weight: 600;
}
.compare tbody tr.differs td {
  background: var(--color-gold-soft);
}
.compare tfoot th,
.compare tfoot td {
  border-bottom: 0;
  font-weight: 700;
}
.points {
  display: block;
}
.again {
  align-self: center;
}
@media (max-width: 900px) {
  .columns {
    grid-template-columns: 1fr;
  }
}
</style>
