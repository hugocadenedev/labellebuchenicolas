import cors from "cors";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createAdminSessionToken, requireAdminSession } from "./adminAuth.js";
import { createStripeCheckoutSession, confirmStripeCheckoutSession, handleStripeWebhook } from "./stripe.js";
import { appConfig } from "./config.js";
import {
  authenticateAdmin,
  authenticateCustomer,
  createCustomerAccount,
  createOrder,
  createProduct,
  createCategory,
  deleteProduct,
  getBootstrap,
  getCustomerAccount,
  getSiteBootstrap,
  listCategories,
  listCustomers,
  listOrders,
  listProducts,
  updateSettings,
  updateCategory,
  updateOrder,
  updateProduct,
  updateProductStock
} from "./dataStore.js";

const app = express();
const port = appConfig.port;
const jsonBodyLimit = "15mb";
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverDir, "..");
const distDir = path.join(projectRoot, "dist");
const distIndexFile = path.join(distDir, "index.html");
const hasFrontendBuild = fs.existsSync(distIndexFile);

app.use(cors());
app.post("/api/payments/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
app.use(express.json({ limit: jsonBodyLimit }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/site/bootstrap", async (_req, res, next) => {
  try {
    res.json(await getSiteBootstrap());
  } catch (error) {
    next(error);
  }
});

app.post("/api/customers/register", async (req, res, next) => {
  try {
    res.status(201).json(await createCustomerAccount(req.body));
  } catch (error) {
    next(error);
  }
});

app.post("/api/customers/login", async (req, res, next) => {
  try {
    res.json(await authenticateCustomer(req.body));
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/login", async (req, res, next) => {
  try {
    const admin = await authenticateAdmin(req.body || {});
    res.json({ token: createAdminSessionToken(admin), admin });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/session", requireAdminSession, (req, res) => {
  res.json({ admin: req.admin });
});

app.get("/api/customers/:id/account", async (req, res, next) => {
  try {
    res.json(await getCustomerAccount(req.params.id));
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders", async (req, res, next) => {
  try {
    res.status(201).json(await createOrder(req.body));
  } catch (error) {
    next(error);
  }
});

app.post("/api/payments/stripe/checkout-session", createStripeCheckoutSession);
app.post("/api/payments/stripe/session/:sessionId/confirm", confirmStripeCheckoutSession);

app.use("/api/admin", requireAdminSession);

app.get("/api/admin/bootstrap", async (_req, res, next) => {
  try {
    res.json(await getBootstrap());
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/settings", async (req, res, next) => {
  try {
    res.json(await updateSettings(req.body));
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/products", async (_req, res, next) => {
  try {
    res.json(await listProducts());
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/categories", async (_req, res, next) => {
  try {
    res.json(await listCategories());
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/categories", async (req, res, next) => {
  try {
    const { id, slug, label, kicker, heading, description, shortDescription, coverProductId, essences, productIds } = req.body;
    if (!id || !slug || !label || !heading) {
      return res.status(400).json({ message: "Missing required category fields" });
    }
    const category = await createCategory({ id, slug, label, kicker, heading, description, shortDescription, coverProductId, essences, productIds });
    return res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/categories/:id", async (req, res, next) => {
  try {
    const category = await updateCategory(req.params.id, req.body);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.json(category);
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/products", async (req, res, next) => {
  try {
    const { id, slug, name, price } = req.body;
    if (!id || !slug || !name || price === undefined || price === "") {
      return res.status(400).json({ message: "Missing required product fields" });
    }
    const product = await createProduct(req.body);
    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/products/:id", async (req, res, next) => {
  try {
    const product = await updateProduct(req.params.id, req.body);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.json(product);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/products/:id", async (req, res, next) => {
  try {
    const product = await deleteProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/products/:id/stock", async (req, res, next) => {
  try {
    const product = await updateProductStock(req.params.id, req.body.stockQty);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.json(product);
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/orders", async (_req, res, next) => {
  try {
    res.json(await listOrders());
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/orders/:id", async (req, res, next) => {
  try {
    const order = await updateOrder(req.params.id, req.body);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    return res.json(order);
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/customers", async (_req, res, next) => {
  try {
    res.json(await listCustomers());
  } catch (error) {
    next(error);
  }
});

if (hasFrontendBuild) {
  app.use(express.static(distDir));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    return res.sendFile(distIndexFile);
  });
}

app.use((error, _req, res, _next) => {
  if (error.type === "entity.too.large" || error.status === 413) {
    return res.status(413).json({ message: `Image trop volumineuse. Limite actuelle: ${jsonBodyLimit}.` });
  }

  console.error(error);
  res.status(error.status || 500).json({ message: error.message || "Internal server error" });
});

let serverInstance = null;

export function startServer() {
  if (serverInstance) {
    return serverInstance;
  }

  serverInstance = app.listen(port, () => {
    console.log(`Admin API listening on http://localhost:${port}`);
  });
  return serverInstance;
}

export { app };

const entryHref = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (entryHref) {
  startServer();
}