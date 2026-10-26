<script setup lang="ts">
import { computed, ref } from "vue";
import { api, type DraftIssue, type DraftOption } from "../api/client.ts";
import Icon from "../reusable/ui/Icon.vue";
import InfoTip from "../reusable/ui/InfoTip.vue";
import {
    dateAfter,
    dayZero,
    daysBetween,
    formatDate,
    fromIsoDate,
    isoDate,
} from "../table/dates.ts";
import { nextName, type Save } from "./draft.ts";
import {
    addOptions,
    type IssueKind,
    type IssueShape,
    shapeOf,
    shapes,
    startOf,
} from "./issues.ts";

/**
 * One issue of a scenario: its name, whether it is a list of options, a range of values, or a range of dates, its unit
 * on a range of values, and its options. On a range, each option is a point: its value, which is its universal value,
 * counted in the unit, and how it is shown to negotiators, which is its name. On a range of dates, the author picks each
 * point's date, and its value is how many days it is after the first day the unit counts from. Each change is saved when
 * the author leaves the box they changed.
 */
const props = defineProps<{
    issue: DraftIssue;
    save: Save;
    readonly: boolean;
    removable: boolean;
}>();
const emit = defineEmits<{ remove: [] }>();
const problem = ref<string | null>(null);
const working = ref(false);

const continuous = () => props.issue.kind === "CONTINUOUS";
const shape = computed(() => shapeOf(props.issue));
/** The first day a range of dates counts from, or null for any other issue. */
const zero = computed(() => dayZero(props.issue.unit));
const field = (event: Event) => event.target as HTMLInputElement;

async function update({
    name = props.issue.name,
    kind = props.issue.kind,
    unit = props.issue.unit ?? "",
}: {
    name?: string;
    kind?: IssueKind;
    unit?: string;
}) {
    const call = api.scenarios.issues.update({
        issue: props.issue.issue,
        name: name.trim(),
        kind,
        unit: kind === "CONTINUOUS" ? unit.trim() : "",
    });
    problem.value = await props.save("/scenarios/issues/update", call);
    return problem.value === null;
}

async function rename(event: Event) {
    const name = field(event).value;
    if (name.trim() === props.issue.name) return;
    if (!(await update({ name }))) field(event).value = props.issue.name;
}

async function changeUnit(event: Event) {
    if (field(event).value.trim() === (props.issue.unit ?? "")) return;
    await update({ unit: field(event).value });
}

/**
 * Makes the issue a list, a range of values, or a range of dates. The options of one can't belong to another, so they
 * go, and the new shape's starters take their place. Briefing removes them when a list becomes a range or back; between
 * the two kinds of range, the kind stays, so the page removes them first.
 */
async function changeShape(to: IssueShape) {
    if (to === shape.value || working.value) return;
    const { options } = props.issue;
    const becomes = shapes[to].label.toLowerCase();
    const count = options.length;
    if (
        count > 0 &&
        !window.confirm(
            `Making ${props.issue.name} ${becomes} removes its ${count} option${count === 1 ? "" : "s"} and every role's points for them.`,
        )
    )
        return;
    working.value = true;
    const start = startOf(to);
    if (start.kind === props.issue.kind) {
        for (const { option } of options)
            await api.scenarios.options.remove({ option });
    }
    if (await update({ kind: start.kind, unit: start.unit }))
        problem.value = await props.save(
            "/scenarios/options/add",
            addOptions(props.issue.issue, start.options),
        );
    working.value = false;
}

/** The date of a point on a range of dates, as people read it. */
const dateOf = (day: Date, value: number | null) =>
    formatDate(dateAfter(day, value ?? 0), day);

async function renameOption(option: DraftOption, event: Event) {
    const name = field(event).value.trim();
    if (name === option.name) return;
    const call = api.scenarios.options.update({
        option: option.option,
        name,
        universalValue: option.universalValue ?? 0,
    });
    problem.value = await props.save("/scenarios/options/update", call);
    if (problem.value !== null) field(event).value = option.name;
}

/** Moves an option of a range to another value. An option still named for its old value is named for its new one too. */
async function moveOption(option: DraftOption, event: Event) {
    const value = field(event).valueAsNumber;
    if (Number.isNaN(value)) {
        field(event).value = String(option.universalValue ?? 0);
        return;
    }
    if (value === option.universalValue) return;
    const name =
        option.name === String(option.universalValue)
            ? String(value)
            : option.name;
    problem.value = await props.save(
        "/scenarios/options/update",
        api.scenarios.options.update({
            option: option.option,
            name,
            universalValue: value,
        }),
    );
    if (problem.value !== null)
        field(event).value = String(option.universalValue ?? 0);
}

