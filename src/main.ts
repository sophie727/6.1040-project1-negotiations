import { assembleApplication } from "./assembly.ts";
import { connect } from "./host/database.ts";
import { seed } from "./seed/seed.ts";

// Until the HTTP server exists, starting the app connects to the database, seeds it, and reports what it holds.
const { database, close } = await connect(process.env.MONGODB_URI);
const application = assembleApplication({ database });
await seed(application);

const scenarios = await application.concepts.Briefing._published();
console.log(`Published scenarios: ${scenarios.map(({ name }) => name).join(", ")}`);
console.log(`Routes: ${JSON.stringify(Object.keys(application.publicInterface.routes).sort())}`);
await close();
