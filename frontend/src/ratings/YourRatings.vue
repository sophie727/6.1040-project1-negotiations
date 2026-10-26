<script setup lang="ts">
import { computed } from "vue";
import type { Ratings } from "../api/client.ts";
import InfoTip from "../reusable/ui/InfoTip.vue";
import { averageStars, percent } from "./format.ts";

/**
 * The person's own ratings: how much value their negotiations with other people created and how much of it they
 * claimed, on average, and how the people they negotiated with rated dealing with them. Practice with the AI doesn't count.
 */
const props = defineProps<{ ratings: Ratings }>();
const rated = computed(() => (props.ratings.negotiations ?? 0) > 0 || (props.ratings.reviews ?? 0) > 0);
</script>

<template>
  <section class="panel ratings" aria-label="Your ratings">
    <h2>Your ratings</h2>
    <dl v-if="rated">
      <div>
        <dt>
          Value created
          <InfoTip label="About value created">
            How much of the most a deal could add, over what everyone gets by walking away, your deals actually added. If the
            best possible deal adds 200 points and yours adds 150, you created 75%. Walking away, or running out of time,
            creates nothing.
          </InfoTip>
        </dt>
        <dd class="display">{{ percent(ratings.create) }}</dd>
      </div>
      <div>
        <dt>
          Value claimed
          <InfoTip label="About value claimed">
            How much of what your deals added went to you. If a deal adds 150 points over everyone's walk-away points and 90
            of them are yours, you claimed 60%. Half is an even split between two people.
          </InfoTip>
        </dt>
        <dd class="display">{{ percent(ratings.claim) }}</dd>
      </div>
      <div>
        <dt>
          Relationship
          <InfoTip label="About the relationship rating">
            The average of the stars, from 1 to 5, that people gave you after negotiating with you, for what you were like to
            deal with. Nobody sees who gave which.
          </InfoTip>
        </dt>
        <dd class="display">{{ ratings.stars === null ? "—" : `★ ${averageStars(ratings.stars)}` }}</dd>
      </div>
    </dl>
    <p class="muted">
      <template v-if="rated">
        Over {{ ratings.negotiations === 1 ? "1 negotiation" : `${ratings.negotiations} negotiations` }} with other people, and
        {{ ratings.reviews === 1 ? "1 review" : `${ratings.reviews} reviews` }} from them.
      </template>
      <template v-else>Negotiate with friends or someone new to get rated. Practice with the AI never counts.</template>
    </p>
  </section>
</template>

<style scoped>
dl {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}
dt {
  font-size: var(--text-sm);
  font-weight: 600;
}
dd {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-accent);
}
@media (max-width: 600px) {
  dl {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
