import { describe, expect, test } from "bun:test";
import { ensureAdmin } from "../../src/seed/seed.ts";
import { ADMIN_PASSWORD, startWholePie } from "../support/app.ts";
import { ok } from "../support/reusable/results.ts";

type App = Awaited<ReturnType<typeof startWholePie>>;

/** Sophie writes and publishes a small Lease of her own: who takes the big bedroom, between Ana and Ben. */
async function sophiesLease({ api, register }: App) {
  const { session } = await register("sophie");
  const { scenario } = ok(await api.scenarios.create({ session, name: "The Lease" }));
  const { issue } = ok(await api.scenarios.issues.add({ session, scenario, name: "Big bedroom", kind: "DISCRETE", unit: "" }));
  const { option: ana } = ok(await api.scenarios.options.add({ session, issue, name: "Ana", universalValue: 0 }));
  const { option: ben } = ok(await api.scenarios.options.add({ session, issue, name: "Ben", universalValue: 0 }));
  for (const name of ["Ana", "Ben"]) {
    const { role } = ok(await api.scenarios.roles.add({ session, scenario, name, batna: 0 }));
    ok(await api.scenarios.roles.brief({ session, role, brief: `You are ${name}.` }));
    ok(await api.scenarios.payoffs.set({ session, role, option: ana, points: name === "Ana" ? 100 : 0 }));
    ok(await api.scenarios.payoffs.set({ session, role, option: ben, points: name === "Ben" ? 100 : 0 }));
  }
  ok(await api.scenarios.publish({ session, scenario }));
  return { session, scenario };
}

async function signInAsAdmin({ api }: App) {
  return ok(await api.auth.login({ username: "admin", password: ADMIN_PASSWORD })).session;
}

async function inBakery({ api }: App, session: Awaited<ReturnType<typeof signInAsAdmin>>, name: string) {
  return ok(await api.bakery({ session })).scenarios.some((scenario) => scenario.name === name);
}

describe("the admin", () => {
  test("signs in as admin with the password from the settings, which nobody else can sign up as, and sees every posted scenario", async () => {
    const app = await startWholePie({ counterpart: null, coach: null });
    const { api, register } = app;
    expect(await api.auth.register({ username: "admin", password: "my own password" })).toHaveProperty("error");
    expect(await api.auth.login({ username: "admin", password: "a wrong guess" })).toHaveProperty("error");
    const admin = await signInAsAdmin(app);

    const lease = await sophiesLease(app);
    expect(ok(await api.admin.scenarios({ session: admin })).scenarios).toEqual([
      { scenario: expect.any(String), name: "The Job Offer", author: "wholepie", archived: false, archivedBy: null },
      { scenario: expect.any(String), name: "The Launch Room", author: "wholepie", archived: false, archivedBy: null },
      { scenario: lease.scenario, name: "The Lease", author: "sophie", archived: false, archivedBy: null },
    ]);
    // Anyone else is refused as if there were nothing there.
    const omar = await register("omar");
    expect(await api.admin.scenarios({ session: omar.session })).toEqual({ error: "NOT_FOUND" });
  });

  test("archives Sophie's scenario, which only the admin can put back, though Sophie still sees it as hers", async () => {
    const app = await startWholePie({ counterpart: null, coach: null });
    const { api, register } = app;
    const lease = await sophiesLease(app);
    const admin = await signInAsAdmin(app);
    const omar = await register("omar");

    // Omar can't archive Sophie's scenario, but the admin can.
    expect(await api.scenarios.archive({ session: omar.session, scenario: lease.scenario })).toEqual({ error: "NOT_FOUND" });
    ok(await api.scenarios.archive({ session: admin, scenario: lease.scenario }));
    expect(await inBakery(app, omar.session, "The Lease")).toBe(false);
    expect(ok(await api.scenarios.mine({ session: lease.session })).scenarios).toEqual([
      { scenario: lease.scenario, name: "The Lease", published: true, archived: true, archivedBy: "admin" },
    ]);
    expect(ok(await api.scenarios.show({ session: lease.session, scenario: lease.scenario })).draft).toMatchObject({
      archived: true,
      archivedBy: "admin",
    });

    // Sophie can't put it back, and Omar isn't told it exists.
    expect(await api.scenarios.unarchive({ session: lease.session, scenario: lease.scenario })).toEqual({ error: "ARCHIVED_BY_ADMIN" });
    expect(await api.scenarios.unarchive({ session: omar.session, scenario: lease.scenario })).toEqual({ error: "NOT_FOUND" });
    expect(await inBakery(app, omar.session, "The Lease")).toBe(false);

    // The admin can.
    ok(await api.scenarios.unarchive({ session: admin, scenario: lease.scenario }));
    expect(await inBakery(app, omar.session, "The Lease")).toBe(true);
    expect(ok(await api.scenarios.mine({ session: lease.session })).scenarios[0]).toMatchObject({ archived: false, archivedBy: null });
  });

  test("can put back a scenario its author archived, and the author can too", async () => {
    const app = await startWholePie({ counterpart: null, coach: null });
    const { api } = app;
    const lease = await sophiesLease(app);
    const admin = await signInAsAdmin(app);
    ok(await api.scenarios.archive({ session: lease.session, scenario: lease.scenario }));
    expect(ok(await api.admin.scenarios({ session: admin })).scenarios[2]).toMatchObject({ archived: true, archivedBy: "sophie" });
    ok(await api.scenarios.unarchive({ session: admin, scenario: lease.scenario }));
    ok(await api.scenarios.archive({ session: lease.session, scenario: lease.scenario }));
    ok(await api.scenarios.unarchive({ session: lease.session, scenario: lease.scenario }));
    expect(await inBakery(app, lease.session, "The Lease")).toBe(true);
  });

  test("a new password in the settings replaces the old one on the next start, and the admin stays the same account", async () => {
    const app = await startWholePie({ counterpart: null, coach: null });
    const { api, application } = app;
    const [before] = await application.concepts.Registering._byUsername({ username: "admin" });
    await ensureAdmin(application, "a new rolling pin");
    expect(await api.auth.login({ username: "admin", password: ADMIN_PASSWORD })).toHaveProperty("error");
    ok(await api.auth.login({ username: "admin", password: "a new rolling pin" }));
    expect(await application.concepts.Registering._byUsername({ username: "admin" })).toEqual([before!]);
  });
});
