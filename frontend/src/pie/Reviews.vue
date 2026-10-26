<script setup lang="ts">
import { ref } from "vue";
import { api, type ReviewTarget, type TableId } from "../api/client.ts";
import { messageFor } from "../api/errors.ts";
import { useSession } from "../reusable/session.ts";
import InfoTip from "../reusable/ui/InfoTip.vue";

/**
 * How it was to deal with each other person at the table: the person gives each of them 1 to 5 stars, once. The stars
 * count toward their relationship rating. At a practice table, there is nobody to review.
 */
const props = defineProps<{ table: TableId; reviews: readonly ReviewTarget[] }>();
const emit = defineEmits<{ changed: [] }>();

const hovering = ref<Record<string, number>>({});
const error = ref<string | null>(null);
const sending = ref(false);

async function review(target: ReviewTarget, stars: number) {
  sending.value = true;
  const result = await api.tables.review({ table: props.table, role: target.role, stars });
  sending.value = false;
  if ("error" in result) {
    if (result.error === "UNAUTHORIZED") useSession().sessionEnded();
    error.value = messageFor("/tables/review", result.error);
    return;
  }
  error.value = null;
  emit("changed");
}
</script>

<template>
  <section v-if="reviews.length > 0" class="panel reviews">
    <h2>
      How was it to negotiate with them?
      <InfoTip label="How reviews work">
        <span>
          Give each person 1 to 5 stars for what they were like to deal with: honest, respectful, and easy to work with, rather
          than how good a deal they got.
        </span>
        <span>
          Reviews are anonymous. People see only the average of their stars and how many reviews they have, and so does whoever
          they negotiate with next. A review can't be changed once you give it.
        </span>
      </InfoTip>
    </h2>
    <p class="muted">Your stars count toward their relationship rating. You can review each person once.</p>
    <ul>
      <li v-for="target in reviews" :key="target.role">
        <span class="who">{{ target.player }}</span>
        <span v-if="target.stars !== null" class="given" :aria-label="`You gave ${target.stars} stars`">
          <span v-for="star in 5" :key="star" :class="{ lit: star <= (target.stars ?? 0) }" aria-hidden="true">★</span>
        </span>
        <span v-else class="picker" role="radiogroup" :aria-label="`Stars for ${target.player}`" @mouseleave="hovering[target.role] = 0">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            role="radio"
            :aria-checked="false"
            :aria-label="`${star} ${star === 1 ? 'star' : 'stars'}`"
            :class="{ lit: star <= (hovering[target.role] ?? 0) }"
            :disabled="sending"
            @mouseenter="hovering[target.role] = star"
            @focus="hovering[target.role] = star"
            @click="review(target, star)"
          >
            ★
          </button>
        </span>
      </li>
    </ul>
    <p v-if="error" class="refusal" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
ul {
  display: flex;
  flex-direction: column;
  padding: 0;
  list-style: none;
}
li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}
.who {
  font-weight: 600;
}
.given span,
.picker button {
  font-size: 24px;
  line-height: 1;
  color: var(--color-border);
}
.picker button {
  padding: 0 2px;
  border: 0;
  background: none;
  cursor: pointer;
}
.given .lit,
.picker .lit {
  color: var(--color-gold);
}
</style>
