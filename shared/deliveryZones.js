import { findFreeShippingRule } from "./promotions.js";

// Estimation de zone de livraison par departement (sans API de geolocalisation externe).
// Depot de reference: Montgaillard-Lauragais (31290).
export const DEPOT_DEPARTMENT = "31";
export const NEARBY_DEPARTMENTS = ["09", "11", "32", "65", "81", "82"];

// Montants TTC (10% TVA) : 44,00 EUR = 40,00 EUR HT ; 66,00 EUR = 60,00 EUR HT.
const ZONE_RULES = {
  local: { amount: 44, label: "Livraison locale (jusqu'a 30 km)" },
  nearby: { amount: 66, label: "Livraison de 31 a 60 km" },
  far: { amount: null, label: "Hors zone (plus de 60 km) : livraison sur devis" }
};

export function extractDepartment(postcode) {
  const digits = String(postcode || "").replace(/\D/g, "");
  return digits.length >= 2 ? digits.slice(0, 2) : "";
}

export function resolveDeliveryZone(postcode) {
  const department = extractDepartment(postcode);
  if (!department) return "unknown";
  if (department === DEPOT_DEPARTMENT) return "local";
  if (NEARBY_DEPARTMENTS.includes(department)) return "nearby";
  return "far";
}

// Sans code postal connu, on affiche une estimation locale par defaut (majorite des clients).
// La livraison offerte vient uniquement des promos "livraison offerte" configurees en admin (freeShippingRules).
// hasActiveOffer : une remise automatique (achete/offert) ou un code promo est appliquee sur la commande,
// auquel cas seules les promos livraison marquees "cumulables" s'appliquent.
export function computeShipping({ postcode, cartItems = [], freeShippingRules = [], hasActiveOffer = false }) {
  const zone = resolveDeliveryZone(postcode);
  const effectiveZone = zone === "unknown" ? "local" : zone;
  const rule = ZONE_RULES[effectiveZone];

  if (rule.amount == null) {
    return { zone, amount: 0, quoteRequired: true, label: rule.label };
  }

  const freeShippingRule = findFreeShippingRule(cartItems, freeShippingRules, { zone: effectiveZone, hasOtherOffer: hasActiveOffer });
  const freeShipping = Boolean(freeShippingRule);
  return {
    zone,
    amount: freeShipping ? 0 : rule.amount,
    quoteRequired: false,
    label: rule.label,
    freeShipping,
    freeShippingLabel: freeShippingRule?.label || ""
  };
}
