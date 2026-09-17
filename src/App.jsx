import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";
import {
  brand,
  families,
  faqs,
  posts,
  productMediaLibrary,
  products,
  reviews,
} from "./catalog";
import { computeShipping, FREE_SHIPPING_MIN_STERES } from "../shared/deliveryZones.js";
import { validatePromoCode, normalizeVolumeDiscounts, normalizePromoCodes, applyAutomaticGifts, getCategorySlugsForProduct } from "../shared/promotions.js";

const tones = {
  dark: { background: "#23291F", color: "#F4F7EC" },
  warm: { background: "#F5EFE2", color: "#A8501B" },
  green: { background: "#F3E5D8", color: "#5B321D" }
};

const pageShell = {
  maxWidth: 1400,
  margin: "0 auto",
  padding: "0 clamp(16px, 4vw, 32px)"
};

const adminShell = {
  width: "100%",
  maxWidth: "none",
  margin: 0
};

const mono = { fontFamily: "'DM Mono', monospace" };
const sans = { fontFamily: "'Outfit', sans-serif" };
const vatRate = 0.1;

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR"
});

const decimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const productMediaOptions = Object.entries(productMediaLibrary).map(([key, media]) => ({
  key,
  ...media
}));

const adminSessionKey = "lbb-admin-session";
const customerSessionKey = "lbb-customer-session";
const stripeCheckoutKey = "lbb-stripe-checkout";

const defaultProductOptionSettings = {
  productOptions: {
    lengths: ["25 cm", "33 cm", "50 cm", "2 m"],
    dryingDurations: ["Seche 18 mois", "Seche 2 ans", "Seche 2 ans et demi"]
  },
  deliverySlots: [],
  promotions: {
    volumeDiscounts: [],
    promoCodes: []
  },
  announcementBar: {
    primaryText: "Tarifs TTC · TVA 10 %",
    secondaryText: "Livraison jusqu'a 30 km : 44,00 EUR TTC",
    tertiaryText: "Au-dela de 60 km : sur devis",
    backgroundColor: "#5B321D",
    textColor: "#FBF6EE"
  },
  heroProof: {
    primaryText: "Tarifs TTC avec TVA 10 %",
    secondaryText: "Livraison offerte des 5 steres dans 30 km",
    tertiaryText: "Offre 4 steres achetes = le 5e offert"
  }
};

function normalizeAnnouncementText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }

  return typeof value === "string" ? value.trim() : fallback;
}

function readAdminSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(adminSessionKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistAdminSession(session) {
  window.localStorage.setItem(adminSessionKey, JSON.stringify(session));
}

function clearAdminSession() {
  window.localStorage.removeItem(adminSessionKey);
}

function readCustomerSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(customerSessionKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistCustomerSession(session) {
  window.localStorage.setItem(customerSessionKey, JSON.stringify(session));
}

function clearCustomerSession() {
  window.localStorage.removeItem(customerSessionKey);
}

function readPendingStripeCheckout() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(stripeCheckoutKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistPendingStripeCheckout(checkout) {
  window.localStorage.setItem(stripeCheckoutKey, JSON.stringify(checkout));
}

function clearPendingStripeCheckout() {
  window.localStorage.removeItem(stripeCheckoutKey);
}

function normalizeAccountView(account) {
  return {
    ...account,
    firstName: account?.firstName || account?.customer?.split(" ")[0] || account?.customer || "",
    memberSince: account?.memberSince || "",
    seasonHistory: Array.isArray(account?.seasonHistory) ? account.seasonHistory : [],
    accessNote: account?.accessNote || "",
    orders: Array.isArray(account?.orders) ? account.orders : [],
    deliveries: Array.isArray(account?.deliveries) ? account.deliveries : [],
    trackSteps: Array.isArray(account?.trackSteps) ? account.trackSteps : [],
    stats: Array.isArray(account?.stats) ? account.stats : []
  };
}

function buildAddressDraft(address = {}, fallbackName = "") {
  return {
    name: address.name || fallbackName,
    line1: address.line1 || "",
    line2: address.line2 || "",
    postcode: address.postcode || "",
    city: address.city || ""
  };
}

function buildCheckoutDraft(account) {
  const primaryAddress = account?.addresses?.[0] || {};
  const customerName = account?.customer || "";
  const firstSlot = account?.deliveries?.[0] ? `${account.deliveries[0].day} · ${account.deliveries[0].hours}` : "";

  return {
    customerName,
    contactEmail: account?.email || "",
    contactPhone: account?.phone || "",
    deliveryAddress: buildAddressDraft(primaryAddress, customerName),
    billingSameAsDelivery: true,
    billingAddress: buildAddressDraft(primaryAddress, customerName),
    paymentMethod: "Carte bancaire",
    slot: firstSlot,
    logisticsNote: account?.accessNote || ""
  };
}

function formatDecimal(value) {
  return decimal.format(Number(value) || 0);
}

function roundToHalf(value) {
  return Math.round(value * 2) / 2;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function convertHtToTtc(value) {
  return roundMoney(Number(value || 0) * (1 + vatRate));
}

function extractHtFromTtc(value) {
  return roundMoney(Number(value || 0) / (1 + vatRate));
}

function extractVatFromTtc(value) {
  return roundMoney(Number(value || 0) - extractHtFromTtc(value));
}

function convertPriceMapHtToTtc(priceMap = {}) {
  return Object.fromEntries(
    Object.entries(priceMap).map(([key, value]) => [key, convertHtToTtc(value)])
  );
}

function buildVatBreakdown(subtotalTtc, shippingTtc = 0) {
  const productsTtc = roundMoney(subtotalTtc);
  const shipping = roundMoney(shippingTtc);
  const productsHt = extractHtFromTtc(productsTtc);
  const shippingHt = extractHtFromTtc(shipping);
  const productsVat = extractVatFromTtc(productsTtc);
  const shippingVat = extractVatFromTtc(shipping);

  return {
    productsHt,
    productsVat,
    productsTtc,
    shippingHt,
    shippingVat,
    shippingTtc: shipping,
    totalHt: roundMoney(productsHt + shippingHt),
    totalVat: roundMoney(productsVat + shippingVat),
    totalTtc: roundMoney(productsTtc + shipping)
  };
}

function estimateStorageRatio(length) {
  if (String(length).includes("25")) return 0.65;
  if (String(length).includes("33")) return 0.7;
  if (String(length).includes("50")) return 0.8;
  return 1;
}

function selectEstimatorProduct(siteProducts, preferredLength, preferredEssence = "") {
  const woodProducts = siteProducts.filter((product) => product.category === "bois-de-chauffage");
  return woodProducts.find((product) => product.length === preferredLength && (!preferredEssence || product.family === preferredEssence || product.essence === preferredEssence))
    || woodProducts.find((product) => preferredEssence && (product.family === preferredEssence || product.essence === preferredEssence))
    || woodProducts.find((product) => product.length === preferredLength)
    || siteProducts.find((product) => product.category === "bois-de-chauffage")
    || siteProducts[0]
    || null;
}

function buildConsumptionEstimate(input, siteProducts) {
  const baseByInsulation = {
    passoire: 155,
    standard: 108,
    bonne: 80,
    recente: 60
  };
  const climateFactor = {
    abrite: 0.93,
    normal: 1,
    expose: 1.12,
    froid: 1.22
  };
  const usageFactor = {
    appoint: 0.38,
    soir: 0.68,
    quotidien: 0.9,
    principal: 1
  };
  const comfortFactor = {
    souple: 0.94,
    normal: 1,
    soutenu: 1.08
  };
  const efficiencyByDevice = {
    foyer: 0.15,
    "insert-ancien": 0.55,
    "insert-recent": 0.72,
    poele: 0.8,
    masse: 0.87
  };

  const area = Number(input.area || 0);
  const height = Number(input.height || 2.5);
  const baseNeed = baseByInsulation[input.insulation] || baseByInsulation.standard;
  const climate = climateFactor[input.climate] || 1;
  const usage = usageFactor[input.usage] || 1;
  const comfort = comfortFactor[input.comfort] || 1;
  const efficiency = efficiencyByDevice[input.device] || 0.72;
  const heightFactor = Math.max(0.88, Math.min(1.22, height / 2.5));
  const usefulKwh = Math.round(area * baseNeed * climate * usage * comfort * heightFactor);
  const requiredSteres = Math.max(1, roundToHalf(usefulKwh / (1900 * efficiency)));
  const safetySteres = roundToHalf(requiredSteres * 1.12);
  const preferredLength = input.device === "foyer" || input.device === "masse"
    ? "50 cm"
    : area < 85
      ? "25 cm"
      : "33 cm";
  const recommendedProduct = selectEstimatorProduct(siteProducts, preferredLength, input.essence);
  const storageVolume = roundToHalf(requiredSteres * estimateStorageRatio(recommendedProduct?.length || preferredLength));
  const budget = Math.round(requiredSteres * Number(recommendedProduct?.price || 130));
  const lots = requiredSteres >= 5 ? 2 : 1;
  const monthlyWeights = [0.08, 0.16, 0.24, 0.24, 0.18, 0.1];
  const monthlyPlan = ["Oct.", "Nov.", "Déc.", "Jan.", "Fév.", "Mars"].map((label, index) => ({
    label,
    steres: Math.max(0.5, roundToHalf(requiredSteres * monthlyWeights[index]))
  }));

  return {
    usefulKwh,
    requiredSteres,
    safetySteres,
    preferredLength,
    recommendedProduct,
    storageVolume,
    budget,
    lots,
    heightFactor,
    efficiency,
    monthlyPlan,
    fuelLabel: input.device === "foyer" ? "flambée d'appoint" : input.usage === "principal" ? "chauffe principale" : "chauffe régulière",
    chosenEssence: input.essence || recommendedProduct?.family || recommendedProduct?.essence || "Chêne"
  };
}

const fallbackCategories = families.map((family) => ({
  id: `fallback-${family.label}`,
  slug: slugify(family.label),
  label: family.label,
  kicker: "Essences seches disponibles",
  heading: `${family.label} vendu au stere`,
  description: "Categorie locale de secours si l'API n'est pas disponible.",
  shortDescription: family.count,
  coverProductId: products.find((product) => product.family === family.label)?.id || products[0].id,
  essences: [family.label],
  productIds: products.filter((product) => product.family === family.label).map((product) => product.id),
  from: family.from,
  count: family.count
}));

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Livraison n'est pas garantie par defaut, on retire toute mention "livre/livré" du libelle d'unite.
function stripDeliveredWording(value) {
  return typeof value === "string" ? value.replace(/\s*livr[ée]e?s?\b/gi, "").trim() : "";
}

function buildProductSpecsFromDraft(product) {
  if (Array.isArray(product.specs) && product.specs.length > 0) {
    return product.specs;
  }

  return [
    product.essence ? { k: "Essence", v: product.essence } : null,
    product.origin ? { k: "Origine", v: product.origin } : null,
    product.length ? { k: "Longueur", v: product.length } : null,
    product.humidity ? { k: "Humidite", v: product.humidity } : null,
    product.calorificValue ? { k: "Pouvoir calorifique", v: product.calorificValue } : null
  ].filter(Boolean);
}

function findMediaKeyBySrc(src) {
  if (!src) return "";
  const match = productMediaOptions.find((item) => item.src === src);
  return match?.key || "";
}

function resolveMediaSource({ imageKey, imageUrl, fallback, preferBlank = false }) {
  if (imageUrl) return imageUrl;
  if (imageKey && productMediaLibrary[imageKey]) return productMediaLibrary[imageKey].src;
  if (fallback) return fallback;
  return preferBlank ? "" : brand.woodYardImage;
}

function resolveGallerySources({ galleryKeys = [], galleryUrls = [], imageKey, imageUrl, fallback = [] }) {
  const keySources = galleryKeys.map((key) => productMediaLibrary[key]?.src).filter(Boolean);
  const sources = uniqueByValue([
    ...galleryUrls.filter(Boolean),
    ...keySources,
    resolveMediaSource({ imageKey, imageUrl, fallback: fallback[0] }),
    ...fallback
  ]);

  return sources.filter(Boolean);
}

function uniqueByValue(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeProductOptionSettings(settings) {
  const productOptions = settings?.productOptions || {};
  const lengths = uniqueByValue(Array.isArray(productOptions.lengths) ? productOptions.lengths : []);
  const dryingDurations = uniqueByValue(Array.isArray(productOptions.dryingDurations) ? productOptions.dryingDurations : []);
  const deliverySlots = uniqueByValue(Array.isArray(settings?.deliverySlots) ? settings.deliverySlots : []);
  const announcementBar = settings?.announcementBar || {};
  const heroProof = settings?.heroProof || {};
  const promotions = settings?.promotions || {};

  return {
    productOptions: {
      lengths: lengths.length > 0 ? lengths : [...defaultProductOptionSettings.productOptions.lengths],
      dryingDurations: dryingDurations.length > 0 ? dryingDurations : [...defaultProductOptionSettings.productOptions.dryingDurations]
    },
    deliverySlots,
    promotions: {
      volumeDiscounts: normalizeVolumeDiscounts(promotions.volumeDiscounts),
      promoCodes: normalizePromoCodes(promotions.promoCodes)
    },
    announcementBar: {
      primaryText: normalizeAnnouncementText(announcementBar.primaryText, defaultProductOptionSettings.announcementBar.primaryText),
      secondaryText: normalizeAnnouncementText(announcementBar.secondaryText, defaultProductOptionSettings.announcementBar.secondaryText),
      tertiaryText: normalizeAnnouncementText(announcementBar.tertiaryText, defaultProductOptionSettings.announcementBar.tertiaryText),
      backgroundColor: typeof announcementBar.backgroundColor === "string" && announcementBar.backgroundColor.trim()
        ? announcementBar.backgroundColor.trim()
        : defaultProductOptionSettings.announcementBar.backgroundColor,
      textColor: typeof announcementBar.textColor === "string" && announcementBar.textColor.trim()
        ? announcementBar.textColor.trim()
        : defaultProductOptionSettings.announcementBar.textColor
    },
    heroProof: {
      primaryText: normalizeAnnouncementText(heroProof.primaryText, defaultProductOptionSettings.heroProof.primaryText),
      secondaryText: normalizeAnnouncementText(heroProof.secondaryText, defaultProductOptionSettings.heroProof.secondaryText),
      tertiaryText: normalizeAnnouncementText(heroProof.tertiaryText, defaultProductOptionSettings.heroProof.tertiaryText)
    }
  };
}

function getProductVariantFamily(siteProducts, product) {
  if (!product) return [];
  if (product.category === "accessoires") return [product];

  return siteProducts.filter((item) => {
    if (item.category !== product.category) return false;
    if (item.categoryId && product.categoryId) {
      return item.categoryId === product.categoryId;
    }

    return (item.essence || item.family || "") === (product.essence || product.family || "");
  });
}

function findMatchingVariant(variants, nextLength, nextDrying) {
  return variants.find((item) => item.length === nextLength && item.drying === nextDrying)
    || variants.find((item) => item.length === nextLength)
    || variants.find((item) => item.drying === nextDrying)
    || variants[0]
    || null;
}

function isAccessoryProduct(product) {
  return product?.category === "accessoires";
}

function isServiceProduct(product) {
  return product?.category === "services";
}

function getProductTypeLabel(product) {
  if (isServiceProduct(product)) return "Service";
  if (isAccessoryProduct(product)) return "Allumage";
  return "Bois de chauffage";
}

function getProductQuantityUnitLabel(product) {
  if (isServiceProduct(product)) return "prestation(s)";
  if (isAccessoryProduct(product)) {
    return product.unit?.includes("filet") ? "filet(s)" : "boîte(s)";
  }
  return "stère(s)";
}

function getServiceSuggestions(siteProducts, cartItems) {
  const selectedServiceIds = new Set(cartItems.filter((item) => isServiceProduct(item)).map((item) => item.id));
  return siteProducts.filter((product) => isServiceProduct(product) && !selectedServiceIds.has(product.id));
}

function normalizeLengthPrices(lengthPrices, availableLengths = [], fallbackPrice = 0) {
  const fallback = Number(fallbackPrice || 0);
  return uniqueByValue(availableLengths).reduce((accumulator, length) => {
    const nextPrice = Number(lengthPrices?.[length]);
    accumulator[length] = Number.isFinite(nextPrice) ? nextPrice : fallback;
    return accumulator;
  }, {});
}

function getProductPriceForLength(product, selectedLength = "") {
  const length = selectedLength || product?.length || "";
  const mappedPrice = Number(product?.lengthPrices?.[length]);
  if (Number.isFinite(mappedPrice) && mappedPrice > 0) {
    return mappedPrice;
  }

  return Number(product?.price || 0);
}

function buildCartLineId(productId, options = {}) {
  return [productId, options.length || "", options.drying || ""].map((value) => encodeURIComponent(String(value))).join("::");
}

function normalizeCartState(value) {
  if (!value || typeof value !== "object") return {};

  return Object.entries(value).reduce((accumulator, [key, entry]) => {
    if (typeof entry === "number") {
      const quantity = Math.max(0, Math.round(entry));
      if (quantity > 0) {
        accumulator[key] = { productId: key, quantity, length: "", drying: "" };
      }
      return accumulator;
    }

    if (!entry || typeof entry !== "object") {
      return accumulator;
    }

    const quantity = Math.max(0, Math.round(Number(entry.quantity || 0)));
    const productId = entry.productId || decodeURIComponent(String(key).split("::")[0] || "");
    if (!productId || quantity <= 0) {
      return accumulator;
    }

    accumulator[key] = {
      productId,
      quantity,
      length: entry.length || "",
      drying: entry.drying || "",
      unitPrice: Number.isFinite(Number(entry.unitPrice)) ? Number(entry.unitPrice) : undefined
    };
    return accumulator;
  }, {});
}

function parseMultilineList(value) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function parseSpecsInput(value) {
  return parseMultilineList(value).map((line) => {
    const [left, ...right] = line.split(":");
    const key = left?.trim();
    const val = right.join(":").trim();
    return key && val ? { k: key, v: val } : null;
  }).filter(Boolean);
}

function serializeSpecs(specs = []) {
  return specs.map((spec) => `${spec.k}: ${spec.v}`).join("\n");
}

function serializeTabPart(values = []) {
  return (values || []).join("\n");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Image load failed"));
    reader.readAsDataURL(file);
  });
}

function buildProductTabsFromDraft(product) {
  if (product.tabs?.overview && product.tabs?.livraison) {
    return product.tabs;
  }

  const isService = isServiceProduct(product);
  const isAccessory = isAccessoryProduct(product);

  const overviewParagraphs = [
    product.desc || `${product.name} est pret pour une chauffe reguliere et une utilisation simple au quotidien.`
  ];
  if (product.length || product.drying) {
    overviewParagraphs.push(
      `${product.essence || product.family || "Ce lot"} propose${product.length ? ` une coupe ${product.length}` : ""}${product.drying ? ` avec un lot ${product.drying.toLowerCase()}` : ""}.`
    );
  }

  const deliveryParagraphs = isService
    ? [
        "Ce service est ajoute a la meme tournee que votre commande de bois : aucun deplacement supplementaire n'est facture.",
        "Il reste ajoutable au panier jusqu'a la validation finale de la commande."
      ]
    : isAccessory
      ? [
          "Cet article est ajoutable a une livraison de bois ou a un retrait au depot, sans frais de livraison dedie.",
          "Livraison jusqu'a 30 km : 44,00 € TTC. De 31 a 60 km : 66,00 € TTC. Au-dela de 60 km : sur devis."
        ]
      : [
          `Livraison jusqu'a 30 km : 44,00 € TTC, offerte des ${FREE_SHIPPING_MIN_STERES} steres de bois commandes.`,
          "De 31 a 60 km : 66,00 € TTC. Au-dela de 60 km, la livraison est etablie sur devis."
        ];
  const deliveryPoints = isService
    ? ["Planifie sur le meme creneau que la livraison.", "Visible dans le panier et la commande finale.", "Aucun frais de deplacement supplementaire."]
    : isAccessory
      ? ["Compatible avec les tournees bois et le retrait depot.", "Aucun surcout logistique dedie.", "Sur devis au-dela de 60 km."]
      : [
          `Offerte des ${FREE_SHIPPING_MIN_STERES} steres dans la zone locale (jusqu'a 30 km).`,
          "44,00 € TTC jusqu'a 30 km, 66,00 € TTC de 31 a 60 km.",
          "Au-dela de 60 km : livraison sur devis."
        ];

  return {
    overview: {
      title: "Description",
      paragraphs: overviewParagraphs,
      points: [
        product.humidity ? `${product.humidity}.` : null,
        product.origin ? `${product.origin}.` : null,
        `Reference ${product.sku || product.id}.`
      ].filter(Boolean)
    },
    livraison: {
      title: "Comment fonctionne la livraison",
      paragraphs: deliveryParagraphs,
      points: deliveryPoints
    }
  };
}

function getCategoryHref(slug) {
  return `/categorie/${slug}`;
}

function materializeStorefrontProduct(baseProducts, apiProduct) {
  // Ne rattacher un produit demo que si le lien est explicite: sinon les specs/badges/notes de ce demo produit fuiteraient sur un produit reel non lie.
  const baseProduct = baseProducts.find((product) => product.id === apiProduct.id)
    || baseProducts.find((product) => product.id === apiProduct.templateProductId);
  const isService = isServiceProduct(apiProduct);
  const canInheritMedia = !isService && Boolean(baseProduct);
  const image = resolveMediaSource({
    imageKey: apiProduct.imageKey,
    imageUrl: apiProduct.imageUrl,
    fallback: canInheritMedia ? baseProduct?.image : "",
    preferBlank: isService || !canInheritMedia
  });

  const priceHt = Number(apiProduct.price ?? baseProduct?.price ?? 0);
  const oldPriceSource = apiProduct.oldPrice ?? baseProduct?.oldPrice ?? null;
  const oldPriceHt = oldPriceSource == null ? null : Number(oldPriceSource);
  const optionFallbackProduct = canInheritMedia ? baseProduct : null;
  const availableLengths = uniqueByValue(apiProduct.availableLengths || [apiProduct.length, optionFallbackProduct?.length].filter(Boolean));
  const lengthPricesHt = normalizeLengthPrices(apiProduct.lengthPrices || baseProduct?.lengthPrices, availableLengths, priceHt);
  const defaultLength = apiProduct.length || availableLengths[0] || optionFallbackProduct?.length || "";
  const defaultPriceHt = getProductPriceForLength({ ...baseProduct, ...apiProduct, price: priceHt, lengthPrices: lengthPricesHt }, defaultLength);
  const availableDryingDurations = uniqueByValue(apiProduct.availableDryingDurations || [apiProduct.drying, optionFallbackProduct?.drying].filter(Boolean));
  const defaultDrying = apiProduct.drying || availableDryingDurations[0] || optionFallbackProduct?.drying || "";

  return {
    ...baseProduct,
    ...apiProduct,
    slug: apiProduct.slug || baseProduct?.slug || slugify(apiProduct.name),
    cat: apiProduct.cat || apiProduct.family || baseProduct?.cat || "Bois",
    essence: apiProduct.essence || apiProduct.family || baseProduct?.essence || "Bois",
    category: apiProduct.category || baseProduct?.category || "bois-de-chauffage",
    family: apiProduct.family || baseProduct?.family || "Bois",
    priceHt: defaultPriceHt,
    price: convertHtToTtc(defaultPriceHt),
    oldPriceHt,
    oldPrice: oldPriceHt == null ? null : convertHtToTtc(oldPriceHt),
    unit: stripDeliveredWording(apiProduct.unit) || stripDeliveredWording(baseProduct?.unit) || "/ stere",
    badge: apiProduct.badge || baseProduct?.badge || "Nouveau",
    badgeTone: apiProduct.badgeTone || baseProduct?.badgeTone || "green",
    rating: apiProduct.rating || baseProduct?.rating || "★★★★★",
    reviews: apiProduct.reviews || baseProduct?.reviews || "0 avis",
    length: defaultLength,
    drying: defaultDrying,
    availableLengths,
    availableDryingDurations,
    lengthPricesHt,
    lengthPrices: convertPriceMapHtToTtc(lengthPricesHt),
    humidity: apiProduct.humidity || "",
    desc: apiProduct.desc || baseProduct?.desc || "",
    image,
    gallery: isService ? [] : resolveGallerySources({
      galleryKeys: apiProduct.galleryKeys,
      galleryUrls: apiProduct.galleryUrls,
      imageKey: apiProduct.imageKey,
      imageUrl: apiProduct.imageUrl,
      fallback: canInheritMedia ? (baseProduct?.gallery || [baseProduct?.image].filter(Boolean)) : []
    }),
    specs: buildProductSpecsFromDraft(apiProduct),
    tabs: buildProductTabsFromDraft(apiProduct),
    stockPct: apiProduct.stockPct ?? baseProduct?.stockPct ?? 0,
    stockLabel: apiProduct.stockLabel || baseProduct?.stockLabel || "",
    isLowStock: apiProduct.isLowStock ?? false,
    status: apiProduct.status || baseProduct?.status || "active"
  };
}

function buildStorefrontProducts(baseProducts, adminProducts) {
  if (!adminProducts || adminProducts.length === 0) return [];

  const normalizedAdminProducts = adminProducts.map((product) => materializeStorefrontProduct(baseProducts, product));
  return normalizedAdminProducts.filter((product) => product.status !== "draft");
}

function buildStorefrontCategories(categories, allProducts) {
  return categories.map((category) => {
    const categoryProducts = getCategoryProducts(allProducts, category).filter((product) => product.status !== "draft" && !isServiceProduct(product));
    const minPrice = categoryProducts.length > 0 ? Math.min(...categoryProducts.map((product) => Number(product.price || 0))) : null;

    return {
      ...category,
      from: minPrice !== null ? `Des ${formatPrice(minPrice)}` : category.from,
      count: `${categoryProducts.length} ${categoryProducts.length > 1 ? "references" : "reference"}`
    };
  });
}

function getCategoryProducts(allProducts, category) {
  if (!category) return [];
  if (Array.isArray(category.productIds) && category.productIds.length > 0) {
    return allProducts.filter((product) => category.productIds.includes(product.id));
  }
  if (Array.isArray(category.essences) && category.essences.length > 0) {
    return allProducts.filter((product) => category.essences.includes(product.essence) || category.essences.includes(product.family));
  }
  return allProducts;
}

function getCategoryForProduct(categories, productId) {
  return categories.find((category) => Array.isArray(category.productIds) && category.productIds.includes(productId)) || categories[0] || null;
}

function getCategoryCoverImage(category, allProducts) {
  if (category.imageUrl) return category.imageUrl;
  return allProducts.find((product) => product.id === category.coverProductId)?.image || "";
}

function formatPrice(value) {
  return currency.format(value);
}

function formatDateTime(value) {
  if (!value) return "Création locale";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Création locale";
  return dateTime.format(date);
}

const orderStatusOptions = [
  { value: "pending", label: "En attente" },
  { value: "paid", label: "Paiement validé" },
  { value: "partial_refund", label: "Remboursement partiel" }
];

const fulfillmentStatusOptions = [
  { value: "pending", label: "En attente" },
  { value: "preparing", label: "Préparation" },
  { value: "ready", label: "Commande prête" }
];

function getOrderStatusTone(status) {
  if (status === "pending") {
    return tones.warm;
  }

  if (status === "partial_refund") {
    return { background: "#FCE7DF", color: "#A8501B" };
  }

  return tones.green;
}

function getFulfillmentTone(fulfillment) {
  if (fulfillment === "ready" || fulfillment === "delivery") {
    return { background: "#F3E5D8", color: "#5B321D" };
  }

  if (fulfillment === "done") {
    return { background: "#23291F", color: "#F4F7EC" };
  }

  if (fulfillment === "preparing") {
    return { background: "#F7F0E4", color: "#8A5A2B" };
  }

  return { background: "#F5EFE2", color: "#A8501B" };
}

function formatAddress(address) {
  if (!address) return "Adresse à compléter";
  return [address.name, address.line1, address.line2, [address.postcode, address.city].filter(Boolean).join(" ")].filter(Boolean).join("\n");
}

function buildOrderItems(order, productsCatalog) {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map((item) => {
      const catalogMatch = productsCatalog.find((product) => product.id === item.productId || product.sku === item.sku);
      const unitPrice = Number(item.unitPrice ?? catalogMatch?.price ?? 0);
      const quantity = Number(item.quantity ?? 1);
      return {
        ...item,
        sku: item.sku || catalogMatch?.sku || item.productId || "SKU",
        name: item.name || catalogMatch?.name || "Produit",
        quantity,
        unitPrice,
        total: Number(item.total ?? quantity * unitPrice)
      };
    });
  }

  return [
    {
      sku: order.id,
      name: order.customer,
      quantity: 1,
      unitPrice: Number(order.total || 0),
      total: Number(order.total || 0)
    }
  ];
}

function joinTimelineDetail(parts) {
  return parts.filter(Boolean).join(" · ");
}

function buildOrderTimeline(order) {
  const existingTimeline = Array.isArray(order.timeline) ? order.timeline : [];
  if (existingTimeline.length > 0) {
    return existingTimeline.filter((step) => step && (step.label || step.detail || step.at));
  }

  return [
    {
      at: order.createdAt || "",
      label: "Passage de commande",
      detail: joinTimelineDetail([order.channel, order.customer])
    },
    {
      at: "",
      label: order.statusLabel || "",
      detail: joinTimelineDetail([order.paymentMethod, order.paymentReference])
    },
    {
      at: "",
      label: order.fulfillmentLabel || "",
      detail: joinTimelineDetail([order.slot, order.logisticsNote])
    }
  ].filter((step) => step.label || step.detail || step.at);
}

async function apiRequest(path, options = {}) {
  const adminSession = path.startsWith("/api/admin") ? readAdminSession() : null;
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(adminSession?.token ? { Authorization: `Bearer ${adminSession.token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    if (response.status === 401 && path.startsWith("/api/admin")) {
      clearAdminSession();
    }
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "API request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function buildOrderRequest(draft, customerId, cartItems, shippingAmount) {
  return {
    ...draft,
    customerId,
    shippingAmount,
    billingAddress: draft.billingSameAsDelivery ? draft.deliveryAddress : draft.billingAddress,
    items: cartItems.map((item) => ({
      productId: item.id,
      name: item.name,
      category: item.category,
      categorySlugs: item.categorySlugs,
      quantity: item.quantity,
      length: item.selectedLength,
      drying: item.selectedDrying,
      unitPrice: item.price
    }))
  };
}

function App() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector(".lbb-admin-main")?.scrollTo(0, 0);
  }, [location.pathname]);

  if (location.pathname.startsWith("/admin")) {
    return <AdminApp />;
  }

  return <StorefrontApp />;
}

function StorefrontApp() {
  const navigate = useNavigate();
  const [siteData, setSiteData] = useState({ categories: [], settings: defaultProductOptionSettings, products: [], account: null });
  const [siteStatus, setSiteStatus] = useState("loading");
  const [isCartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [customerSession, setCustomerSession] = useState(() => readCustomerSession());
  const [customerAccount, setCustomerAccount] = useState(null);
  const [accountStatus, setAccountStatus] = useState(() => readCustomerSession() ? "loading" : "idle");
  const [promoCode, setPromoCode] = useState(() => window.localStorage.getItem("lbb-promo-code") || "");

  useEffect(() => {
    if (promoCode) {
      window.localStorage.setItem("lbb-promo-code", promoCode);
    } else {
      window.localStorage.removeItem("lbb-promo-code");
    }
  }, [promoCode]);
  const [cart, setCart] = useState(() => {
    const stored = window.localStorage.getItem("lbb-cart");
    return stored ? normalizeCartState(JSON.parse(stored)) : normalizeCartState({ "chene-33": 2, "hetre-33": 1, "filet-bois-allumage-50l": 1 });
  });

  useEffect(() => {
    let isMounted = true;
    let retryHandle;

    async function loadSite(attempt = 0) {
      try {
        const data = await apiRequest("/api/site/bootstrap");
        if (!isMounted) return;
        setSiteData({
          categories: Array.isArray(data.categories) ? data.categories : [],
          settings: normalizeProductOptionSettings(data.settings),
          products: Array.isArray(data.products) ? data.products : [],
          account: data.account || null
        });
        setSiteStatus("ready");
      } catch {
        if (!isMounted) return;
        if (attempt < 8) {
          retryHandle = window.setTimeout(() => loadSite(attempt + 1), 1200);
          return;
        }
        setSiteStatus("fallback");
      }
    }

    loadSite();

    return () => {
      isMounted = false;
      if (retryHandle) {
        window.clearTimeout(retryHandle);
      }
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("lbb-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!customerSession?.id) {
      setCustomerAccount(null);
      setAccountStatus("idle");
      return undefined;
    }

    let isMounted = true;

    async function loadCustomerAccount() {
      setAccountStatus("loading");
      try {
        const account = await apiRequest(`/api/customers/${customerSession.id}/account`);
        if (!isMounted) return;
        setCustomerAccount(account);
        setAccountStatus("ready");
      } catch {
        if (!isMounted) return;
        clearCustomerSession();
        setCustomerSession(null);
        setCustomerAccount(null);
        setAccountStatus("idle");
      }
    }

    loadCustomerAccount();

    return () => {
      isMounted = false;
    };
  }, [customerSession]);

  const siteCategories = siteData.categories;
  const siteSettings = normalizeProductOptionSettings(siteData.settings);
  const siteProducts = useMemo(() => buildStorefrontProducts(products, siteData.products), [siteData.products]);
  const storefrontCategories = useMemo(() => buildStorefrontCategories(siteCategories.filter((category) => category.slug !== "services"), siteProducts), [siteCategories, siteProducts]);
  const storefrontProducts = useMemo(() => siteProducts.filter((product) => !isServiceProduct(product)), [siteProducts]);
  const activeAccount = useMemo(() => (customerAccount ? normalizeAccountView(customerAccount) : null), [customerAccount]);
  const defaultCategory = storefrontCategories[0] || null;
  const defaultCategoryPath = defaultCategory ? getCategoryHref(defaultCategory.slug) : "/boutique";
  const cartItems = Object.entries(cart).map(([lineId, line]) => {
    const product = siteProducts.find((item) => item.id === line.productId);
    if (!product || line.quantity <= 0) return null;

    const selectedLength = line.length || product.length;
    const selectedDrying = line.drying || product.drying;
    const unitPrice = Number.isFinite(Number(line.unitPrice)) ? Number(line.unitPrice) : getProductPriceForLength(product, selectedLength);

    return {
      ...product,
      lineId,
      quantity: line.quantity,
      price: unitPrice,
      selectedLength,
      selectedDrying,
      categorySlugs: getCategorySlugsForProduct(siteCategories, product)
    };
  }).filter(Boolean);
  const cartItemsWithGifts = useMemo(
    () => applyAutomaticGifts(cartItems, siteSettings.promotions.volumeDiscounts),
    [cartItems, siteSettings]
  );
  const cartCount = cartItemsWithGifts.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  useEffect(() => {
    if (siteStatus !== "ready" || siteProducts.length === 0) {
      return;
    }

    setCart((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([, line]) => siteProducts.some((product) => product.id === line.productId))
      );

      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [siteProducts, siteStatus]);

  function addToCart(productId, quantity = 1, options = {}) {
    const lineId = buildCartLineId(productId, options);
    setCart((current) => ({
      ...current,
      [lineId]: {
        productId,
        quantity: (current[lineId]?.quantity || 0) + quantity,
        length: options.length || "",
        drying: options.drying || "",
        unitPrice: Number.isFinite(Number(options.unitPrice)) ? Number(options.unitPrice) : current[lineId]?.unitPrice
      }
    }));
    setCartDrawerOpen(true);
  }

  function setQuantity(lineId, quantity) {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) {
        delete next[lineId];
        return next;
      }
      next[lineId] = {
        ...next[lineId],
        quantity
      };
      return next;
    });
  }

  function prepareEstimatedCart(productId, quantity, options = {}) {
    if (!productId) return;
    const lineId = buildCartLineId(productId, options);
    const product = siteProducts.find((item) => item.id === productId);
    setCart({ [lineId]: {
      productId,
      quantity: Math.max(1, Math.round(quantity)),
      length: options.length || "",
      drying: options.drying || "",
      unitPrice: Number.isFinite(Number(options.unitPrice)) ? Number(options.unitPrice) : getProductPriceForLength(product, options.length || product?.length || "")
    } });
    setCartDrawerOpen(false);
  }

  function applyCustomerPayload(payload) {
    persistCustomerSession(payload.session);
    setCustomerSession(payload.session);
    setCustomerAccount(payload.account);
    setAccountStatus("ready");
  }

  async function handleCustomerRegister(draft) {
    const payload = await apiRequest("/api/customers/register", {
      method: "POST",
      body: JSON.stringify(draft)
    });
    applyCustomerPayload(payload);
  }

  async function handleCustomerLogin(draft) {
    const payload = await apiRequest("/api/customers/login", {
      method: "POST",
      body: JSON.stringify(draft)
    });
    applyCustomerPayload(payload);
  }

  function handleCustomerLogout() {
    clearCustomerSession();
    setCustomerSession(null);
    setCustomerAccount(null);
    setAccountStatus("idle");
    navigate("/");
  }

  async function handlePlaceOrder(draft) {
    if (!customerSession?.id) {
      throw new Error("Connectez-vous avant de valider la commande.");
    }

    const payload = await apiRequest("/api/orders", {
      method: "POST",
      body: JSON.stringify(buildOrderRequest(draft, customerSession.id, cartItemsWithGifts, Number(draft.shippingAmount || 0)))
    });

    setCart({});
    setCartDrawerOpen(false);
    setCustomerAccount(payload.account);
    setAccountStatus("ready");
    return payload.order;
  }

  async function handleStartStripeCheckout(draft) {
    if (!customerSession?.id) {
      throw new Error("Connectez-vous avant de valider la commande.");
    }

    const orderRequest = buildOrderRequest(draft, customerSession.id, cartItemsWithGifts, Number(draft.shippingAmount || 0));
    persistPendingStripeCheckout({
      orderRequest,
      createdAt: new Date().toISOString()
    });

    const payload = await apiRequest("/api/payments/stripe/checkout-session", {
      method: "POST",
      body: JSON.stringify(orderRequest)
    });

    if (!payload?.url) {
      throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
    }

    window.location.assign(payload.url);
  }

  async function handleConfirmStripeCheckout(sessionId) {
    const pendingCheckout = readPendingStripeCheckout();
    const payload = await apiRequest(`/api/payments/stripe/session/${sessionId}/confirm`, {
      method: "POST",
      body: JSON.stringify(pendingCheckout?.orderRequest || {})
    });

    clearPendingStripeCheckout();
    setCart({});
    setCartDrawerOpen(false);
    setCustomerAccount(payload.account);
    setAccountStatus("ready");
    return payload.order;
  }

  return (
    <div className="lbb-app">
      <AnnouncementBar settings={siteSettings} />
      <SiteHeader cartCount={cartCount} categories={storefrontCategories} onOpenCart={() => setCartDrawerOpen(true)} account={activeAccount} />
      <Routes>
        <Route path="/" element={<HomePage addToCart={addToCart} cartCount={cartCount} categories={storefrontCategories} settings={siteSettings} siteProducts={storefrontProducts} defaultCategoryPath={defaultCategoryPath} siteStatus={siteStatus} />} />
        <Route path="/boutique" element={<CatalogPage addToCart={addToCart} categories={storefrontCategories} siteProducts={storefrontProducts} defaultCategoryPath={defaultCategoryPath} siteStatus={siteStatus} />} />
        <Route path="/categorie" element={<Navigate to={defaultCategoryPath} replace />} />
        <Route path="/categorie/:slug" element={<CategoryPage addToCart={addToCart} categories={storefrontCategories} siteProducts={storefrontProducts} defaultCategoryPath={defaultCategoryPath} siteStatus={siteStatus} />} />
        <Route path="/produit/:slug" element={<ProductPage addToCart={addToCart} categories={storefrontCategories} settings={siteSettings} siteProducts={storefrontProducts} defaultCategoryPath={defaultCategoryPath} siteStatus={siteStatus} />} />
        <Route path="/estimation-consommation" element={<ConsumptionEstimatorPage siteProducts={storefrontProducts} defaultCategoryPath={defaultCategoryPath} onPrepareCart={prepareEstimatedCart} />} />
        <Route path="/panier" element={<CartPage cartItems={cartItemsWithGifts} setQuantity={setQuantity} addToCart={addToCart} siteProducts={siteProducts} defaultCategoryPath={defaultCategoryPath} account={activeAccount} settings={siteSettings} promoCode={promoCode} onApplyPromoCode={setPromoCode} />} />
        <Route path="/commande" element={<CheckoutPage cartItems={cartItemsWithGifts} addToCart={addToCart} siteProducts={siteProducts} settings={siteSettings} account={activeAccount} defaultCategoryPath={defaultCategoryPath} onLogin={handleCustomerLogin} onRegister={handleCustomerRegister} onPlaceOrder={handlePlaceOrder} onStartStripeCheckout={handleStartStripeCheckout} promoCode={promoCode} onApplyPromoCode={setPromoCode} />} />
        <Route path="/commande/confirmation/stripe" element={<StripeCheckoutConfirmationPage onConfirmStripeCheckout={handleConfirmStripeCheckout} />} />
        <Route path="/commande/confirmation/:orderId" element={<CheckoutConfirmationPage account={activeAccount} defaultCategoryPath={defaultCategoryPath} />} />
        <Route path="/compte" element={<AccountPage account={activeAccount} accountStatus={accountStatus} onLogin={handleCustomerLogin} onRegister={handleCustomerRegister} onLogout={handleCustomerLogout} />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CartDrawer cartItems={cartItemsWithGifts} setQuantity={setQuantity} isOpen={isCartDrawerOpen} onClose={() => setCartDrawerOpen(false)} defaultCategoryPath={defaultCategoryPath} />
      <SiteFooter />
    </div>
  );
}

function AdminApp() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/*" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

function AnnouncementBar({ settings }) {
  const announcementBar = normalizeProductOptionSettings(settings).announcementBar;
  const promoItems = [announcementBar.primaryText, announcementBar.secondaryText, announcementBar.tertiaryText].filter(Boolean);

  return (
    <div className="lbb-announcement-bar" style={{ background: announcementBar.backgroundColor, color: announcementBar.textColor, ...mono, fontSize: 11.5, letterSpacing: ".06em", padding: "11px 32px" }}>
      <div className="lbb-announcement-bar-track">
        <div className="lbb-announcement-bar-group">
          {promoItems.map((item) => <span key={item} className="lbb-announcement-bar-item">{item}</span>)}
        </div>
        <div className="lbb-announcement-bar-group" aria-hidden="true">
          {promoItems.map((item, index) => <span key={`${item}-${index}`} className="lbb-announcement-bar-item">{item}</span>)}
        </div>
      </div>
    </div>
  );
}

function SiteHeader({ cartCount, categories, onOpenCart, account }) {
  const location = useLocation();
  const isAccountPage = location.pathname === "/compte";
  const isEstimatorPage = location.pathname === "/estimation-consommation";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsMobileSearchOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMenuOpen((current) => {
      if (current) {
        setIsMobileSearchOpen(false);
        return false;
      }

      return true;
    });
  };

  const toggleMobileSearch = () => {
    setIsMenuOpen(true);
    setIsMobileSearchOpen((current) => !current);
  };

  const renderHeaderSearch = (className, showShortcut) => (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 12, background: "#FFFFFF", border: "1px solid rgba(35,41,31,.1)", borderRadius: 999, padding: "11px 20px", boxShadow: "0 1px 2px rgba(35,41,31,.04)" }}>
      <span style={{ ...mono, fontSize: 13, color: "#8A9180" }}>⌕</span>
      <input placeholder="Chêne, hêtre, 33 cm, allume-feu…" style={{ border: 0, outline: 0, background: "transparent", fontFamily: "'Newsreader', serif", fontSize: 15, width: "100%", color: "#23291F" }} />
      {showShortcut ? <span className="lbb-header-search-shortcut" style={{ ...mono, fontSize: 10, letterSpacing: ".06em", color: "#A8AE9C", border: "1px solid rgba(35,41,31,.12)", borderRadius: 6, padding: "2px 6px" }}>⌘K</span> : null}
    </div>
  );

  const renderHeaderNav = (className, onItemClick) => (
    <nav className={className} style={{ display: "flex", alignItems: "center", gap: 26, ...sans, fontSize: 13, fontWeight: 600, letterSpacing: ".03em", flexWrap: "wrap" }}>
      {categories.map((item) => (
        <Link key={item.id} to={getCategoryHref(item.slug)} onClick={onItemClick}>{item.label}</Link>
      ))}
      <span style={{ width: 1, height: 14, background: "rgba(35,41,31,.14)" }} />
      <Link to="/estimation-consommation" onClick={onItemClick} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 999, background: isEstimatorPage ? "#A8501B" : "#F5E2D3", color: isEstimatorPage ? "#FFF7F1" : "#A8501B", boxShadow: isEstimatorPage ? "0 16px 30px -24px rgba(168,80,27,.9)" : "none" }}>
        <span style={{ width: 22, height: 22, borderRadius: 999, background: isEstimatorPage ? "rgba(255,247,241,.16)" : "rgba(168,80,27,.1)", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 19h14" />
            <path d="M7 19V9" />
            <path d="M12 19V5" />
            <path d="M17 19v-7" />
          </svg>
        </span>
        Estimation de consommation
      </Link>
      <a href="#histoire" onClick={onItemClick}>Notre histoire</a>
    </nav>
  );

  const mobileNavItems = [
    ...categories.map((item) => ({ label: item.label, to: getCategoryHref(item.slug) })),
    { label: "Estimation de consommation", to: "/estimation-consommation", isRoute: true },
    { label: "Notre histoire", href: "#histoire" }
  ];

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  return (
    <header className="lbb-site-header" style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(251,250,245,.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(35,41,31,.08)" }}>
      <div className="lbb-header-desktop">
        <div className="lbb-header-main" style={{ ...pageShell, paddingTop: 14, paddingBottom: 14 }}>
          <Link to="/" className="lbb-header-brand" style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <img className="brand-logo" src={brand.headerLogo || brand.logo} alt="La Belle Bûche" />
          </Link>
          {renderHeaderSearch("lbb-header-search lbb-header-search-desktop", true)}
          <div className="lbb-header-actions" style={{ display: "flex", alignItems: "center", gap: 24, ...mono, fontSize: 11.5, letterSpacing: ".05em" }}>
            <div className="lbb-header-contact" style={{ display: "grid", gap: 3, textAlign: "right", lineHeight: 1.3, minWidth: 150 }}>
              <span style={{ color: "#23291F" }}>{brand.phone}</span>
              <span style={{ color: "#8A9180", whiteSpace: "nowrap" }}>Montgaillard-Lauragais</span>
            </div>
            <Link to="/compte" className="lbb-header-account-link" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 34, height: 34, borderRadius: 999, background: isAccountPage ? "#5B321D" : "#F3E5D8", color: isAccountPage ? "#FBF6EE" : "#5B321D", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
              </span>
              {isAccountPage ? account?.firstName || "Espace client" : "Espace client"}
            </Link>
            <button type="button" onClick={onOpenCart} className="lbb-header-cart-button" style={{ ...mono, fontSize: 11.5, letterSpacing: ".05em", background: "#5B321D", color: "#FBF6EE", borderRadius: 999, padding: "12px 16px 12px 20px", display: "flex", alignItems: "center", gap: 10, border: 0, cursor: "pointer" }}>
              Panier <span style={{ background: "#C05621", color: "#fff", borderRadius: 999, minWidth: 21, height: 21, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{cartCount}</span>
            </button>
          </div>
        </div>
        <div className="lbb-header-nav-desktop" style={{ ...pageShell, paddingBottom: 12 }}>
          {renderHeaderNav("lbb-header-nav")}
        </div>
      </div>

      <div className="lbb-header-mobile" style={{ ...pageShell }}>
        <div className="lbb-mobile-header-bar">
          <Link to="/" className="lbb-mobile-header-brand" onClick={closeMenu}>
            <img className="brand-logo" src={brand.headerLogo || brand.logo} alt="La Belle Bûche" />
          </Link>
          <div className="lbb-mobile-header-actions">
            <button type="button" className="lbb-mobile-header-icon-button" onClick={toggleMobileSearch} aria-label="Ouvrir la recherche">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
            <button type="button" className="lbb-mobile-header-icon-button" onClick={onOpenCart} aria-label="Ouvrir le panier">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
                <path d="M2 3h3l2.4 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 6H6" />
              </svg>
              <span>{cartCount}</span>
            </button>
            <button type="button" className="lbb-mobile-header-menu-button" onClick={toggleMobileMenu} aria-expanded={isMenuOpen} aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}>
              {isMenuOpen ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              ) : (
                <>
                  <span />
                  <span />
                  <span />
                </>
              )}
            </button>
          </div>
        </div>

        <div className={`lbb-mobile-menu-panel${isMenuOpen ? " is-open" : ""}`}>
          <div className="lbb-mobile-menu-meta">
            <a href={`tel:${brand.phone.replace(/\s+/g, "")}`}>{brand.phone}</a>
            <Link to="/compte" onClick={closeMenu}>{isAccountPage ? account?.firstName || "Espace client" : "Se connecter"}</Link>
          </div>
          {isMobileSearchOpen ? renderHeaderSearch("lbb-mobile-menu-search", false) : null}
          <nav className="lbb-mobile-menu-nav">
            {mobileNavItems.map((item) => (
              item.isRoute ? (
                <Link key={item.label} to={item.to} className="lbb-mobile-menu-row lbb-mobile-menu-row-highlight" onClick={closeMenu}>
                  <span>{item.label}</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              ) : item.to ? (
                <Link key={item.label} to={item.to} className="lbb-mobile-menu-row" onClick={closeMenu}>
                  <span>{item.label}</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              ) : (
                <a key={item.label} href={item.href} className="lbb-mobile-menu-row" onClick={closeMenu}>
                  <span>{item.label}</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </a>
              )
            ))}
          </nav>
          <div className="lbb-mobile-menu-footer">
            <Link to="/compte" className="lbb-mobile-menu-account-cta" onClick={closeMenu}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="8" r="4" />
              </svg>
              <span>Espace client</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function CartDrawer({ cartItems, setQuantity, isOpen, onClose, defaultCategoryPath }) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div className={`lbb-cart-drawer-shell${isOpen ? " is-open" : ""}`} aria-hidden={!isOpen}>
      <button type="button" className="lbb-cart-drawer-backdrop" onClick={onClose} aria-label="Fermer le panier" />
      <aside className="lbb-cart-drawer" aria-label="Votre panier">
        <div className="lbb-cart-drawer-header">
          <h2 style={{ ...sans, fontWeight: 700, fontSize: 24, letterSpacing: "-.03em", margin: 0, color: "#5B321D" }}>Votre panier</h2>
          <button type="button" onClick={onClose} className="lbb-cart-drawer-close" aria-label="Fermer">×</button>
        </div>
        {cartItems.length === 0 ? (
          <div className="lbb-cart-drawer-empty">
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: "#4E5647" }}>Le panier est vide pour le moment.</p>
            <Link to={defaultCategoryPath} onClick={onClose} className="lbb-btn lbb-btn-primary">Voir les produits</Link>
          </div>
        ) : (
          <>
            <div className="lbb-cart-drawer-items">
              {cartItems.map((item) => (
                <article key={item.lineId} className={`lbb-cart-drawer-item${isServiceProduct(item) ? " is-service" : ""}`}>
                  {!isServiceProduct(item) && item.image ? (
                    <div className="lbb-cart-drawer-thumb">
                      <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : null}
                  <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ ...sans, display: "block", fontWeight: 700, fontSize: 18, lineHeight: 1.2, letterSpacing: "-.02em", color: "#5B321D" }}>{item.name}{item.isGift ? <span style={{ ...mono, fontSize: 9.5, letterSpacing: ".05em", color: "#5C7752", background: "#E6EFE4", borderRadius: 999, padding: "3px 8px", marginLeft: 8 }}>OFFERT</span> : null}</strong>
                        <span style={{ display: "block", marginTop: 4, ...mono, fontSize: 10.5, lineHeight: 1.55, color: "#8A9180" }}>{item.isGift ? item.giftLabel : (isServiceProduct(item) ? [item.unit ? item.unit.replace("/ ", "") : ""] : [...([item.selectedLength, item.selectedDrying].filter(Boolean)), item.unit ? item.unit.replace("/ ", "") : ""]).filter(Boolean).join(" · ")}</span>
                      </div>
                      <span style={{ ...sans, fontWeight: 700, fontSize: 18, whiteSpace: "nowrap", color: "#55715B" }}>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    {!item.isGift ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div className="lbb-cart-drawer-stepper">
                          <button type="button" onClick={() => setQuantity(item.lineId, item.quantity - 1)} aria-label={`Retirer une unité de ${item.name}`}>−</button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => setQuantity(item.lineId, item.quantity + 1)} aria-label={`Ajouter une unité de ${item.name}`}>+</button>
                        </div>
                        <button type="button" onClick={() => setQuantity(item.lineId, 0)} style={{ border: 0, background: "transparent", cursor: "pointer", ...mono, fontSize: 10.5, color: "#A8AE9C", padding: 0 }}>Retirer</button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            <div className="lbb-cart-drawer-footer">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                <span style={{ ...sans, fontWeight: 700, fontSize: 18, letterSpacing: "-.02em", color: "#6A6F61" }}>Sous-total</span>
                <span style={{ ...sans, fontWeight: 700, fontSize: 40, letterSpacing: "-.04em", color: "#55715B" }}>{formatPrice(subtotal)}</span>
              </div>
              <Link to="/panier" onClick={onClose} className="lbb-btn lbb-btn-primary" style={{ width: "100%", justifyContent: "center" }}>Passer commande →</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function HomePage({ addToCart, categories, settings, siteProducts, defaultCategoryPath, siteStatus, showOnlyCatalogue = false }) {
  const [chip, setChip] = useState("Tous");
  const [sort, setSort] = useState("popular");
  const [openFaq, setOpenFaq] = useState(0);
  const heroProof = normalizeProductOptionSettings(settings).heroProof;

  const visibleProducts = useMemo(() => {
    const base = siteProducts;
    const filtered = chip === "Tous" ? base : getCategoryProducts(base, categories.find((category) => category.label === chip));
    const sorted = [...filtered];
    if (sort === "price") sorted.sort((a, b) => a.price - b.price);
    if (sort === "stock") sorted.sort((a, b) => b.stockPct - a.stockPct);
    return sorted;
  }, [chip, sort, categories, siteProducts]);

  return (
    <main>
      {!showOnlyCatalogue && (
        <>
          <section className="lbb-hero-banner" style={{ backgroundImage: `linear-gradient(90deg, rgba(20, 14, 10, .76) 0%, rgba(42, 28, 17, .58) 34%, rgba(64, 42, 24, .34) 56%, rgba(96, 62, 32, .18) 100%), linear-gradient(180deg, rgba(29, 20, 12, .06) 0%, rgba(29, 20, 12, .46) 100%), url(${brand.heroImage})` }}>
            <div className="lbb-hero-haze" />
            <div className="lbb-hero-inner" style={{ ...pageShell }}>
              <div className="lbb-hero-copy">
                <div className="lbb-hero-kicker" style={{ ...mono }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: "rgba(251,250,245,.88)", boxShadow: "0 0 0 4px rgba(251,250,245,.12)" }} />
                  Specialiste bois de chauffage
                </div>
                <h1 style={{ ...sans, fontWeight: 700, fontSize: "clamp(52px, 6vw, 84px)", lineHeight: 0.94, letterSpacing: "-.045em", margin: "0 0 24px", color: "#FFFFFF", maxWidth: "11.5ch" }}>
                  Chauffez-vous au naturel,
                  <br />
                  <span style={{ color: "#D8B083" }}>au meilleur prix</span>
                </h1>
                <p style={{ margin: "0 0 34px", fontSize: 19, lineHeight: 1.58, color: "rgba(251,250,245,.9)", maxWidth: "48ch" }}>
                  Chêne, hêtre, charme, châtaignier et allume-feu naturel: des tarifs clairs, une livraison locale et du bois sec prêt à brûler.
                </p>
                <div className="lbb-hero-actions">
                  <Link to="/boutique" className="lbb-btn lbb-btn-primary">Voir le catalogue</Link>
                  <a href="#catalogue" className="lbb-btn lbb-btn-secondary lbb-hero-secondary-btn">Voir les offres</a>
                </div>
                <div className="lbb-hero-proof" style={{ ...mono }}>
                  {[heroProof.primaryText, heroProof.secondaryText, heroProof.tertiaryText].filter(Boolean).map((item) => <span key={item}>{item}</span>)}
                </div>
              </div>
            </div>
          </section>

          <section style={{ ...pageShell, paddingTop: 84 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, marginBottom: 36, flexWrap: "wrap" }}>
              <h2 style={{ ...sans, fontWeight: 700, fontSize: 28, letterSpacing: "-.025em", margin: 0 }}>Nos produits de chauffage</h2>
            </div>
            <div className="lbb-family-grid">
              {categories.map((category) => (
                <Link key={category.id} to={getCategoryHref(category.slug)} className="lbb-family-card" style={{ display: "grid", gap: 14, alignContent: "start", justifyItems: "center", textAlign: "center", color: "inherit" }}>
                  <div className="lbb-family-card-media" style={{ position: "relative", width: "100%", aspectRatio: 1, borderRadius: 999, overflow: "hidden", background: "#EADACB", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 14 }}>
                    {getCategoryCoverImage(category, siteProducts)
                      ? <img src={getCategoryCoverImage(category, siteProducts)} alt={category.label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      : null}
                    <span style={{ position: "relative", ...mono, fontSize: 9.5, letterSpacing: ".06em", background: "rgba(251,250,245,.9)", borderRadius: 999, padding: "4px 10px", color: "#6B7263" }}>{category.from}</span>
                  </div>
                  <span style={{ ...sans, fontWeight: 600, fontSize: 13, letterSpacing: ".02em" }}>{category.label}</span>
                  <span style={{ ...mono, fontSize: 10.5, color: "#A8AE9C", marginTop: -8 }}>{category.count}</span>
                </Link>
              ))}
            </div>
          </section>

          <section style={{ ...pageShell, paddingTop: 84 }}>
            <div className="lbb-two-col" style={{ background: "#F5EFE2", borderRadius: 34, padding: "44px 46px", alignItems: "center" }}>
              <div>
                <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#A8501B", marginBottom: 14 }}>Le b.a.-ba</div>
                <h2 style={{ ...sans, fontWeight: 700, fontSize: 30, lineHeight: 1.08, letterSpacing: "-.03em", margin: "0 0 14px", color: "#3B2A17" }}>Un stère, ce n'est pas un mètre cube de bûches</h2>
                <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "#6B5842", maxWidth: "42ch" }}>Le stère se mesure en bûches d'un mètre empilées. Plus les bûches sont courtes, plus elles s'imbriquent : le volume apparent baisse, la quantité de bois reste identique.</p>
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                {[
                  ["1 m", "100%", "#8A5A2B", "1,00 m³"],
                  ["50 cm", "80%", "#A87141", "0,80 m³"],
                  ["33 cm", "70%", "#C08B57", "0,70 m³"],
                  ["25 cm", "65%", "#D6A97C", "0,65 m³"]
                ].map(([label, width, color, value]) => (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: "78px 1fr 96px", gap: 20, alignItems: "center" }}>
                    <span style={{ ...sans, fontWeight: 700, fontSize: 15, color: "#3B2A17" }}>{label}</span>
                    <span style={{ height: 26, borderRadius: 8, background: color, width }} />
                    <span style={{ ...mono, fontSize: 11.5, color: "#6B5842", textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <section id="catalogue" style={{ ...pageShell, paddingTop: showOnlyCatalogue ? 40 : 96 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, flexWrap: "wrap", marginBottom: 30 }}>
          <div>
            <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#C05621", marginBottom: 12 }}>Tarifs TTC bois et allumage · livraison en option selon distance</div>
            <h2 style={{ ...sans, fontWeight: 700, fontSize: "clamp(32px, 3.2vw, 46px)", letterSpacing: "-.032em", margin: 0 }}>La boutique</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span style={{ ...mono, fontSize: 11, color: "#8A9180" }}>{visibleProducts.length} références</span>
            <div style={{ display: "flex", gap: 4, background: "#F3E5D8", borderRadius: 999, padding: 4 }}>
              {[{ id: "popular", label: "Populaire" }, { id: "price", label: "Prix" }, { id: "stock", label: "Stock" }].map((item) => (
                <button key={item.id} type="button" onClick={() => setSort(item.id)} style={{ ...mono, fontSize: 11, letterSpacing: ".05em", padding: "9px 15px", borderRadius: 999, cursor: "pointer", border: 0, background: sort === item.id ? "#5B321D" : "transparent", color: sort === item.id ? "#FBF6EE" : "#5B321D" }}>{item.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 34, paddingBottom: 26, borderBottom: "1px solid rgba(35,41,31,.09)" }}>
          {["Tous", ...categories.map((category) => category.label)].map((item) => (
            <button key={item} type="button" onClick={() => setChip(item)} style={{ ...mono, fontSize: 11.5, letterSpacing: ".05em", padding: "11px 17px", borderRadius: 999, cursor: "pointer", border: `1px solid ${chip === item ? "#5B321D" : "rgba(35,41,31,.14)"}`, background: chip === item ? "#5B321D" : "#FFFFFF", color: chip === item ? "#FBF6EE" : "#23291F" }}>{item}</button>
          ))}
        </div>
        <div className="lbb-catalog-grid">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} detailed />
          ))}
        </div>
      </section>

      {!showOnlyCatalogue && (
        <>
          <section style={{ ...pageShell, paddingTop: 96 }}>
            <div style={{ background: "#F5EFE2", color: "#2C241D", border: "1px solid rgba(168,80,27,.12)", borderRadius: 36, padding: "42px 44px", display: "grid", gap: 22, boxShadow: "0 28px 54px -42px rgba(73,46,25,.18)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 12, maxWidth: 760 }}>
                  <div style={{ ...mono, fontSize: 11, letterSpacing: ".1em", color: "#A8501B" }}>ESTIMATION DE CONSOMMATION</div>
                  <h2 style={{ ...sans, fontWeight: 700, fontSize: "clamp(34px, 4vw, 48px)", lineHeight: 1, letterSpacing: "-.04em", margin: 0 }}>Un simulateur dédié pour estimer votre saison avant d'acheter.</h2>
                  <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: "#5D5147", maxWidth: "54ch" }}>Surface, isolation, type d'appareil, hauteur sous plafond, climat et rythme d'usage: la page calcule un besoin annuel plus réaliste, un volume conseillé et un budget indicatif.</p>
                </div>
                <Link to="/estimation-consommation" className="lbb-btn lbb-btn-secondary" style={{ background: "#A8501B", color: "#FFF7F1", borderColor: "transparent", justifyContent: "center" }}>Lancer l'estimation</Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                {[
                  ["Surface analysée", "40 à 240 m²"],
                  ["Niveau de détail", "6 paramètres réels"],
                  ["Résultat", "stères, stockage, budget"],
                  ["Suite logique", "liens directs vers le catalogue"]
                ].map(([label, value]) => (
                  <div key={label} style={{ background: "rgba(255,255,255,.56)", border: "1px solid rgba(168,80,27,.12)", borderRadius: 22, padding: "18px 18px 16px", display: "grid", gap: 6 }}>
                    <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#A78968" }}>{label}</span>
                    <strong style={{ ...sans, fontWeight: 700, fontSize: 23, letterSpacing: "-.03em" }}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="histoire" style={{ ...pageShell, paddingTop: 96 }}>
            <div className="lbb-two-col" style={{ alignItems: "stretch" }}>
              <div style={{ position: "relative", minHeight: 420, borderRadius: 34, overflow: "hidden" }}>
                <img src={brand.woodYardImage} alt="Parc à bois" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", left: 20, bottom: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ ...mono, fontSize: 10, letterSpacing: ".06em", background: "rgba(251,250,245,.9)", borderRadius: 999, padding: "6px 11px", color: "#6B7263" }}>Montgaillard-Lauragais</span>
                  <span style={{ ...mono, fontSize: 10, letterSpacing: ".06em", background: "rgba(251,250,245,.9)", borderRadius: 999, padding: "6px 11px", color: "#6B7263" }}>31290</span>
                  <span style={{ ...mono, fontSize: 10, letterSpacing: ".06em", background: "rgba(251,250,245,.9)", borderRadius: 999, padding: "6px 11px", color: "#6B7263" }}>Depuis 1919</span>
                </div>
              </div>
              <div style={{ display: "grid", gap: 18, alignContent: "center" }}>
                <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#C05621" }}>Notre histoire</div>
                <h2 style={{ ...sans, fontWeight: 700, fontSize: 34, letterSpacing: "-.03em", margin: 0 }}>Une maison de bois locale, pas un catalogue générique.</h2>
                <p style={{ fontSize: 17.5, lineHeight: 1.6, color: "#4E5647", margin: 0 }}>Depuis Montgaillard-Lauragais, La Belle Buche prepare et livre un bois de chauffage pense pour les besoins reels des foyers du secteur, avec un service simple, clair et local.</p>
                <div className="lbb-stat-grid">
                  {["TVA 10 %", "31290", "> 60 km sur devis"].map((item, index) => (
                    <div key={item} style={{ background: index === 1 ? "#F3E5D8" : "#FFFFFF", border: "1px solid rgba(35,41,31,.08)", borderRadius: 22, padding: 20 }}>
                      <strong style={{ ...sans, fontSize: 28, letterSpacing: "-.03em" }}>{item}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section style={{ ...pageShell, paddingTop: 96, paddingBottom: 96 }}>
            <div style={{ background: "#23291F", color: "#F4F7EC", borderRadius: 30, padding: "32px 34px", display: "grid", gap: 14 }}>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#C05621" }}>Offre de lancement</div>
              <h3 style={{ ...sans, fontWeight: 700, fontSize: "clamp(28px, 3.6vw, 38px)", letterSpacing: "-.03em", margin: 0 }}>4 stères achetés = le 5e offert</h3>
              <p style={{ fontSize: 17, lineHeight: 1.6, margin: 0, color: "#F3E5D8", maxWidth: "58ch" }}>Valable jusqu'au 20/11/2026, non cumulable avec la livraison offerte dès 5 stères dans 30 km.</p>
            </div>
            <div style={{ marginTop: 28 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 20 }}>
                <h2 style={{ ...sans, fontWeight: 700, fontSize: 28, letterSpacing: "-.025em", margin: 0 }}>À lire avant la saison</h2>
                <span style={{ ...mono, fontSize: 11.5, color: "#8A9180" }}>3 articles éditoriaux</span>
              </div>
              <div className="lbb-post-grid">
                {posts.map((post) => (
                  <article key={post.title} style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.08)", borderRadius: 24, overflow: "hidden", display: "grid" }}>
                    <div style={{ aspectRatio: "1.4 / 1", background: "#EADACB" }}>
                      <img src={post.image} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ padding: 22, display: "grid", gap: 10 }}>
                      <span style={{ ...mono, fontSize: 10, letterSpacing: ".06em", color: "#8A9180" }}>{post.meta}</span>
                      <h3 style={{ ...sans, fontWeight: 700, fontSize: 18, letterSpacing: "-.02em", margin: 0 }}>{post.title}</h3>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function ConsumptionEstimatorPage({ siteProducts, defaultCategoryPath, onPrepareCart }) {
  const navigate = useNavigate();
  const [area, setArea] = useState(120);
  const [height, setHeight] = useState(2.5);
  const [insulation, setInsulation] = useState("standard");
  const [device, setDevice] = useState("insert-recent");
  const [usage, setUsage] = useState("principal");
  const [climate, setClimate] = useState("normal");
  const [comfort, setComfort] = useState("normal");
  const essenceOptions = useMemo(() => Array.from(new Set(siteProducts.filter((product) => product.category === "bois-de-chauffage").map((product) => product.family || product.essence).filter(Boolean))), [siteProducts]);
  const [essence, setEssence] = useState(() => essenceOptions[0] || "Chêne");
  useEffect(() => {
    if (!essenceOptions.length) return;
    if (!essenceOptions.includes(essence)) {
      setEssence(essenceOptions[0]);
    }
  }, [essence, essenceOptions]);
  const estimate = useMemo(() => buildConsumptionEstimate({ area, height, insulation, device, usage, climate, comfort, essence }, siteProducts), [area, height, insulation, device, usage, climate, comfort, essence, siteProducts]);

  function handlePrepareCart() {
    if (!estimate.recommendedProduct?.id) return;
    onPrepareCart(estimate.recommendedProduct.id, estimate.requiredSteres);
    navigate("/panier");
  }

  return (
    <main>
      <div style={{ ...pageShell, paddingTop: 22, ...mono, fontSize: 11, letterSpacing: ".06em", color: "#8A9180", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Link to="/">Accueil</Link><span>/</span><span style={{ color: "#23291F" }}>Estimation de consommation</span>
      </div>

      <section style={{ ...pageShell, paddingTop: 24 }}>
        <div style={{ background: "#F5EFE2", color: "#2C241D", borderRadius: 36, padding: "44px 44px 42px", display: "grid", gap: 30, boxShadow: "0 30px 70px -56px rgba(92,74,52,.28)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ display: "grid", gap: 12, maxWidth: 780 }}>
              <div style={{ ...mono, fontSize: 11, letterSpacing: ".1em", color: "#A8501B" }}>SIMULATION SAISONNIÈRE</div>
              <h1 style={{ ...sans, fontWeight: 700, fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 0.96, letterSpacing: "-.05em", margin: 0 }}>Estimation de consommation</h1>
              <p style={{ margin: 0, fontSize: 18.5, lineHeight: 1.62, color: "#5E5145", maxWidth: "58ch" }}>Une page dédiée pour estimer plus finement vos besoins annuels en bois de chauffage et partir ensuite vers la bonne coupe, le bon volume et le bon budget.</p>
            </div>
            <div style={{ display: "grid", gap: 10, minWidth: 220 }}>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#A8501B" }}>RÉSULTAT CENTRAL</div>
              <div style={{ ...sans, fontWeight: 700, fontSize: 62, lineHeight: 0.95, letterSpacing: "-.06em" }}>{formatDecimal(estimate.requiredSteres)}<span style={{ fontSize: 26 }}> st</span></div>
              <div style={{ fontSize: 16.5, lineHeight: 1.55, color: "#5E5145" }}>{estimate.fuelLabel} · {formatPrice(estimate.budget)} estimés</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 24 }} className="lbb-two-col">
            <div style={{ background: "rgba(255,255,255,.44)", border: "1px solid rgba(92,74,52,.12)", borderRadius: 30, padding: "28px 28px 24px", display: "grid", gap: 22 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>PARAMÈTRES DU LOGEMENT</div>
                <label style={{ display: "grid", gap: 10 }}>
                  <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#5E5145" }}>SURFACE À CHAUFFER · {area} m²</span>
                  <input type="range" min="40" max="240" step="5" value={area} onChange={(event) => setArea(Number(event.target.value))} style={{ width: "100%", accentColor: "#F5C38F" }} />
                </label>
                <label style={{ display: "grid", gap: 10 }}>
                  <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#5E5145" }}>HAUTEUR SOUS PLAFOND · {formatDecimal(height)} m</span>
                  <input type="range" min="2.2" max="3.2" step="0.1" value={height} onChange={(event) => setHeight(Number(event.target.value))} style={{ width: "100%", accentColor: "#F5C38F" }} />
                </label>
              </div>

              <SelectorRow title="ISOLATION" options={[{ value: "passoire", label: "Très faible" }, { value: "standard", label: "Standard" }, { value: "bonne", label: "Bonne" }, { value: "recente", label: "Récente" }]} value={insulation} onChange={setInsulation} card />
              <SelectorRow title="ESSENCE" options={essenceOptions.map((item) => ({ value: item, label: item }))} value={essence} onChange={setEssence} />
              <SelectorRow title="APPAREIL" options={[{ value: "foyer", label: "Foyer ouvert" }, { value: "insert-ancien", label: "Insert ancien" }, { value: "insert-recent", label: "Insert récent" }, { value: "poele", label: "Poêle récent" }, { value: "masse", label: "Poêle de masse" }]} value={device} onChange={setDevice} card />
              <SelectorRow title="USAGE" options={[{ value: "appoint", label: "Appoint" }, { value: "soir", label: "Soirs et week-ends" }, { value: "quotidien", label: "Quotidien" }, { value: "principal", label: "Principal" }]} value={usage} onChange={setUsage} />
              <SelectorRow title="CLIMAT" options={[{ value: "abrite", label: "Abrité" }, { value: "normal", label: "Normal" }, { value: "expose", label: "Exposé" }, { value: "froid", label: "Zone froide" }]} value={climate} onChange={setClimate} />
              <SelectorRow title="CONFORT" options={[{ value: "souple", label: "Modéré" }, { value: "normal", label: "Équilibré" }, { value: "soutenu", label: "Chauffe soutenue" }]} value={comfort} onChange={setComfort} />
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ background: "#FFF7F1", color: "#2C241D", borderRadius: 30, padding: "28px 28px 24px", display: "grid", gap: 16 }}>
                <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#A8501B" }}>SYNTHÈSE</div>
                <div style={{ display: "grid", gap: 8 }}>
                  <strong style={{ ...sans, fontWeight: 700, fontSize: 36, letterSpacing: "-.04em" }}>{formatDecimal(estimate.requiredSteres)} stères conseillés</strong>
                  <span style={{ fontSize: 16, lineHeight: 1.55, color: "#5B4A3F" }}>{estimate.usefulKwh.toLocaleString("fr-FR")} kWh utiles annuels · rendement appareil {Math.round(estimate.efficiency * 100)} %.</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  <div style={{ background: "#F7E8DD", borderRadius: 20, padding: "16px 16px 14px", display: "grid", gap: 4 }}><span style={{ ...mono, fontSize: 9.5, letterSpacing: ".08em", color: "#A8501B" }}>MARGE DE CONFORT</span><strong style={{ ...sans, fontWeight: 700, fontSize: 22 }}>{formatDecimal(estimate.safetySteres)} st</strong></div>
                  <div style={{ background: "#F4EFE8", borderRadius: 20, padding: "16px 16px 14px", display: "grid", gap: 4 }}><span style={{ ...mono, fontSize: 9.5, letterSpacing: ".08em", color: "#7A6A55" }}>STOCKAGE</span><strong style={{ ...sans, fontWeight: 700, fontSize: 22 }}>{formatDecimal(estimate.storageVolume)} m³</strong></div>
                </div>
                <div style={{ height: 1, background: "rgba(35,41,31,.08)" }} />
                <div style={{ display: "grid", gap: 6 }}>
                  <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>COUPE CONSEILLÉE</span>
                  <strong style={{ ...sans, fontWeight: 700, fontSize: 24 }}>{estimate.recommendedProduct?.name || `Bois ${estimate.preferredLength}`}</strong>
                  <span style={{ fontSize: 16, lineHeight: 1.55, color: "#5B4A3F" }}>{estimate.recommendedProduct ? `${formatPrice(estimate.recommendedProduct.price)} ${estimate.recommendedProduct.unit}` : `Format ${estimate.preferredLength}`}</span>
                  <span style={{ ...mono, fontSize: 10.5, color: "#A8501B" }}>Essence retenue : {estimate.chosenEssence}</span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link to={estimate.recommendedProduct?.slug ? `/produit/${estimate.recommendedProduct.slug}` : defaultCategoryPath} className="lbb-btn lbb-btn-primary">Voir le produit conseillé</Link>
                  <Link to="/boutique" className="lbb-btn lbb-btn-secondary">Comparer dans la boutique</Link>
                  <button type="button" onClick={handlePrepareCart} className="lbb-btn lbb-btn-soft">Préparer {Math.round(estimate.requiredSteres)} stère(s) dans le panier</button>
                </div>
              </div>
              <div style={{ background: "rgba(255,247,241,.12)", border: "1px solid rgba(255,247,241,.14)", borderRadius: 30, padding: "24px 26px", display: "grid", gap: 12 }}>
                <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "rgba(255,247,241,.72)" }}>CADENCE CONSEILLÉE</div>
                <strong style={{ ...sans, fontWeight: 700, fontSize: 26 }}>{estimate.lots} livraison{estimate.lots > 1 ? "s" : ""} sur la saison</strong>
                <span style={{ fontSize: 16, lineHeight: 1.55, color: "rgba(255,247,241,.88)" }}>{estimate.requiredSteres >= 5 ? "Fractionner la saison réduit le stockage à domicile et lisse le budget." : "Une livraison peut suffire si vous avez l'abri nécessaire."}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...pageShell, paddingTop: 34, paddingBottom: 96 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            ["Besoin utile", `${estimate.usefulKwh.toLocaleString("fr-FR")} kWh`, `Calculé sur ${area} m² avec un facteur hauteur de ${formatDecimal(estimate.heightFactor)}.`],
            ["Budget indicatif", formatPrice(estimate.budget), estimate.recommendedProduct ? `Base ${estimate.recommendedProduct.name}.` : "Base chêne sec."],
            ["Volume à stocker", `${formatDecimal(estimate.storageVolume)} m³`, `Avec une coupe ${estimate.recommendedProduct?.length || estimate.preferredLength}.`],
            ["Marge conseillée", `${formatDecimal(estimate.safetySteres)} st`, "Pour lisser les vagues de froid et les hivers plus longs."]
          ].map(([label, value, detail]) => (
            <div key={label} style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.08)", borderRadius: 24, padding: "22px 22px 20px", display: "grid", gap: 7 }}>
              <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#A78968" }}>{label}</span>
              <strong style={{ ...sans, fontWeight: 700, fontSize: 28, letterSpacing: "-.03em", color: "#2C241D" }}>{value}</strong>
              <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "#5D5147" }}>{detail}</span>
            </div>
          ))}
        </div>

        <div className="lbb-two-col" style={{ paddingTop: 26, alignItems: "start" }}>
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.08)", borderRadius: 28, padding: "28px 30px", display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#A8501B" }}>RÉPARTITION SAISON</div>
              <strong style={{ ...sans, fontWeight: 700, fontSize: 28, letterSpacing: "-.03em" }}>Projection mensuelle</strong>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {estimate.monthlyPlan.map((month) => (
                <div key={month.label} style={{ display: "grid", gridTemplateColumns: "60px 1fr 64px", gap: 14, alignItems: "center" }}>
                  <span style={{ ...mono, fontSize: 10.5, color: "#8A9180" }}>{month.label}</span>
                  <div style={{ height: 16, borderRadius: 999, background: "#F3EEE4", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, (month.steres / Math.max(estimate.requiredSteres, 1)) * 100 * 2.8)}%`, background: "#A8501B", borderRadius: 999 }} /></div>
                  <strong style={{ ...sans, fontWeight: 700, fontSize: 17, color: "#2C241D", textAlign: "right" }}>{formatDecimal(month.steres)} st</strong>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#F5EFE2", borderRadius: 28, padding: "28px 30px", display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#A8501B" }}>LECTURE RAPIDE</div>
              <strong style={{ ...sans, fontWeight: 700, fontSize: 28, letterSpacing: "-.03em", color: "#2C241D" }}>Comment lire ce résultat</strong>
            </div>
            <div style={{ display: "grid", gap: 10, fontSize: 16, lineHeight: 1.6, color: "#5D5147" }}>
              <span>Le calcul part d'un besoin de chauffage utile du logement, puis le corrige selon l'isolation, le climat, la hauteur et votre rythme d'usage.</span>
              <span>Le rendement de l'appareil convertit ensuite ce besoin en stères de bois sec réellement consommés.</span>
              <span>La marge conseillée sert à éviter la rupture en fin d'hiver si la saison est plus froide que prévu.</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to={defaultCategoryPath} className="lbb-btn lbb-btn-primary">Voir le bois conseillé</Link>
              <Link to="/boutique" className="lbb-btn lbb-btn-secondary">Ouvrir toute la boutique</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function CategoryPage({ addToCart, categories, siteProducts, defaultCategoryPath, siteStatus }) {
  const { slug } = useParams();
  const currentCategory = categories.find((category) => category.slug === slug) || null;
  const [selectedEssences, setSelectedEssences] = useState(["Chêne"]);
  const [selectedLength, setSelectedLength] = useState([]);
  const [selectedDrying, setSelectedDrying] = useState([]);
  const [priceMax, setPriceMax] = useState(140);
  const [view, setView] = useState("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (currentCategory?.essences?.length) {
      setSelectedEssences(currentCategory.essences);
    } else {
      setSelectedEssences([]);
    }
    setSelectedLength([]);
    setSelectedDrying([]);
    setPriceMax(600);
    setView("grid");
  }, [currentCategory?.id]);

  if (!currentCategory && siteStatus === "loading") {
    return (
      <main>
        <section style={{ ...pageShell, paddingTop: 48, paddingBottom: 96 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: 28, ...mono, fontSize: 11.5, color: "#8A9180" }}>Chargement de la categorie…</div>
        </section>
      </main>
    );
  }

  if (!currentCategory) return <Navigate to={defaultCategoryPath} replace />;

  const woodProducts = getCategoryProducts(siteProducts.filter((product) => product.category === "bois-de-chauffage" || product.category === "accessoires" || product.category === "services"), currentCategory);
  const visible = woodProducts.filter((product) => {
    const matchEssence = selectedEssences.length === 0 || selectedEssences.includes(product.essence);
    const matchLength = selectedLength.length === 0 || selectedLength.includes(product.length);
    const matchDrying = selectedDrying.length === 0 || selectedDrying.includes(product.drying);
    const matchPrice = product.price <= priceMax;
    return matchEssence && matchLength && matchDrying && matchPrice;
  });

  const activeTags = [
    ...selectedEssences.map((item) => ({ type: "essence", label: item })),
    ...selectedLength.map((item) => ({ type: "length", label: item })),
    ...selectedDrying.map((item) => ({ type: "drying", label: item }))
  ];

  return (
    <main>
      <div style={{ ...pageShell, paddingTop: 22, ...mono, fontSize: 11, letterSpacing: ".06em", color: "#8A9180", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Link to="/">Accueil</Link><span>/</span><Link to="/boutique">Boutique</Link><span>/</span><span style={{ color: "#23291F" }}>{currentCategory.label}</span>
      </div>
      <section style={{ ...pageShell, paddingTop: 30 }}>
        <div>
          <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#C05621", marginBottom: 14 }}>{currentCategory.kicker}</div>
          <h1 style={{ ...sans, fontWeight: 700, fontSize: "clamp(38px, 4.4vw, 62px)", lineHeight: 0.98, letterSpacing: "-.036em", margin: "0 0 20px" }}>{currentCategory.heading}</h1>
          <p style={{ fontSize: 19, lineHeight: 1.58, color: "#4E5647", maxWidth: "62ch", margin: 0 }}>{currentCategory.description}</p>
        </div>
      </section>
      <section style={{ ...pageShell, paddingTop: 44 }}>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 6 }}>
          {categories.map((category) => (
            <Link key={category.id} to={getCategoryHref(category.slug)} style={{ flex: "0 0 auto", width: 178, display: "grid", gap: 10, background: "#FFFFFF", border: `1px solid ${category.id === currentCategory.id ? "#5B321D" : "rgba(35,41,31,.08)"}`, borderRadius: 20, padding: 14, textAlign: "left", cursor: "pointer", color: "inherit" }}>
              <div style={{ position: "relative", aspectRatio: 1.5, borderRadius: 13, overflow: "hidden", background: "#EADACB" }}>
                {getCategoryCoverImage(category, siteProducts)
                  ? <img src={getCategoryCoverImage(category, siteProducts)} alt={category.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : null}
              </div>
              <span style={{ ...sans, fontWeight: 600, fontSize: 13.5, letterSpacing: ".01em", color: "#23291F" }}>{category.label}</span>
              <span style={{ ...mono, fontSize: 10, letterSpacing: ".04em", color: "#8A9180" }}>{category.count}</span>
            </Link>
          ))}
        </div>
      </section>
      <section id="grille" style={{ ...pageShell, paddingTop: 46 }}>
        <div className="lbb-category-layout">
          <aside className="lbb-sticky-panel" style={{ position: "sticky", top: 158, display: "grid", gap: 16, alignSelf: "start" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ ...sans, fontWeight: 700, fontSize: 15 }}>Filtrer</span>
              <button type="button" onClick={() => { setSelectedEssences([]); setSelectedLength([]); setSelectedDrying([]); setPriceMax(140); }} style={{ background: "transparent", border: 0, cursor: "pointer", ...mono, fontSize: 10.5, letterSpacing: ".06em", color: "#A8AE9C", padding: 0 }}>Tout effacer</button>
            </div>
            <button type="button" className="lbb-filter-toggle" onClick={() => setFiltersOpen((current) => !current)}>
              {filtersOpen ? "Masquer les filtres" : `Filtrer${activeTags.length ? ` (${activeTags.length})` : ""}`}
            </button>
            <div className={`lbb-filter-panel${filtersOpen ? " is-open" : ""}`} style={{ gap: 26 }}>
              <FacetList title="ESSENCE" valueLabel={`${selectedEssences.length || "Toutes"}`} options={Array.from(new Set(woodProducts.map((product) => product.essence)))} values={selectedEssences} onToggle={(value) => toggleArray(setSelectedEssences, value)} />
              <FacetPills title="LONGUEUR" valueLabel={selectedLength[0] || "Toutes"} options={Array.from(new Set(woodProducts.map((product) => product.length).filter(Boolean)))} values={selectedLength} onToggle={(value) => toggleArray(setSelectedLength, value)} />
              <FacetRange title="PRIX" valueLabel={`≤ ${formatPrice(priceMax)}`} value={priceMax} min={90} max={600} step={5} onChange={setPriceMax} />
              <FacetPills title="SÉCHAGE" valueLabel={selectedDrying[0] || "Tous"} options={Array.from(new Set(woodProducts.map((product) => product.drying).filter(Boolean)))} values={selectedDrying} onToggle={(value) => toggleArray(setSelectedDrying, value)} />
            </div>
          </aside>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", paddingBottom: 20, borderBottom: "1px solid rgba(35,41,31,.09)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ ...mono, fontSize: 11, letterSpacing: ".05em", color: "#8A9180" }}>{visible.length} références visibles</span>
                {activeTags.map((tag) => (
                  <button key={`${tag.type}-${tag.label}`} type="button" onClick={() => removeTag(tag, { setSelectedEssences, setSelectedLength, setSelectedDrying })} style={{ ...mono, fontSize: 10.5, letterSpacing: ".05em", background: "#F3E5D8", color: "#5B321D", border: 0, borderRadius: 999, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>{tag.label} <span style={{ color: "#8C5A36" }}>✕</span></button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ display: "flex", gap: 4, background: "#F3E5D8", borderRadius: 999, padding: 4 }}>
                  {["Grille", "Liste"].map((label) => (
                    <button key={label} type="button" onClick={() => setView(label === "Grille" ? "grid" : "list")} style={{ ...mono, fontSize: 11, letterSpacing: ".05em", padding: "9px 15px", borderRadius: 999, cursor: "pointer", border: 0, background: view === (label === "Grille" ? "grid" : "list") ? "#5B321D" : "transparent", color: view === (label === "Grille" ? "grid" : "list") ? "#FBF6EE" : "#5B321D" }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className={view === "grid" ? "lbb-catalog-grid" : "lbb-list-grid"} style={{ paddingTop: 28 }}>
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} addToCart={addToCart} compact={view === "list"} />
              ))}
            </div>
            <div style={{ background: "#5B321D", color: "#FBF6EE", borderRadius: 22, padding: 24, marginTop: 28 }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#E8C9B3", marginBottom: 10 }}>AIDE AU CHOIX</div>
              <p style={{ margin: "0 0 16px", fontSize: 16.5, lineHeight: 1.5, color: "#FBF6EE" }}>Vous hésitez entre deux coupes ? Lancez l'estimation dédiée avant de choisir votre volume.</p>
              <Link to="/estimation-consommation" className="lbb-btn lbb-btn-light">Lancer l'estimation</Link>
            </div>
          </div>
        </div>
      </section>
      <section style={{ ...pageShell, paddingTop: 96, paddingBottom: 96 }}>
        <div className="lbb-two-col" style={{ background: "#F5EFE2", borderRadius: 34, padding: "46px 48px" }}>
          <div>
            <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#A8501B", marginBottom: 14 }}>Guide longueur</div>
            <h2 style={{ ...sans, fontWeight: 700, fontSize: 30, lineHeight: 1.08, letterSpacing: "-.03em", margin: "0 0 16px", color: "#3B2A17" }}>Quelle coupe pour quel appareil ?</h2>
            <p style={{ margin: "0 0 22px", fontSize: 17, lineHeight: 1.6, color: "#6B5842", maxWidth: "44ch" }}>La structure suit la maquette catégorie : à gauche l'explication, à droite une liste de longueurs avec leur usage conseillé.</p>
          </div>
          <div style={{ display: "grid", gap: 12, alignContent: "center" }}>
            {[
              ["25 cm", "Insert compact, rechargement précis, rangement facile."],
              ["33 cm", "Le standard polyvalent pour la plupart des inserts et poêles."],
              ["50 cm", "Cheminée traditionnelle et grands foyers."],
              ["1 m", "Recoupe sur place ou très grand foyer avec beaucoup de stockage."]
            ].map(([len, use]) => (
              <div key={len} style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 20, alignItems: "baseline", paddingBottom: 12, borderBottom: "1px solid rgba(59,42,23,.12)" }}>
                <span style={{ ...sans, fontWeight: 700, fontSize: 16, color: "#3B2A17" }}>{len}</span>
                <span style={{ ...mono, fontSize: 11.5, lineHeight: 1.6, color: "#6B5842" }}>{use}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function CatalogPage({ addToCart, categories, siteProducts, defaultCategoryPath, siteStatus }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedEssences, setSelectedEssences] = useState([]);
  const [selectedLength, setSelectedLength] = useState([]);
  const [selectedDrying, setSelectedDrying] = useState([]);
  const [priceMax, setPriceMax] = useState(140);
  const [view, setView] = useState("grid");
  const [sort, setSort] = useState("popular");

  useEffect(() => {
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSelectedEssences([]);
    setSelectedLength([]);
    setSelectedDrying([]);
    setPriceMax(140);
    setView("grid");
    setSort("popular");
  }, [siteStatus]);

  if (siteStatus === "loading" && siteProducts.length === 0) {
    return (
      <main>
        <section style={{ ...pageShell, paddingTop: 48, paddingBottom: 96 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: 28, ...mono, fontSize: 11.5, color: "#8A9180" }}>Chargement du catalogue…</div>
        </section>
      </main>
    );
  }

  const catalogProducts = siteProducts.filter((product) => product.category === "bois-de-chauffage" || product.category === "accessoires" || product.category === "services");
  const maxCatalogPrice = Math.max(140, ...catalogProducts.map((product) => product.price));
  const visibleProducts = catalogProducts
    .filter((product) => {
      const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(getCategoryForProduct(categories, product.id)?.label);
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(getProductTypeLabel(product));
      const essenceMatch = selectedEssences.length === 0 || selectedEssences.includes(product.essence);
      const lengthMatch = selectedLength.length === 0 || selectedLength.includes(product.length);
      const dryingMatch = selectedDrying.length === 0 || selectedDrying.includes(product.drying);
      const priceMatch = product.price <= priceMax;
      return categoryMatch && typeMatch && essenceMatch && lengthMatch && dryingMatch && priceMatch;
    })
    .sort((left, right) => {
      if (sort === "price-asc") return left.price - right.price;
      if (sort === "price-desc") return right.price - left.price;
      if (sort === "alpha") return left.name.localeCompare(right.name, "fr");
      return (right.stockPct ?? 0) - (left.stockPct ?? 0);
    });

  const activeTags = [
    ...selectedCategories.map((item) => ({ type: "category", label: item })),
    ...selectedTypes.map((item) => ({ type: "productType", label: item })),
    ...selectedEssences.map((item) => ({ type: "essence", label: item })),
    ...selectedLength.map((item) => ({ type: "length", label: item })),
    ...selectedDrying.map((item) => ({ type: "drying", label: item }))
  ];

  return (
    <main>
      <div style={{ ...pageShell, paddingTop: 22, ...mono, fontSize: 11, letterSpacing: ".06em", color: "#8A9180", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Link to="/">Accueil</Link><span>/</span><span style={{ color: "#23291F" }}>Catalogue</span>
      </div>
      <section style={{ ...pageShell, paddingTop: 30 }}>
        <div className="lbb-two-col" style={{ gridTemplateColumns: "1.2fr .8fr", alignItems: "end" }}>
          <div>
            <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#C05621", marginBottom: 14 }}>Catalogue complet</div>
            <h1 style={{ ...sans, fontWeight: 700, fontSize: "clamp(38px, 4.4vw, 62px)", lineHeight: 0.98, letterSpacing: "-.036em", margin: "0 0 20px" }}>Tout le catalogue, filtré par taille, essence, type et prix.</h1>
            <p style={{ fontSize: 19, lineHeight: 1.58, color: "#4E5647", maxWidth: "62ch", margin: 0 }}>Retrouvez tous les produits disponibles sur une seule page: chêne, hêtre, charme, châtaignier, allumage et services, avec filtres par catégories, tailles de bûche, type de produit, séchage et budget.</p>
          </div>
        </div>
      </section>
      <section style={{ ...pageShell, paddingTop: 44, paddingBottom: 96 }}>
        <div className="lbb-category-layout">
          <aside className="lbb-sticky-panel" style={{ position: "sticky", top: 158, display: "grid", gap: 26, alignSelf: "start" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ ...sans, fontWeight: 700, fontSize: 15 }}>Filtrer</span>
              <button type="button" onClick={() => { setSelectedCategories([]); setSelectedTypes([]); setSelectedEssences([]); setSelectedLength([]); setSelectedDrying([]); setPriceMax(maxCatalogPrice); }} style={{ background: "transparent", border: 0, cursor: "pointer", ...mono, fontSize: 10.5, letterSpacing: ".06em", color: "#A8AE9C", padding: 0 }}>Tout effacer</button>
            </div>
            <FacetList title="CATÉGORIES" valueLabel={`${selectedCategories.length || "Toutes"}`} options={categories.map((category) => category.label)} values={selectedCategories} onToggle={(value) => toggleArray(setSelectedCategories, value)} />
            <FacetPills title="TYPE" valueLabel={selectedTypes[0] || "Tous"} options={["Bois de chauffage", "Allumage", "Service"]} values={selectedTypes} onToggle={(value) => toggleArray(setSelectedTypes, value)} />
            <FacetList title="ESSENCE" valueLabel={`${selectedEssences.length || "Toutes"}`} options={Array.from(new Set(catalogProducts.map((product) => product.essence)))} values={selectedEssences} onToggle={(value) => toggleArray(setSelectedEssences, value)} />
            <FacetPills title="TAILLES" valueLabel={selectedLength[0] || "Toutes"} options={Array.from(new Set(catalogProducts.map((product) => product.length).filter(Boolean)))} values={selectedLength} onToggle={(value) => toggleArray(setSelectedLength, value)} />
            <FacetRange title="PRIX" valueLabel={`≤ ${formatPrice(priceMax)}`} value={priceMax} min={0} max={maxCatalogPrice} step={5} onChange={setPriceMax} />
            <FacetPills title="SÉCHAGE" valueLabel={selectedDrying[0] || "Tous"} options={Array.from(new Set(catalogProducts.map((product) => product.drying).filter(Boolean)))} values={selectedDrying} onToggle={(value) => toggleArray(setSelectedDrying, value)} />
          </aside>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", paddingBottom: 20, borderBottom: "1px solid rgba(35,41,31,.09)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ ...mono, fontSize: 11, letterSpacing: ".05em", color: "#8A9180" }}>{visibleProducts.length} références visibles</span>
                {activeTags.map((tag) => (
                  <button key={`${tag.type}-${tag.label}`} type="button" onClick={() => removeTag(tag, { setSelectedCategories, setSelectedTypes, setSelectedEssences, setSelectedLength, setSelectedDrying })} style={{ ...mono, fontSize: 10.5, letterSpacing: ".05em", background: "#F3E5D8", color: "#5B321D", border: 0, borderRadius: 999, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>{tag.label} <span style={{ color: "#8C5A36" }}>✕</span></button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 4, background: "#F3E5D8", borderRadius: 999, padding: 4 }}>
                  {[{ id: "popular", label: "Stock" }, { id: "price-asc", label: "Prix ↑" }, { id: "price-desc", label: "Prix ↓" }, { id: "alpha", label: "A-Z" }].map((item) => (
                    <button key={item.id} type="button" onClick={() => setSort(item.id)} style={{ ...mono, fontSize: 11, letterSpacing: ".05em", padding: "9px 15px", borderRadius: 999, cursor: "pointer", border: 0, background: sort === item.id ? "#5B321D" : "transparent", color: sort === item.id ? "#FBF6EE" : "#5B321D" }}>{item.label}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4, background: "#F3E5D8", borderRadius: 999, padding: 4 }}>
                  {["Grille", "Liste"].map((label) => (
                    <button key={label} type="button" onClick={() => setView(label === "Grille" ? "grid" : "list")} style={{ ...mono, fontSize: 11, letterSpacing: ".05em", padding: "9px 15px", borderRadius: 999, cursor: "pointer", border: 0, background: view === (label === "Grille" ? "grid" : "list") ? "#5B321D" : "transparent", color: view === (label === "Grille" ? "grid" : "list") ? "#FBF6EE" : "#5B321D" }}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className={view === "grid" ? "lbb-catalog-grid" : "lbb-list-grid"} style={{ paddingTop: 28 }}>
              {visibleProducts.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: 28, display: "grid", gap: 10 }}>
                  <strong style={{ ...sans, fontSize: 22, letterSpacing: "-.02em", color: "#2C241D" }}>Catalogue vide</strong>
                  <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "#4E5647", maxWidth: "46ch" }}>Le site public peut démarrer sans produit. Vous pourrez publier catégories et produits ensuite depuis le back office.</p>
                </div>
              ) : visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} addToCart={addToCart} compact={view === "list"} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProductPage({ addToCart, categories, settings, siteProducts, defaultCategoryPath, siteStatus }) {
  const { slug } = useParams();
  const product = siteProducts.find((item) => item.slug === slug);
  const productSettings = useMemo(() => normalizeProductOptionSettings(settings), [settings]);
  const variantProducts = useMemo(() => getProductVariantFamily(siteProducts, product), [siteProducts, product]);
  const [shotIndex, setShotIndex] = useState(0);
  const [qty, setQty] = useState(4);
  const [tab, setTab] = useState("overview");
  const [length, setLength] = useState(product?.length ?? "");
  const [drying, setDrying] = useState(product?.drying ?? "");

  useEffect(() => {
    setShotIndex(0);
    setQty(4);
    setTab("overview");
    setLength(product?.length ?? "");
    setDrying(product?.drying ?? "");
  }, [product?.id, productSettings.productOptions.dryingDurations, productSettings.productOptions.lengths]);

  if (!product && siteStatus === "loading") {
    return (
      <main>
        <section style={{ ...pageShell, paddingTop: 48, paddingBottom: 96 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: 28, ...mono, fontSize: 11.5, color: "#8A9180" }}>Chargement du produit…</div>
        </section>
      </main>
    );
  }

  if (!product) return <Navigate to={defaultCategoryPath} replace />;

  const isAccessory = isAccessoryProduct(product);
  const isService = isServiceProduct(product);
  const hasProductLevelOptions = !isAccessory && !isService && ((product.availableLengths?.length || 0) > 1 || (product.availableDryingDurations?.length || 0) > 1);
  const activeProduct = isAccessory || isService || hasProductLevelOptions ? product : findMatchingVariant(variantProducts, length, drying) || product;
  const activeUnitPrice = getProductPriceForLength(activeProduct, length);
  const total = activeUnitPrice * qty;
  const currentCategory = getCategoryForProduct(categories, activeProduct.id);
  const currentCategoryPath = currentCategory ? getCategoryHref(currentCategory.slug) : defaultCategoryPath;
  const related = siteProducts.filter((item) => item.category === activeProduct.category && item.id !== activeProduct.id).slice(0, 4);
  const tabData = activeProduct.tabs[tab];
  const badgeTone = tones[activeProduct.badgeTone] || tones.green;
  const hasOldPrice = Number.isFinite(activeProduct.oldPrice) && activeProduct.oldPrice > activeUnitPrice;
  const quantityUnitLabel = getProductQuantityUnitLabel(activeProduct);
  const optionTitle = isAccessory ? "CONDITIONNEMENT" : "LONGUEUR DE BÛCHE";
  const optionChoices = isAccessory
    ? [activeProduct.length]
    : hasProductLevelOptions
      ? uniqueByValue(activeProduct.availableLengths || [activeProduct.length])
      : uniqueByValue(variantProducts.map((item) => item.length).filter(Boolean));
  const secondaryOptionTitle = isAccessory ? "USAGE" : "SÉCHAGE";
  const secondaryOptionChoices = isAccessory
    ? [activeProduct.drying, activeProduct.humidity].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).slice(0, 2)
    : hasProductLevelOptions
      ? uniqueByValue(activeProduct.availableDryingDurations || [activeProduct.drying])
      : uniqueByValue(variantProducts.filter((item) => item.length === length).map((item) => item.drying).filter(Boolean));

  function handleLengthChange(nextLength) {
    setLength(nextLength);
    if (hasProductLevelOptions) {
      setShotIndex(0);
      return;
    }
    const nextProduct = findMatchingVariant(variantProducts, nextLength, drying);
    if (nextProduct?.drying) {
      setDrying(nextProduct.drying);
    }
    setShotIndex(0);
  }

  function handleDryingChange(nextDrying) {
    setDrying(nextDrying);
    setShotIndex(0);
  }

  return (
    <main>
      <div style={{ ...pageShell, paddingTop: 22, ...mono, fontSize: 11, letterSpacing: ".06em", color: "#8A9180", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Link to="/">Accueil</Link><span>/</span><Link to={currentCategoryPath}>{currentCategory?.label || "Categorie"}</Link><span>/</span><span style={{ color: "#23291F" }}>{activeProduct.name}</span><Link to={currentCategoryPath} style={{ marginLeft: "auto" }}>← Retour à la catégorie</Link>
      </div>
      <section className="lbb-product-layout" style={{ ...pageShell, paddingTop: 26, alignItems: "start" }}>
        <div className="lbb-sticky-panel" style={{ display: "grid", gap: 14, position: "sticky", top: 140 }}>
          <div style={{ position: "relative", aspectRatio: "4 / 3.2", borderRadius: 28, overflow: "hidden", background: "#EADACB" }}>
            <img src={activeProduct.gallery[shotIndex]} alt={activeProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", top: 20, left: 20, right: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ ...mono, fontSize: 10, letterSpacing: ".07em", background: badgeTone.background, color: badgeTone.color, padding: "7px 13px", borderRadius: 999 }}>{activeProduct.badge}</span>
              {activeProduct.humidity ? (
                <span style={{ ...mono, fontSize: 10, letterSpacing: ".07em", background: "rgba(251,250,245,.94)", color: "#5B321D", padding: "7px 13px", borderRadius: 999 }}>{activeProduct.humidity}</span>
              ) : null}
            </div>
          </div>
          <div className="lbb-product-gallery-thumbs" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {activeProduct.gallery.map((image, index) => (
              <button key={image} type="button" onClick={() => setShotIndex(index)} style={{ aspectRatio: 1, borderRadius: 15, cursor: "pointer", border: `2px solid ${index === shotIndex ? "#5B321D" : "#EADACB"}`, padding: 0, overflow: "hidden", background: "#EADACB" }}>
                <img src={image} alt="Aperçu produit" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
          {!isService ? (
            <div className="lbb-mini-features" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, ...mono, fontSize: 10.5, letterSpacing: ".04em", color: "#6B7263", textAlign: "center" }}>
              <span style={{ background: "#F5EFE2", borderRadius: 14, padding: "13px 6px" }}>{activeProduct.length}</span>
              <span style={{ background: "#F3E5D8", color: "#5B321D", borderRadius: 14, padding: "13px 6px" }}>{activeProduct.origin || ""}</span>
              <span style={{ background: "#5B321D", color: "#FBF6EE", borderRadius: 14, padding: "13px 6px" }}>{activeProduct.drying}</span>
            </div>
          ) : null}
        </div>
        <div>
          <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#C05621", marginBottom: 14 }}>{activeProduct.essence} · Forêt du Sud-Ouest · réf. {activeProduct.id.toUpperCase()}</div>
          <h1 style={{ ...sans, fontWeight: 700, fontSize: "clamp(34px, 3.7vw, 50px)", lineHeight: 1.02, letterSpacing: "-.034em", margin: "0 0 16px" }}>{activeProduct.name}<br />{isService ? "prestation disponible à la commande" : isAccessory ? "à ajouter à votre commande" : "vendu au stère"}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 22, ...mono, fontSize: 11.5 }}>
            {activeProduct.rating ? <span style={{ color: "#C05621", letterSpacing: ".12em" }}>{activeProduct.rating}</span> : null}
            {activeProduct.reviews ? <a href="#avis" style={{ color: "#5B321D", borderBottom: "1px solid rgba(91,50,29,.35)" }}>{activeProduct.reviews}</a> : null}
            {activeProduct.rating || activeProduct.reviews ? <span style={{ color: "#A8AE9C" }}>·</span> : null}
            <span style={{ color: "#8A9180" }}>{activeProduct.stockLabel}</span>
          </div>
          <p style={{ fontSize: 19, lineHeight: 1.6, color: "#4E5647", maxWidth: "56ch", margin: "0 0 30px" }}>{activeProduct.desc}</p>
          <div style={{ display: "grid", gap: 24, background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: 28, boxShadow: "0 24px 54px -44px rgba(35,41,31,.65)" }}>
            {!isService && optionChoices.length > 0 ? <SelectorRow title={optionTitle} options={optionChoices} value={length} onChange={handleLengthChange} card /> : null}
            {!isService && secondaryOptionChoices.length > 0 ? <SelectorRow title={secondaryOptionTitle} options={secondaryOptionChoices} value={drying} onChange={handleDryingChange} /> : null}
            {!isService && (optionChoices.length > 0 || secondaryOptionChoices.length > 0) ? <div style={{ height: 1, background: "rgba(35,41,31,.09)" }} /> : null}
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>{isService ? "QUANTITÉ DE PRESTATIONS" : isAccessory ? "QUANTITÉ" : "NOMBRE DE STÈRES"}</span>
                <span style={{ ...mono, fontSize: 10.5, color: "#C05621" }}>{isService ? "Service ajoutable avant validation de la commande" : isAccessory ? "Ajoutable à une livraison ou à un retrait dépôt" : ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 18, border: "1px solid rgba(35,41,31,.14)", borderRadius: 999, padding: "10px 20px" }}>
                  <button type="button" onClick={() => setQty((current) => Math.max(1, current - 1))} style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 19, color: "#55604F", lineHeight: 1 }}>−</button>
                  <span style={{ ...sans, fontWeight: 700, fontSize: 19, minWidth: 26, textAlign: "center" }}>{qty}</span>
                  <button type="button" onClick={() => setQty((current) => current + 1)} style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 19, color: "#55604F", lineHeight: 1 }}>+</button>
                </div>
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={{ ...mono, fontSize: 10.5, color: "#8A9180" }}>{isService ? `${qty} ${quantityUnitLabel}` : isAccessory ? `${qty} ${quantityUnitLabel}` : `soit env. ${(qty * 0.7).toFixed(1).replace(".", ",")} m³ empilé`}</span>
                  <span style={{ ...mono, fontSize: 10.5, color: "#5B321D" }}>{isService ? "Ajout facturé comme ligne complémentaire." : isAccessory ? "Compatible avec les tournées bois et le retrait dépôt" : `Base saison moyenne pour une maison de ${qty >= 5 ? "100 à 130" : "70 à 90"} m²`}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ ...sans, fontWeight: 700, fontSize: 40, letterSpacing: "-.035em", lineHeight: 1 }}>{formatPrice(activeUnitPrice)}</span>
                  {hasOldPrice ? <span style={{ ...mono, fontSize: 11.5, color: "#A8AE9C", textDecoration: "line-through" }}>{formatPrice(activeProduct.oldPrice)}</span> : null}
                  <span style={{ ...mono, fontSize: 11.5, color: "#8A9180" }}>{activeProduct.unit}</span>
                </div>
                <span style={{ ...mono, fontSize: 11, color: "#4E5647" }}>Total {qty} {quantityUnitLabel} · <span style={{ color: "#23291F" }}>{formatPrice(total)}</span> · tarifs TTC TVA 10 %</span>
              </div>
            </div>
            <div className="lbb-cta-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => addToCart(activeProduct.id, qty, isAccessory || isService ? { unitPrice: activeUnitPrice } : { length, drying, unitPrice: activeUnitPrice })} className="lbb-btn lbb-btn-primary" style={{ width: "100%", justifyContent: "center" }}>Ajouter {qty} {quantityUnitLabel}</button>
              {!isService ? <Link to="/estimation-consommation" className="lbb-btn lbb-btn-secondary" style={{ justifyContent: "center" }}>Estimer ma consommation</Link> : <Link to="/panier" className="lbb-btn lbb-btn-secondary" style={{ justifyContent: "center" }}>Voir mon panier</Link>}
            </div>
          </div>
        </div>
      </section>
      <section style={{ ...pageShell, paddingTop: 90 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid rgba(35,41,31,.1)" }}>
          {[{ id: "overview", label: "Description" }, { id: "livraison", label: "Livraison" }].map((item) => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} style={{ background: "transparent", border: 0, borderBottom: `2px solid ${tab === item.id ? "#5B321D" : "transparent"}`, cursor: "pointer", padding: "14px 18px", ...sans, fontWeight: 600, fontSize: 14.5, letterSpacing: ".01em", color: tab === item.id ? "#23291F" : "#8A9180" }}>{item.label}</button>
          ))}
        </div>
        <div className="lbb-two-col" style={{ paddingTop: 44, alignItems: "start" }}>
          <div>
            <h2 style={{ ...sans, fontWeight: 700, fontSize: 28, letterSpacing: "-.028em", margin: "0 0 20px" }}>{tabData.title}</h2>
            {tabData.paragraphs.map((paragraph) => (
              <p key={paragraph} style={{ fontSize: 18.5, lineHeight: 1.62, color: "#4E5647", maxWidth: "62ch", margin: "0 0 18px" }}>{paragraph}</p>
            ))}
            <div style={{ display: "grid", gap: 12, marginTop: 26 }}>
              {tabData.points.map((point) => (
                <div key={point} style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 14, alignItems: "baseline" }}>
                  <span style={{ ...mono, fontSize: 12, color: "#8C5A36" }}>✦</span>
                  <span style={{ fontSize: 17.5, lineHeight: 1.55, color: "#2F3629" }}>{point}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.08)", borderRadius: 28, padding: "30px 32px" }}>
            <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#C05621", marginBottom: 20 }}>FICHE TECHNIQUE DU LOT</div>
            {activeProduct.specs.map((spec) => (
              <div key={spec.k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, padding: "13px 0", borderBottom: "1px solid rgba(35,41,31,.07)", ...mono, fontSize: 11.5 }}>
                <span style={{ color: "#8A9180", letterSpacing: ".03em" }}>{spec.k}</span>
                <span style={{ color: "#23291F", textAlign: "right" }}>{spec.v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="avis" style={{ ...pageShell, paddingTop: 96, paddingBottom: 96 }}>
        <div className="lbb-two-col" style={{ gridTemplateColumns: ".62fr 1.38fr", alignItems: "start" }}>
          <div style={{ background: "#F3E5D8", borderRadius: 30, padding: 34 }}>
            <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#C05621", marginBottom: 16 }}>AVIS VÉRIFIÉS</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
              <span style={{ ...sans, fontWeight: 700, fontSize: 54, lineHeight: 1, letterSpacing: "-.04em", color: "#23291F" }}>4,9</span>
              <span style={{ ...mono, fontSize: 12, color: "#6B7263" }}>/ 5</span>
            </div>
            <div style={{ ...mono, fontSize: 11.5, color: "#C05621", letterSpacing: ".12em", marginBottom: 24 }}>★★★★★ <span style={{ color: "#6B7263", letterSpacing: ".04em" }}>{activeProduct.reviews}</span></div>
          </div>
          <div className="lbb-review-grid">
            {reviews.map((review) => (
              <article key={review.author} style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 24, padding: 24, display: "grid", gap: 12 }}>
                <p style={{ fontSize: 17, lineHeight: 1.6, color: "#4E5647", margin: 0 }}>{review.quote}</p>
                <strong style={{ ...sans, fontWeight: 700 }}>{review.author}</strong>
              </article>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 44 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 20 }}>
            <h2 style={{ ...sans, fontWeight: 700, fontSize: 28, letterSpacing: "-.025em", margin: 0 }}>Produits associés</h2>
            <span style={{ ...mono, fontSize: 11.5, color: "#8A9180" }}>Même essence, autre coupe ou autre lot</span>
          </div>
          <div className="lbb-catalog-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} addToCart={addToCart} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function CartPage({ cartItems, setQuantity, addToCart, siteProducts, defaultCategoryPath, account, settings, promoCode, onApplyPromoCode }) {
  const [promoInput, setPromoInput] = useState(promoCode || "");
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const woodVolume = cartItems.filter((item) => item.category === "bois-de-chauffage").reduce((sum, item) => sum + item.quantity, 0);
  const shippingEstimate = subtotal === 0 ? { amount: 0, label: "", quoteRequired: false } : computeShipping({ woodVolume });
  const shipping = shippingEstimate.amount;
  const promoResult = promoCode ? validatePromoCode(promoCode, subtotal, settings?.promotions?.promoCodes) : { valid: false, amount: 0, message: "" };
  const discountAmount = promoResult.valid ? promoResult.amount : 0;
  const totals = buildVatBreakdown(Math.max(0, subtotal - discountAmount), shipping);

  function handleApplyPromo(event) {
    event.preventDefault();
    onApplyPromoCode(promoInput.trim());
  }

  function handleRemovePromo() {
    setPromoInput("");
    onApplyPromoCode("");
  }

  return (
    <main>
      <div style={{ ...pageShell, paddingTop: 22, ...mono, fontSize: 11, letterSpacing: ".06em", color: "#8A9180", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Link to="/">Accueil</Link><span>/</span><span style={{ color: "#23291F" }}>Panier</span><Link to={defaultCategoryPath} style={{ marginLeft: "auto" }}>← Continuer mes achats</Link>
      </div>
      <section style={{ ...pageShell, paddingTop: 26 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, flexWrap: "wrap", marginBottom: 30 }}>
          <div>
            <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#C05621", marginBottom: 12 }}>Étape 1 sur 3 — Vérification du chargement</div>
            <h1 style={{ ...sans, fontWeight: 700, fontSize: "clamp(34px, 3.6vw, 48px)", lineHeight: 1.02, letterSpacing: "-.034em", margin: 0 }}>Votre panier</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, ...mono, fontSize: 11, letterSpacing: ".06em", flexWrap: "wrap" }}>
            <CheckoutStep active label="Panier" number="1" />
            <span style={{ width: 34, height: 1, background: "rgba(35,41,31,.18)" }} />
            <CheckoutStep label="Livraison" number="2" />
            <span style={{ width: 34, height: 1, background: "rgba(35,41,31,.18)" }} />
            <CheckoutStep label="Paiement" number="3" />
          </div>
        </div>
      </section>
      {cartItems.length === 0 ? (
        <section style={{ ...pageShell, paddingTop: 10, paddingBottom: 100 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 32, padding: "74px 48px", textAlign: "center", boxShadow: "0 24px 54px -46px rgba(35,41,31,.6)" }}>
            <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#C05621", marginBottom: 16 }}>Panier vide</div>
            <h2 style={{ ...sans, fontWeight: 700, fontSize: 34, letterSpacing: "-.03em", margin: "0 0 14px" }}>Rien dans la remorque</h2>
            <p style={{ fontSize: 19, lineHeight: 1.6, color: "#4E5647", maxWidth: "44ch", margin: "0 auto 32px" }}>Comptez 6 à 8 stères pour chauffer une maison de 120 m² sur une saison complète. On vous aide à calculer si vous hésitez.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to={defaultCategoryPath} className="lbb-btn lbb-btn-primary">Voir le bois au stère</Link>
              <Link to="/estimation-consommation" className="lbb-btn lbb-btn-secondary">Estimer ma consommation</Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="lbb-cart-layout" style={{ ...pageShell, paddingTop: 10, paddingBottom: 90, alignItems: "start" }}>
          <div style={{ minWidth: 0, display: "grid", gap: 18 }}>
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 54px -48px rgba(35,41,31,.6)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "22px 28px", borderBottom: "1px solid rgba(35,41,31,.08)", ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>
                <span>{cartItems.length} références dans la remorque</span>
                <span>{woodVolume} stères — env. {woodVolume * 450} kg</span>
              </div>
              {cartItems.map((item) => (
                <div key={item.lineId} className="lbb-cart-item" style={{ display: "flex", gap: 20, padding: "22px 28px", borderBottom: "1px solid rgba(35,41,31,.07)", alignItems: "flex-start" }}>
                  {!isServiceProduct(item) && item.image ? <div className="lbb-cart-item-media" style={{ flex: "0 0 88px", width: 88, aspectRatio: 1, borderRadius: 16, overflow: "hidden", background: "#EADACB" }}><img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div> : null}
                  <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 8 }}>
                    <div className="lbb-cart-item-topline" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                        <div className="lbb-cart-item-code" style={{ ...mono, fontSize: 9.5, letterSpacing: ".08em", color: "#C05621" }}>{item.id.toUpperCase()}</div>
                        <Link to={`/produit/${item.slug}`} className="lbb-cart-item-title" style={{ ...sans, fontWeight: 700, fontSize: 18, letterSpacing: "-.02em", lineHeight: 1.2 }}>{item.name}</Link>
                        {item.isGift ? <span style={{ ...mono, fontSize: 9.5, letterSpacing: ".05em", color: "#5C7752", background: "#E6EFE4", borderRadius: 999, padding: "6px 11px", width: "fit-content" }}>OFFERT · {item.giftLabel}</span> : null}
                      </div>
                      <span className="lbb-cart-item-total" style={{ ...sans, fontWeight: 700, fontSize: 19, letterSpacing: "-.02em", whiteSpace: "nowrap" }}>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    <div className="lbb-cart-item-desc" style={{ fontSize: 14.5, lineHeight: 1.5, color: "#4E5647" }}>{item.desc}</div>
                    {[item.selectedLength, item.selectedDrying].some(Boolean) ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", ...mono, fontSize: 9.5, letterSpacing: ".05em" }}>
                        {item.selectedLength ? <span style={{ background: "#F3E5D8", color: "#5B321D", borderRadius: 999, padding: "6px 11px" }}>{item.selectedLength}</span> : null}
                        {item.selectedDrying ? <span style={{ background: "#F5EFE2", color: "#8A6B3C", borderRadius: 999, padding: "6px 11px" }}>{item.selectedDrying}</span> : null}
                      </div>
                    ) : null}
                    {!item.isGift ? (
                      <div className="lbb-cart-item-footer" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 2, ...mono, fontSize: 10.5, letterSpacing: ".05em" }}>
                        <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(35,41,31,.14)", borderRadius: 999, overflow: "hidden" }}>
                          <button type="button" onClick={() => setQuantity(item.lineId, item.quantity - 1)} style={{ border: 0, background: "transparent", cursor: "pointer", width: 34, height: 34, fontSize: 15, color: "#5B321D" }}>−</button>
                          <span style={{ minWidth: 30, textAlign: "center", ...sans, fontWeight: 700, fontSize: 13, color: "#23291F" }}>{item.quantity}</span>
                          <button type="button" onClick={() => setQuantity(item.lineId, item.quantity + 1)} style={{ border: 0, background: "transparent", cursor: "pointer", width: 34, height: 34, fontSize: 15, color: "#5B321D" }}>+</button>
                        </div>
                        <span className="lbb-cart-item-unit" style={{ color: "#8A9180" }}>{formatPrice(item.price)} / unité</span>
                        <button type="button" onClick={() => setQuantity(item.lineId, 0)} style={{ border: 0, background: "transparent", cursor: "pointer", marginLeft: "auto", ...mono, fontSize: 10.5, letterSpacing: ".06em", color: "#A8AE9C", padding: 0 }}>Retirer</button>
                      </div>
                    ) : (
                      <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".05em", color: "#8A9180", marginTop: 2 }}>{item.quantity} offert(s) automatiquement</span>
                    )}
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 20, padding: "20px 28px", background: "#F7F4EA" }}>
                <Link to={defaultCategoryPath} style={{ ...mono, fontSize: 10.5, letterSpacing: ".06em", color: "#5B321D", borderBottom: "1px solid rgba(91,50,29,.35)" }}>Ajouter un autre produit</Link>
              </div>
            </div>
          </div>
          <aside className="lbb-sticky-panel" style={{ minWidth: 0, display: "grid", gap: 16, position: "sticky", top: 140 }}>
            <ServiceUpsellSection siteProducts={siteProducts} cartItems={cartItems} addToCart={addToCart} title="Ajoutez la prestation qui va avec la livraison" description="" />
            <div className="lbb-cart-summary" style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: 28, boxShadow: "0 24px 54px -44px rgba(35,41,31,.65)" }}>
              <h2 className="lbb-cart-summary-title" style={{ ...sans, fontWeight: 700, fontSize: 21, letterSpacing: "-.024em", margin: "0 0 22px" }}>Récapitulatif</h2>
              <div className="lbb-cart-summary-lines" style={{ display: "grid", gap: 13, fontSize: 17, color: "#4E5647" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>Sous-total produits HT</span><span style={{ color: "#23291F" }}>{formatPrice(totals.productsHt)}</span></div>
                {promoResult.valid ? <div style={{ display: "flex", justifyContent: "space-between", gap: 16, color: "#5C7752" }}><span>Code {promoResult.code}</span><span>−{formatPrice(promoResult.amount)}</span></div> : null}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>TVA produits 10 %</span><span style={{ color: "#23291F" }}>{formatPrice(totals.productsVat)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>Livraison HT (estimation)</span><span style={{ color: "#23291F" }}>{shippingEstimate.quoteRequired ? "Sur devis" : shippingEstimate.freeShipping ? "Offerte" : formatPrice(totals.shippingHt)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>TVA livraison 10 %</span><span style={{ color: "#23291F" }}>{shippingEstimate.quoteRequired ? "Sur devis" : shippingEstimate.freeShipping ? "Offerte" : formatPrice(totals.shippingVat)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, ...mono, fontSize: 11, letterSpacing: ".05em", color: "#8A9180" }}><span>Total TVA 10 %</span><span>{formatPrice(totals.totalVat)}</span></div>
              </div>
              <form onSubmit={handleApplyPromo} style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <input value={promoInput} onChange={(event) => setPromoInput(event.target.value)} placeholder="Code promo" className="lbb-admin-input" style={{ flex: 1, minHeight: 40 }} />
                {promoCode ? <button type="button" onClick={handleRemovePromo} className="lbb-btn lbb-btn-secondary lbb-btn-small">Retirer</button> : <button type="submit" className="lbb-btn lbb-btn-secondary lbb-btn-small">Appliquer</button>}
              </form>
              {promoCode && !promoResult.valid && promoResult.message ? <p style={{ ...mono, fontSize: 10.5, color: "#A8501B", margin: "8px 0 0" }}>{promoResult.message}</p> : null}
              <p style={{ ...mono, fontSize: 10.5, letterSpacing: ".03em", color: "#8A9180", margin: "12px 0 0" }}>Frais estimés pour une adresse locale ; le montant définitif est calculé à l'étape suivante selon votre code postal.</p>
              <div style={{ height: 1, background: "rgba(35,41,31,.1)", margin: "22px 0" }} />
              <div className="lbb-cart-summary-total" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                <span style={{ ...sans, fontWeight: 700, fontSize: 17, letterSpacing: "-.02em" }}>Total TTC</span>
                <span className="lbb-cart-summary-total-amount" style={{ ...sans, fontWeight: 700, fontSize: 34, letterSpacing: "-.035em" }}>{formatPrice(totals.totalTtc)}</span>
              </div>
              <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".05em", color: "#8A9180", marginTop: 8 }}>Ou {formatPrice(totals.totalTtc / 3)} en 3× sans frais</div>
              <Link to="/commande" className="lbb-btn lbb-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 22 }}>Passer à la commande</Link>
            </div>
            <div style={{ background: "#23291F", color: "#E7EBDD", borderRadius: 28, padding: "26px 28px" }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#C05621", marginBottom: 12 }}>ESPACE CLIENT</div>
              <p style={{ margin: "0 0 10px", fontSize: 16.5, lineHeight: 1.5, maxWidth: "34ch" }}>Retrouvez vos commandes en cours, vos créneaux de livraison et vos consignes d&apos;accès en un seul endroit.</p>
              <div style={{ ...mono, fontSize: 10, letterSpacing: ".05em", color: "#9AA391", marginBottom: 16 }}>{account?.activeOrderStatus || "Créez votre compte pour suivre vos commandes."}</div>
              <Link to="/compte" style={{ ...mono, fontSize: 10.5, letterSpacing: ".06em", color: "#F4F7EC", borderBottom: "1px solid rgba(244,247,236,.35)" }}>Voir mon espace client →</Link>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}

function CustomerAuthCard({ title, description, initialMode = "login", onLogin, onRegister }) {
  const [mode, setMode] = useState(initialMode);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginDraft, setLoginDraft] = useState({ email: "", password: "" });
  const [registerDraft, setRegisterDraft] = useState({ name: "", email: "", phone: "", city: "", password: "" });

  useEffect(() => {
    setMode(initialMode);
    setFeedback("");
  }, [initialMode]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await onLogin(loginDraft);
      } else {
        await onRegister(registerDraft);
      }
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: "28px 30px", display: "grid", gap: 20, boxShadow: "0 24px 54px -46px rgba(35,41,31,.45)" }}>
      <div style={{ display: "grid", gap: 8 }}>
        <strong style={{ ...sans, fontWeight: 700, fontSize: 28, letterSpacing: "-.03em", color: "#2C241D" }}>{title}</strong>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: "#4E5647" }}>{description}</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[{ id: "login", label: "Connexion" }, { id: "register", label: "Créer un compte" }].map((item) => (
          <button key={item.id} type="button" onClick={() => setMode(item.id)} style={{ ...mono, fontSize: 10.5, letterSpacing: ".06em", padding: "11px 14px", borderRadius: 999, cursor: "pointer", border: `1px solid ${mode === item.id ? "#5B321D" : "rgba(35,41,31,.14)"}`, background: mode === item.id ? "#5B321D" : "#FFFFFF", color: mode === item.id ? "#FBF6EE" : "#23291F" }}>{item.label}</button>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        {mode === "register" ? (
          <>
            <input value={registerDraft.name} onChange={(event) => setRegisterDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Nom et prénom" className="lbb-admin-input" required />
            <input value={registerDraft.email} onChange={(event) => setRegisterDraft((current) => ({ ...current, email: event.target.value }))} placeholder="Email" type="email" className="lbb-admin-input" required />
            <input value={registerDraft.phone} onChange={(event) => setRegisterDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Téléphone" className="lbb-admin-input" />
            <input value={registerDraft.city} onChange={(event) => setRegisterDraft((current) => ({ ...current, city: event.target.value }))} placeholder="Ville" className="lbb-admin-input" />
            <input value={registerDraft.password} onChange={(event) => setRegisterDraft((current) => ({ ...current, password: event.target.value }))} placeholder="Mot de passe" type="password" className="lbb-admin-input" required />
          </>
        ) : (
          <>
            <input value={loginDraft.email} onChange={(event) => setLoginDraft((current) => ({ ...current, email: event.target.value }))} placeholder="Email" type="email" className="lbb-admin-input" required />
            <input value={loginDraft.password} onChange={(event) => setLoginDraft((current) => ({ ...current, password: event.target.value }))} placeholder="Mot de passe" type="password" className="lbb-admin-input" required />
          </>
        )}
        {feedback ? <div style={{ background: "#FCE7DF", color: "#A8501B", borderRadius: 16, padding: "12px 14px", ...mono, fontSize: 10.5 }}>{feedback}</div> : null}
        <button type="submit" className="lbb-btn lbb-btn-primary" style={{ justifyContent: "center" }} disabled={isSubmitting}>{isSubmitting ? "Chargement..." : mode === "login" ? "Se connecter" : "Créer mon compte"}</button>
      </form>
    </div>
  );
}

function CheckoutPage({ cartItems, addToCart, siteProducts, settings, account, defaultCategoryPath, onLogin, onRegister, onPlaceOrder, onStartStripeCheckout, promoCode, onApplyPromoCode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => buildCheckoutDraft(account));
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoInput, setPromoInput] = useState(promoCode || "");
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const woodVolume = cartItems.filter((item) => item.category === "bois-de-chauffage").reduce((sum, item) => sum + item.quantity, 0);
  const shippingResult = computeShipping({ postcode: draft.deliveryAddress.postcode, woodVolume });
  const shipping = shippingResult.amount;
  const promoResult = promoCode ? validatePromoCode(promoCode, subtotal, settings?.promotions?.promoCodes) : { valid: false, amount: 0, message: "" };
  const discountAmount = promoResult.valid ? promoResult.amount : 0;
  const totals = buildVatBreakdown(Math.max(0, subtotal - discountAmount), shipping);
  const searchParams = new URLSearchParams(location.search);
  const stripeCancelled = searchParams.get("payment") === "cancelled";

  useEffect(() => {
    setDraft(buildCheckoutDraft(account));
    setFeedback("");
  }, [account]);

  if (cartItems.length === 0) {
    return <Navigate to="/panier" replace />;
  }

  function handleApplyPromo(event) {
    event.preventDefault();
    onApplyPromoCode(promoInput.trim());
  }

  function handleRemovePromo() {
    setPromoInput("");
    onApplyPromoCode("");
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateLengthPrice(length, value) {
    setDraft((current) => ({
      ...current,
      lengthPrices: {
        ...(current.lengthPrices || {}),
        [length]: value
      }
    }));
  }

  function updateAddress(field, key, value) {
    setDraft((current) => ({
      ...current,
      [field]: {
        ...current[field],
        [key]: value
      }
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback("");

    if (shippingResult.quoteRequired) {
      setFeedback("Cette adresse est hors zone de livraison automatique. Contactez-nous pour établir un devis avant de commander.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...draft,
        paymentMethod: "Carte bancaire",
        shippingAmount: shipping,
        promoCode: promoResult.valid ? promoResult.code : "",
        billingAddress: draft.billingSameAsDelivery ? draft.deliveryAddress : draft.billingAddress
      };
      await onStartStripeCheckout(payload);
      return;
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <section style={{ ...pageShell, paddingTop: 30, paddingBottom: 90 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 28 }}>
          <div>
            <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#C05621", marginBottom: 10 }}>Tunnel de commande</div>
            <h1 style={{ ...sans, fontWeight: 700, fontSize: "clamp(34px, 4vw, 48px)", lineHeight: 1.02, letterSpacing: "-.034em", margin: 0 }}>Finaliser votre commande</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, ...mono, fontSize: 11, letterSpacing: ".06em", flexWrap: "wrap" }}>
            <CheckoutStep active label={account ? "Espace client" : "Connexion"} number="1" />
            <span style={{ width: 34, height: 1, background: "rgba(35,41,31,.18)" }} />
            <CheckoutStep active={Boolean(account)} label="Livraison" number="2" />
            <span style={{ width: 34, height: 1, background: "rgba(35,41,31,.18)" }} />
            <CheckoutStep active={Boolean(account)} label="Validation" number="3" />
          </div>
        </div>

        {!account ? (
          <div className="lbb-two-col" style={{ alignItems: "start" }}>
            <CustomerAuthCard title="Espace client" description="Créez votre compte ou connectez-vous avant de choisir votre créneau et valider la commande." onLogin={onLogin} onRegister={onRegister} />
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: 28, display: "grid", gap: 16 }}>
              <strong style={{ ...sans, fontWeight: 700, fontSize: 22, letterSpacing: "-.02em" }}>Votre panier</strong>
              {cartItems.map((item) => <div key={item.lineId} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 16, color: "#4E5647" }}><span>{item.quantity} × {item.name}{item.isGift ? " · OFFERT" : [item.selectedLength, item.selectedDrying].filter(Boolean).length ? ` · ${[item.selectedLength, item.selectedDrying].filter(Boolean).join(" · ")}` : ""}</span><strong style={{ color: "#23291F" }}>{formatPrice(item.price * item.quantity)}</strong></div>)}
              <div style={{ height: 1, background: "rgba(35,41,31,.08)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>Sous-total HT</span><strong>{formatPrice(totals.totalHt)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>TVA 10 %</span><strong>{formatPrice(totals.totalVat)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}><span style={{ ...sans, fontWeight: 700, fontSize: 18 }}>Total TTC</span><strong style={{ ...sans, fontWeight: 700, fontSize: 28 }}>{formatPrice(totals.totalTtc)}</strong></div>
              <ServiceUpsellSection siteProducts={siteProducts} cartItems={cartItems} addToCart={addToCart} title="Ajoutez vos services avant connexion" description="Ces services seront repris dans la commande dès que vous validez votre panier." />
            </div>
          </div>
        ) : (
          <div className="lbb-cart-layout" style={{ alignItems: "start" }}>
            <form onSubmit={handleSubmit} style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: 28, display: "grid", gap: 22 }}>
              <div style={{ display: "grid", gap: 12 }}>
                <strong style={{ ...sans, fontWeight: 700, fontSize: 22, letterSpacing: "-.02em" }}>Contact</strong>
                <div className="lbb-two-col" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  <input value={draft.customerName} onChange={(event) => updateDraft("customerName", event.target.value)} placeholder="Nom et prénom" className="lbb-admin-input" required />
                  <input value={draft.contactPhone} onChange={(event) => updateDraft("contactPhone", event.target.value)} placeholder="Téléphone" className="lbb-admin-input" required />
                </div>
                <input value={draft.contactEmail} onChange={(event) => updateDraft("contactEmail", event.target.value)} placeholder="Email" type="email" className="lbb-admin-input" required />
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <strong style={{ ...sans, fontWeight: 700, fontSize: 22, letterSpacing: "-.02em" }}>Adresse de livraison</strong>
                <div className="lbb-two-col" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  <input value={draft.deliveryAddress.line1} onChange={(event) => updateAddress("deliveryAddress", "line1", event.target.value)} placeholder="Adresse" className="lbb-admin-input" required />
                  <input value={draft.deliveryAddress.line2} onChange={(event) => updateAddress("deliveryAddress", "line2", event.target.value)} placeholder="Complément" className="lbb-admin-input" />
                  <input value={draft.deliveryAddress.postcode} onChange={(event) => updateAddress("deliveryAddress", "postcode", event.target.value)} placeholder="Code postal" className="lbb-admin-input" required />
                  <input value={draft.deliveryAddress.city} onChange={(event) => updateAddress("deliveryAddress", "city", event.target.value)} placeholder="Ville" className="lbb-admin-input" required />
                </div>
                <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".03em", color: shippingResult.quoteRequired ? "#A8501B" : "#8A9180" }}>{shippingResult.label}</span>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15.5, color: "#4E5647" }}>
                  <input type="checkbox" checked={draft.billingSameAsDelivery} onChange={(event) => updateDraft("billingSameAsDelivery", event.target.checked)} />
                  Utiliser la même adresse pour la facturation
                </label>
                {!draft.billingSameAsDelivery ? (
                  <div className="lbb-two-col" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                    <input value={draft.billingAddress.line1} onChange={(event) => updateAddress("billingAddress", "line1", event.target.value)} placeholder="Adresse de facturation" className="lbb-admin-input" required />
                    <input value={draft.billingAddress.line2} onChange={(event) => updateAddress("billingAddress", "line2", event.target.value)} placeholder="Complément" className="lbb-admin-input" />
                    <input value={draft.billingAddress.postcode} onChange={(event) => updateAddress("billingAddress", "postcode", event.target.value)} placeholder="Code postal" className="lbb-admin-input" required />
                    <input value={draft.billingAddress.city} onChange={(event) => updateAddress("billingAddress", "city", event.target.value)} placeholder="Ville" className="lbb-admin-input" required />
                  </div>
                ) : null}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>PAIEMENT</span>
                <div className="lbb-admin-input" style={{ display: "flex", alignItems: "center", color: "#23291F", background: "#F8F6F1" }}>Carte bancaire</div>
              </div>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>NOTE LIVRAISON</span>
                <textarea value={draft.logisticsNote} onChange={(event) => updateDraft("logisticsNote", event.target.value)} className="lbb-admin-input" style={{ minHeight: 110, resize: "vertical" }} placeholder="Code portail, accès, consignes..." />
              </label>

              {stripeCancelled ? <div style={{ background: "#FFF2DD", color: "#9A5A00", borderRadius: 16, padding: "12px 14px", ...mono, fontSize: 10.5 }}>Paiement Stripe annulé. Votre panier et vos informations sont toujours là.</div> : null}
              {feedback ? <div style={{ background: "#FCE7DF", color: "#A8501B", borderRadius: 16, padding: "12px 14px", ...mono, fontSize: 10.5 }}>{feedback}</div> : null}
              <button type="submit" className="lbb-btn lbb-btn-primary" style={{ justifyContent: "center" }} disabled={isSubmitting || shippingResult.quoteRequired}>{isSubmitting ? "Validation..." : "Payer avec Stripe"}</button>
            </form>

            <aside className="lbb-sticky-panel" style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: 28, display: "grid", gap: 16, position: "sticky", top: 140 }}>
              <strong style={{ ...sans, fontWeight: 700, fontSize: 22, letterSpacing: "-.02em" }}>Récapitulatif</strong>
              {cartItems.map((item) => <div key={item.lineId} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 16, color: "#4E5647" }}><span>{item.quantity} × {item.name}{item.isGift ? " · OFFERT" : [item.selectedLength, item.selectedDrying].filter(Boolean).length ? ` · ${[item.selectedLength, item.selectedDrying].filter(Boolean).join(" · ")}` : ""}</span><strong style={{ color: "#23291F" }}>{formatPrice(item.price * item.quantity)}</strong></div>)}
              <div style={{ height: 1, background: "rgba(35,41,31,.08)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>Sous-total produits HT</span><strong>{formatPrice(totals.productsHt)}</strong></div>
              {promoResult.valid ? <div style={{ display: "flex", justifyContent: "space-between", gap: 16, color: "#5C7752" }}><span>Code {promoResult.code}</span><span>−{formatPrice(promoResult.amount)}</span></div> : null}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>TVA produits 10 %</span><strong>{formatPrice(totals.productsVat)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>Livraison HT</span><strong>{shippingResult.quoteRequired ? "Sur devis" : shippingResult.freeShipping ? "Offerte" : formatPrice(totals.shippingHt)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>TVA livraison 10 %</span><strong>{shippingResult.quoteRequired ? "Sur devis" : shippingResult.freeShipping ? "Offerte" : formatPrice(totals.shippingVat)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, ...mono, fontSize: 11, color: "#8A9180" }}><span>Total TVA 10 %</span><span>{formatPrice(totals.totalVat)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}><span style={{ ...sans, fontWeight: 700, fontSize: 18 }}>Total TTC</span><strong style={{ ...sans, fontWeight: 700, fontSize: 30 }}>{formatPrice(totals.totalTtc)}</strong></div>
              <form onSubmit={handleApplyPromo} style={{ display: "flex", gap: 8 }}>
                <input value={promoInput} onChange={(event) => setPromoInput(event.target.value)} placeholder="Code promo" className="lbb-admin-input" style={{ flex: 1, minHeight: 40 }} />
                {promoCode ? <button type="button" onClick={handleRemovePromo} className="lbb-btn lbb-btn-secondary lbb-btn-small">Retirer</button> : <button type="submit" className="lbb-btn lbb-btn-secondary lbb-btn-small">Appliquer</button>}
              </form>
              {promoCode && !promoResult.valid && promoResult.message ? <p style={{ ...mono, fontSize: 10.5, color: "#A8501B", margin: 0 }}>{promoResult.message}</p> : null}
              <Link to={defaultCategoryPath} className="lbb-btn lbb-btn-secondary" style={{ justifyContent: "center" }}>Ajouter un autre produit</Link>
              <ServiceUpsellSection siteProducts={siteProducts} cartItems={cartItems} addToCart={addToCart} title="Services encore ajoutables" description="Le panier reste modifiable jusqu'à la validation finale de la commande." />
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function StripeCheckoutConfirmationPage({ onConfirmStripeCheckout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasStartedRef = useRef(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get("session_id");
    if (!sessionId || hasStartedRef.current) {
      if (!sessionId) {
        setFeedback("Session Stripe introuvable.");
      }
      return;
    }

    hasStartedRef.current = true;
    onConfirmStripeCheckout(sessionId)
      .then((order) => {
        navigate(`/commande/confirmation/${order.id}`, { replace: true });
      })
      .catch((error) => {
        setFeedback(error.message);
      });
  }, [location.search, navigate, onConfirmStripeCheckout]);

  return (
    <main>
      <section style={{ ...pageShell, paddingTop: 44, paddingBottom: 100 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 32, padding: "48px 42px", display: "grid", gap: 18, boxShadow: "0 24px 54px -46px rgba(35,41,31,.5)" }}>
          <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#C05621" }}>Paiement Stripe</div>
          <h1 style={{ ...sans, fontWeight: 700, fontSize: "clamp(34px, 4vw, 48px)", lineHeight: 1.02, letterSpacing: "-.034em", margin: 0 }}>{feedback ? "Confirmation impossible" : "Validation du paiement en cours"}</h1>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "#4E5647" }}>{feedback || "Nous vérifions votre session Stripe avant de créer la commande."}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/commande" className="lbb-btn lbb-btn-secondary">Retour au checkout</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function CheckoutConfirmationPage({ account, defaultCategoryPath }) {
  const { orderId } = useParams();
  const order = account?.orders?.find((item) => item.ref === orderId) || null;

  return (
    <main>
      <section style={{ ...pageShell, paddingTop: 44, paddingBottom: 100 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 32, padding: "48px 42px", display: "grid", gap: 18, boxShadow: "0 24px 54px -46px rgba(35,41,31,.5)" }}>
          <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#C05621" }}>Commande confirmée</div>
          <h1 style={{ ...sans, fontWeight: 700, fontSize: "clamp(34px, 4vw, 48px)", lineHeight: 1.02, letterSpacing: "-.034em", margin: 0 }}>Merci, votre commande est enregistrée</h1>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "#4E5647" }}>Référence {orderId}{order ? ` · ${order.total}` : ""}</p>
          {order ? <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: "#4E5647" }}>Statut {order.status} · {order.date}</p> : null}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/compte" className="lbb-btn lbb-btn-primary">Voir mon espace client</Link>
            <Link to={defaultCategoryPath} className="lbb-btn lbb-btn-secondary">Retour au catalogue</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function AccountPage({ account, accountStatus, onLogin, onRegister, onLogout }) {
  const [tab, setTab] = useState("dashboard");

  if (accountStatus === "loading") {
    return (
      <main>
        <section style={{ ...pageShell, paddingTop: 48, paddingBottom: 96 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: 28, ...mono, fontSize: 11.5, color: "#8A9180" }}>Chargement du compte client...</div>
        </section>
      </main>
    );
  }

  if (!account) {
    return (
      <main>
        <section style={{ ...pageShell, paddingTop: 40, paddingBottom: 90 }}>
          <CustomerAuthCard title="Espace client" description="Connectez-vous pour suivre vos commandes, revoir vos créneaux et retrouver vos informations de livraison." onLogin={onLogin} onRegister={onRegister} />
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="lbb-account-layout" style={{ ...pageShell, paddingTop: 34, paddingBottom: 90, alignItems: "start" }}>
        <aside className="lbb-sticky-panel" style={{ maxWidth: 300, minWidth: 0, display: "grid", gap: 14, position: "sticky", top: 140 }}>
          <div style={{ background: "#23291F", color: "#E7EBDD", borderRadius: 26, padding: "24px 24px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18 }}>
              <span style={{ width: 44, height: 44, borderRadius: 999, background: "#C05621", color: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", ...sans, fontWeight: 700, fontSize: 15 }}>{account.initials}</span>
              <span style={{ display: "grid", gap: 3 }}>
                <span style={{ ...sans, fontWeight: 700, fontSize: 17, letterSpacing: "-.02em", color: "#F4F7EC" }}>{account.customer}</span>
                <span style={{ ...mono, fontSize: 10, letterSpacing: ".06em", color: "#9AA391" }}>{account.memberSince ? `Cliente depuis ${account.memberSince}` : "Compte client actif"}</span>
              </span>
            </div>
            <div style={{ display: "grid", gap: 8, ...mono, fontSize: 10.5, letterSpacing: ".05em", color: "#9AA391" }}>
              <span style={{ color: "#C05621" }}>{account.activeOrderStatus || "Suivi client actif"}</span>
              <span>{account.activeOrderHeadline || "Retrouvez ici vos commandes, livraisons et informations utiles."}</span>
            </div>
          </div>
          <nav style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 26, padding: 12, display: "grid", gap: 2 }}>
            {[
              ["dashboard", "Tableau de bord", "Actif"],
              ["orders", "Commandes", `${account.orders.length}`],
              ["deliveries", "Livraisons", `${account.deliveries.length}`]
            ].map(([id, label, badge]) => (
              <button key={id} type="button" onClick={() => setTab(id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left", cursor: "pointer", border: 0, background: tab === id ? "#F3E5D8" : "transparent", color: tab === id ? "#23291F" : "#4E5647", borderRadius: 16, padding: "14px 16px", ...sans, fontWeight: tab === id ? 700 : 600, fontSize: 14.5, letterSpacing: "-.01em" }}>
                {label}
                <span style={{ ...mono, fontSize: 10, letterSpacing: ".05em", color: tab === id ? "#5B321D" : "#A8AE9C" }}>{badge}</span>
              </button>
            ))}
          </nav>
        </aside>
        <div style={{ minWidth: 0, display: "grid", gap: 20 }}>
          <div>
            <div style={{ ...mono, fontSize: 11, letterSpacing: ".08em", color: "#C05621", marginBottom: 12 }}>{tab === "dashboard" ? "Vue générale" : tab === "orders" ? "Historique" : "Créneaux"}</div>
            <h1 style={{ ...sans, fontWeight: 700, fontSize: "clamp(32px, 3.3vw, 44px)", lineHeight: 1.03, letterSpacing: "-.034em", margin: "0 0 12px" }}>{tab === "dashboard" ? "Votre espace client" : tab === "orders" ? "Vos commandes" : "Vos livraisons"}</h1>
            <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: "#4E5647", maxWidth: "62ch", margin: 0 }}>Retrouvez vos commandes, vos créneaux de livraison et vos informations de contact.</p>
              <button type="button" className="lbb-btn lbb-btn-secondary" onClick={onLogout}>Déconnexion</button>
            </div>
          </div>
          {tab === "dashboard" && <AccountDashboard account={account} />}
          {tab === "orders" && <AccountOrders account={account} />}
          {tab === "deliveries" && <AccountDeliveries account={account} />}
        </div>
      </section>
    </main>
  );
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const session = readAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session?.token) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const payload = await apiRequest("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      persistAdminSession({
        ...payload.admin,
        token: payload.token,
        loginAt: new Date().toISOString()
      });
      navigate("/admin", { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="lbb-admin-auth-shell">
      <section className="lbb-admin-auth-card">
        <div style={{ display: "grid", gap: 16 }}>
          <span style={{ ...mono, fontSize: 11, letterSpacing: ".12em", color: "#C05621" }}>BACK OFFICE PRIVE</span>
          <div style={{ display: "grid", gap: 10 }}>
            <h1 style={{ ...sans, fontWeight: 700, fontSize: "clamp(34px, 5vw, 58px)", lineHeight: 0.95, letterSpacing: "-.045em", margin: 0 }}>Pilotage admin<br />La Belle Buche</h1>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: "#5C6455", maxWidth: "42ch" }}>Connexion separee du site public, sans header storefront, pour gerer catalogue, medias, categories, commandes et clients depuis un espace dedie.</p>
          </div>
          <div className="lbb-admin-auth-notes">
            <div>
              <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>ACCES</span>
              <strong style={{ ...sans, fontSize: 16 }}>Authentification admin backend</strong>
            </div>
            <div>
              <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>SCOPE</span>
              <strong style={{ ...sans, fontSize: 16 }}>Catalogue, ventes, CRM, medias</strong>
            </div>
            <div>
              <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>ENVIRONNEMENT</span>
              <strong style={{ ...sans, fontSize: 16 }}>Session admin signee cote serveur</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.08)", borderRadius: 28, padding: "28px 28px 26px", display: "grid", gap: 16, boxShadow: "0 24px 54px -42px rgba(35,41,31,.45)" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>IDENTIFICATION</span>
            <strong style={{ ...sans, fontWeight: 700, fontSize: 24, letterSpacing: "-.03em" }}>Connexion admin</strong>
          </div>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email admin" className="lbb-admin-input" autoComplete="username" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" type="password" className="lbb-admin-input" autoComplete="current-password" />
          {error ? <div style={{ background: "#FCE7DF", color: "#A8501B", borderRadius: 16, padding: "12px 14px", ...mono, fontSize: 10.5 }}>{error}</div> : null}
          <button type="submit" className="lbb-btn lbb-btn-primary" style={{ justifyContent: "center" }} disabled={isSubmitting}>{isSubmitting ? "Connexion..." : "Entrer dans le back office"}</button>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", ...mono, fontSize: 10.5, color: "#8A9180" }}>
            <span>Session admin persistante dans le navigateur</span>
            <Link to="/" style={{ color: "#5B321D" }}>Retour au site</Link>
          </div>
        </form>
      </section>
    </main>
  );
}

