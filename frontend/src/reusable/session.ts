// Adapted from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng.
import { ref } from "vue";
import { api } from "../api/client.ts";

interface Me {
  username: string;
}

const me = ref<Me | null>(null);
const checked = ref(false);
const error = ref<string | null>(null);

async function load() {
  const result = await api.auth.me();
  me.value = "error" in result ? null : result;
  checked.value = true;
}

/**
 * Awaits a sign-in request. On success, loads the signed-in person and returns null. On a refusal, sets
 * `error` to the sentence `messages` gives for the HTTP category, and returns the category.
 */
async function enter(answer: Promise<object>, messages: Record<string, string>): Promise<string | null> {
  const result = await answer;
  if ("error" in result && typeof result.error === "string") {
    error.value = messages[result.error] ?? "Something went wrong. Try again.";
    return result.error;
  }
  error.value = null;
  await load();
  return null;
}

/** Signs out, then reloads the bakery so that the tab's polling and requests stop. */
async function signOut() {
  await api.auth.logout();
  window.location.assign("/");
}

/** Shows the sign-in screen when an endpoint call is refused because the session ended. */
function sessionEnded() {
  error.value = "Your session has ended. Sign in again.";
  me.value = null;
}

/** The signed-in person, and the functions that call `/auth/me` and `/auth/logout`, shared by every component. */
export function useSession() {
  return { me, checked, error, load, enter, signOut, sessionEnded };
}
