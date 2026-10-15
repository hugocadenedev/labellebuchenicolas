// Moteur de promotions partage entre le front et le back (remises automatiques + codes promo).

function roundToCents(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function estimateStorageRatio(length) {
  if (String(length).includes("25")) return 0.65;
  if (String(length).includes("33")) return 0.7;
  if (String(length).includes("50")) return 0.8;
  return 1;
}

// Un produit "vendu au m3" saisit sa quantite en m3 apparents : on la convertit en steres reels
// pour que les seuils de remise (ex: 4 steres achetes = le 5e offert) restent corrects quelle que soit l'unite de vente.
export function getSterEquivalentQuantity(item) {
  const quantity = Number(item?.quantity || 0);
  if (item?.sellUnit === "m3") {
    return quantity / Math.max(estimateStorageRatio(item.selectedLength || item.length), 0.01);
  }
  return quantity;
}

// Prix equivalent au stere reel pour un produit vendu au m3 (inverse de getSterEquivalentQuantity), sinon prix inchange.
function getSterEquivalentPrice(item) {
  const price = Number(item?.price || 0);
  if (item?.sellUnit === "m3") {
    return price * Math.max(estimateStorageRatio(item.selectedLength || item.length), 0.01);
  }
  return price;
}

// Les remises par volume ciblent les categories du back-office (assignation par produit),
// pas le champ generique "category" (bois-de-chauffage / accessoires / services).
export function getCategorySlugsForProduct(categories = [], product) {
  if (!product) return [];
  return (Array.isArray(categories) ? categories : [])
    .filter((category) => Array.isArray(category.productIds) && category.productIds.includes(product.id))
    .map((category) => category.slug)
    .filter(Boolean);
}

export function normalizeVolumeDiscounts(values) {
  return (Array.isArray(values) ? values : [])
    .map((rule) => {
      const rawSlugs = Array.isArray(rule?.categorySlugs)
        ? rule.categorySlugs
        : (typeof rule?.categorySlug === "string" ? [rule.categorySlug] : []);
      const categorySlugs = [...new Set(rawSlugs.map((slug) => String(slug || "").trim()).filter(Boolean))];
      return {
        id: String(rule?.id || "").trim() || `vol_${Math.random().toString(36).slice(2, 9)}`,
        label: typeof rule?.label === "string" ? rule.label.trim() : "",
        categorySlugs,
        buyQuantity: Math.max(0, Math.round(Number(rule?.buyQuantity) || 0)),
        freeQuantity: Math.max(0, Math.round(Number(rule?.freeQuantity) || 0)),
        active: rule?.active !== false
      };
    })
    .filter((rule) => rule.buyQuantity > 0 && rule.freeQuantity > 0);
}

export function normalizePromoCodes(values) {
  return (Array.isArray(values) ? values : [])
    .map((entry) => ({
      code: String(entry?.code || "").trim().toUpperCase(),
      type: entry?.type === "fixed" ? "fixed" : "percent",
      value: Math.max(0, Number(entry?.value) || 0),
      minSubtotal: Math.max(0, Number(entry?.minSubtotal) || 0),
      active: entry?.active !== false
    }))
    .filter((entry) => entry.code && entry.value > 0);
}

export const FREE_SHIPPING_ZONES = ["local", "nearby"];

// Promo "livraison offerte" configurable en admin : seuil en steres et/ou en montant TTC, sur certaines categories et zones.
export function normalizeFreeShippingRules(values) {
  return (Array.isArray(values) ? values : [])
    .map((rule) => {
      const categorySlugs = [...new Set((Array.isArray(rule?.categorySlugs) ? rule.categorySlugs : []).map((slug) => String(slug || "").trim()).filter(Boolean))];
      const zones = (Array.isArray(rule?.zones) ? rule.zones : []).filter((zone) => FREE_SHIPPING_ZONES.includes(zone));
      return {
        id: String(rule?.id || "").trim() || `ship_${Math.random().toString(36).slice(2, 9)}`,
        label: typeof rule?.label === "string" ? rule.label.trim() : "",
        categorySlugs,
        minSteres: Math.max(0, Number(rule?.minSteres) || 0),
        minSubtotal: Math.max(0, Number(rule?.minSubtotal) || 0),
        zones: zones.length > 0 ? [...new Set(zones)] : ["local"],
        cumulative: rule?.cumulative === true,
        active: rule?.active !== false
      };
    })
    .filter((rule) => rule.minSteres > 0 || rule.minSubtotal > 0);
}

// Renvoie la premiere promo "livraison offerte" applicable au panier, ou null.
// Les steres ne comptent que le bois de chauffage ; les produits exclus des offres et les articles offerts ne comptent pas.
// hasOtherOffer : une remise achete/offert ou un code promo est deja appliquee (promo non cumulable dans ce cas).
export function findFreeShippingRule(cartItems = [], rules = [], { zone = "local", hasOtherOffer = false } = {}) {
  const items = (Array.isArray(cartItems) ? cartItems : []).filter((item) => !item?.isGift);
  return normalizeFreeShippingRules(rules).find((rule) => {
    if (!rule.active || !rule.zones.includes(zone)) return false;
    if (hasOtherOffer && !rule.cumulative) return false;
    const matching = items.filter((item) => itemMatchesRuleCategories(item, rule));
    const steres = matching
      .filter((item) => item.category === "bois-de-chauffage")
      .reduce((sum, item) => sum + getSterEquivalentQuantity(item), 0);
    const subtotal = matching.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    // Petite tolerance pour les conversions m3 -> steres (ex: 3,25 m3 / 0,65 = 4,9999...).
    return steres + 1e-6 >= rule.minSteres && subtotal + 1e-6 >= rule.minSubtotal;
  }) || null;
}

// Un produit coche "exclu des offres" en admin ne compte jamais dans une remise achete/offert ni dans un code promo.
export function isExcludedFromPromotions(item) {
  return item?.excludeFromPromotions === true;
}

// Montant TTC du panier sur lequel un code promo peut s'appliquer (hors produits exclus des offres et articles offerts).
export function getPromoEligibleSubtotal(cartItems = []) {
  return roundToCents((Array.isArray(cartItems) ? cartItems : [])
    .filter((item) => !item?.isGift && !isExcludedFromPromotions(item))
    .reduce((sum, item) => sum + Number(item?.price || 0) * Number(item?.quantity || 0), 0));
}

function itemMatchesRuleCategories(item, rule) {
  if (isExcludedFromPromotions(item)) return false;
  if (rule.categorySlugs.length === 0) return true;
  const itemSlugs = Array.isArray(item.categorySlugs) && item.categorySlugs.length > 0
    ? item.categorySlugs
    : (item.category ? [item.category] : []);
  return itemSlugs.some((slug) => rule.categorySlugs.includes(slug));
}

// Le(s) article(s) les moins chers du lot sont offerts, comme "4 achetes = le 5e offert".
export function computeVolumeDiscount(cartItems = [], rules = []) {
  const activeRules = normalizeVolumeDiscounts(rules).filter((rule) => rule.active);
  const breakdown = [];
  let amount = 0;

  activeRules.forEach((rule) => {
    const matching = cartItems.filter((item) => itemMatchesRuleCategories(item, rule));
    const totalQuantity = matching.reduce((sum, item) => sum + getSterEquivalentQuantity(item), 0);
    const bundleSize = rule.buyQuantity + rule.freeQuantity;
    if (totalQuantity < bundleSize) return;

    const bundles = Math.floor(totalQuantity / bundleSize);
    const freeUnits = bundles * rule.freeQuantity;
    if (freeUnits <= 0) return;

    const unitPrices = matching
      .flatMap((item) => Array(Math.max(0, Math.round(getSterEquivalentQuantity(item)))).fill(getSterEquivalentPrice(item)))
      .sort((a, b) => a - b);
    const ruleAmount = roundToCents(unitPrices.slice(0, freeUnits).reduce((sum, price) => sum + price, 0));
    if (ruleAmount <= 0) return;

    amount = roundToCents(amount + ruleAmount);
    breakdown.push({
      id: rule.id,
      label: rule.label || `${rule.buyQuantity} achetes = ${rule.freeQuantity} offert(s)`,
      freeUnits,
      amount: ruleAmount
    });
  });

  return { amount, breakdown };
}

// Ajoute automatiquement le(s) article(s) offert(s) au panier des que le seuil d'achat est atteint,
// sans que le client n'ait besoin de les ajouter lui-meme (ex: 4 achetes -> le 5e apparait offert).
export function applyAutomaticGifts(cartItems = [], rules = []) {
  const activeRules = normalizeVolumeDiscounts(rules).filter((rule) => rule.active);
  const giftLines = [];

  activeRules.forEach((rule) => {
    const matching = cartItems.filter((item) => !item.isGift && itemMatchesRuleCategories(item, rule));
    const paidQuantity = matching.reduce((sum, item) => sum + getSterEquivalentQuantity(item), 0);
    if (paidQuantity < rule.buyQuantity) return;

    const bundles = Math.floor(paidQuantity / rule.buyQuantity);
    const giftQuantitySteres = bundles * rule.freeQuantity;
    if (giftQuantitySteres <= 0) return;

    const cheapest = [...matching].sort((a, b) => getSterEquivalentPrice(a) - getSterEquivalentPrice(b))[0];
    if (!cheapest) return;

    // L'article offert garde l'unite de vente du produit (m3 ou stere), on reconvertit donc le nombre de steres offerts.
    const giftQuantity = cheapest.sellUnit === "m3"
      ? giftQuantitySteres * Math.max(estimateStorageRatio(cheapest.selectedLength || cheapest.length), 0.01)
      : giftQuantitySteres;

    giftLines.push({
      ...cheapest,
      lineId: `gift-${rule.id}`,
      quantity: giftQuantity,
      price: 0,
      isGift: true,
      giftLabel: rule.label || `${rule.buyQuantity} achetes = ${rule.freeQuantity} offert(s)`
    });
  });

  return [...cartItems, ...giftLines];
}

// Le minimum d'achat se verifie sur le panier complet, la remise ne porte que sur les produits eligibles.
export function validatePromoCode(codeInput, subtotalTtc, promoCodes = [], eligibleSubtotalTtc = subtotalTtc) {
  const code = String(codeInput || "").trim().toUpperCase();
  if (!code) {
    return { valid: false, code: "", amount: 0, message: "" };
  }

  const match = normalizePromoCodes(promoCodes).find((entry) => entry.active && entry.code === code);
  if (!match) {
    return { valid: false, code, amount: 0, message: "Code promo invalide ou expire." };
  }

  if (Number(subtotalTtc) < match.minSubtotal) {
    return { valid: false, code, amount: 0, message: `Ce code necessite au moins ${match.minSubtotal.toFixed(2)} EUR d'achat.` };
  }

  const eligibleSubtotal = Math.max(0, Math.min(Number(eligibleSubtotalTtc) || 0, Number(subtotalTtc) || 0));
  if (eligibleSubtotal <= 0) {
    return { valid: false, code, amount: 0, message: "Ce code ne s'applique a aucun article de votre panier." };
  }

  const amount = match.type === "percent"
    ? roundToCents(eligibleSubtotal * (match.value / 100))
    : roundToCents(Math.min(match.value, eligibleSubtotal));

  return { valid: true, code: match.code, amount, message: `Code ${match.code} applique.` };
}