function createProductDraft(categories, settings, creationMode = "product") {
  const serviceCategory = categories.find((category) => category.slug === "services");
  return {
    name: "",
    desc: "",
    categoryId: creationMode === "service" ? (serviceCategory?.id || categories[0]?.id || "") : (categories[0]?.id || ""),
    price: "",
    oldPrice: "",
    stockQty: "",
    length: "",
    drying: "",
    availableLengths: [],
    lengthPrices: {},
    availableDryingDurations: [],
    humidity: "",
    imageUrl: "",
    unit: "",
    status: "active"
  };
}

function createProductDraftFromProduct(categories, product, settings) {
  const availableLengths = product?.availableLengths?.length ? product.availableLengths : [product?.length].filter(Boolean);
  return {
    name: product?.name || "",
    desc: product?.desc || "",
    categoryId: getCategoryForProduct(categories, product?.id)?.id || product?.categoryId || categories[0]?.id || "",
    price: product?.price ?? "",
    oldPrice: product?.oldPrice ?? "",
    stockQty: product?.stockQty ?? "",
    length: product?.length || "",
    drying: product?.drying || "",
    availableLengths,
    lengthPrices: availableLengths.reduce((accumulator, length) => ({
      ...accumulator,
      [length]: product?.lengthPrices?.[length] ?? product?.price ?? ""
    }), {}),
    availableDryingDurations: product?.availableDryingDurations?.length ? product.availableDryingDurations : [product?.drying].filter(Boolean),
    humidity: product?.humidity || "",
    imageUrl: product?.imageUrl || "",
    unit: product?.unit || "",
    status: product?.status || "active"
  };
}

