import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { replaceAllDataFromSnapshot } from "../server/sqlStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const storePath = path.join(__dirname, "..", "server", "data", "store.json");
  const raw = await fs.readFile(storePath, "utf8");
  const sanitized = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const snapshot = JSON.parse(sanitized);

  await replaceAllDataFromSnapshot(snapshot);
  console.log("Current JSON store imported into MySQL.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});