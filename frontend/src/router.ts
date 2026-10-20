import { computed, ref } from "vue";

/**
 * The pages: the bakery at `/`, each table at `/tables/<table>`, each invitation at `/join/<code>`, a new scenario at
 * `/write`, and each scenario its author is writing at `/write/<scenario>`. Anything else is an unknown page.
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

/** Shows the page at `to` in place of the current one, so the back button skips the one replaced. */
export function replace(to: string) {
  history.replaceState(null, "", to);
  path.value = to;
  window.scrollTo(0, 0);
}

const RETURN_KEY = "wholepie-return-to";

/** Remembers the page the person is on, such as an invitation, so they come back to it after signing in on Commons. */
export function rememberPage() {
  try {
    sessionStorage.setItem(RETURN_KEY, path.value);
  } catch {
    // Without storage, as in a private window, the person comes back to the bakery instead.
  }
}

/** The page `rememberPage` remembered, once, or the bakery. Only a path on this site counts. */
export function rememberedPage(): string {
  try {
    const remembered = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    if (remembered !== null && /^\/(?!\/)/.test(remembered)) return remembered;
  } catch {
    // Without storage, the bakery is where they land.
  }
  return "/";
}

/** Which page the address names. */
export const page = computed(() => {
  if (path.value === "/") return { name: "bakery" } as const;
  const table = /^\/tables\/([A-Za-z0-9]+)$/.exec(path.value)?.[1];
  if (table !== undefined) return { name: "table", table } as const;
  const code = /^\/join\/([A-Za-z0-9_-]+)$/.exec(path.value)?.[1];
  if (code !== undefined) return { name: "join", code } as const;
  if (path.value === "/write") return { name: "write" } as const;
  const scenario = /^\/write\/([A-Za-z0-9]+)$/.exec(path.value)?.[1];
  if (scenario !== undefined) return { name: "edit", scenario } as const;
  return { name: "unknown" } as const;
});
