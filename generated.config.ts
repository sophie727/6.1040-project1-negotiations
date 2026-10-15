import { MongoClient } from "mongodb";
import { assembleApplication } from "./src/assembly.ts";

// `sync-engine check` reads only the assembly's shape and calls no concept, so this client never connects.
const database = new MongoClient("mongodb://localhost").db("wholepie");

export default {
  assemble: () => assembleApplication({ database }),
  title: "The Whole Pie",
  design: {
    version: 1,
    documents: [new URL("./design/types.md", import.meta.url)],
  },
};
