// Adapted from conceptbox (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng.
import { describe, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { wholePiePolicy } from "../../src/host/http.ts";
import { startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

const SAM = { subject: "u7f3", username: "sam" };
const LEO = { subject: "u2b9", username: "leo" };

describe("signing in with Commons", () => {
  test("Sam signs in with Commons, practices The Job Offer, and comes back to the same account after renaming himself", async () => {
    const { api, signInWithCommons } = await startWholePie({ counterpart: null, coach: null });
    const sam = ok((await signInWithCommons(SAM)).result);
    expect(await api.auth.me({ session: sam.session })).toEqual({ username: "sam" });

    const [jobOffer] = ok(await api.bakery({ session: sam.session })).scenarios;
    const hiro = jobOffer!.roles.find(({ name }) => name === "Hiro")!.role;
    const { table } = ok(await api.practice.start({ session: sam.session, scenario: jobOffer!.scenario, role: hiro }));

    // His Commons username changes, but his Commons user doesn't, so he reaches the account he made, and its table.
    const again = ok((await signInWithCommons({ subject: SAM.subject, username: "samuel" })).result);
    expect(again.user).toBe(sam.user);
    expect(await api.auth.me({ session: again.session })).toEqual({ username: "sam" });
    expect(ok(await api.bakery({ session: again.session })).tables).toMatchObject([{ table }]);
  });

  test("when Nadia already took `sam`, Sam chooses another username, and his next sign-in reaches it", async () => {
    const { api, register, signInWithCommons } = await startWholePie({ counterpart: null, coach: null });
    const nadia = await register("sam");

    const { attempt, result } = await signInWithCommons(SAM);
    expect(result).toEqual({ error: "USERNAME_TAKEN" });
    expect(await api.auth.commons.choose({ attempt, username: "sam" })).toEqual({ error: "USERNAME_TAKEN" });
    expect(await api.auth.commons.choose({ attempt, username: "s" })).toEqual({ error: "INVALID_USERNAME" });
    const sam = ok(await api.auth.commons.choose({ attempt, username: "sam-lee" }));
    expect(sam.user).not.toBe(nadia.user);
    expect(await api.auth.me({ session: sam.session })).toEqual({ username: "sam-lee" });

    expect(await api.auth.commons.choose({ attempt, username: "sam-two" })).toEqual({ error: "SIGN_IN_EXPIRED" });
    expect(ok((await signInWithCommons(SAM)).result).user).toBe(sam.user);
  });

  test("nobody signs in as `wholepie`, the author of the built-in scenarios, with Commons either", async () => {
    const { api, signInWithCommons } = await startWholePie({ counterpart: null, coach: null });
    const { attempt, result } = await signInWithCommons({ subject: "u0w1", username: "wholepie" });
    expect(result).toEqual({ error: "USERNAME_TAKEN" });
    const chosen = ok(await api.auth.commons.choose({ attempt, username: "whole-pie-fan" }));
    expect(await api.auth.me({ session: chosen.session })).toEqual({ username: "whole-pie-fan" });
  });

  test("Leo's link finishes no sign-in in Sam's browser, with Sam's own attempt or with none, and Leo's code still works for Leo", async () => {
    const { api, commons } = await startWholePie({ counterpart: null, coach: null });
    const leos = ok(await api.auth.commons.start({}));
    const { code, state } = commons.approve(leos.address, LEO);

    const sams = ok(await api.auth.commons.start({}));
    expect(await api.auth.commons.finish({ attempt: sams.attempt, state, code })).toEqual({ error: "SIGN_IN_EXPIRED" });
    expect(await api.auth.commons.finish({ attempt: null as never, state, code })).toEqual({ error: "SIGN_IN_EXPIRED" });
    expect(await api.auth.commons.choose({ attempt: null as never, username: "leo" })).toEqual({ error: "SIGN_IN_EXPIRED" });

    const leo = ok(await api.auth.commons.finish({ attempt: leos.attempt, state, code }));
    expect(await api.auth.me({ session: leo.session })).toEqual({ username: "leo" });
  });

  test("an attempt older than ten minutes can't be finished, and a code Commons refuses signs nobody in", async () => {
    const { api, commons, database, register } = await startWholePie({ counterpart: null, coach: null });
    const attempts = database.collection("commonsfederating.attempts");
    const { attempt, address } = ok(await api.auth.commons.start({}));
    const { code, state } = commons.approve(address, SAM);
    await attempts.updateOne({ _id: attempt as never }, { $set: { expiresAt: new Date(0) } });
    expect(await api.auth.commons.finish({ attempt, state, code })).toEqual({ error: "SIGN_IN_EXPIRED" });

    const fresh = ok(await api.auth.commons.start({}));
    const freshState = new URL(fresh.address).searchParams.get("state") ?? "";
    expect(await api.auth.commons.finish({ attempt: fresh.attempt, state: freshState, code: "a-code-commons-never-issued" })).toEqual({
      error: "SIGN_IN_REFUSED",
    });
    expect(ok(await register("sam")).user).toBeString();
  });

  test("nobody signs up or signs in with a password as Sam, who signed in with Commons", async () => {
    const { api, signInWithCommons } = await startWholePie({ counterpart: null, coach: null });
    ok((await signInWithCommons(SAM)).result);
    expect(await api.auth.register({ username: "sam", password: "leos-password" })).toEqual({ error: "USERNAME_TAKEN" });
    expect(await api.auth.login({ username: "sam", password: "leos-password" })).toEqual({ error: "INVALID_CREDENTIALS" });
  });
});

const ORIGIN = "http://localhost:3141";
const SIGN_IN = "__Host-wholepie-sign-in";
const SESSION = "__Host-wholepie-session";

/** The Whole Pie behind its HTTP handler, and browsers that each keep their own cookies, so a test can see each cookie set and cleared. */
async function serve() {
  const app = await startWholePie({ counterpart: null, coach: null });
  const handle = createHttpHandler({
    application: app.application,
    gateway: createGateway({ application: app.application }),
    policy: wholePiePolicy(ORIGIN),
  });

  function browser() {
    const jar = new Map<string, string>();

    async function post(path: string, body: object = {}) {
      const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
      const response = await handle(
        new Request(`${ORIGIN}/api${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie },
          body: JSON.stringify(body),
        }),
      );
      const set = response.headers.getSetCookie().map((line) => line.split(";")[0]?.split("=") ?? []);
      for (const [name = "", value = ""] of set) {
        if (value === "") jar.delete(name);
        else jar.set(name, value);
      }
      const cleared = set.filter(([, value]) => value === "").map(([name]) => name);
      return { status: response.status, body: await response.json(), cookies: response.headers.getSetCookie(), cleared };
    }

    return { jar, post };
  }

  return { ...app, browser };
}

describe("signing in with Commons over HTTP", () => {
  test("starting sets the sign-in cookie, and finishing swaps it for a session", async () => {
    const { browser, commons } = await serve();
    const sam = browser();
    const start = await sam.post("/auth/commons/start");
    expect(start.body).toEqual({ address: expect.any(String) });
    expect(start.cookies[0]).toMatch(/^__Host-wholepie-sign-in=[^;]+; .*Expires=/);
    expect(start.cookies[0]).toContain("HttpOnly");

    const { code, state } = commons.approve(start.body.address, SAM);
    expect((await sam.post("/auth/commons/finish", { state, code })).status).toBe(200);
    expect(sam.jar.has(SIGN_IN)).toBe(false);
    expect(sam.jar.has(SESSION)).toBe(true);
    expect((await sam.post("/auth/me")).body).toEqual({ username: "sam" });
    expect((await sam.post("/bakery")).status).toBe(200);
  });

  test("Leo's link is refused with 403 in Sam's browser, and a taken username answers 409 and keeps the attempt", async () => {
    const { browser, commons, register } = await serve();
    const leo = browser();
    const sam = browser();
    const leos = await leo.post("/auth/commons/start");
    const leosCode = commons.approve(leos.body.address, LEO);
    await sam.post("/auth/commons/start");
    const forged = await sam.post("/auth/commons/finish", { attempt: leo.jar.get(SIGN_IN), ...leosCode });
    expect(forged).toMatchObject({ status: 403, body: { error: "FORBIDDEN" }, cleared: [] });

    await register("sam");
    const start = await sam.post("/auth/commons/start");
    const { code, state } = commons.approve(start.body.address, SAM);
    expect(await sam.post("/auth/commons/finish", { state, code })).toMatchObject({ status: 409, cleared: [] });
    expect(sam.jar.has(SIGN_IN)).toBe(true);
    expect((await sam.post("/auth/commons/choose", { username: "sam-lee" })).status).toBe(200);
    expect(sam.jar.has(SIGN_IN)).toBe(false);
    expect((await sam.post("/auth/me")).body).toEqual({ username: "sam-lee" });
  });
});
