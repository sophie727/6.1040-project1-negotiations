import { type Ref, ref, watch } from "vue";

/**
 * A splitter's share, kept in this browser under `key`, so the panes keep the sizes the person gave them on every page
 * that uses the same key, and after a reload. Where the browser keeps nothing, such as in a private window that blocks
 * storage, the share starts at `initial` each time.
 */
export function storedShare(key: string, initial: number): Ref<number> {
  const share = ref(read(key) ?? initial);
  watch(share, (next) => {
    try {
      localStorage.setItem(key, String(next));
    } catch {
      // The browser keeps nothing, so the share lasts until the page closes.
    }
  });
  return share;
}

/** The share stored under `key`, if a share between 0 and 1 is stored there. */
function read(key: string): number | undefined {
  try {
    const stored = Number(localStorage.getItem(key));
    return stored > 0 && stored < 1 ? stored : undefined;
  } catch {
    return undefined;
  }
}