/**
 * Moves a point on a range of dates to another day. A point still named for its old date is named for its new one too.
 */
async function moveDate(option: DraftOption, event: Event) {
    const day = zero.value;
    const picked = fromIsoDate(field(event).value);
    if (day === null) return;
    if (picked === null) {
        field(event).value = isoDate(
            dateAfter(day, option.universalValue ?? 0),
        );
        return;
    }
    const value = daysBetween(day, picked);
    if (value === option.universalValue) return;
    const name =
        option.name === dateOf(day, option.universalValue)
            ? formatDate(picked, day)
            : option.name;
    problem.value = await props.save(
        "/scenarios/options/update",
        api.scenarios.options.update({
            option: option.option,
            name,
            universalValue: value,
        }),
    );
    if (problem.value !== null)
        field(event).value = isoDate(
            dateAfter(day, option.universalValue ?? 0),
        );
}

/**
 * Adds an option: the next "Option" on a list, or, on a range, one past the highest, as far past it as the last two are
 * apart, named for its value, or for its date on a range of dates.
 */
async function addOption() {
    const { options } = props.issue;
    let name = nextName(
        "Option",
        options.map(({ name }) => name),
    );
    let value = 0;
    if (continuous()) {
        // Options of a range arrive lowest first.
        const values = options.map(({ universalValue }) => universalValue ?? 0);
        const highest = values.at(-1);
        const gap = values.length >= 2 ? values.at(-1)! - values.at(-2)! : 10;
        value = highest === undefined ? 0 : highest + (gap || 10);
        name = zero.value === null ? String(value) : dateOf(zero.value, value);
    }
    problem.value = await props.save(
        "/scenarios/options/add",
        api.scenarios.options.add({
            issue: props.issue.issue,
            name,
            universalValue: value,
        }),
    );
}

async function removeOption(option: DraftOption) {
    problem.value = await props.save(
        "/scenarios/options/remove",
        api.scenarios.options.remove({ option: option.option }),
    );
}
</script>

