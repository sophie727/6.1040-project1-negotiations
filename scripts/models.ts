/**
 * Lists the models that the Anthropic API at ANTHROPIC_BASE_URL, such as MIT's Parley, offers to ANTHROPIC_API_KEY,
 * so you can choose one for ANTHROPIC_MODEL in `.env`. Run it with `bun run models`; Bun reads `.env` itself.
 */
import { listModels } from "../src/agents/reusable/models.ts";

const where = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
if (!process.env.ANTHROPIC_API_KEY) {
  console.log("ANTHROPIC_API_KEY isn't set. Add it to .env, along with ANTHROPIC_BASE_URL if you use a proxy such as Parley.");
  process.exit(1);
}
const models = await listModels();
if (models === undefined) {
  console.log(`${where} didn't list its models. Check ANTHROPIC_API_KEY, or ask the provider which model ids it accepts.`);
  process.exit(1);
}
console.log(`Models that ${where} offers to your key:\n${models.map((id) => `  ${id}`).join("\n")}`);
const chosen = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
console.log(models.includes(chosen) ? `\nThe server will use ${chosen}.` : `\nThe server would use ${chosen}, which isn't listed: set ANTHROPIC_MODEL in .env to one of the above.`);
