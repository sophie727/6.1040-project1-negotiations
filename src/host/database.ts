import { type Db, MongoClient } from "mongodb";

/**
 * Connects to the MongoDB at `uri`, using the database MONGODB_DB names (`wholepie` unless set). Without a URI, it starts
 * an in-memory MongoDB instead, which loses everything when the process stops: handy for trying the app, not for keeping data.
 */
export async function connect(uri: string | undefined): Promise<{ database: Db; close: () => Promise<void> }> {
  const name = process.env.MONGODB_DB || "wholepie";
  if (uri === undefined || uri === "") {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const memory = await MongoMemoryServer.create();
    console.warn("MONGODB_URL is not set, so data is kept in memory and lost when the process stops.");
    const client = await new MongoClient(memory.getUri()).connect();
    return {
      database: client.db(name),
      close: async () => {
        await client.close();
        await memory.stop();
      },
    };
  }
  const client = await new MongoClient(uri).connect();
  return { database: client.db(name), close: () => client.close() };
}
