import { computed, ref } from "vue";

/**
 * The pages: the bakery at `/`, each table at `/tables/<table>`, and each invitation at `/join/<code>`. Anything else
 * is an unknown page.
 */
const path = ref(window.location.pathname);
window.addEventListener("popstate", () => {
  path.value = window.location.pathname;
});

/** Shows the page at `to`, and adds it to the browser's history so the back button returns here. */
export function go(to: string) {
  if (to === path.value) return;
  history.pushState(null, "", to);
  path.value = to;
  window.scrollTo(0, 0);
}

/** Which page the address names. */
export const page = computed(() => {
  if (path.value === "/") return { name: "bakery" } as const;
  const table = /^\/tables\/([A-Za-z0-9]+)$/.exec(path.value)?.[1];
  if (table !== undefined) return { name: "table", table } as const;
  const code = /^\/join\/([A-Za-z0-9_-]+)$/.exec(path.value)?.[1];
  if (code !== undefined) return { name: "join", code } as const;
  return { name: "unknown" } as const;
});
