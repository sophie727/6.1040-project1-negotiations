<script setup lang="ts">
import { onMounted } from "vue";
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
</script>

<template>
  <header class="topbar">
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 14px max(24px, calc((100vw - 1168px) / 2));
  background: var(--color-accent);
  color: var(--color-gold);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-gold);
  text-decoration: none;
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
  color: var(--color-gold);
  background: rgba(0, 0, 0, 0.12);
}
.topbar :deep(.icon-button:hover),
.topbar :deep(.icon-button[aria-expanded="true"]) {
  color: var(--color-gold);
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
  .topbar {
    padding: 12px 16px;
  }
  .content {
    padding: var(--space-4) var(--space-4) var(--space-8);
  }
}
</style>
