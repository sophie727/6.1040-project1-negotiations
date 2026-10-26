import { describe, expect, test } from "bun:test";
import { AlreadyArchived, AlreadyPosted, NotArchived, NotPosted, PostingConcept } from "../../src/concepts/Posting/Posting.ts";
import { testDatabase } from "../support/reusable/mongo.ts";
import { expectOneWinner } from "../support/reusable/race.ts";

async function setup() {
  return { posting: new PostingConcept<string>(await testDatabase()) };
}

async function expectRefusal(attempt: Promise<unknown>, refusal: new (message?: string) => Error, message: string) {
  await expect(attempt).rejects.toThrow(refusal);
  await expect(attempt).rejects.toThrow(message);
}

describe("Posting", () => {
  test("its principle: Sophie posts The Lease and Test Lease, archives Test Lease, and unarchives it", async () => {
    const { posting } = await setup();
    expect(await posting._post({ item: "the-lease" })).toEqual({ posted: false, archived: false });
    await posting.post({ item: "the-lease" });
    await posting.post({ item: "test-lease" });
    expect(await posting._posts()).toEqual([
      { item: "the-lease", archived: false },
      { item: "test-lease", archived: false },
    ]);

    // Archived, Test Lease is still posted, so what people did with it still refers to something posted.
    await posting.archive({ item: "test-lease" });
    expect(await posting._post({ item: "test-lease" })).toEqual({ posted: true, archived: true });
    expect(await posting._posts()).toEqual([
      { item: "the-lease", archived: false },
      { item: "test-lease", archived: true },
    ]);

    await posting.unarchive({ item: "test-lease" });
    expect(await posting._post({ item: "test-lease" })).toEqual({ posted: true, archived: false });
  });

  test("nothing is posted twice, and only something posted is archived or unarchived", async () => {
    const { posting } = await setup();
    await expectRefusal(posting.archive({ item: "a-draft" }), NotPosted, "Only something posted can be archived.");
    await expectRefusal(posting.unarchive({ item: "a-draft" }), NotArchived, "This isn't archived.");
    await posting.post({ item: "the-lease" });
    await expectRefusal(posting.post({ item: "the-lease" }), AlreadyPosted, "This is already posted.");
    await expectRefusal(posting.unarchive({ item: "the-lease" }), NotArchived, "This isn't archived.");
    await posting.archive({ item: "the-lease" });
    await expectRefusal(posting.archive({ item: "the-lease" }), AlreadyArchived, "This is already archived.");
    // Posting it again is still refused: it is posted, only archived.
    await expectRefusal(posting.post({ item: "the-lease" }), AlreadyPosted, "This is already posted.");
  });

  test("of two posts of one item at once, Posting adds one and refuses the other", async () => {
    const { posting } = await setup();
    await expectOneWinner([posting.post({ item: "the-lease" }), posting.post({ item: "the-lease" })], AlreadyPosted);
    expect(await posting._posts()).toEqual([{ item: "the-lease", archived: false }]);
  });
});
