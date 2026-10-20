<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { TableId } from "./api/client.ts";
import BakeryPage from "./bakery/BakeryPage.vue";
import PasswordForm from "./reusable/PasswordForm.vue";
import SignIn from "./reusable/SignIn.vue";
import { useSession } from "./reusable/session.ts";
import Menu from "./reusable/ui/Menu.vue";
import { go, page } from "./router.ts";
import TablePage from "./table/TablePage.vue";

const { me, checked, load, signOut } = useSession();
onMounted(load);

/** Whether the page has scrolled, when the navbar turns menu-board green; at the top, it blends into the page. */
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
    <a class="brand display" href="/" @click.prevent="go('/')">
      <img src="/pie.svg" alt="" width="30" height="30" />
      The Whole Pie
    </a>
    <Menu v-if="me" label="Account">
      <template #button>
        <span class="me">{{ me.username }}</span>
      </template>
      <p class="signed-in">Signed in as <strong>{{ me.username }}</strong></p>
      <button type="button" @click="signOut">Sign out</button>
    </Menu>
  </header>
  <main v-if="checked" class="content">
    <template v-if="me">
      <BakeryPage v-if="page.name === 'bakery'" />
      <TablePage v-else-if="page.name === 'table'" :key="page.table" :table="page.table as TableId" />
      <section v-else class="notice">
        <h1>There's nothing here</h1>
        <a class="button primary" href="/" @click.prevent="go('/')">Back to the bakery</a>
      </section>
    </template>
    <SignIn v-else lead="Practice negotiating against an AI counterpart, then see the whole pie: what you got, and what was possible.">
      <PasswordForm />
    </SignIn>
  </main>
</template>

<style scoped>
.topbar {
  /* Three columns, so the brand sits in the middle whether or not the account menu is on the right. */
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-4);
  position: sticky;
  top: 0;
  z-index: 20;
  height: var(--topbar-height);
  padding: 0 max(24px, calc((100vw - 1168px) / 2));
  color: var(--color-accent);
  background: var(--color-page);
  transition: background-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
}
.topbar.scrolled {
  color: var(--color-on-menu);
  background: var(--color-menu);
  box-shadow: var(--shadow-card);
}
.brand {
  grid-column: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-2xl);
  font-weight: 700;
  color: inherit;
  text-decoration: none;
}
.topbar > .menu {
  grid-column: 3;
  justify-self: end;
}
.brand img {
  border-radius: 50%;
  background: var(--color-gold-soft);
}
.topbar :deep(.icon-button) {
  width: auto;
  height: 36px;
  padding: 0 14px;
  border-radius: var(--radius-full);
  color: inherit;
  background: rgba(45, 31, 24, 0.06);
}
.topbar :deep(.icon-button:hover),
.topbar :deep(.icon-button[aria-expanded="true"]) {
  color: inherit;
  background: rgba(45, 31, 24, 0.12);
}
.topbar.scrolled :deep(.icon-button) {
  background: rgba(0, 0, 0, 0.12);
}
.topbar.scrolled :deep(.icon-button:hover),
.topbar.scrolled :deep(.icon-button[aria-expanded="true"]) {
  background: rgba(0, 0, 0, 0.22);
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
.content {
  padding: var(--space-8) var(--space-6) var(--space-12);
}
@media (max-width: 600px) {
  /* A phone has no room to center the brand beside the account menu, so the brand moves to the left. */
  .topbar {
    display: flex;
    justify-content: space-between;
    padding: 0 16px;
  }
  .brand {
    font-size: var(--text-xl);
    white-space: nowrap;
  }
  .content {
    padding: var(--space-4) var(--space-4) var(--space-8);
  }
}
</style>