function createCategoryDraft(productOptions) {
  return {
    id: "",
    slug: "",
    label: "",
    kicker: "Essence seche disponible",
    heading: "",
    description: "",
    shortDescription: "",
    imageUrl: "",
    coverProductId: "",
    essences: [],
    productIds: []
  };
}

function AdminPill({ children, tone = "neutral" }) {
  const toneMap = {
    neutral: { background: "#F3EEE4", color: "#786F61" },
    success: { background: "#E6EFE4", color: "#5C7752" },
    warning: { background: "#F7E8DD", color: "#A45D33" },
    dark: { background: "#5B321D", color: "#FFF8F0" }
  };
  const palette = toneMap[tone] || toneMap.neutral;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", minHeight: 24, borderRadius: 999, padding: "0 10px", background: palette.background, color: palette.color, ...mono, fontSize: 10, letterSpacing: ".03em" }}>
      {children}
    </span>
  );
}

function AdminMetricCard({ label, value, detail }) {
  return (
    <div className="lbb-admin-surface lbb-admin-metric-card">
      <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#9A8F80" }}>{label}</span>
      <strong style={{ ...sans, fontSize: 30, fontWeight: 700, letterSpacing: "-.04em", color: "#2E241C" }}>{value}</strong>
      <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "#7A6F63" }}>{detail}</span>
    </div>
  );
}

