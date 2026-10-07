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

function itemMatchesRuleCategories(item, rule) {
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

export function validatePromoCode(codeInput, subtotalTtc, promoCodes = []) {
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

  const amount = match.type === "percent"
    ? roundToCents(Number(subtotalTtc) * (match.value / 100))
    : roundToCents(Math.min(match.value, Number(subtotalTtc)));

  return { valid: true, code: match.code, amount, message: `Code ${match.code} applique.` };
}
