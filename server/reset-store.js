import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mode = process.argv.includes("--empty") ? "empty" : null;

if (!mode) {
  console.error("Usage: node server/reset-store.js --empty");
  process.exit(1);
}

const sourcePath = path.join(__dirname, "data", `store.${mode}.json`);
const targetPath = path.join(__dirname, "data", "store.json");

await fs.copyFile(sourcePath, targetPath);
console.log(`store.json reset from ${path.basename(sourcePath)}`);