function AdminPageHeader({ title, actions }) {
  return (
    <div className="lbb-admin-page-header">
      <div style={{ display: "grid", gap: 8 }}>
        <h1 style={{ ...sans, fontWeight: 700, fontSize: "clamp(30px, 3vw, 42px)", lineHeight: 1.04, letterSpacing: "-.04em", margin: 0, color: "#2C241D" }}>{title}</h1>
      </div>
      {actions ? <div className="lbb-admin-page-actions">{actions}</div> : null}
    </div>
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const session = readAdminSession();
  const location = useLocation();
  const [adminState, setAdminState] = useState({
    profile: null,
    stats: [],
    categories: [],
    settings: defaultProductOptionSettings,
    products: [],
    orders: [],
    customers: [],
    deliveries: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  if (!session?.token) {
    return <Navigate to="/admin/login" replace />;
  }

  async function loadAdmin() {
    setIsLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/admin/bootstrap");
      setAdminState(data);
      return true;
    } catch (loadError) {
      if (loadError.message.toLowerCase().includes("session admin invalide") || loadError.message.toLowerCase().includes("expiree")) {
        clearAdminSession();
        navigate("/admin/login", { replace: true });
      }
      setError(loadError.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    let retryHandle;

    async function loadWithRetry(attempt = 0) {
      const ok = await loadAdmin();
      if (ok || !isMounted) return;
      if (attempt < 8) {
        retryHandle = window.setTimeout(() => {
          loadWithRetry(attempt + 1);
        }, 1200);
      }
    }

    loadWithRetry();

    return () => {
      isMounted = false;
      if (retryHandle) {
        window.clearTimeout(retryHandle);
      }
    };
  }, []);

  async function handleCreateProduct(productDraft) {
    await apiRequest("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(productDraft)
    });
    await loadAdmin();
    navigate("/admin/products", { replace: true });
  }

  async function handleUpdateProduct(productId, productDraft) {
    await apiRequest(`/api/admin/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify(productDraft)
    });
    await loadAdmin();
    navigate("/admin/products", { replace: true });
  }

  async function handleDeleteProduct(productId) {
    await apiRequest(`/api/admin/products/${productId}`, {
      method: "DELETE"
    });
    await loadAdmin();
  }

  async function handleStockUpdate(productId, stockQty) {
    await apiRequest(`/api/admin/products/${productId}/stock`, {
      method: "PATCH",
      body: JSON.stringify({ stockQty })
    });
    await loadAdmin();
  }

  async function handleOrderUpdate(orderId, nextStatus) {
    const statusLabelMap = {
      pending: "En attente",
      paid: "Paiement validé",
      partial_refund: "Remboursement partiel"
    };
    await apiRequest(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus, statusLabel: statusLabelMap[nextStatus] || nextStatus })
    });
    await loadAdmin();
  }

  async function handleOrderFulfillmentUpdate(orderId, nextFulfillment) {
    const fulfillmentLabelMap = {
      pending: "En attente",
      preparing: "Préparation",
      ready: "Commande prête"
    };
    await apiRequest(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ fulfillment: nextFulfillment, fulfillmentLabel: fulfillmentLabelMap[nextFulfillment] || nextFulfillment })
    });
    await loadAdmin();
  }

  async function handleCreateCategory(categoryDraft) {
    await apiRequest("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify(categoryDraft)
    });
    await loadAdmin();
    navigate("/admin/categories", { replace: true });
  }

  async function handleCategoryUpdate(categoryId, categoryPatch) {
    await apiRequest(`/api/admin/categories/${categoryId}`, {
      method: "PUT",
      body: JSON.stringify(categoryPatch)
    });
    await loadAdmin();
  }

  async function handleDeleteCategory(categoryId) {
    await apiRequest(`/api/admin/categories/${categoryId}`, {
      method: "DELETE"
    });
    await loadAdmin();
  }

  async function handleSettingsUpdate(settingsDraft) {
    await apiRequest("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(settingsDraft)
    });
    await loadAdmin();
  }

  function handleLogout() {
    clearAdminSession();
    navigate("/admin/login", { replace: true });
  }

  const lowStockProducts = adminState.products.filter((product) => product.isLowStock);
  const pendingOrders = adminState.orders.filter((order) => order.status === "pending");
  const activeProducts = adminState.products.filter((product) => product.status === "active");
  const avgDeliveryProgress = adminState.deliveries.length
    ? Math.round(adminState.deliveries.reduce((sum, delivery) => sum + Number(delivery.progress || 0), 0) / adminState.deliveries.length)
    : 0;
  const navGroups = [
    {
      label: "Tableau de bord",
      items: [{ to: "/admin", label: "Vue d'ensemble", badge: `${pendingOrders.length}`, end: true }]
    },
    {
      label: "Catalogue",
      items: [
        { to: "/admin/products", label: "Produits", badge: `${adminState.products.length}` },
        { to: "/admin/categories", label: "Categories", badge: `${adminState.categories.length}` }
      ]
    },
    {
      label: "Boutique",
      items: [
        { to: "/admin/orders", label: "Commandes", badge: `${adminState.orders.length}` },
        { to: "/admin/customers", label: "Clients", badge: `${adminState.customers.length}` }
      ]
    },
    {
      label: "Parametres",
      items: [{ to: "/admin/settings", label: "Parametres", badge: "Config" }]
    }
  ];
  const flatNavItems = navGroups.flatMap((group) => group.items);
  const activeItem = flatNavItems.find((item) => (item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)));

  return (
    <main className="lbb-admin-shell">
      <section className="lbb-admin-topbar">
        <div className="lbb-admin-topbar-inner" style={{ ...adminShell, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, paddingTop: 18, paddingRight: 24, paddingBottom: 18, paddingLeft: 24, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 5 }}>
            <span style={{ ...mono, fontSize: 10, letterSpacing: ".09em", color: "#9D8A73" }}>BACK OFFICE</span>
            <strong style={{ ...sans, fontWeight: 700, fontSize: 26, letterSpacing: "-.03em", color: "#2C241D" }}>{activeItem?.label || "La Belle Buche"}</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="lbb-admin-status-pill">{pendingOrders.length} a traiter</div>
            <div className="lbb-admin-status-pill">{lowStockProducts.length} stock critique</div>
            <Link to="/" className="lbb-btn lbb-btn-secondary">Voir le site</Link>
            <button type="button" className="lbb-btn lbb-btn-primary" onClick={handleLogout}>Deconnexion</button>
          </div>
        </div>
      </section>

      <section className="lbb-admin-layout" style={{ ...adminShell, paddingTop: 28, paddingRight: 24, paddingBottom: 90, paddingLeft: 24, alignItems: "start" }}>
        <aside className="lbb-admin-sidebar">
          <div className="lbb-admin-sidebar-brand">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="lbb-admin-sidebar-logo">LB</span>
              <span style={{ display: "grid", gap: 2 }}>
                <strong style={{ ...sans, fontSize: 18, fontWeight: 700, letterSpacing: "-.03em", color: "#2C241D" }}>La Belle Buche</strong>
                <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#A38F76" }}>Admin</span>
              </span>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ ...sans, fontSize: 14.5, color: "#4F4338" }}>{adminState.profile?.name || "Chargement"}</strong>
              <span style={{ ...mono, fontSize: 10, color: "#9A8F80" }}>{session.email}</span>
            </div>
          </div>

          <nav className="lbb-admin-nav">
            {navGroups.map((group) => (
              <div key={group.label} className="lbb-admin-nav-group">
                <div className="lbb-admin-nav-group-title">{group.label}</div>
                {group.items.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `lbb-admin-nav-link${isActive ? " is-active" : ""}`}>
                    <span>{item.label}</span>
                    <span className="lbb-admin-nav-badge">{item.badge}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="lbb-admin-sidebar-actions">
            <Link to="/admin/products/new" className="lbb-btn lbb-btn-primary" style={{ justifyContent: "center" }}>Nouveau produit</Link>
            <Link to="/admin/products/new-service" className="lbb-btn lbb-btn-secondary" style={{ justifyContent: "center" }}>Nouveau service</Link>
            <Link to="/admin/categories/new" className="lbb-btn lbb-btn-secondary" style={{ justifyContent: "center" }}>Nouvelle categorie</Link>
          </div>

        </aside>

        <div className="lbb-admin-main">
          {error ? <div className="lbb-admin-alert">API admin indisponible: {error}. Lance aussi `npm run dev:api`.</div> : null}
          {isLoading ? <div className="lbb-admin-surface" style={{ padding: 28, ...mono, fontSize: 11.5, color: "#8A9180" }}>Chargement du CMS admin…</div> : null}
          {!isLoading && (
            <Routes>
              <Route index element={<AdminDashboard stats={adminState.stats} orders={adminState.orders} deliveries={adminState.deliveries} products={adminState.products} categories={adminState.categories} customers={adminState.customers} onStockUpdate={handleStockUpdate} onNavigate={navigate} />} />
              <Route path="products" element={<AdminProductsIndex products={adminState.products} categories={adminState.categories} onStockUpdate={handleStockUpdate} onDeleteProduct={handleDeleteProduct} />} />
              <Route path="products/new" element={<AdminProductCreatePage categories={adminState.categories} settings={adminState.settings} onCreateProduct={handleCreateProduct} creationMode="product" />} />
              <Route path="products/new-service" element={<AdminProductCreatePage categories={adminState.categories} settings={adminState.settings} onCreateProduct={handleCreateProduct} creationMode="service" />} />
              <Route path="products/:productId/edit" element={<AdminProductEditPage categories={adminState.categories} settings={adminState.settings} products={adminState.products} onUpdateProduct={handleUpdateProduct} />} />
              <Route path="categories" element={<AdminCategoriesIndex categories={adminState.categories} products={adminState.products} onUpdateCategory={handleCategoryUpdate} onDeleteCategory={handleDeleteCategory} />} />
              <Route path="categories/new" element={<AdminCategoryCreatePage products={adminState.products} onCreateCategory={handleCreateCategory} />} />
              <Route path="orders" element={<AdminOrders orders={adminState.orders} onOrderUpdate={handleOrderUpdate} onOrderFulfillmentUpdate={handleOrderFulfillmentUpdate} />} />
              <Route path="orders/:orderId" element={<AdminOrderDetail orders={adminState.orders} customers={adminState.customers} products={adminState.products} deliveries={adminState.deliveries} onOrderUpdate={handleOrderUpdate} onOrderFulfillmentUpdate={handleOrderFulfillmentUpdate} />} />
              <Route path="customers" element={<AdminCustomers customers={adminState.customers} />} />
              <Route path="settings" element={<AdminSettings session={session} profile={adminState.profile} settings={adminState.settings} categories={adminState.categories} products={adminState.products} customers={adminState.customers} onLogout={handleLogout} onUpdateSettings={handleSettingsUpdate} />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          )}
        </div>
      </section>
    </main>
  );
}

function AdminDashboard({ stats, orders, deliveries, products, categories, customers, onStockUpdate, onNavigate }) {
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const paidOrders = orders.filter((order) => order.status === "paid");
  const lowStockProducts = products.filter((product) => product.isLowStock).slice(0, 4);
  const topCategories = categories.slice(0, 4);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <AdminPageHeader
        title="Vue d'ensemble"
        actions={[
          <Link key="new-product" to="/admin/products/new" className="lbb-btn lbb-btn-primary">Nouveau produit</Link>,
          <Link key="new-service" to="/admin/products/new-service" className="lbb-btn lbb-btn-secondary">Nouveau service</Link>,
          <button key="open-orders" type="button" className="lbb-btn lbb-btn-secondary" onClick={() => onNavigate("/admin/orders")}>Voir les commandes</button>
        ]}
      />
      <div className="lbb-admin-kpis">
        {stats.map((stat) => <AdminMetricCard key={stat.label} label={stat.label} value={stat.value} detail={stat.detail} />)}
      </div>
      <div className="lbb-admin-summary-grid">
        <div className="lbb-admin-surface" style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ ...sans, fontWeight: 700, fontSize: 20, letterSpacing: "-.02em", color: "#2C241D" }}>Pilotage rapide</span>
            <AdminPill tone="dark">{paidOrders.length} commandes payees</AdminPill>
          </div>
          <div className="lbb-admin-quick-grid">
            <AdminMetricCard label="Commandes payees" value={String(paidOrders.length)} detail="reglements valides" />
            <AdminMetricCard label="Clients suivis" value={String(customers.length)} detail="fiches disponibles" />
            <AdminMetricCard label="Categories live" value={String(categories.length)} detail="navigation active" />
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[`${pendingOrders.length} commande(s) a confirmer ou preparer.`, `${lowStockProducts.length} reference(s) sous seuil.`, deliveries.length > 0 ? `${deliveries.length} tournee(s) a suivre.` : "Aucune tournee a suivre."].map((item) => (
              <div key={item} className="lbb-admin-list-row"><span>{item}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="lbb-two-col" style={{ alignItems: "start" }}>
        <div className="lbb-admin-surface" style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}><span style={{ ...sans, fontWeight: 700, fontSize: 20, letterSpacing: "-.02em", color: "#2C241D" }}>Commandes recentes</span><Link to="/admin/orders" className="lbb-btn lbb-btn-secondary lbb-btn-small">Ouvrir</Link></div>
          <div className="lbb-admin-table">
            <div className="lbb-admin-table-head">Commande</div><div className="lbb-admin-table-head">Client</div><div className="lbb-admin-table-head">Statut</div><div className="lbb-admin-table-head">Créneau</div>
            {orders.slice(0, 5).map((order) => <AdminRow key={order.id} cells={[<strong style={{ ...sans, fontSize: 15 }}>{order.id}</strong>, <span>{order.customer}</span>, <AdminPill tone={order.status === "pending" ? "warning" : "success"}>{order.statusLabel}</AdminPill>, <span style={{ ...mono, fontSize: 10.5 }}>{order.slot}</span>]} />)}
          </div>
        </div>
        <div style={{ display: "grid", gap: 18 }}>
          <div className="lbb-admin-surface" style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}><span style={{ ...sans, fontWeight: 700, fontSize: 20, color: "#2C241D" }}>Tournees</span><AdminPill>{deliveries.length} active{deliveries.length > 1 ? "s" : ""}</AdminPill></div>
            <div style={{ display: "grid", gap: 12 }}>{deliveries.map((delivery) => <div key={delivery.truck} className="lbb-admin-list-row"><span style={{ display: "grid", gap: 4 }}><strong style={{ ...sans, fontSize: 15.5, color: "#2C241D" }}>{delivery.truck} · {delivery.driver}</strong><span style={{ fontSize: 14.5, color: "#786F61" }}>{delivery.zone}</span></span><span style={{ ...mono, fontSize: 10.5, color: "#A78968" }}>{delivery.nextStop}</span></div>)}</div>
            {deliveries.length === 0 ? <span style={{ ...mono, fontSize: 10.5, color: "#7A6A55" }}>Aucune tournee active.</span> : null}
          </div>
          <div className="lbb-admin-surface lbb-admin-surface-soft" style={{ display: "grid", gap: 12 }}>
            <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#A8501B" }}>Alertes stock</span>
            {lowStockProducts.map((product) => <div key={product.id} className="lbb-admin-list-row"><span style={{ display: "grid", gap: 3 }}><span style={{ ...sans, fontWeight: 700, fontSize: 15, color: "#2C241D" }}>{product.name}</span><span style={{ ...mono, fontSize: 10, color: "#7A6A55" }}>{product.stockLabel}</span></span><button type="button" className="lbb-btn lbb-btn-small lbb-btn-secondary" onClick={() => onStockUpdate(product.id, product.stockQty + 50)}>+50</button></div>)}
            {lowStockProducts.length === 0 ? <span style={{ ...mono, fontSize: 10.5, color: "#7A6A55" }}>Aucune alerte stock immediate.</span> : null}
          </div>
        </div>
      </div>
      <div className="lbb-two-col" style={{ alignItems: "start" }}>
        <div className="lbb-admin-surface" style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}><span style={{ ...sans, fontWeight: 700, fontSize: 20, color: "#2C241D" }}>Categories</span><Link to="/admin/categories" className="lbb-btn lbb-btn-secondary lbb-btn-small">Gerer</Link></div>
          <div style={{ display: "grid", gap: 12 }}>{topCategories.map((category) => <div key={category.id} className="lbb-admin-list-row"><span style={{ display: "grid", gap: 4 }}><strong style={{ ...sans, fontSize: 16, color: "#2C241D" }}>{category.label}</strong><span style={{ ...mono, fontSize: 10.5, color: "#8A9180" }}>{category.count} · {category.from}</span></span><AdminPill>{category.slug}</AdminPill></div>)}</div>
        </div>
        <div className="lbb-admin-surface" style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}><span style={{ ...sans, fontWeight: 700, fontSize: 20, color: "#2C241D" }}>Clients</span><Link to="/admin/customers" className="lbb-btn lbb-btn-secondary lbb-btn-small">CRM</Link></div>
          <div style={{ display: "grid", gap: 12 }}>{customers.slice(0, 4).map((customer) => <div key={customer.email || customer.name} className="lbb-admin-list-row"><span style={{ display: "grid", gap: 4 }}><strong style={{ ...sans, fontSize: 16, color: "#2C241D" }}>{customer.name || customer.customer}</strong><span style={{ ...mono, fontSize: 10.5, color: "#8A9180" }}>{customer.email || customer.city || "Fiche client locale"}</span></span><AdminPill tone="success">{customer.orders} cmd</AdminPill></div>)}</div>
        </div>
      </div>
    </div>
  );
}

function AdminProductCreatePage({ categories, settings, onCreateProduct, creationMode = "product" }) {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <AdminPageHeader title={creationMode === "service" ? "Ajouter un service" : "Ajouter un produit"} actions={[<Link key="back" to="/admin/products" className="lbb-btn lbb-btn-secondary">Retour au catalogue</Link>]} />
      <ProductEditorForm categories={categories} settings={settings} onSubmitProduct={onCreateProduct} submitLabel={creationMode === "service" ? "Publier le service" : "Publier le produit"} successContext="creation" creationMode={creationMode} />
    </div>
  );
}

function AdminProductEditPage({ categories, settings, products, onUpdateProduct }) {
  const { productId } = useParams();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <AdminPageHeader title="Produit introuvable" actions={[<Link key="back" to="/admin/products" className="lbb-btn lbb-btn-secondary">Retour au catalogue</Link>]} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <AdminPageHeader title={`Modifier ${product.name}`} actions={[<Link key="back" to="/admin/products" className="lbb-btn lbb-btn-secondary">Retour au catalogue</Link>]} />
      <ProductEditorForm categories={categories} settings={settings} initialProduct={product} onSubmitProduct={(payload) => onUpdateProduct(product.id, payload)} submitLabel="Enregistrer les modifications" successContext="edition" />
    </div>
  );
}

function ProductEditorForm({ categories, settings, initialProduct = null, onSubmitProduct, submitLabel, successContext, creationMode = "product" }) {
  const productSettings = useMemo(() => normalizeProductOptionSettings(settings), [settings]);
  const [draft, setDraft] = useState(() => initialProduct ? createProductDraftFromProduct(categories, initialProduct, productSettings) : createProductDraft(categories, productSettings, creationMode));
  const [feedback, setFeedback] = useState("");
  const selectedCategory = categories.find((category) => category.id === draft.categoryId) || null;
  const isAccessoryCategory = selectedCategory?.slug === "accessoires";
  const isServiceCategory = selectedCategory?.slug === "services";
  const isServiceCreation = !initialProduct && creationMode === "service";
  const configuredLengths = uniqueByValue([draft.length, ...productSettings.productOptions.lengths]);
  const configuredDryingDurations = uniqueByValue([draft.drying, ...productSettings.productOptions.dryingDurations]);

  useEffect(() => {
    if (!categories.length) return;
    setDraft(initialProduct ? createProductDraftFromProduct(categories, initialProduct, productSettings) : createProductDraft(categories, productSettings, creationMode));
  }, [categories, initialProduct, productSettings, creationMode]);

  function resetDraft() {
    setDraft(initialProduct ? createProductDraftFromProduct(categories, initialProduct, productSettings) : createProductDraft(categories, productSettings, creationMode));
    setFeedback("");
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateLengthPrice(length, value) {
    setDraft((current) => ({
      ...current,
      lengthPrices: {
        ...(current.lengthPrices || {}),
        [length]: value
      }
    }));
  }

  function toggleDraftOption(field, value) {
    setDraft((current) => {
      const values = Array.isArray(current[field]) ? current[field] : [];
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

      const nextDraft = { ...current, [field]: nextValues };
      if (field === "availableLengths") {
        nextDraft.length = nextValues[0] || "";
        nextDraft.lengthPrices = nextValues.reduce((accumulator, option) => ({
          ...accumulator,
          [option]: current.lengthPrices?.[option] ?? current.price ?? ""
        }), {});
      }
      if (field === "availableDryingDurations") {
        nextDraft.drying = nextValues[0] || "";
      }
      return nextDraft;
    });
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await readFileAsDataUrl(file);
      setDraft((current) => ({ ...current, imageUrl }));
      setFeedback(`Photo importee : ${file.name}`);
    } catch {
      setFeedback("Impossible d'importer la photo du produit.");
    } finally {
      event.target.value = "";
    }
  }

  async function submitDraft(event) {
    event.preventDefault();
    setFeedback("");
    try {
      const slug = initialProduct?.slug || slugify(draft.name);
      const id = initialProduct?.id || slugify(draft.name);
      const nextLength = isAccessoryCategory || isServiceCategory ? draft.length : draft.availableLengths[0] || draft.length || "";
      const nextDrying = isAccessoryCategory || isServiceCategory ? draft.drying : draft.availableDryingDurations[0] || draft.drying || "";
      const categoryType = isServiceCategory ? "services" : isAccessoryCategory ? "accessoires" : "bois-de-chauffage";
      const familyLabel = selectedCategory?.label || (isServiceCategory ? "Service" : "Bois de chauffage");
      const normalizedLengthPrices = !isAccessoryCategory && !isServiceCategory
        ? draft.availableLengths.reduce((accumulator, length) => {
            const value = Number(draft.lengthPrices?.[length]);
            accumulator[length] = Number.isFinite(value) ? value : Number(draft.price || 0);
            return accumulator;
          }, {})
        : {};
      const submittedPrice = !isAccessoryCategory && !isServiceCategory
        ? (nextLength ? (normalizedLengthPrices[nextLength] ?? Number(draft.price || 0)) : Number(draft.price || 0))
        : draft.price;
      await onSubmitProduct({
        id,
        slug,
        name: draft.name,
        desc: isServiceCategory ? "" : draft.desc,
        price: submittedPrice,
        oldPrice: isServiceCategory ? "" : draft.oldPrice,
        stockQty: isServiceCategory ? 0 : draft.stockQty,
        length: nextLength,
        drying: nextDrying,
        availableLengths: draft.availableLengths,
        lengthPrices: normalizedLengthPrices,
        availableDryingDurations: draft.availableDryingDurations,
        imageUrl: isServiceCategory ? "" : draft.imageUrl,
        unit: draft.unit,
        category: categoryType,
        categoryId: draft.categoryId,
        family: familyLabel,
        essence: familyLabel,
        humidity: isAccessoryCategory || isServiceCategory ? "" : draft.humidity,
        status: draft.status
      });
      setFeedback(successContext === "edition" ? (isServiceCategory ? "Service mis a jour." : "Produit mis a jour.") : (isServiceCategory ? "Service cree." : "Produit cree."));
    } catch (createError) {
      setFeedback(createError.message);
    }
  }

  if (!categories.length) {
    return (
      <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: "24px 26px", display: "grid", gap: 14 }}>
        <strong style={{ ...sans, fontSize: 21, letterSpacing: "-.024em", color: "#2C241D" }}>Aucune categorie disponible</strong>
        <div><Link to="/admin/categories/new" className="lbb-btn lbb-btn-primary">Creer une categorie</Link></div>
      </div>
    );
  }

  return (
    <form onSubmit={submitDraft} style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: "24px 26px", display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}><span style={{ ...sans, fontWeight: 700, fontSize: 21, letterSpacing: "-.024em" }}>{initialProduct ? (isServiceCategory ? "Modifier le service" : "Modifier le produit") : isServiceCreation ? "Creer un service" : "Creer un produit"}</span></div>
      <div style={{ display: "grid", gap: 14 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>{isServiceCategory ? "TITRE DU SERVICE" : "NOM DU PRODUIT"}</span>
          <input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder={isServiceCategory ? "Ex: Rangement du bois" : "Ex: Chene premium"} className="lbb-admin-input" required />
        </label>
        {!isServiceCategory ? <label style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>DESCRIPTION</span>
          <textarea value={draft.desc} onChange={(event) => updateDraft("desc", event.target.value)} placeholder="Ex: Bois sec prêt pour une chauffe régulière, coupe propre et livraison locale." className="lbb-admin-input" style={{ minHeight: 110, resize: "vertical" }} />
        </label> : null}
        {!isServiceCreation ? <label style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>CATEGORIE</span>
          <select value={draft.categoryId} onChange={(event) => updateDraft("categoryId", event.target.value)} className="lbb-admin-select" required>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </select>
        </label> : null}
        {isAccessoryCategory ? (
          <>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>TAILLE</span>
              <input value={draft.length} onChange={(event) => updateDraft("length", event.target.value)} placeholder="Ex: 33 cm" className="lbb-admin-input" required />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>DUREE DE SECHAGE</span>
              <input value={draft.drying} onChange={(event) => updateDraft("drying", event.target.value)} placeholder="Ex: Seche 18 mois" className="lbb-admin-input" required />
            </label>
          </>
        ) : null}
        {!isAccessoryCategory && !isServiceCategory ? (
          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>PRIX HT DE BASE</span>
              <input value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} placeholder="Ex: 119" type="number" step="0.01" min="0" className="lbb-admin-input" required />
            </label>
            <div className="lbb-two-col" style={{ alignItems: "start", gap: 14 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>TAILLES DISPONIBLES SUR LA FICHE PRODUIT</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {configuredLengths.map((option) => {
                  const active = draft.availableLengths.includes(option);
                  return <button key={option} type="button" onClick={() => toggleDraftOption("availableLengths", option)} style={{ ...mono, fontSize: 11, letterSpacing: ".04em", padding: "10px 14px", borderRadius: 999, cursor: "pointer", border: `1px solid ${active ? "#5B321D" : "rgba(35,41,31,.16)"}`, background: active ? "#5B321D" : "#FFFFFF", color: active ? "#FBF6EE" : "#4E5647" }}>{option}</button>;
                })}
              </div>
              <span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>Options proposées depuis les parametres admin. Aucune taille selectionnee = pas de choix client.</span>
              <span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>Par defaut sur la fiche: {draft.availableLengths[0] || "-"}</span>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>SECHAGES DISPONIBLES SUR LA FICHE PRODUIT</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {configuredDryingDurations.map((option) => {
                  const active = draft.availableDryingDurations.includes(option);
                  return <button key={option} type="button" onClick={() => toggleDraftOption("availableDryingDurations", option)} style={{ ...mono, fontSize: 11, letterSpacing: ".04em", padding: "10px 14px", borderRadius: 999, cursor: "pointer", border: `1px solid ${active ? "#5B321D" : "rgba(35,41,31,.16)"}`, background: active ? "#5B321D" : "#FFFFFF", color: active ? "#FBF6EE" : "#4E5647" }}>{option}</button>;
                })}
              </div>
              <span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>Options proposées depuis les parametres admin. Aucun sechage selectionne = pas de choix client.</span>
              <span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>Par defaut sur la fiche: {draft.availableDryingDurations[0] || "-"}</span>
            </div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>PRIX HT PAR TAILLE</span>
              {draft.availableLengths.length === 0 ? <span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>Aucune taille selectionnee. Le prix de base sera utilise tel quel.</span> : null}
              {draft.availableLengths.map((lengthOption) => (
                <label key={lengthOption} style={{ display: "grid", gap: 6 }}>
                  <span style={{ ...mono, fontSize: 10.5, color: "#4E5647" }}>{lengthOption}</span>
                  <input value={draft.lengthPrices?.[lengthOption] ?? ""} onChange={(event) => updateLengthPrice(lengthOption, event.target.value)} placeholder="Ex: 129" type="number" step="0.01" min="0" className="lbb-admin-input" required />
                </label>
              ))}
            </div>
          </div>
        ) : null}
        {isServiceCategory ? (
          <div style={{ background: "#F7F4EA", borderRadius: 18, padding: "14px 16px", ...mono, fontSize: 10.5, letterSpacing: ".04em", color: "#7A6A55" }}>
            Les services n'affichent pas de choix de longueur ni de séchage côté client.
          </div>
        ) : null}
        {(isAccessoryCategory || isServiceCategory) ? <label style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>PRIX HT</span>
          <input value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} placeholder="Ex: 119" type="number" step="0.01" min="0" className="lbb-admin-input" required />
        </label> : null}
        {!isServiceCategory ? <label style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>PRIX REMISE HT</span>
          <input value={draft.oldPrice} onChange={(event) => updateDraft("oldPrice", event.target.value)} placeholder="Ex: 139" type="number" step="0.01" min="0" className="lbb-admin-input" />
        </label> : null}
        {!isServiceCategory ? <label style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>STOCK</span>
          <input value={draft.stockQty} onChange={(event) => updateDraft("stockQty", event.target.value)} placeholder="Ex: 120" type="number" min="0" className="lbb-admin-input" required />
        </label> : null}
        {!isAccessoryCategory && !isServiceCategory ? <label style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>HUMIDITÉ (optionnel)</span>
          <input value={draft.humidity} onChange={(event) => updateDraft("humidity", event.target.value)} placeholder="Ex: 16 % humidité" className="lbb-admin-input" />
          <span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>Affiché sur la fiche produit et la carte. Laisse vide si non mesuré.</span>
        </label> : null}
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>UNITÉ DE VENTE</span>
          <input value={draft.unit} onChange={(event) => updateDraft("unit", event.target.value)} placeholder={isServiceCategory ? "Ex: / prestation TTC" : isAccessoryCategory ? "Ex: / boîte de 12" : "Ex: / stère"} className="lbb-admin-input" />
          <span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>Affichée à côté du prix (ex: / stère, / boîte, / sac, / kg). Laisse vide pour "/ stère" par défaut.</span>
        </label>
        {!isServiceCategory ? <label style={{ display: "grid", gap: 8 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>PHOTO DU PRODUIT</span>
          {draft.imageUrl ? <img src={draft.imageUrl} alt="Apercu produit" style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 18, border: "1px solid rgba(35,41,31,.12)", background: "#F3EEE4" }} /> : <div style={{ width: 160, height: 160, borderRadius: 18, border: "1px dashed rgba(35,41,31,.18)", background: "#FBFAF5", display: "grid", placeItems: "center", color: "#8A9180", ...mono, fontSize: 10.5, letterSpacing: ".05em" }}>AUCUNE PHOTO</div>}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="lbb-admin-input" />
          <span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>Aucune image automatique ne sera injectee si tu laisses ce champ vide.</span>
        </label> : null}
      </div>
      {feedback ? <div style={{ background: "#FCE7DF", color: "#A8501B", borderRadius: 16, padding: "12px 14px", ...mono, fontSize: 10.5, letterSpacing: ".04em" }}>{feedback}</div> : null}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button type="submit" className="lbb-btn lbb-btn-primary">{submitLabel}</button><button type="button" className="lbb-btn lbb-btn-secondary" onClick={resetDraft}>{initialProduct ? "Revenir aux valeurs actuelles" : "Vider"}</button></div>
    </form>
  );
}

function AdminProductsIndex({ products: adminProducts, categories, onStockUpdate, onDeleteProduct }) {
  const [query, setQuery] = useState("");

  function getCategoryLabel(productId) {
    return categories.find((category) => category.productIds.includes(productId))?.label || "Non classe";
  }

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return adminProducts;

    return adminProducts.filter((product) => [product.name, product.sku, getCategoryLabel(product.id)].join(" ").toLowerCase().includes(normalizedQuery));
  }, [adminProducts, query, categories]);

  async function handleDeleteClick(product) {
    if (!window.confirm(`Supprimer ${product.name} du catalogue ?`)) {
      return;
    }

    await onDeleteProduct(product.id);
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <AdminPageHeader title="Produits" actions={[
        <Link key="new-product" to="/admin/products/new" className="lbb-btn lbb-btn-primary">Nouveau produit</Link>,
        <Link key="new-service" to="/admin/products/new-service" className="lbb-btn lbb-btn-secondary">Nouveau service</Link>
      ]} />
      <div className="lbb-admin-quick-grid">
        <AdminMetricCard label="Produits actifs" value={String(adminProducts.filter((product) => product.status === "active").length)} detail="publies" />
        <AdminMetricCard label="Brouillons" value={String(adminProducts.filter((product) => product.status === "draft").length)} detail="en attente" />
        <AdminMetricCard label="Stock bas" value={String(adminProducts.filter((product) => product.isLowStock).length)} detail="a reapprovisionner" />
      </div>
      <div className="lbb-admin-surface" style={{ display: "grid", gap: 18 }}>
        <div className="lbb-admin-toolbar">
          <div style={{ display: "grid", gap: 4 }}><span style={{ ...sans, fontWeight: 700, fontSize: 21, letterSpacing: "-.024em", color: "#2C241D" }}>Catalogue publie</span><span style={{ ...mono, fontSize: 11, color: "#8A9180" }}>{filteredProducts.length} reference(s)</span></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un produit..." className="lbb-admin-search" />
            <Link to="/admin/products/new" className="lbb-btn lbb-btn-primary">+ Nouveau produit</Link>
            <Link to="/admin/products/new-service" className="lbb-btn lbb-btn-secondary">+ Nouveau service</Link>
          </div>
        </div>
        <div className="lbb-admin-table lbb-admin-table-products-cms">
          <div className="lbb-admin-table-head">Produit</div><div className="lbb-admin-table-head">Categorie</div><div className="lbb-admin-table-head">Prix HT</div><div className="lbb-admin-table-head">Stock</div><div className="lbb-admin-table-head">Etat</div><div className="lbb-admin-table-head">Actions</div>
          {filteredProducts.map((product) => <AdminRow key={product.id} className="lbb-admin-table-products-cms" cells={[
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>{product.image ? <img src={product.image} alt={product.name} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 12, background: "#F3EEE4" }} /> : <span style={{ width: 44, height: 44, borderRadius: 12, border: "1px dashed rgba(35,41,31,.18)", background: "#FBFAF5", display: "grid", placeItems: "center", ...mono, fontSize: 9, color: "#8A9180" }}>PHOTO</span>}<span style={{ display: "grid", gap: 3 }}><strong style={{ ...sans, fontSize: 15, color: "#2C241D" }}>{product.name}</strong><span style={{ ...mono, fontSize: 10, color: "#A0917E" }}>{product.sku}</span></span></span>,
            <AdminPill>{getCategoryLabel(product.id)}</AdminPill>,
            <strong style={{ ...sans, fontSize: 15, color: "#2C241D" }}>{formatPrice(product.price)}</strong>,
            <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><AdminPill tone={product.isLowStock ? "warning" : "success"}>{product.stockLabel}</AdminPill><button type="button" className="lbb-btn lbb-btn-small lbb-btn-secondary" onClick={() => onStockUpdate(product.id, product.stockQty + 10)}>+10</button></span>,
            <AdminPill tone={product.isLowStock ? "warning" : "success"}>{product.isLowStock ? "Stock bas" : product.status === "active" ? "Publie" : "Brouillon"}</AdminPill>,
            <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link to={product.slug ? `/produit/${product.slug}` : "/admin/products"} className="lbb-btn lbb-btn-secondary lbb-btn-small">Voir</Link><Link to={`/admin/products/${product.id}/edit`} className="lbb-btn lbb-btn-small lbb-btn-primary">Modifier</Link><button type="button" className="lbb-btn lbb-btn-small lbb-btn-secondary" onClick={() => handleDeleteClick(product)}>Supprimer</button></span>
          ]} />)}
        </div>
      </div>
    </div>
  );
}

function AdminCategoryCreatePage({ products: productOptions, onCreateCategory }) {
  const [draft, setDraft] = useState(() => createCategoryDraft(productOptions));
  const [feedback, setFeedback] = useState("");
  const selectedProducts = useMemo(
    () => productOptions.filter((product) => draft.productIds.includes(product.id)),
    [draft.productIds, productOptions]
  );
  const imageCandidates = selectedProducts.filter((product) => product.image);

  function updateDraft(field, value) {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === "label") {
        const slug = slugify(value);
        if (!current.id) next.id = `cat_${slug}`;
        if (!current.slug) next.slug = slug;
        next.heading = value;
      }
      return next;
    });
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await readFileAsDataUrl(file);
      setDraft((current) => ({ ...current, imageUrl, coverProductId: "" }));
      setFeedback(`Photo importee : ${file.name}`);
    } catch {
      setFeedback("Impossible d'importer la photo de la categorie.");
    } finally {
      event.target.value = "";
    }
  }


  function toggleProduct(categoryProductId) {
    setDraft((current) => {
      const productIds = current.productIds.includes(categoryProductId)
        ? current.productIds.filter((productId) => productId !== categoryProductId)
        : [...current.productIds, categoryProductId];
      return {
        ...current,
        productIds,
        coverProductId: current.coverProductId && productIds.includes(current.coverProductId) ? current.coverProductId : ""
      };
    });
  }

  async function submitDraft(event) {
    event.preventDefault();
    await onCreateCategory({
      ...draft,
      id: draft.id || `cat_${slugify(draft.label)}`,
      slug: draft.slug || slugify(draft.label),
      heading: draft.label,
      shortDescription: draft.shortDescription || `${selectedProducts.length} produit(s) relies`,
      coverProductId: draft.coverProductId,
      essences: uniqueByValue(selectedProducts.map((product) => product.family || product.essence).filter(Boolean)),
      productIds: draft.productIds
    });
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <AdminPageHeader title="Ajouter une categorie" actions={[<Link key="back" to="/admin/categories" className="lbb-btn lbb-btn-secondary">Retour aux categories</Link>]} />
      <div className="lbb-admin-summary-grid">
        <form onSubmit={submitDraft} style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: "24px 26px", display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}><span style={{ ...sans, fontWeight: 700, fontSize: 21, letterSpacing: "-.024em" }}>Creer une categorie</span></div>
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>NOM DE LA CATEGORIE</span>
              <input value={draft.label} onChange={(event) => updateDraft("label", event.target.value)} placeholder="Ex: Bois sec premium" className="lbb-admin-input" required />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>DESCRIPTION</span>
              <textarea value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} placeholder="Quelques mots pour decrire la categorie" className="lbb-admin-input" style={{ minHeight: 110, resize: "vertical" }} />
            </label>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>PRODUITS A RATTACHER</span>
            <div style={{ display: "grid", gap: 10 }}>
              {productOptions.map((product) => {
                const active = draft.productIds.includes(product.id);
                return <button key={product.id} type="button" onClick={() => toggleProduct(product.id)} style={{ border: active ? "1px solid rgba(91,50,29,.45)" : "1px solid rgba(35,41,31,.09)", background: active ? "#F3E5D8" : "#FFFFFF", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, cursor: "pointer", textAlign: "left" }}><span style={{ display: "flex", alignItems: "center", gap: 12 }}>{product.image ? <img src={product.image} alt={product.name} style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover", background: "#F3EEE4" }} /> : <span style={{ width: 42, height: 42, borderRadius: 12, border: "1px dashed rgba(35,41,31,.18)", background: "#FBFAF5", display: "grid", placeItems: "center", ...mono, fontSize: 9, color: "#8A9180" }}>PHOTO</span>}<span style={{ display: "grid", gap: 3 }}><strong style={{ ...sans, fontSize: 15, color: "#2C241D" }}>{product.name}</strong><span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>{formatPrice(product.price)} · {product.id}</span></span></span><AdminPill tone={active ? "success" : "neutral"}>{active ? "Relie" : "Selectionner"}</AdminPill></button>;
              })}
            </div>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>PHOTO DE CATEGORIE</span>
            {draft.imageUrl ? <img src={draft.imageUrl} alt="Apercu categorie" style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 18, border: "1px solid rgba(35,41,31,.12)", background: "#F3EEE4" }} /> : <div style={{ width: 160, height: 160, borderRadius: 18, border: "1px dashed rgba(35,41,31,.18)", background: "#FBFAF5", display: "grid", placeItems: "center", color: "#8A9180", ...mono, fontSize: 10.5, letterSpacing: ".05em" }}>AUCUNE PHOTO</div>}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="lbb-admin-input" />
            {draft.imageUrl ? <button type="button" className="lbb-btn lbb-btn-secondary lbb-btn-small" style={{ width: "fit-content" }} onClick={() => updateDraft("imageUrl", "")}>Retirer la photo</button> : null}
            {feedback ? <div style={{ ...mono, fontSize: 10, color: "#8A9180" }}>{feedback}</div> : null}
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>VISUEL DE SECOURS (SI AUCUNE PHOTO)</span>
            <div style={{ display: "grid", gap: 10 }}>
              <button type="button" onClick={() => updateDraft("coverProductId", "")} style={{ border: draft.coverProductId ? "1px solid rgba(35,41,31,.09)" : "1px solid rgba(91,50,29,.45)", background: draft.coverProductId ? "#FFFFFF" : "#F3E5D8", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, cursor: "pointer", textAlign: "left" }}>
                <span style={{ display: "grid", gap: 3 }}>
                  <strong style={{ ...sans, fontSize: 15, color: "#2C241D" }}>Aucun visuel</strong>
                  <span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>La categorie restera sans image tant qu'aucun visuel n'est choisi.</span>
                </span>
                <AdminPill tone={draft.coverProductId ? "neutral" : "success"}>{draft.coverProductId ? "Choisir" : "Actif"}</AdminPill>
              </button>
              {imageCandidates.length === 0 ? <div style={{ ...mono, fontSize: 10.5, color: "#8A9180" }}>Selectionne un produit avec une vraie image pour l'utiliser comme visuel de categorie.</div> : null}
              {imageCandidates.map((product) => {
                const active = draft.coverProductId === product.id;
                return <button key={product.id} type="button" onClick={() => updateDraft("coverProductId", product.id)} style={{ border: active ? "1px solid rgba(91,50,29,.45)" : "1px solid rgba(35,41,31,.09)", background: active ? "#F3E5D8" : "#FFFFFF", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, cursor: "pointer", textAlign: "left" }}><span style={{ display: "flex", alignItems: "center", gap: 12 }}><img src={product.image} alt={product.name} style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", background: "#F3EEE4" }} /><span style={{ display: "grid", gap: 3 }}><strong style={{ ...sans, fontSize: 15, color: "#2C241D" }}>{product.name}</strong><span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>{product.id}</span></span></span><AdminPill tone={active ? "success" : "neutral"}>{active ? "Actif" : "Choisir"}</AdminPill></button>;
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button type="submit" className="lbb-btn lbb-btn-primary">Publier la categorie</button><button type="button" className="lbb-btn lbb-btn-secondary" onClick={() => setDraft(createCategoryDraft(productOptions))}>Vider</button></div>
        </form>
      </div>
    </div>
  );
}

function AdminCategoriesIndex({ categories, products: productOptions, onUpdateCategory, onDeleteCategory }) {
  const [edits, setEdits] = useState({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    setEdits(Object.fromEntries(categories.map((category) => [category.id, { slug: category.slug, imageUrl: category.imageUrl || "", description: category.description || "", heading: category.heading || "" }])));
  }, [categories]);

  function updateEdit(categoryId, field, value) {
    setEdits((current) => ({ ...current, [categoryId]: { ...current[categoryId], [field]: value } }));
  }

  async function handleImageUpload(categoryId, event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await readFileAsDataUrl(file);
      updateEdit(categoryId, "imageUrl", imageUrl);
    } finally {
      event.target.value = "";
    }
  }

  async function handleDeleteClick(category) {
    if (category.slug === "services") {
      window.alert("La categorie systeme des services ne peut pas etre supprimee.");
      return;
    }

    if (!window.confirm(`Supprimer la categorie ${category.label} ? Les produits resteront actifs mais ne seront plus relies a cette categorie.`)) {
      return;
    }

    await onDeleteCategory(category.id);
  }

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return categories;
    return categories.filter((category) => [category.label, category.slug, category.heading].join(" ").toLowerCase().includes(normalizedQuery));
  }, [categories, query]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <AdminPageHeader title="Categories" actions={[<Link key="new" to="/admin/categories/new" className="lbb-btn lbb-btn-primary">Ajouter une categorie</Link>]} />
      <div className="lbb-admin-quick-grid">
        <AdminMetricCard label="Pages categories" value={String(categories.length)} detail="en ligne" />
        <AdminMetricCard label="Produits lies" value={String(categories.reduce((sum, category) => sum + category.productIds.length, 0))} detail="liaisons actives" />
        <AdminMetricCard label="Templates cover" value={String(productOptions.length)} detail="visuels disponibles" />
      </div>
      <div className="lbb-admin-surface" style={{ display: "grid", gap: 18 }}>
        <div className="lbb-admin-toolbar"><span style={{ ...sans, fontWeight: 700, fontSize: 21, letterSpacing: "-.024em", color: "#2C241D" }}>Pages categories publiees</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une categorie..." className="lbb-admin-search" /></div>
        <div className="lbb-admin-table lbb-admin-table-categories-cms">
          <div className="lbb-admin-table-head">Categorie</div><div className="lbb-admin-table-head">Slug</div><div className="lbb-admin-table-head">Titre (page)</div><div className="lbb-admin-table-head">Description</div><div className="lbb-admin-table-head">Photo</div><div className="lbb-admin-table-head">Produits</div><div className="lbb-admin-table-head">Apercu</div><div className="lbb-admin-table-head">Action</div>
          {filteredCategories.map((category) => <AdminRow key={category.id} className="lbb-admin-table-categories-cms" cells={[
            <span style={{ display: "grid", gap: 3 }}><strong style={{ ...sans, fontSize: 15 }}>{category.label}</strong><span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>{category.heading}</span></span>,
            <input value={edits[category.id]?.slug || ""} onChange={(event) => updateEdit(category.id, "slug", event.target.value)} className="lbb-admin-input" style={{ minHeight: 40 }} />,
            <input value={edits[category.id]?.heading || ""} onChange={(event) => updateEdit(category.id, "heading", event.target.value)} placeholder="Titre affiche en haut de la page categorie" className="lbb-admin-input" style={{ minHeight: 40 }} />,
            <textarea value={edits[category.id]?.description || ""} onChange={(event) => updateEdit(category.id, "description", event.target.value)} placeholder="Quelques mots pour decrire la categorie" className="lbb-admin-input" style={{ minHeight: 60, resize: "vertical", fontSize: 13 }} />,
            <span style={{ display: "grid", gap: 8 }}>
              {edits[category.id]?.imageUrl ? <img src={edits[category.id].imageUrl} alt={category.label} style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", background: "#F3EEE4" }} /> : <span style={{ width: 48, height: 48, borderRadius: 12, border: "1px dashed rgba(35,41,31,.18)", background: "#FBFAF5", display: "grid", placeItems: "center", ...mono, fontSize: 9, color: "#8A9180" }}>PHOTO</span>}
              <input type="file" accept="image/*" onChange={(event) => handleImageUpload(category.id, event)} className="lbb-admin-input" style={{ minHeight: 36, fontSize: 10.5 }} />
            </span>,
            <span style={{ display: "grid", gap: 6 }}>{productOptions.filter((product) => category.productIds.includes(product.id)).slice(0, 3).map((product) => <span key={product.id} style={{ fontSize: 14.5, color: "#4E5647" }}>{product.name}</span>)}<span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>{category.productIds.length} produit(s) relies</span></span>,
            <Link to={getCategoryHref(category.slug)} className="lbb-btn lbb-btn-secondary lbb-btn-small">Voir page</Link>,
            <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="lbb-btn lbb-btn-small lbb-btn-primary" onClick={() => onUpdateCategory(category.id, { ...category, slug: edits[category.id]?.slug || category.slug, imageUrl: edits[category.id]?.imageUrl ?? category.imageUrl, description: edits[category.id]?.description ?? category.description, heading: edits[category.id]?.heading || category.heading })}>Sauver</button>
              <button type="button" className="lbb-btn lbb-btn-small lbb-btn-secondary" onClick={() => handleDeleteClick(category)}>Supprimer</button>
            </span>
          ]} />)}
        </div>
      </div>
    </div>
  );
}

function AdminOrders({ orders, onOrderUpdate, onOrderFulfillmentUpdate }) {
  const [query, setQuery] = useState("");
  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return orders;
    return orders.filter((order) => [order.id, order.customer, order.channel, order.statusLabel, order.fulfillmentLabel].join(" ").toLowerCase().includes(normalizedQuery));
  }, [orders, query]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <AdminPageHeader title="Commandes" />
      <div className="lbb-admin-surface" style={{ display: "grid", gap: 18 }}>
        <div className="lbb-admin-toolbar"><div style={{ display: "grid", gap: 4 }}><span style={{ ...sans, fontWeight: 700, fontSize: 21, letterSpacing: "-.024em", color: "#2C241D" }}>Commandes récentes</span><span style={{ ...mono, fontSize: 11, color: "#8A9180" }}>{filteredOrders.length} commande(s)</span></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une commande..." className="lbb-admin-search" /></div>
        <div style={{ display: "grid", gap: 0 }}>
          <div className="lbb-admin-orders-row lbb-admin-orders-head">
            <div className="lbb-admin-table-head">Commande</div>
            <div className="lbb-admin-table-head">Canal</div>
            <div className="lbb-admin-table-head">Paiement</div>
            <div className="lbb-admin-table-head">Préparation</div>
            <div className="lbb-admin-table-head">Total</div>
          </div>
          {filteredOrders.map((order) => (
            <div key={order.id} className="lbb-admin-orders-row">
              <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                <span style={{ display: "grid", gap: 3 }}>
                  <strong style={{ ...sans, fontSize: 15, color: "#2C241D" }}>{order.id}</strong>
                  <span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>{order.customer}</span>
                  <span style={{ ...mono, fontSize: 10, color: "#A0917E" }}>{formatDateTime(order.createdAt)}</span>
                </span>
                <Link to={`/admin/orders/${order.id}`} className="lbb-btn lbb-btn-secondary lbb-btn-small" style={{ width: "fit-content" }}>Voir le détail</Link>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}><AdminPill>{order.channel}</AdminPill></div>
              <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                <AdminPill tone={order.status === "pending" ? "warning" : order.status === "partial_refund" ? "neutral" : "success"}>{order.statusLabel}</AdminPill>
                <select value={order.status} onChange={(event) => onOrderUpdate(order.id, event.target.value)} className="lbb-admin-select">{orderStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              </div>
              <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
                <AdminPill tone={order.fulfillment === "ready" || order.fulfillment === "delivery" ? "success" : order.fulfillment === "done" ? "dark" : order.fulfillment === "preparing" ? "warning" : "neutral"}>{order.fulfillmentLabel}</AdminPill>
                <select value={order.fulfillment === "scheduled" ? "pending" : order.fulfillment === "delivery" ? "ready" : order.fulfillment} onChange={(event) => onOrderFulfillmentUpdate(order.id, event.target.value)} className="lbb-admin-select">{fulfillmentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}><strong style={{ ...sans, fontSize: 24, color: "#2C241D", letterSpacing: "-.02em" }}>{formatPrice(order.total)}</strong></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminOrderDetail({ orders, customers, products, deliveries, onOrderUpdate, onOrderFulfillmentUpdate }) {
  const { orderId } = useParams();
  const order = orders.find((item) => item.id === orderId);
  const customer = customers.find((item) => item.id === order?.customerId || item.name === order?.customer);
  const items = useMemo(() => buildOrderItems(order || {}, products), [order, products]);
  const timeline = useMemo(() => buildOrderTimeline(order || {}), [order]);
  const statusTone = getOrderStatusTone(order?.status);
  const fulfillmentTone = getFulfillmentTone(order?.fulfillment);
  const delivery = deliveries.find((item) => item.truck === order?.deliveryTruck) || null;
  const itemsSubtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const shippingAmount = Number(order?.shippingAmount ?? Math.max(Number(order?.total || 0) - itemsSubtotal, 0));
  const taxAmount = Number(order?.taxAmount ?? Number(order?.total || 0) / 6);

  if (!order) {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <AdminPageHeader title="Commande introuvable" actions={[<Link key="back" to="/admin/orders" className="lbb-btn lbb-btn-secondary">Retour aux commandes</Link>]} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <AdminPageHeader
        title={`Commande ${order.id}`}
        actions={[
          <Link key="back" to="/admin/orders" className="lbb-btn lbb-btn-secondary">Retour aux commandes</Link>,
          <Link key="customer" to="/admin/customers" className="lbb-btn lbb-btn-primary">Voir le CRM</Link>
        ]}
      />

      <div className="lbb-admin-kpis">
        <div style={{ background: statusTone.background, color: statusTone.color, borderRadius: 22, padding: 22, display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", opacity: 0.8 }}>PAIEMENT</span>
          <strong style={{ ...sans, fontSize: 26, letterSpacing: "-.03em" }}>{order.statusLabel}</strong>
          <span style={{ fontSize: 15 }}>{order.paymentMethod || "Mode de paiement local"}</span>
        </div>
        <div style={{ background: fulfillmentTone.background, color: fulfillmentTone.color, borderRadius: 22, padding: 22, display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", opacity: 0.8 }}>LOGISTIQUE</span>
          <strong style={{ ...sans, fontSize: 26, letterSpacing: "-.03em" }}>{order.fulfillmentLabel}</strong>
          <span style={{ fontSize: 15 }}>{order.slot}</span>
        </div>
        <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 22, padding: 22, display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>TOTAL</span>
          <strong style={{ ...sans, fontSize: 26, letterSpacing: "-.03em" }}>{formatPrice(order.total)}</strong>
          <span style={{ fontSize: 15, color: "#4E5647" }}>{items.reduce((sum, item) => sum + item.quantity, 0)} ligne(s) et un canal {order.channel.toLowerCase()}</span>
        </div>
      </div>

      <div className="lbb-admin-summary-grid" style={{ alignItems: "start" }}>
        <div style={{ display: "grid", gap: 20 }}>
          <section style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: "26px 28px", display: "grid", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "baseline" }}>
              <span style={{ ...sans, fontWeight: 700, fontSize: 21, letterSpacing: "-.024em" }}>Lignes de commande</span>
              <span style={{ ...mono, fontSize: 10.5, color: "#8A9180" }}>{formatDateTime(order.createdAt)}</span>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((item) => (
                <div key={`${item.sku}-${item.name}`} style={{ display: "grid", gap: 8, background: "#FBFAF5", border: "1px solid rgba(35,41,31,.06)", borderRadius: 20, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "baseline" }}>
                    <span style={{ display: "grid", gap: 4 }}>
                      <strong style={{ ...sans, fontSize: 18, letterSpacing: "-.02em" }}>{item.name}</strong>
                      <span style={{ ...mono, fontSize: 10.5, color: "#8A9180" }}>{item.sku}</span>
                    </span>
                    <strong style={{ ...sans, fontSize: 22, letterSpacing: "-.02em" }}>{formatPrice(item.total)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", fontSize: 15.5, color: "#4E5647" }}>
                    <span>{item.quantity} × {formatPrice(item.unitPrice)}</span>
                    <span>{item.note || order.slot}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gap: 10, background: "#F7F8F1", borderRadius: 20, padding: "20px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>Sous-total produits</span><strong>{formatPrice(itemsSubtotal)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>Livraison</span><strong>{shippingAmount === 0 ? "Offerte" : formatPrice(shippingAmount)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span>TVA estimée</span><strong>{formatPrice(taxAmount)}</strong></div>
              <div style={{ height: 1, background: "rgba(35,41,31,.08)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}><span style={{ ...sans, fontWeight: 700, fontSize: 18 }}>Total commande</span><strong style={{ ...sans, fontSize: 26, letterSpacing: "-.03em" }}>{formatPrice(order.total)}</strong></div>
            </div>
          </section>

          <section style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: "26px 28px", display: "grid", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "baseline" }}>
              <span style={{ ...sans, fontWeight: 700, fontSize: 21, letterSpacing: "-.024em" }}>Chronologie</span>
              <span style={{ ...mono, fontSize: 10.5, color: "#8A9180" }}>{timeline.length} etape(s)</span>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {timeline.map((step, index) => (
                <div key={`${step.label}-${index}`} style={{ display: "grid", gap: 5, paddingLeft: 18, borderLeft: "2px solid rgba(35,41,31,.12)" }}>
                  <span style={{ ...mono, fontSize: 10, letterSpacing: ".06em", color: "#8A9180" }}>{step.at ? new Date(step.at).toLocaleString("fr-FR") : "En cours"}</span>
                  <strong style={{ ...sans, fontSize: 17 }}>{step.label}</strong>
                  <span style={{ fontSize: 15.5, color: "#4E5647" }}>{step.detail}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <section style={{ background: "#23291F", color: "#F4F7EC", borderRadius: 28, padding: "26px 28px", display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#C05621" }}>ACTION RAPIDE</span>
              <strong style={{ ...sans, fontSize: 24, letterSpacing: "-.03em" }}>Pilotage de la commande</strong>
            </div>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".06em", color: "#A8AE9C" }}>Statut paiement</span>
              <select value={order.status} onChange={(event) => onOrderUpdate(order.id, event.target.value)} className="lbb-admin-select">
                {orderStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div style={{ display: "grid", gap: 10, fontSize: 15.5, color: "#F3E5D8" }}>
              <span>Référence paiement : {order.paymentReference || "À rattacher"}</span>
              <span>Instruction logistique : {order.logisticsNote || "Aucune instruction particulière."}</span>
              <span>Préparation : {order.fulfillmentLabel}</span>
            </div>
          </section>

          <section style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: "26px 28px", display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>ACTION RAPIDE</span>
              <strong style={{ ...sans, fontSize: 24, letterSpacing: "-.03em", color: "#2C241D" }}>Pilotage logistique</strong>
            </div>
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".06em", color: "#8A9180" }}>Statut logistique</span>
              <select value={order.fulfillment === "scheduled" ? "pending" : order.fulfillment === "delivery" ? "ready" : order.fulfillment} onChange={(event) => onOrderFulfillmentUpdate(order.id, event.target.value)} className="lbb-admin-select">
                {fulfillmentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </section>

          <section style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: "26px 28px", display: "grid", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ ...sans, fontWeight: 700, fontSize: 21, letterSpacing: "-.024em" }}>Client & livraison</span>
              <span style={{ ...mono, fontSize: 10.5, color: "#8A9180" }}>{customer?.orders || "-"} commande(s) connues</span>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <strong style={{ ...sans, fontSize: 18 }}>{customer?.name || order.customer}</strong>
                <span style={{ fontSize: 15.5, color: "#4E5647" }}>{customer?.email || order.contactEmail || "Email non renseigne"}</span>
                <span style={{ fontSize: 15.5, color: "#4E5647" }}>{customer?.phone || order.contactPhone || "Telephone non renseigne"}</span>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ background: "#F7F8F1", borderRadius: 18, padding: "16px 18px", whiteSpace: "pre-line", fontSize: 15.5, color: "#4E5647" }}>
                  {formatAddress(order.deliveryAddress)}
                </div>
                <div style={{ background: "#FBFAF5", borderRadius: 18, padding: "16px 18px", whiteSpace: "pre-line", fontSize: 15.5, color: "#7A6A55" }}>
                  {formatAddress(order.billingAddress)}
                </div>
              </div>
              {delivery ? <div style={{ background: "#F3E5D8", borderRadius: 18, padding: "16px 18px", display: "grid", gap: 6 }}><strong style={{ ...sans, fontSize: 17 }}>{delivery.truck} · {delivery.driver}</strong><span style={{ fontSize: 15.5, color: "#4E5647" }}>{delivery.zone}</span><span style={{ ...mono, fontSize: 10.5, color: "#5B321D" }}>Prochain point: {delivery.nextStop}</span></div> : null}
            </div>
          </section>

          <section style={{ background: "#F5EFE2", borderRadius: 28, padding: "26px 28px", display: "grid", gap: 12 }}>
            <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#A8501B" }}>NOTES INTERNES</span>
            <strong style={{ ...sans, fontSize: 21, letterSpacing: "-.024em" }}>{order.internalNoteTitle || "Consignes d'exploitation"}</strong>
            <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55, color: "#7A6A55" }}>{order.internalNote || "Ajouter ici les details depot, l'acces client, la manutention ou les remarques SAV."}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function AdminCustomers({ customers }) {
  const [query, setQuery] = useState("");
  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return customers;
    return customers.filter((customer) => [customer.name, customer.email, customer.city].join(" ").toLowerCase().includes(normalizedQuery));
  }, [customers, query]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <AdminPageHeader title="Clients" />
      <div className="lbb-admin-summary-grid">
        <div className="lbb-admin-surface" style={{ display: "grid", gap: 18 }}>
          <div className="lbb-admin-toolbar"><span style={{ ...sans, fontWeight: 700, fontSize: 21, letterSpacing: "-.024em", color: "#2C241D" }}>Clients recents</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un client..." className="lbb-admin-search" /></div>
          <div className="lbb-admin-table lbb-admin-table-customers"><div className="lbb-admin-table-head">Client</div><div className="lbb-admin-table-head">Ville</div><div className="lbb-admin-table-head">Commandes</div><div className="lbb-admin-table-head">Valeur</div>{filteredCustomers.map((customer) => <AdminRow key={customer.email} className="lbb-admin-table-customers" cells={[<span style={{ display: "grid", gap: 3 }}><strong style={{ ...sans, fontSize: 15, color: "#2C241D" }}>{customer.name}</strong><span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>{customer.email}</span></span>, <AdminPill>{customer.city}</AdminPill>, <AdminPill tone="success">{customer.orders} commandes</AdminPill>, <strong style={{ ...sans, fontSize: 15, color: "#2C241D" }}>{formatPrice(customer.lifetime)}</strong>]} />)}</div>
        </div>
      </div>
    </div>
  );
}

function AdminOptionListEditor({ title, items, draftValue, setDraftValue, onAdd, onRemove, presetOptions = [] }) {
  const availablePresets = presetOptions.filter((option) => !items.includes(option));

  return (
    <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
      <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>{title}</span>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (
          <div key={item} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#FBFAF5", border: "1px solid rgba(35,41,31,.08)", borderRadius: 16, padding: "12px 14px" }}>
            <span style={{ ...sans, fontWeight: 600, fontSize: 15, color: "#2C241D" }}>{item}</span>
            <button type="button" className="lbb-btn lbb-btn-small lbb-btn-secondary" onClick={() => onRemove(item)} disabled={items.length <= 1}>Retirer</button>
          </div>
        ))}
      </div>
      {availablePresets.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {availablePresets.map((option) => (
            <button key={option} type="button" onClick={() => onAdd(option)} style={{ ...mono, fontSize: 10.5, letterSpacing: ".05em", border: "1px solid rgba(35,41,31,.14)", background: "#FFFFFF", color: "#4E5647", borderRadius: 999, padding: "8px 12px", cursor: "pointer" }}>+ {option}</button>
          ))}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input value={draftValue} onChange={(event) => setDraftValue(event.target.value)} placeholder="Ajouter une valeur" className="lbb-admin-input" style={{ flex: "1 1 220px", minWidth: 0 }} />
        <button type="button" className="lbb-btn lbb-btn-primary" onClick={() => onAdd(draftValue)}>Ajouter</button>
      </div>
    </div>
  );
}

function AdminVolumeDiscountEditor({ categories, rules, onAdd, onRemove }) {
  const [label, setLabel] = useState("");
  const [categorySlugs, setCategorySlugs] = useState([]);
  const [buyQuantity, setBuyQuantity] = useState("4");
  const [freeQuantity, setFreeQuantity] = useState("1");

  function toggleCategory(slug) {
    setCategorySlugs((current) => (current.includes(slug) ? current.filter((value) => value !== slug) : [...current, slug]));
  }

  function handleAdd() {
    const buy = Math.round(Number(buyQuantity));
    const free = Math.round(Number(freeQuantity));
    if (!Number.isFinite(buy) || buy <= 0 || !Number.isFinite(free) || free <= 0) return;
    onAdd({
      label: label.trim() || `${buy} achetés = ${free} offert(s)`,
      categorySlugs,
      buyQuantity: buy,
      freeQuantity: free,
      active: true
    });
    setLabel("");
    setCategorySlugs([]);
  }

  function describeCategories(rule) {
    if (!rule.categorySlugs?.length) return "Toutes catégories";
    return rule.categorySlugs
      .map((slug) => categories.find((category) => category.slug === slug)?.label || slug)
      .join(", ");
  }

  return (
    <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
      <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>REMISES AUTOMATIQUES PAR VOLUME</span>
      <span style={{ fontSize: 14, color: "#6B7263" }}>Ex: "Achetez 4 stères, le 5e est offert" — les articles les moins chers du lot concerné sont offerts automatiquement dans le panier.</span>
      <div style={{ display: "grid", gap: 10 }}>
        {rules.length === 0 ? <span style={{ ...mono, fontSize: 10.5, color: "#8A9180" }}>Aucune remise automatique configurée.</span> : null}
        {rules.map((rule) => (
          <div key={rule.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#FBFAF5", border: "1px solid rgba(35,41,31,.08)", borderRadius: 16, padding: "12px 14px" }}>
            <span style={{ display: "grid", gap: 2 }}>
              <strong style={{ ...sans, fontWeight: 600, fontSize: 15, color: "#2C241D" }}>{rule.label}</strong>
              <span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>{describeCategories(rule)} · {rule.buyQuantity} achetés / {rule.freeQuantity} offert(s)</span>
            </span>
            <button type="button" className="lbb-btn lbb-btn-small lbb-btn-secondary" onClick={() => onRemove(rule.id)}>Retirer</button>
          </div>
        ))}
      </div>
      <div className="lbb-two-col" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Libellé (ex: 4 achetés = le 5e offert)" className="lbb-admin-input" />
        <input value={buyQuantity} onChange={(event) => setBuyQuantity(event.target.value)} type="number" min="1" placeholder="Quantité achetée" className="lbb-admin-input" />
        <input value={freeQuantity} onChange={(event) => setFreeQuantity(event.target.value)} type="number" min="1" placeholder="Quantité offerte" className="lbb-admin-input" />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>CATÉGORIES CONCERNÉES (aucune sélection = toutes catégories)</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {categories.map((category) => {
            const checked = categorySlugs.includes(category.slug);
            return (
              <label
                key={category.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "#2C241D",
                  border: `1px solid ${checked ? "#2C241D" : "rgba(35,41,31,.15)"}`,
                  background: checked ? "#2C241D0d" : "#FBFAF5",
                  borderRadius: 999,
                  padding: "6px 12px",
                  cursor: "pointer"
                }}
              >
                <input type="checkbox" checked={checked} onChange={() => toggleCategory(category.slug)} style={{ margin: 0 }} />
                {category.label}
              </label>
            );
          })}
        </div>
      </div>
      <button type="button" className="lbb-btn lbb-btn-primary" style={{ width: "fit-content" }} onClick={handleAdd}>Ajouter la remise</button>
    </div>
  );
}

function AdminPromoCodeEditor({ codes, onAdd, onRemove }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("10");
  const [minSubtotal, setMinSubtotal] = useState("0");

  function handleAdd() {
    const normalizedCode = code.trim().toUpperCase();
    const numericValue = Number(value);
    if (!normalizedCode || !Number.isFinite(numericValue) || numericValue <= 0) return;
    onAdd({
      code: normalizedCode,
      type,
      value: numericValue,
      minSubtotal: Math.max(0, Number(minSubtotal) || 0),
      active: true
    });
    setCode("");
    setValue("10");
    setMinSubtotal("0");
  }

  return (
    <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
      <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>CODES PROMO</span>
      <span style={{ fontSize: 14, color: "#6B7263" }}>Le client saisit ce code au panier ou au checkout pour obtenir la remise.</span>
      <div style={{ display: "grid", gap: 10 }}>
        {codes.length === 0 ? <span style={{ ...mono, fontSize: 10.5, color: "#8A9180" }}>Aucun code promo configuré.</span> : null}
        {codes.map((entry) => (
          <div key={entry.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#FBFAF5", border: "1px solid rgba(35,41,31,.08)", borderRadius: 16, padding: "12px 14px" }}>
            <span style={{ display: "grid", gap: 2 }}>
              <strong style={{ ...sans, fontWeight: 600, fontSize: 15, color: "#2C241D" }}>{entry.code}</strong>
              <span style={{ ...mono, fontSize: 10, color: "#8A9180" }}>{entry.type === "percent" ? `${entry.value} %` : formatPrice(entry.value)}{entry.minSubtotal > 0 ? ` · dès ${formatPrice(entry.minSubtotal)}` : ""}</span>
            </span>
            <button type="button" className="lbb-btn lbb-btn-small lbb-btn-secondary" onClick={() => onRemove(entry.code)}>Retirer</button>
          </div>
        ))}
      </div>
      <div className="lbb-two-col" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Code (ex: BIENVENUE10)" className="lbb-admin-input" style={{ textTransform: "uppercase" }} />
        <select value={type} onChange={(event) => setType(event.target.value)} className="lbb-admin-select">
          <option value="percent">Pourcentage</option>
          <option value="fixed">Montant fixe</option>
        </select>
        <input value={value} onChange={(event) => setValue(event.target.value)} type="number" min="0" step="0.01" placeholder={type === "percent" ? "Ex: 10 (%)" : "Ex: 15 (€)"} className="lbb-admin-input" />
        <input value={minSubtotal} onChange={(event) => setMinSubtotal(event.target.value)} type="number" min="0" step="0.01" placeholder="Panier minimum (€), 0 = aucun" className="lbb-admin-input" />
      </div>
      <button type="button" className="lbb-btn lbb-btn-primary" style={{ width: "fit-content" }} onClick={handleAdd}>Ajouter le code</button>
    </div>
  );
}

function AdminSettings({ session, profile, settings, categories, products, customers, onLogout, onUpdateSettings }) {
  const productSettings = useMemo(() => normalizeProductOptionSettings(settings), [settings]);
  const [adminName, setAdminName] = useState(profile?.name || "");
  const [lengths, setLengths] = useState(productSettings.productOptions.lengths);
  const [dryingDurations, setDryingDurations] = useState(productSettings.productOptions.dryingDurations);
  const [announcementPrimaryText, setAnnouncementPrimaryText] = useState(productSettings.announcementBar.primaryText);
  const [announcementSecondaryText, setAnnouncementSecondaryText] = useState(productSettings.announcementBar.secondaryText);
  const [announcementTertiaryText, setAnnouncementTertiaryText] = useState(productSettings.announcementBar.tertiaryText);
  const [announcementBackgroundColor, setAnnouncementBackgroundColor] = useState(productSettings.announcementBar.backgroundColor);
  const [announcementTextColor, setAnnouncementTextColor] = useState(productSettings.announcementBar.textColor);
  const [heroProofPrimaryText, setHeroProofPrimaryText] = useState(productSettings.heroProof.primaryText);
  const [heroProofSecondaryText, setHeroProofSecondaryText] = useState(productSettings.heroProof.secondaryText);
  const [heroProofTertiaryText, setHeroProofTertiaryText] = useState(productSettings.heroProof.tertiaryText);
  const [volumeDiscounts, setVolumeDiscounts] = useState(productSettings.promotions.volumeDiscounts);
  const [promoCodes, setPromoCodes] = useState(productSettings.promotions.promoCodes);
  const [lengthDraft, setLengthDraft] = useState("");
  const [dryingDraft, setDryingDraft] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setAdminName(profile?.name || "");
    setLengths(productSettings.productOptions.lengths);
    setDryingDurations(productSettings.productOptions.dryingDurations);
    setAnnouncementPrimaryText(productSettings.announcementBar.primaryText);
    setAnnouncementSecondaryText(productSettings.announcementBar.secondaryText);
    setAnnouncementTertiaryText(productSettings.announcementBar.tertiaryText);
    setAnnouncementBackgroundColor(productSettings.announcementBar.backgroundColor);
    setAnnouncementTextColor(productSettings.announcementBar.textColor);
    setHeroProofPrimaryText(productSettings.heroProof.primaryText);
    setHeroProofSecondaryText(productSettings.heroProof.secondaryText);
    setHeroProofTertiaryText(productSettings.heroProof.tertiaryText);
    setVolumeDiscounts(productSettings.promotions.volumeDiscounts);
    setPromoCodes(productSettings.promotions.promoCodes);
    setLengthDraft("");
    setDryingDraft("");
  }, [productSettings, profile]);

  function addOption(setter, resetter, value) {
    const normalized = String(value || "").trim();
    if (!normalized) return;
    setter((current) => current.includes(normalized) ? current : [...current, normalized]);
    resetter("");
  }

  function removeOption(setter, value, allowEmpty = false) {
    setter((current) => current.length <= 1 && !allowEmpty ? current : current.filter((item) => item !== value));
  }

  async function savePromotions(nextVolumeDiscounts, nextPromoCodes) {
    setFeedback("");
    try {
      await onUpdateSettings({ promotions: { volumeDiscounts: nextVolumeDiscounts, promoCodes: nextPromoCodes } });
      setFeedback("Promotions enregistrees.");
    } catch (updateError) {
      setFeedback(updateError.message);
    }
  }

  function addVolumeDiscount(rule) {
    const next = [...volumeDiscounts, { id: `vol_${Date.now().toString(36)}`, ...rule }];
    setVolumeDiscounts(next);
    savePromotions(next, promoCodes);
  }

  function removeVolumeDiscount(id) {
    const next = volumeDiscounts.filter((rule) => rule.id !== id);
    setVolumeDiscounts(next);
    savePromotions(next, promoCodes);
  }

  function addPromoCode(entry) {
    const next = [...promoCodes, entry];
    setPromoCodes(next);
    savePromotions(volumeDiscounts, next);
  }

  function removePromoCode(code) {
    const next = promoCodes.filter((entry) => entry.code !== code);
    setPromoCodes(next);
    savePromotions(volumeDiscounts, next);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback("");

    try {
      await onUpdateSettings({
        profile: {
          name: adminName
        },
        productOptions: {
          lengths,
          dryingDurations
        },
        announcementBar: {
          primaryText: announcementPrimaryText,
          secondaryText: announcementSecondaryText,
          tertiaryText: announcementTertiaryText,
          backgroundColor: announcementBackgroundColor,
          textColor: announcementTextColor
        },
        heroProof: {
          primaryText: heroProofPrimaryText,
          secondaryText: heroProofSecondaryText,
          tertiaryText: heroProofTertiaryText
        },
        promotions: {
          volumeDiscounts,
          promoCodes
        }
      });
      setFeedback("Nom admin, bandeaux, textes accueil et promotions enregistres.");
    } catch (updateError) {
      setFeedback(updateError.message);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <AdminPageHeader title="Parametres et acces" />
      <div className="lbb-admin-summary-grid">
        <div className="lbb-admin-surface" style={{ display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gap: 6 }}><span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>SESSION</span><strong style={{ ...sans, fontWeight: 700, fontSize: 24, letterSpacing: "-.03em" }}>{session.email}</strong></div>
          <div style={{ display: "grid", gap: 12 }}><div className="lbb-admin-setting-row"><span>Role</span><strong>{session.role}</strong></div><div className="lbb-admin-setting-row"><span>Connexion</span><strong>{new Date(session.loginAt).toLocaleString("fr-FR")}</strong></div><div className="lbb-admin-setting-row"><span>Mode</span><strong>Authentification backend</strong></div></div>
          <button type="button" className="lbb-btn lbb-btn-primary" onClick={onLogout}>Fermer la session</button>
        </div>
        <div className="lbb-admin-surface lbb-admin-surface-soft" style={{ display: "grid", gap: 16 }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#A8501B" }}>SYSTEME</span>
          <div className="lbb-admin-quick-grid"><AdminMetricCard label="Produits" value={String(products.length)} detail="publies ou brouillons" /><AdminMetricCard label="Categories" value={String(categories.length)} detail="navigation admin" /><AdminMetricCard label="Clients" value={String(customers.length)} detail="fiches actives" /></div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="lbb-admin-surface" style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>PROFIL ADMIN</span>
          <strong style={{ ...sans, fontWeight: 700, fontSize: 24, letterSpacing: "-.03em", color: "#2C241D" }}>Identité affichée dans le back office</strong>
        </div>
        <label style={{ display: "grid", gap: 8, maxWidth: 420 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>NOM ADMIN</span>
          <input value={adminName} onChange={(event) => setAdminName(event.target.value)} className="lbb-admin-input" placeholder="Ex: Rémi Lacaze" required />
        </label>
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>ATTRIBUTS PRODUIT</span>
          <strong style={{ ...sans, fontWeight: 700, fontSize: 24, letterSpacing: "-.03em", color: "#2C241D" }}>Longueurs et sechages disponibles</strong>
        </div>
        <div className="lbb-two-col" style={{ alignItems: "start", gap: 16 }}>
          <AdminOptionListEditor
            title="LONGUEURS"
            items={lengths}
            draftValue={lengthDraft}
            setDraftValue={setLengthDraft}
            onAdd={(value) => addOption(setLengths, setLengthDraft, value)}
            onRemove={(value) => removeOption(setLengths, value)}
            presetOptions={defaultProductOptionSettings.productOptions.lengths}
          />
          <AdminOptionListEditor
            title="SECHAGES"
            items={dryingDurations}
            draftValue={dryingDraft}
            setDraftValue={setDryingDraft}
            onAdd={(value) => addOption(setDryingDurations, setDryingDraft, value)}
            onRemove={(value) => removeOption(setDryingDurations, value)}
            presetOptions={defaultProductOptionSettings.productOptions.dryingDurations}
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>PROMOTIONS</span>
          <strong style={{ ...sans, fontWeight: 700, fontSize: 24, letterSpacing: "-.03em", color: "#2C241D" }}>Remises automatiques et codes promo</strong>
        </div>
        <AdminVolumeDiscountEditor categories={categories} rules={volumeDiscounts} onAdd={addVolumeDiscount} onRemove={removeVolumeDiscount} />
        <AdminPromoCodeEditor codes={promoCodes} onAdd={addPromoCode} onRemove={removePromoCode} />
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>BANDEAU PROMOTIONNEL</span>
          <strong style={{ ...sans, fontWeight: 700, fontSize: 24, letterSpacing: "-.03em", color: "#2C241D" }}>Sur-header du site public</strong>
        </div>
        <div className="lbb-two-col" style={{ alignItems: "start", gap: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>MESSAGE 1</span>
            <input value={announcementPrimaryText} onChange={(event) => setAnnouncementPrimaryText(event.target.value)} className="lbb-admin-input" placeholder="Ex: Tarifs TTC · TVA 10 %" />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>MESSAGE 2</span>
            <input value={announcementSecondaryText} onChange={(event) => setAnnouncementSecondaryText(event.target.value)} className="lbb-admin-input" placeholder="Ex: Livraison jusqu'a 30 km : 44,00 EUR TTC" />
          </label>
        </div>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>MESSAGE 3</span>
          <input value={announcementTertiaryText} onChange={(event) => setAnnouncementTertiaryText(event.target.value)} className="lbb-admin-input" placeholder="Ex: Au-dela de 60 km : sur devis" />
        </label>
        <div className="lbb-two-col" style={{ alignItems: "start", gap: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>COULEUR DU FOND</span>
            <div style={{ display: "grid", gridTemplateColumns: "68px 1fr", gap: 10, alignItems: "center" }}>
              <input value={announcementBackgroundColor} onChange={(event) => setAnnouncementBackgroundColor(event.target.value)} type="color" className="lbb-admin-input" style={{ padding: 6, minHeight: 48 }} />
              <input value={announcementBackgroundColor} onChange={(event) => setAnnouncementBackgroundColor(event.target.value)} className="lbb-admin-input" placeholder="#5B321D" />
            </div>
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>COULEUR DU TEXTE</span>
            <div style={{ display: "grid", gridTemplateColumns: "68px 1fr", gap: 10, alignItems: "center" }}>
              <input value={announcementTextColor} onChange={(event) => setAnnouncementTextColor(event.target.value)} type="color" className="lbb-admin-input" style={{ padding: 6, minHeight: 48 }} />
              <input value={announcementTextColor} onChange={(event) => setAnnouncementTextColor(event.target.value)} className="lbb-admin-input" placeholder="#FBF6EE" />
            </div>
          </label>
        </div>
        <div style={{ display: "grid", gap: 10, background: "#F5EFE2", borderRadius: 22, padding: 18, border: "1px solid rgba(120,111,99,.12)" }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>APERÇU</span>
          <div style={{ background: announcementBackgroundColor, color: announcementTextColor, ...mono, fontSize: 11.5, letterSpacing: ".06em", display: "flex", justifyContent: "center", gap: 24, padding: "11px 18px", flexWrap: "wrap", borderRadius: 14 }}>
            {[announcementPrimaryText, announcementSecondaryText, announcementTertiaryText].filter(Boolean).map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>TEXTES ACCUEIL</span>
          <strong style={{ ...sans, fontWeight: 700, fontSize: 24, letterSpacing: "-.03em", color: "#2C241D" }}>Mentions sous les boutons du hero</strong>
        </div>
        <div className="lbb-two-col" style={{ alignItems: "start", gap: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>LIGNE 1</span>
            <input value={heroProofPrimaryText} onChange={(event) => setHeroProofPrimaryText(event.target.value)} className="lbb-admin-input" placeholder="Ex: Tarifs TTC avec TVA 10 %" />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>LIGNE 2</span>
            <input value={heroProofSecondaryText} onChange={(event) => setHeroProofSecondaryText(event.target.value)} className="lbb-admin-input" placeholder="Ex: Livraison offerte des 5 steres dans 30 km" />
          </label>
        </div>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>LIGNE 3</span>
          <input value={heroProofTertiaryText} onChange={(event) => setHeroProofTertiaryText(event.target.value)} className="lbb-admin-input" placeholder="Ex: Offre 4 steres achetes = le 5e offert" />
        </label>
        <div style={{ display: "grid", gap: 10, background: "#F5EFE2", borderRadius: 22, padding: 18, border: "1px solid rgba(120,111,99,.12)" }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#8A9180" }}>APERÇU ACCUEIL</span>
          <div className="lbb-hero-proof" style={{ ...mono, color: "#5B321D" }}>
            {[heroProofPrimaryText, heroProofSecondaryText, heroProofTertiaryText].filter(Boolean).map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
        <span style={{ ...mono, fontSize: 10.5, color: "#8A9180" }}>Ajout et retrait valeur par valeur. Les produits bois reprennent ensuite ces choix dans le back-office et sur la fiche client.</span>
        {feedback ? <div style={{ background: "#FCE7DF", color: "#A8501B", borderRadius: 16, padding: "12px 14px", ...mono, fontSize: 10.5 }}>{feedback}</div> : null}
        <div><button type="submit" className="lbb-btn lbb-btn-primary">Enregistrer les paramètres</button></div>
      </form>
    </div>
  );
}

function AdminRow({ cells, className = "lbb-admin-table" }) {
  return cells.map((cell, index) => <div key={index} className={className} style={{ padding: "18px 0", borderTop: "1px solid rgba(120,111,99,.12)", fontSize: 14.5, color: "#5D5147" }}>{cell}</div>);
}

function AccountDashboard({ account }) {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="lbb-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        {account.stats.map((stat) => (
          <div key={stat.kicker} style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 22, padding: 22, display: "grid", gap: 7 }}>
            <span style={{ ...mono, fontSize: 9.5, letterSpacing: ".08em", color: "#8A9180" }}>{stat.kicker}</span>
            <span style={{ ...sans, fontWeight: 700, fontSize: 30, letterSpacing: "-.035em" }}>{stat.value}</span>
            <span style={{ fontSize: 15.5, lineHeight: 1.4, color: "#4E5647" }}>{stat.desc}</span>
          </div>
        ))}
      </div>
      <div className="lbb-two-col" style={{ alignItems: "start" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 54px -48px rgba(35,41,31,.6)" }}>
          <div style={{ height: 176, background: "#EADACB" }}><img src={brand.deliveryImage} alt="Livraison en cours" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
          <div style={{ padding: "26px 28px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
              <span style={{ ...sans, fontWeight: 700, fontSize: 21, letterSpacing: "-.024em" }}>{account.activeOrderHeadline || "Aucune commande en cours"}</span>
              {account.activeOrderStatus ? <span style={{ ...mono, fontSize: 9.5, letterSpacing: ".06em", background: "#5B321D", color: "#FBF6EE", borderRadius: 999, padding: "7px 13px" }}>{account.activeOrderStatus}</span> : null}
            </div>
            <div style={{ display: "grid", gap: 0 }}>
              {account.trackSteps.length > 0 ? account.trackSteps.map((step, index) => (
                <div key={step.label} style={{ display: "grid", gridTemplateColumns: "22px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
                  <div style={{ display: "grid", justifyItems: "center", height: "100%" }}>
                    <span style={{ width: 13, height: 13, borderRadius: 999, background: step.active ? "#5B321D" : "#E5D3C4", marginTop: 5 }} />
                    {index < account.trackSteps.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 40, background: step.active ? "#5B321D" : "#E5D3C4" }} />}
                  </div>
                  <div style={{ display: "grid", gap: 4, paddingBottom: 16 }}>
                    <span style={{ ...sans, fontWeight: 700, fontSize: 15.5, letterSpacing: "-.015em", color: step.active ? "#23291F" : "#8A9180" }}>{step.label}</span>
                    <span style={{ ...mono, fontSize: 10, letterSpacing: ".05em", color: "#8A9180" }}>{step.when}</span>
                    <span style={{ fontSize: 15.5, lineHeight: 1.45, color: "#4E5647" }}>{step.desc}</span>
                  </div>
                </div>
              )) : <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "#4E5647" }}>Aucun suivi disponible pour le moment.</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: "26px 28px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, marginBottom: 20 }}>
              <span style={{ ...sans, fontWeight: 700, fontSize: 18, letterSpacing: "-.02em" }}>Vos saisons de chauffe</span>
              <span style={{ ...mono, fontSize: 10, letterSpacing: ".06em", color: "#8A9180" }}>en stères</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: account.seasonHistory.length > 0 ? "repeat(5, 1fr)" : "1fr", gap: 12, alignItems: "end", minHeight: 140 }}>
              {account.seasonHistory.length > 0 ? account.seasonHistory.map((value, index) => (
                <div key={index} style={{ display: "grid", gap: 8, justifyItems: "center", alignContent: "end", height: "100%" }}>
                  <span style={{ ...sans, fontWeight: 700, fontSize: 13, color: "#5B321D" }}>{String(value).replace(".", ",")}</span>
                  <div style={{ width: "100%", height: `${value * 16}px`, borderRadius: "10px 10px 4px 4px", background: index === account.seasonHistory.length - 1 ? "#C05621" : "#C99363" }} />
                  <span style={{ ...mono, fontSize: 9.5, letterSpacing: ".05em", color: "#8A9180" }}>{2022 + index}</span>
                </div>
              )) : <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "#4E5647" }}>Aucun historique de chauffe enregistré.</span>}
            </div>
          </div>
          <div style={{ background: "#F3E5D8", borderRadius: 28, padding: "26px 28px", display: "grid", gap: 14 }}>
            <span style={{ ...sans, fontWeight: 700, fontSize: 18, letterSpacing: "-.02em", color: "#23291F" }}>Recommander en un geste</span>
            {account.orders.slice(0, 3).map((order) => (
              <div key={order.ref} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, background: "#FBFAF5", borderRadius: 18, padding: "14px 16px" }}>
                <span style={{ display: "grid", gap: 3 }}>
                  <span style={{ ...sans, fontWeight: 700, fontSize: 15, letterSpacing: "-.015em" }}>{order.items[0]}</span>
                  <span style={{ ...mono, fontSize: 9.5, letterSpacing: ".05em", color: "#8A9180" }}>{order.date}</span>
                </span>
                <Link to="/panier" style={{ ...mono, fontSize: 10, letterSpacing: ".06em", border: "1px solid rgba(35,41,31,.16)", borderRadius: 999, padding: "9px 14px", color: "#23291F" }}>Reprendre</Link>
              </div>
            ))}
            {account.orders.length === 0 ? <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "#4E5647" }}>Aucune commande passée pour le moment.</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountOrders({ account }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {account.orders.length === 0 ? <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 26, padding: "24px 26px", fontSize: 16, color: "#4E5647" }}>Aucune commande enregistrée sur ce compte.</div> : null}
      {account.orders.map((order) => (
        <div key={order.ref} style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 26, padding: "24px 26px", display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span style={{ ...sans, fontWeight: 700, fontSize: 19, letterSpacing: "-.022em" }}>{order.ref}</span>
              <span style={{ ...mono, fontSize: 9.5, letterSpacing: ".06em", background: order.status.includes("Livraison") ? "#F3E5D8" : "#F5EFE2", color: order.status.includes("Livraison") ? "#5B321D" : "#A8501B", borderRadius: 999, padding: "7px 13px" }}>{order.status}</span>
              <span style={{ ...mono, fontSize: 10, letterSpacing: ".05em", color: "#8A9180" }}>{order.date}</span>
            </span>
            <span style={{ ...sans, fontWeight: 700, fontSize: 22, letterSpacing: "-.03em" }}>{order.total}</span>
          </div>
          <div style={{ display: "grid", gap: 7, fontSize: 16.5, lineHeight: 1.5, color: "#4E5647" }}>
            {order.items.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderTop: "1px solid rgba(35,41,31,.08)", paddingTop: 16 }}>
            <span style={{ ...mono, fontSize: 10, letterSpacing: ".05em", color: "#8A9180" }}>{order.note}</span>
            <span style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <a href="#" className="lbb-btn lbb-btn-secondary lbb-btn-small">Facture PDF</a>
              <Link to="/panier" className="lbb-btn lbb-btn-primary lbb-btn-small">Recommander</Link>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountDeliveries({ account }) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: 28, display: "grid", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
          <span style={{ ...sans, fontWeight: 700, fontSize: 21, letterSpacing: "-.024em" }}>{`Créneau de la livraison ${account.orders[0]?.ref || "client"}`}</span>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".06em", color: "#8A9180" }}>Modifiable jusqu'à 48 h avant</span>
        </div>
        <div className="lbb-service-grid">
          {account.deliveries.map((slot) => (
            <button key={slot.day} type="button" style={{ display: "grid", gap: 7, textAlign: "left", cursor: "pointer", border: "1px solid rgba(35,41,31,.1)", background: slot.day.startsWith("Jeu") ? "#F3E5D8" : "#FFFFFF", borderRadius: 20, padding: 20 }}>
              <span style={{ ...mono, fontSize: 9.5, letterSpacing: ".07em", color: "#C05621" }}>{slot.day}</span>
              <span style={{ ...sans, fontWeight: 700, fontSize: 18, letterSpacing: "-.02em" }}>{slot.hours}</span>
              <span style={{ fontSize: 15.5, lineHeight: 1.4, color: "#4E5647" }}>{slot.desc}</span>
            </button>
          ))}
        </div>
        {account.deliveries.length === 0 ? <div style={{ fontSize: 16, lineHeight: 1.55, color: "#4E5647" }}>Aucun créneau de livraison n'est encore enregistré pour ce compte.</div> : null}
        {account.accessNote ? <div style={{ background: "#F3E5D8", borderRadius: 20, padding: "20px 22px", display: "grid", gap: 8 }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: ".07em", color: "#5B321D" }}>CONSIGNE D'ACCÈS ENREGISTRÉE</span>
          <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.5, color: "#5B321D", maxWidth: "64ch" }}>{account.accessNote}</p>
        </div> : null}
      </div>
    </div>
  );
}

function ProductCard({ product, addToCart, detailed = false, compact = false }) {
  const tone = tones[product.badgeTone] ?? tones.green;
  const hasOldPrice = Number.isFinite(product.oldPrice) && product.oldPrice > product.price;

  return (
    <article style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.08)", borderRadius: 26, padding: 20, display: "grid", gap: 16, alignContent: "start", boxShadow: "0 1px 2px rgba(35,41,31,.03)", gridTemplateColumns: compact ? "220px 1fr" : "1fr" }} className="lbb-product-card">
      <div style={{ position: "relative", aspectRatio: compact ? "1.15" : "1.06", borderRadius: 18, background: "#EADACB", overflow: "hidden" }}>
        <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <span style={{ position: "absolute", left: 11, top: 11, ...mono, fontSize: 9.5, letterSpacing: ".07em", background: tone.background, color: tone.color, padding: "6px 12px", borderRadius: 999 }}>{product.badge}</span>
        <button type="button" onClick={() => addToCart(product.id)} style={{ position: "absolute", right: 11, top: 11, width: 34, height: 34, borderRadius: 999, border: 0, background: "rgba(251,250,245,.94)", color: "#23291F", fontSize: 17, cursor: "pointer", lineHeight: 1 }}>+</button>
      </div>
      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
        <div style={{ display: "grid", gap: 7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ ...mono, fontSize: 10, letterSpacing: ".05em", color: "#8A9180" }}>{product.cat}</span>
            {product.rating ? <span style={{ ...mono, fontSize: 10, color: "#C05621" }}>{product.rating}</span> : null}
            {product.reviews ? <span style={{ ...mono, fontSize: 10, color: "#A8AE9C" }}>{product.reviews}</span> : null}
          </div>
          <h3 style={{ ...sans, fontWeight: 700, fontSize: compact ? 20 : 16.5, letterSpacing: "-.012em", margin: 0, lineHeight: 1.25 }}><Link to={`/produit/${product.slug}`}>{product.name}</Link></h3>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "#6F5848" }}>{product.desc}</p>
        </div>
        {detailed && (
          <div style={{ display: "grid", gap: 7, background: "#F7EFE6", borderRadius: 14, padding: "12px 14px" }}>
            {product.specs.slice(0, 3).map((spec) => (
              <div key={spec.k} style={{ display: "flex", justifyContent: "space-between", gap: 12, ...mono, fontSize: 10.5, letterSpacing: ".03em" }}>
                <span style={{ color: "#8A9180" }}>{spec.k}</span>
                <span style={{ color: "#5B321D" }}>{spec.v}</span>
              </div>
            ))}
          </div>
        )}
        {!detailed && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[product.length, product.humidity, product.drying].filter(Boolean).slice(0, 3).map((tag) => (
              <span key={tag} style={{ ...mono, fontSize: 10, letterSpacing: ".04em", background: "#F3E5D8", color: "#6F5848", borderRadius: 999, padding: "6px 11px" }}>{tag}</span>
            ))}
          </div>
        )}
        <div style={{ display: "grid", gap: 7 }}>
          <div style={{ height: 4, borderRadius: 999, background: "#E8D9CD", overflow: "hidden" }}><div style={{ height: "100%", width: `${product.stockPct}%`, background: product.stockPct < 45 ? "#C05621" : "#8C5A36", borderRadius: 999 }} /></div>
          <span style={{ ...mono, fontSize: 10, color: product.stockPct < 45 ? "#C05621" : "#5B321D" }}>{product.stockLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
          <span style={{ ...sans, fontWeight: 700, fontSize: 25, letterSpacing: "-.025em", whiteSpace: "nowrap" }}>{formatPrice(product.price)}</span>
          {hasOldPrice ? <span style={{ ...mono, fontSize: 10.5, color: "#A8AE9C", textDecoration: "line-through" }}>{formatPrice(product.oldPrice)}</span> : null}
          <span style={{ ...mono, fontSize: 10.5, color: "#8A9180", marginLeft: "auto" }}>{product.unit}</span>
        </div>
        <button type="button" onClick={() => addToCart(product.id)} className="lbb-btn lbb-btn-soft" style={{ width: "100%", justifyContent: "center" }}>Ajouter au panier</button>
      </div>
    </article>
  );
}

function CompareRow({ row }) {
  return (
    <>
      <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180", padding: "14px 0", borderTop: "1px solid rgba(35,41,31,.08)" }}>{row.label}</div>
      {row.values.map((value) => (
        <div key={`${row.label}-${value}`} style={{ fontSize: 16, lineHeight: 1.55, color: "#4E5647", padding: "14px 0", borderTop: "1px solid rgba(35,41,31,.08)" }}>{value}</div>
      ))}
    </>
  );
}

function SelectorRow({ title, options, value, onChange, card = false }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}>{title}</span>
      <div style={{ display: card ? "grid" : "flex", gridTemplateColumns: card ? "repeat(auto-fit, minmax(120px, 1fr))" : undefined, gap: 9, flexWrap: "wrap" }}>
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;
          const active = value === optionValue;

          return (
            <button key={optionValue} type="button" onClick={() => onChange(optionValue)} style={card ? { display: "grid", gap: 5, justifyItems: "start", textAlign: "left", cursor: "pointer", border: `1px solid ${active ? "#5B321D" : "rgba(35,41,31,.12)"}`, background: active ? "#F3E5D8" : "#FFFFFF", borderRadius: 16, padding: "13px 14px", color: active ? "#5B321D" : "#23291F" } : { ...mono, fontSize: 11.5, letterSpacing: ".04em", padding: "12px 18px", borderRadius: 999, cursor: "pointer", border: `1px solid ${active ? "#5B321D" : "rgba(35,41,31,.12)"}`, background: active ? "#5B321D" : "#FFFFFF", color: active ? "#FBF6EE" : "#23291F" }}>
              <span style={card ? { ...sans, fontWeight: 700, fontSize: 15, color: active ? "#5B321D" : "#23291F" } : undefined}>{optionLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FacetList({ title, valueLabel, options, values, onToggle }) {
  return (
    <div style={{ display: "grid", gap: 12, paddingBottom: 26, borderBottom: "1px solid rgba(35,41,31,.09)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}><span>{title}</span><span style={{ color: "#5B321D" }}>{valueLabel}</span></div>
      <div style={{ display: "grid", gap: 12 }}>
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <button key={option} type="button" onClick={() => onToggle(option)} style={{ display: "flex", alignItems: "center", gap: 11, background: "transparent", border: 0, cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "'Newsreader', serif", fontSize: 16, color: active ? "#23291F" : "#6F5848" }}>
              <span style={{ width: 17, height: 17, borderRadius: active ? 4 : 999, border: `1px solid ${active ? "#5B321D" : "rgba(35,41,31,.25)"}`, background: active ? "#5B321D" : "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#FBF6EE", flexShrink: 0 }}>{active ? "✓" : ""}</span>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FacetPills({ title, valueLabel, options, values, onToggle }) {
  return (
    <div style={{ display: "grid", gap: 12, paddingBottom: 26, borderBottom: "1px solid rgba(35,41,31,.09)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}><span>{title}</span><span style={{ color: "#5B321D" }}>{valueLabel}</span></div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {options.map((option) => {
          const active = values.includes(option);
          return <button key={option} type="button" onClick={() => onToggle(option)} style={{ ...mono, fontSize: 11, letterSpacing: ".04em", padding: "10px 14px", borderRadius: 999, cursor: "pointer", border: `1px solid ${active ? "#5B321D" : "rgba(35,41,31,.16)"}`, background: active ? "#5B321D" : "#FFFFFF", color: active ? "#FBF6EE" : "#6F5848" }}>{option}</button>;
        })}
      </div>
    </div>
  );
}

function FacetRange({ title, valueLabel, value, min, max, step, onChange }) {
  return (
    <div style={{ display: "grid", gap: 12, paddingBottom: 26, borderBottom: "1px solid rgba(35,41,31,.09)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#8A9180" }}><span>{title}</span><span style={{ color: "#5B321D" }}>{valueLabel}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ width: "100%", accentColor: "#5B321D" }} />
    </div>
  );
}

function ServiceUpsellSection({ siteProducts, cartItems, addToCart, title = "Services utiles", description = "Ajoutez un service réel à la tournée avant validation." }) {
  const suggestions = getServiceSuggestions(siteProducts, cartItems).slice(0, 3);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid rgba(35,41,31,.09)", borderRadius: 28, padding: 28, display: "grid", gap: 18, boxShadow: "0 24px 54px -48px rgba(35,41,31,.35)" }}>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#C05621" }}>SERVICES COMPLÉMENTAIRES</div>
        <strong style={{ ...sans, fontWeight: 700, fontSize: 22, letterSpacing: "-.02em", color: "#23291F" }}>{title}</strong>
        {description ? <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: "#4E5647" }}>{description}</p> : null}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {suggestions.map((service) => (
          <div key={service.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", border: "1px solid rgba(35,41,31,.08)", borderRadius: 20, padding: "18px 18px" }}>
            <div style={{ display: "grid", gap: 6, minWidth: 0, flex: "1 1 280px" }}>
              <span style={{ ...mono, fontSize: 10, letterSpacing: ".08em", color: "#C05621" }}>{getProductTypeLabel(service)}</span>
              <strong style={{ ...sans, fontWeight: 700, fontSize: 18, letterSpacing: "-.02em", color: "#23291F" }}>{service.name}</strong>
              <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "#4E5647" }}>{service.desc}</span>
            </div>
            <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
              <span style={{ ...sans, fontWeight: 700, fontSize: 24, letterSpacing: "-.03em", color: "#23291F" }}>{formatPrice(service.price)}</span>
              <button type="button" onClick={() => addToCart(service.id, 1, {})} className="lbb-btn lbb-btn-secondary">Ajouter ce service</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckoutStep({ active = false, label, number }) {
  return <span style={{ display: "flex", alignItems: "center", gap: 9, color: active ? "#23291F" : "#A88E7A" }}><span style={{ width: 24, height: 24, borderRadius: 999, background: active ? "#5B321D" : "#F3E5D8", color: active ? "#FBF6EE" : "#8A6E5A", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{number}</span> {label}</span>;
}

function SiteFooter() {
  return (
    <footer style={{ background: "#23291F", color: "#9AA391" }}>
      <div className="lbb-footer-grid" style={{ ...pageShell, paddingTop: 80, paddingBottom: 30 }}>
        <div>
          <img className="brand-logo brand-logo-footer" src={brand.logo} alt="La Belle Bûche" />
          <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".08em", color: "#C05621", marginBottom: 16 }}>Bois de chauffage vendu au stère</div>
          <p style={{ margin: "0 0 20px", fontSize: 16, lineHeight: 1.55, maxWidth: "40ch" }}>Bûcherons-négociants dans le Sud-Ouest. Du bois coupé près de chez vous, séché deux ans, livré et rangé.</p>
        </div>
        <div style={{ display: "grid", gap: 11, alignContent: "start", fontSize: 16 }}>
          <div style={{ ...sans, fontWeight: 700, fontSize: 12.5, letterSpacing: ".05em", color: "#F4F7EC", marginBottom: 6 }}>Ville</div>
          <span>{brand.phone}</span>
          <span>Montgaillard-Lauragais</span>
        </div>
        <div style={{ display: "grid", gap: 11, alignContent: "start", fontSize: 16 }}>
          <div style={{ ...sans, fontWeight: 700, fontSize: 12.5, letterSpacing: ".05em", color: "#F4F7EC", marginBottom: 6 }}>Contact</div>
          <span>{brand.advisorPhone}</span>
          <span>Montgaillard-Lauragais</span>
        </div>
        <div style={{ display: "grid", gap: 11, alignContent: "start", fontSize: 16 }}>
          <div style={{ ...sans, fontWeight: 700, fontSize: 12.5, letterSpacing: ".05em", color: "#F4F7EC", marginBottom: 6 }}>Informations</div>
          <a href="#">Livraison</a><a href="#">Qu'est-ce qu'un stère ?</a><Link to="/compte">Programme de fidélité</Link><a href="#">CGV — CGU</a><a href="#">Mentions légales</a>
        </div>
      </div>
      <div style={{ ...pageShell, paddingTop: 22, paddingBottom: 40, borderTop: "1px solid rgba(244,247,236,.1)", ...mono, fontSize: 10.5, letterSpacing: ".07em", display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <span>© 2026 La Belle Bûche — Maquette portée sous React</span>
        <span>Paiement par carte bancaire · 3× sans frais</span>
      </div>
    </footer>
  );
}

function toggleArray(setter, value) {
  setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
}

function removeTag(tag, setters) {
  if (tag.type === "category") setters.setSelectedCategories((current) => current.filter((item) => item !== tag.label));
  if (tag.type === "productType") setters.setSelectedTypes((current) => current.filter((item) => item !== tag.label));
  if (tag.type === "essence") setters.setSelectedEssences((current) => current.filter((item) => item !== tag.label));
  if (tag.type === "length") setters.setSelectedLength((current) => current.filter((item) => item !== tag.label));
  if (tag.type === "drying") setters.setSelectedDrying((current) => current.filter((item) => item !== tag.label));
}

export default App;