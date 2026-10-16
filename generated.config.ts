import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { MongoClient } from "mongodb";
import { assembleApplication } from "./src/assembly.ts";
import { wholePiePolicy } from "./src/host/http.ts";

// `sync-engine check` reads only the assembly's shape and calls no concept, so this client never connects.
const database = new MongoClient("mongodb://localhost").db("wholepie");

export default {
  assemble: () => assembleApplication({ database }),
  title: "The Whole Pie",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/reusable/accounts.md", import.meta.url),
      new URL("./design/compositions/reusable/passwords.md", import.meta.url),
      new URL("./design/compositions/reusable/answering.md", import.meta.url),
      new URL("./design/compositions/practice.md", import.meta.url),
      new URL("./design/compositions/table.md", import.meta.url),
      new URL("./design/compositions/proposals.md", import.meta.url),
      new URL("./design/compositions/counterpart.md", import.meta.url),
      new URL("./design/compositions/debrief.md", import.meta.url),
    ],
  },
  // The browser's client uses the HTTP contract, where each refusal arrives as its HTTP category.
  projections: [httpWire({ policy: wholePiePolicy("http://localhost:3141"), name: "TheWholePieWireHttp" })],
};
