<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { ScenarioId, TableId } from "./api/client.ts";
import BakeryPage from "./bakery/BakeryPage.vue";
import JoinPage from "./join/JoinPage.vue";
import CommonsButton from "./reusable/CommonsButton.vue";
import CommonsCallback from "./reusable/CommonsCallback.vue";
import PasswordForm from "./reusable/PasswordForm.vue";
import SettingsDialog from "./reusable/SettingsDialog.vue";
import SignIn from "./reusable/SignIn.vue";
import { useSession } from "./reusable/session.ts";
import Menu from "./reusable/ui/Menu.vue";
import { go, page, rememberedPage, rememberPage, replace } from "./router.ts";
import TablePage from "./table/TablePage.vue";
import NewScenario from "./write/NewScenario.vue";
import ScenarioEditor from "./write/ScenarioEditor.vue";

const { me, checked, load, signOut } = useSession();

/** Whether Commons just sent the browser back here with a code, which the callback finishes signing in with. */
const returningFromCommons = ref(window.location.pathname === "/auth/commons/callback");
onMounted(() => {
  if (!returningFromCommons.value) load();
});

/** Once signing in with Commons ends, the person goes back to the page they started from, such as an invitation. */
function finishedCommons() {
  returningFromCommons.value = false;
  replace(rememberedPage());
  if (!checked.value) load();
}

/** Whether the settings dialog is open. */
const settingsOpen = ref(false);

/** Whether the page has scrolled, when the shopfront folds down to a slimmer awning and leaves more of the page in view. */
const scrolled = ref(false);
const notice = () => {
  scrolled.value = window.scrollY > 0;
};
onMounted(() => {
  notice();
  window.addEventListener("scroll", notice, { passive: true });
});
onUnmounted(() => window.removeEventListener("scroll", notice));
</script>

<template>
  <header class="topbar" :class="{ scrolled }">
    <a class="brand display" href="/" @click.prevent="go('/')">The Whole Pie</a>
    <Menu v-if="me" label="Account">
      <template #button>
        <span class="me">{{ me.username }}</span>
      </template>
      <p class="signed-in">Signed in as <strong>{{ me.username }}</strong></p>
      <button type="button" @click="settingsOpen = true">Settings</button>
      <button type="button" @click="signOut">Sign out</button>
    </Menu>
  </header>
  <SettingsDialog v-if="me && settingsOpen" @close="settingsOpen = false" />
  <main v-if="returningFromCommons" class="content">
    <CommonsCallback @done="finishedCommons" />
  </main>
  <main v-else-if="checked" class="content">
    <template v-if="me">
      <BakeryPage v-if="page.name === 'bakery'" />
      <TablePage v-else-if="page.name === 'table'" :key="page.table" :table="page.table as TableId" />
      <JoinPage v-else-if="page.name === 'join'" :key="page.code" :code="page.code" />
      <NewScenario v-else-if="page.name === 'write'" />
      <ScenarioEditor v-else-if="page.name === 'edit'" :key="page.scenario" :scenario="page.scenario as ScenarioId" />
      <section v-else class="notice">
        <h1>There's nothing here</h1>
        <a class="button primary" href="/" @click.prevent="go('/')">Back to the bakery</a>
      </section>
    </template>
    <SignIn
      v-else
      :lead="
        page.name === 'join'
          ? 'Someone invited you to negotiate. Sign up, or sign in, to join them.'
          : 'Practice negotiating against an AI counterpart or other people, then see the whole pie: what you got, and what was possible.'
      "
    >
      <CommonsButton @click="rememberPage" />
      <p class="divider">or with a password</p>
      <PasswordForm />
    </SignIn>
  </main>
</template>

<style scoped>
/*
 * A painted shopfront: a teal cornice with a cream bead under it, over a frosted-mint awning that is lettered with the
 * name and shaded where it folds. Three columns keep the name in the middle whether or not the account menu is there.
 */
.topbar {
  --cornice: 14px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-4);
  position: sticky;
  top: 0;
  z-index: 20;
  height: var(--topbar-height);
  padding: var(--cornice) max(24px, calc((100vw - 1168px) / 2)) 0;
  color: var(--color-accent);
  background:
    linear-gradient(var(--color-page), var(--color-page)) 0 var(--cornice) / 100% 2px no-repeat,
    linear-gradient(180deg, #628d79, var(--color-teal)) top / 100% var(--cornice) no-repeat,
    linear-gradient(180deg, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0) 40%, rgba(80, 124, 104, 0.12)),
    var(--color-mint);
  transition: height 0.25s ease, padding 0.25s ease;
}
/* The awning's valance, which falls in shallow scallops edged in teal. */
.topbar::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 12px;
  background: radial-gradient(circle at 15px 0, var(--color-awning-edge) 14.5px, transparent 15.5px) 0 0 / 30px 12px repeat-x;
  filter: drop-shadow(0 1.5px 0 rgba(80, 124, 104, 0.75)) drop-shadow(0 4px 3px rgba(31, 58, 46, 0.14));
  pointer-events: none;
}
/* Once the page scrolls, the shopfront folds down to a slimmer awning. */
.topbar.scrolled {
  --cornice: 6px;
  height: 62px;
}
.brand {
  grid-column: 2;
  font-size: 34px;
  font-weight: 500;
  font-variation-settings: "opsz" 144;
  letter-spacing: 0.02em;
  text-transform: lowercase;
  white-space: nowrap;
  color: inherit;
  text-decoration: none;
  transition: font-size 0.25s ease;
}
.topbar.scrolled .brand {
  font-size: 26px;
}
.topbar > .menu {
  grid-column: 3;
  justify-self: end;
}
.topbar :deep(.icon-button) {
  width: auto;
  height: 32px;
  padding: 0 14px;
  border: 1px solid rgba(80, 124, 104, 0.45);
  border-radius: var(--radius-full);
  color: var(--color-teal);
  background: transparent;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.topbar :deep(.icon-button:hover),
.topbar :deep(.icon-button[aria-expanded="true"]) {
  color: var(--color-teal);
  background: rgba(80, 124, 104, 0.1);
}
.topbar :deep(.items) {
  color: var(--color-text);
}
.me {
  font-weight: 600;
}
.signed-in {
  padding: 8px 10px;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
.signed-in strong {
  color: var(--color-text);
}
/*
 * The page starts clear of the awning's scallops. Anything as wide as the screen, like the bakery's display case, is
 * clipped at its edge, so a scrollbar's width never makes the page scroll sideways.
 */
.content {
  padding: var(--space-12) var(--space-6) var(--space-12);
  overflow-x: clip;
}
@media (max-width: 600px) {
  /* A phone has no room to center the brand beside the account menu, so the brand moves to the left. */
  .topbar {
    display: flex;
    justify-content: space-between;
    padding: var(--cornice) 16px 0;
  }
  .brand {
    font-size: 26px;
  }
  .topbar.scrolled .brand {
    font-size: 22px;
  }
  .content {
    padding: var(--space-8) var(--space-4) var(--space-8);
  }
}
</style>
