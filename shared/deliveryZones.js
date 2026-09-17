// Estimation de zone de livraison par departement (sans API de geolocalisation externe).
// Depot de reference: Montgaillard-Lauragais (31290).
export const DEPOT_DEPARTMENT = "31";
export const NEARBY_DEPARTMENTS = ["09", "11", "32", "65", "81", "82"];

const ZONE_RULES = {
  local: { amount: 44, freeFromSubtotal: 600, label: "Livraison locale (31, environ 30 km)" },
  nearby: { amount: 69, freeFromSubtotal: 900, label: "Livraison departements limitrophes (environ 30-60 km)" },
  far: { amount: null, freeFromSubtotal: null, label: "Hors zone (plus de 60 km) : livraison sur devis" }
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
export function computeShipping({ postcode, subtotalTtc = 0 }) {
  const zone = resolveDeliveryZone(postcode);
  const rule = ZONE_RULES[zone === "unknown" ? "local" : zone];

  if (rule.amount == null) {
    return { zone, amount: 0, quoteRequired: true, label: rule.label };
  }

  const amount = Number(subtotalTtc) >= rule.freeFromSubtotal ? 0 : rule.amount;
  return { zone, amount, quoteRequired: false, label: rule.label };
}
