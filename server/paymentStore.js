import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const paymentStorePath = path.join(__dirname, "data", "stripe-checkouts.json");

async function ensureStoreFile() {
  try {
    await fs.access(paymentStorePath);
  } catch {
    await fs.writeFile(paymentStorePath, "{}\n", "utf8");
  }
}

async function readPaymentStore() {
  await ensureStoreFile();
  const raw = await fs.readFile(paymentStorePath, "utf8");
  return JSON.parse(raw || "{}");
}

async function writePaymentStore(data) {
  await fs.writeFile(paymentStorePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function savePendingStripeCheckout(sessionId, payload) {
  const store = await readPaymentStore();
  store[sessionId] = {
    payload,
    createdAt: new Date().toISOString()
  };
  await writePaymentStore(store);
}

export async function readPendingStripeCheckout(sessionId) {
  const store = await readPaymentStore();
  return store[sessionId] || null;
}

export async function clearPendingStripeCheckout(sessionId) {
  const store = await readPaymentStore();
  if (!store[sessionId]) return;
  delete store[sessionId];
  await writePaymentStore(store);
}