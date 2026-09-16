import Stripe from "stripe";
import { appConfig, isStripeEnabled, isStripeWebhookEnabled } from "./config.js";
import { createOrder } from "./dataStore.js";
import {
  clearPendingStripeCheckout,
  readPendingStripeCheckout,
  savePendingStripeCheckout
} from "./paymentStore.js";

let stripeClient;

function getStripeClient() {
  if (!isStripeEnabled()) {
    throw Object.assign(new Error("Stripe n'est pas configuré sur ce serveur."), { status: 503 });
  }

  if (!stripeClient) {
    stripeClient = new Stripe(appConfig.stripe.secretKey);
  }

  return stripeClient;
}

function getBaseUrl(req) {
  if (appConfig.appUrl) {
    return appConfig.appUrl.replace(/\/+$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildCheckoutLineItems(items, shippingAmount) {
  const lineItems = items.map((item) => ({
    quantity: Number(item.quantity || 0),
    price_data: {
      currency: appConfig.stripe.currency,
      unit_amount: Math.round(Number(item.unitPrice || 0) * 100),
      product_data: {
        name: item.name,
        description: [item.length, item.drying].filter(Boolean).join(" · ") || undefined
      }
    }
  }));

  if (Number(shippingAmount || 0) > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: appConfig.stripe.currency,
        unit_amount: Math.round(Number(shippingAmount) * 100),
        product_data: {
          name: "Livraison"
        }
      }
    });
  }

  return lineItems;
}

function buildOrderPayload(body, paymentReference) {
  return {
    ...body,
    paymentMethod: "Carte bancaire",
    paymentReference,
    status: "paid",
    statusLabel: "Paiement accepté"
  };
}

async function resolvePendingOrderPayload(sessionId, requestBody = {}) {
  const pendingCheckout = await readPendingStripeCheckout(sessionId);
  const pendingPayload = pendingCheckout?.payload || null;
  const requestHasItems = Array.isArray(requestBody.items) && requestBody.items.length > 0;

  if (pendingPayload) {
    return pendingPayload;
  }

  if (requestHasItems) {
    return requestBody;
  }

  throw Object.assign(new Error("Le brouillon de commande Stripe est introuvable sur le serveur."), { status: 404 });
}

async function finalizePaidStripeSession(sessionId, requestBody = {}) {
  const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
  if (!session || session.payment_status !== "paid") {
    throw Object.assign(new Error("Le paiement Stripe n'est pas confirmé."), { status: 409 });
  }

  const orderPayload = await resolvePendingOrderPayload(sessionId, requestBody);
  const payload = await createOrder(buildOrderPayload(orderPayload, session.id));
  await clearPendingStripeCheckout(session.id);
  return {
    ...payload,
    stripeSessionId: session.id,
    paymentStatus: session.payment_status
  };
}

export async function createStripeCheckoutSession(req, res, next) {
  try {
    const { items = [], shippingAmount = 0, customerId, contactEmail } = req.body || {};
    if (!customerId) {
      return res.status(400).json({ message: "Compte client requis pour le paiement Stripe." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Le panier est vide." });
    }

    const session = await getStripeClient().checkout.sessions.create({
      mode: "payment",
      success_url: `${getBaseUrl(req)}/#/commande/confirmation/stripe?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getBaseUrl(req)}/#/commande?payment=cancelled`,
      customer_email: normalizeText(contactEmail) || undefined,
      line_items: buildCheckoutLineItems(items, shippingAmount),
      metadata: {
        customerId,
        source: "la-belle-buche"
      }
    });

    await savePendingStripeCheckout(session.id, req.body || {});

    return res.status(201).json({
      sessionId: session.id,
      url: session.url,
      publishableKey: appConfig.stripe.publishableKey || null
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmStripeCheckoutSession(req, res, next) {
  try {
    const sessionId = req.params.sessionId;
    if (!sessionId) {
      return res.status(400).json({ message: "Session Stripe manquante." });
    }

    return res.json(await finalizePaidStripeSession(sessionId, req.body || {}));
  } catch (error) {
    next(error);
  }
}

export async function handleStripeWebhook(req, res, next) {
  try {
    if (!isStripeWebhookEnabled()) {
      return res.status(503).json({ message: "Stripe webhook n'est pas configuré." });
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ message: "Signature Stripe manquante." });
    }

    const event = getStripeClient().webhooks.constructEvent(req.body, signature, appConfig.stripe.webhookSecret);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session?.id && session.payment_status === "paid") {
        await finalizePaidStripeSession(session.id);
      }
    }

    return res.json({ received: true });
  } catch (error) {
    next(error);
  }
}