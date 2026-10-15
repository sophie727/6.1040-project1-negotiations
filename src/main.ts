import { MongoClient } from "mongodb";
import { assembleApplication } from "./assembly.ts";

// The client connects only when a concept first uses the database, so listing the routes never connects.
const database = new MongoClient(process.env.MONGODB_URI ?? "mongodb://localhost:27017").db(process.env.MONGODB_DB ?? "wholepie");

const application = assembleApplication({ database });
console.log(JSON.stringify(Object.keys(application.publicInterface.routes).sort()));