<template>
    <article class="issue">
        <header>
            <input
                class="title display"
                :value="issue.name"
                aria-label="Issue name"
                maxlength="100"
                :disabled="readonly"
                @change="rename"
            />
            <button
                v-if="!readonly && removable"
                type="button"
                class="icon-button"
                :aria-label="`Remove ${issue.name}`"
                @click="emit('remove')"
            >
                <Icon name="close" />
            </button>
        </header>

        <div
            class="kinds"
            role="radiogroup"
            :aria-label="`What kind of issue ${issue.name} is`"
        >
            <button
                v-for="each in ['list', 'numbers', 'dates'] as const"
                :key="each"
                type="button"
                role="radio"
                :aria-checked="shape === each"
                :disabled="readonly || working"
                @click="changeShape(each)"
            >
                {{ shapes[each].label }}
            </button>
        </div>
        <p class="muted">{{ shapes[shape].hint }}</p>

        <label v-if="shape === 'numbers'" class="field unit">
            Unit
            <input
                :value="issue.unit ?? ''"
                placeholder="dollars"
                maxlength="100"
                :disabled="readonly"
                @change="changeUnit"
            />
            <span class="hint">
                What the values count, such as dollars or percent. "dollars"
                shows values as money, such as $95,000, and "percent" with a
                percent sign. Leave it blank for plain numbers.
            </span>
        </label>

        <div
            v-if="issue.kind === 'CONTINUOUS' && issue.options.length > 0"
            class="columns"
            :class="{ dates: zero }"
        >
            <span v-if="zero">
                <span class="heading">Date</span>
                <InfoTip label="What a point's date is">
                    <span>
                        The day this point stands for. The earliest and latest
                        dates are the ends of the range: a deal can land on any
                        day between them, but not outside them.
                    </span>
                    <span
                        >Add a date in the middle when what the issue is worth
                        changes there, such as a start date that's fine until
                        March and costly after.</span
                    >
                </InfoTip>
            </span>
            <span v-else>
                <span class="heading"
                    >Value{{ issue.unit ? ` (${issue.unit})` : "" }}</span
                >
                <InfoTip label="What a point's value is">
                    <span>
                        Where the point sits on the range, counted in the unit.
                        It's the number a deal agrees on, such as 80000 for a
                        salary of $80,000.
                    </span>
                    <span>
                        The lowest and highest values are the ends of the range:
                        a deal can land on any value between them, but not past
                        them. Add a point in the middle when what the issue is
                        worth bends there, such as a start date that's fine
                        until March and costly after.
                    </span>
                </InfoTip>
            </span>
            <span>
                <span class="heading">Shown as</span>
                <InfoTip label="What shown as means">
                    <template v-if="zero"
                        >What negotiators read for that day, such as "March 1"
                        or "Early March". It starts as the date.</template
                    >
                    <template v-else
                        >What negotiators read for that point, such as "$80K"
                        for 80000. It can just be the number.</template
                    >
                </InfoTip>
            </span>
        </div>
        <ol
            class="options"
            :class="{ range: issue.kind === 'CONTINUOUS', dates: zero }"
        >
            <li v-for="option in issue.options" :key="option.option">
                <input
                    v-if="zero"
                    class="value"
                    type="date"
                    :value="
                        isoDate(dateAfter(zero, option.universalValue ?? 0))
                    "
                    :aria-label="`Date of ${option.name}`"
                    :disabled="readonly"
                    @change="moveDate(option, $event)"
                />
                <input
                    v-else-if="issue.kind === 'CONTINUOUS'"
                    class="value"
                    type="number"
                    :value="option.universalValue ?? 0"
                    :aria-label="`Value of ${option.name}${issue.unit ? `, in ${issue.unit}` : ''}`"
                    :disabled="readonly"
                    @change="moveOption(option, $event)"
                />
                <input
                    class="name"
                    :value="option.name"
                    :aria-label="
                        issue.kind === 'CONTINUOUS'
                            ? `How ${zero ? dateOf(zero, option.universalValue) : (option.universalValue ?? 0)} is shown`
                            : 'Option name'
                    "
                    maxlength="100"
                    :disabled="readonly"
                    @change="renameOption(option, $event)"
                />
                <button
                    v-if="!readonly"
                    type="button"
                    class="icon-button"
                    :aria-label="`Remove ${option.name}`"
                    @click="removeOption(option)"
                >
                    <Icon name="close" :size="16" />
                </button>
            </li>
        </ol>
        <p v-if="issue.options.length < 2" class="muted">
            {{
                issue.kind === "CONTINUOUS"
                    ? "A range needs at least two points, its ends,"
                    : "An issue needs at least two options"
            }}
            before the scenario can be published.
        </p>
        <button
            v-if="!readonly"
            type="button"
            class="text-button add"
            @click="addOption"
        >
            {{
                issue.kind === "CONTINUOUS"
                    ? "+ Add a point"
                    : "+ Add an option"
            }}
        </button>
        <p v-if="problem" class="refusal" role="alert">{{ problem }}</p>
    </article>
</template>

<style scoped>
.issue {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-page);
}
header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}
.title {
    flex: 1;
    min-width: 0;
    padding: 4px 8px;
    margin-left: -8px;
    border: 1.5px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    font-size: var(--text-lg);
    font-weight: 700;
    color: inherit;
}
.title:hover:not(:disabled),
.title:focus {
    border-color: var(--color-border);
    background: var(--color-surface);
    outline: none;
}
.title:focus {
    border-color: var(--color-accent);
}
.kinds {
    display: inline-flex;
    flex-wrap: wrap;
    align-self: flex-start;
    padding: 3px;
    border-radius: var(--radius-lg);
    background: var(--color-line);
}
.kinds button {
    padding: 6px 14px;
    border: 0;
    border-radius: var(--radius-full);
    background: none;
    font-weight: 600;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
}
.kinds button[aria-checked="true"] {
    background: var(--color-surface);
    color: var(--color-accent);
    box-shadow: var(--shadow-card);
}
.unit input {
    max-width: 260px;
}
.options {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0;
    list-style: none;
}
.options li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}
.options input {
    padding: 8px 10px;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    font: inherit;
    color: inherit;
}
.options input:focus {
    outline: none;
    border-color: var(--color-accent);
}
.options .name {
    flex: 1;
    min-width: 0;
}
/* On a range, the values and how they're shown line up in two columns under their headings. */
.columns,
.range li {
    display: grid;
    grid-template-columns: 130px minmax(0, 1fr) 36px;
    gap: var(--space-2);
    align-items: center;
}
.columns {
    margin-bottom: calc(-1 * var(--space-2));
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-text-muted);
}
.columns > span {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
}
.columns .heading {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
/* A date box needs more room than a number. */
.columns.dates,
.dates li {
    grid-template-columns: 160px minmax(0, 1fr) 36px;
}
.range .value {
    width: 100%;
    min-width: 0;
}
.add {
    align-self: flex-start;
}
</style>
