import "dotenv/config";

function readInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const appConfig = {
  port: readInt(process.env.PORT, 3001),
  dataBackend: (process.env.DATA_BACKEND || "json").trim().toLowerCase(),
  appUrl: (process.env.APP_URL || "").trim(),
  mysql: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: readInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "la_belle_buche",
    connectionLimit: readInt(process.env.DB_POOL_SIZE, 10)
  },
  stripe: {
    secretKey: (process.env.STRIPE_SECRET_KEY || "").trim(),
    publishableKey: (process.env.STRIPE_PUBLISHABLE_KEY || "").trim(),
    webhookSecret: (process.env.STRIPE_WEBHOOK_SECRET || "").trim(),
    currency: (process.env.STRIPE_CURRENCY || "eur").trim().toLowerCase()
  }
};

export function isMysqlBackendEnabled() {
  return appConfig.dataBackend === "mysql";
}

export function isStripeEnabled() {
  return Boolean(appConfig.stripe.secretKey);
}

export function isStripeWebhookEnabled() {
  return Boolean(appConfig.stripe.secretKey && appConfig.stripe.webhookSecret);
}