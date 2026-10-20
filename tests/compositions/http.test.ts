import { describe, expect, test } from "bun:test";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { wholePiePolicy } from "../../src/host/http.ts";
import { startWholePie } from "../support/app.ts";

const ORIGIN = "http://localhost:3141";
const SESSION = "__Host-wholepie-session";

/** The Whole Pie behind its HTTP handler, and a browser that keeps its cookies, as the frontend will call it. */
async function serve() {
  const app = await startWholePie({ counterpart: null });
  const handle = createHttpHandler({
    application: app.application,
    gateway: createGateway({ application: app.application }),
    policy: wholePiePolicy(ORIGIN),
  });
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
    for (const line of response.headers.getSetCookie()) {
      const [name = "", value = ""] = line.split(";")[0]?.split("=") ?? [];
      if (value === "") jar.delete(name);
      else jar.set(name, value);
    }
    return { status: response.status, body: await response.json() };
  }

  return { jar, post };
}

describe("over HTTP", () => {
  test("signing up sets the session cookie, which every later request carries, and a refusal arrives as its HTTP category", async () => {
    const { jar, post } = await serve();
    expect((await post("/bakery")).status).toBe(401);

    const signedUp = await post("/auth/register", { username: "nadia", password: "correct horse" });
    expect(signedUp.status).toBe(200);
    expect(signedUp.body).not.toHaveProperty("session");
    expect(jar.has(SESSION)).toBe(true);

    const { body: bakery } = await post("/bakery");
    const [jobOffer] = bakery.scenarios;
    const hiro = jobOffer.roles.find(({ name }: { name: string }) => name === "Hiro").role;
    const started = await post("/practice/start", { scenario: jobOffer.scenario, role: hiro });
    expect(started.status).toBe(200);
    const { table } = started.body;

    expect(await post("/tables/send", { table, body: "Hi!" })).toEqual({ status: 409, body: { error: "CONFLICT" } });
    expect(await post("/tables/start", { table, minutes: "thirty" })).toMatchObject({ status: 400 });
    expect(await post("/tables/start", { table, minutes: 500 })).toEqual({ status: 400, body: { error: "INVALID_REQUEST" } });
    expect((await post("/tables/start", { table, minutes: 30 })).status).toBe(200);
    expect(await post("/tables/send", { table, body: " " })).toEqual({ status: 400, body: { error: "INVALID_REQUEST" } });
    expect((await post("/tables/send", { table, body: "Hi!" })).status).toBe(200);

    expect((await post("/auth/logout")).status).toBe(200);
    expect(jar.has(SESSION)).toBe(false);
    expect((await post("/tables/show", { table })).status).toBe(401);
  });
});
