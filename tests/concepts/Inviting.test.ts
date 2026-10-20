import { describe, expect, test } from "bun:test";
import { InvitingConcept } from "../../src/concepts/Inviting/Inviting.ts";
import { testDatabase } from "../support/reusable/mongo.ts";

async function setup() {
  return { inviting: new InvitingConcept<string, string>(await testDatabase()) };
}

/** A code fit for a link: 22 characters of URL-safe base64, which is 128 random bits. */
const LINK_CODE = /^[A-Za-z0-9_-]{22}$/;

describe("Inviting", () => {
  test("its principle: Nadia's link leads her friends to her table, and the table's own address leads nowhere", async () => {
    const { inviting } = await setup();
    const { invitation, code } = await inviting.invite({ subject: "nadias-table", inviter: "nadia" });
    expect(code).toMatch(LINK_CODE);

    // Omar follows the link: it names Nadia's table and says Nadia sent it.
    expect(await inviting._invitation({ code })).toEqual([{ invitation, subject: "nadias-table", inviter: "nadia" }]);
    // Leo saw the table's address, but no invitation has it as its code.
    expect(await inviting._invitation({ code: "nadias-table" })).toEqual([]);
    // A mistyped link leads nowhere either.
    expect(await inviting._invitation({ code: code.slice(0, -1) })).toEqual([]);

    // For a three-way negotiation, the same link lets a second friend in too: following it changes nothing.
    expect(await inviting._invitation({ code })).toEqual([{ invitation, subject: "nadias-table", inviter: "nadia" }]);
    expect(await inviting._invitations({ subject: "nadias-table" })).toEqual([{ invitation, code, inviter: "nadia" }]);
  });

  test("each invitation has its own code, and a table can have several invitations, oldest first", async () => {
    const { inviting } = await setup();
    const first = await inviting.invite({ subject: "nadias-table", inviter: "nadia" });
    const second = await inviting.invite({ subject: "nadias-table", inviter: "omar" });
    const elsewhere = await inviting.invite({ subject: "leos-table", inviter: "leo" });
    expect(new Set([first.code, second.code, elsewhere.code]).size).toBe(3);
    expect(new Set([first.invitation, second.invitation, elsewhere.invitation]).size).toBe(3);

    expect(await inviting._invitations({ subject: "nadias-table" })).toEqual([
      { invitation: first.invitation, code: first.code, inviter: "nadia" },
      { invitation: second.invitation, code: second.code, inviter: "omar" },
    ]);
    expect(await inviting._invitations({ subject: "leos-table" })).toEqual([
      { invitation: elsewhere.invitation, code: elsewhere.code, inviter: "leo" },
    ]);
    expect(await inviting._invitations({ subject: "nobodys-table" })).toEqual([]);
  });

  test("codes are random, so none repeats and none gives away the table it leads to", async () => {
    const { inviting } = await setup();
    const codes = await Promise.all(
      Array.from({ length: 100 }, (_, index) => inviting.invite({ subject: `table-${index}`, inviter: "nadia" })),
    );
    expect(new Set(codes.map(({ code }) => code)).size).toBe(100);
    for (const [index, { code }] of codes.entries()) {
      expect(code).toMatch(LINK_CODE);
      expect(code).not.toContain(`table-${index}`);
    }
  });
});
