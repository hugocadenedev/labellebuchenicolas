import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { appConfig } from "./config.js";
import { computeShipping } from "../shared/deliveryZones.js";
import { normalizeVolumeDiscounts, normalizePromoCodes, computeVolumeDiscount, validatePromoCode, getCategorySlugsForProduct } from "../shared/promotions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storePath = path.join(__dirname, "data", "store.json");

async function readStore() {
  const raw = await fs.readFile(storePath, "utf8");
  const sanitized = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return normalizeStoreShape(sanitizeStoreStrings(JSON.parse(sanitized)));
}

async function writeStore(data) {
  await fs.writeFile(storePath, JSON.stringify(sanitizeStoreStrings(data), null, 2) + "\n", "utf8");
}

function sanitizeStoreStrings(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeStoreStrings);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, sanitizeStoreStrings(entry)]));
  }

  if (typeof value === "string") {
    return repairMojibake(value);
  }

  return value;
}

function repairMojibake(value) {
  if (!/[ÃÂâ]/.test(value)) {
    return value;
  }

  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8");
    return /�/.test(repaired) ? value : repaired;
  } catch {
    return value;
  }
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

const defaultProductOptionSettings = {
  lengths: ["25 cm", "33 cm", "50 cm", "2 m"],
  dryingDurations: ["Seche 18 mois", "Seche 2 ans", "Seche 2 ans et demi"]
};

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR"
});

const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const shortMoment = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
});

function formatCurrency(value) {
  return currency.format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return shortDate.format(date);
}

function formatMoment(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return shortMoment.format(date).replace(",", " ·");
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Livraison n'est pas garantie par defaut, on retire toute mention "livre/livré" du libelle d'unite.
function stripDeliveredWording(value) {
  return normalizeText(value).replace(/\s*livr[ée]e?s?\b/gi, "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeAnnouncementText(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }

  return typeof value === "string" ? value.trim() : fallback;
}

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeOptionList(values, fallback = []) {
  const normalized = uniqueValues((Array.isArray(values) ? values : []).map(normalizeText));
  return normalized.length > 0 ? normalized : [...fallback];
}

function normalizeOptionalOptionList(values) {
  return uniqueValues((Array.isArray(values) ? values : []).map(normalizeText).filter(Boolean));
}

function normalizeLengthPrices(lengthPrices, availableLengths = [], fallbackPrice = 0) {
  const fallback = roundCurrency(fallbackPrice);
  return uniqueValues(availableLengths).reduce((accumulator, length) => {
    const rawPrice = Number(lengthPrices?.[length]);
    accumulator[length] = Number.isFinite(rawPrice) ? roundCurrency(rawPrice) : fallback;
    return accumulator;
  }, {});
}

function getProductPriceForLength(product, selectedLength = "") {
  const length = normalizeText(selectedLength) || product?.length || "";
  const mappedPrice = Number(product?.lengthPrices?.[length]);
  if (Number.isFinite(mappedPrice) && mappedPrice > 0) {
    return roundCurrency(mappedPrice);
  }

  return roundCurrency(product?.price || 0);
}

function normalizeSettings(input = {}) {
  const productOptions = input?.productOptions || {};
  const announcementBar = input?.announcementBar || {};
  const heroProof = input?.heroProof || {};
  const promotions = input?.promotions || {};
  return {
    productOptions: {
      lengths: normalizeOptionList(productOptions.lengths, defaultProductOptionSettings.lengths),
      dryingDurations: normalizeOptionList(productOptions.dryingDurations, defaultProductOptionSettings.dryingDurations)
    },
    deliverySlots: normalizeOptionList(input?.deliverySlots, []),
    promotions: {
      volumeDiscounts: normalizeVolumeDiscounts(promotions.volumeDiscounts),
      promoCodes: normalizePromoCodes(promotions.promoCodes)
    },
    announcementBar: {
      primaryText: normalizeAnnouncementText(announcementBar.primaryText, "Tarifs TTC · TVA 10 %"),
      secondaryText: normalizeAnnouncementText(announcementBar.secondaryText, "Livraison jusqu'a 30 km : 44,00 EUR TTC"),
      tertiaryText: normalizeAnnouncementText(announcementBar.tertiaryText, "Au-dela de 60 km : sur devis"),
      backgroundColor: normalizeText(announcementBar.backgroundColor) || "#5B321D",
      textColor: normalizeText(announcementBar.textColor) || "#FBF6EE"
    },
    heroProof: {
      primaryText: normalizeAnnouncementText(heroProof.primaryText, "Tarifs TTC avec TVA 10 %"),
      secondaryText: normalizeAnnouncementText(heroProof.secondaryText, "Livraison jusqu'a 30 km : 44,00 EUR TTC"),
      tertiaryText: normalizeAnnouncementText(heroProof.tertiaryText, "Offre 4 steres achetes = le 5e offert")
    }
  };
}

function normalizeProfile(input = {}, fallback = {}) {
  const name = normalizeText(input?.name) || fallback.name || "Admin";
  const role = normalizeText(input?.role) || fallback.role || "Manager";

  return {
    name,
    role,
    initials: toInitials(name) || fallback.initials || "AD"
  };
}

function buildDefaultServiceCategory() {
  return {
    id: "cat_services",
    slug: "services",
    label: "Services",
    kicker: "Compléments de livraison",
    heading: "Services à ajouter à votre commande",
    description: "Des prestations complémentaires proposées pendant la commande, comme le rangement du bois ou l'aide au déchargement.",
    shortDescription: "Prestations ajoutables au panier client.",
    coverProductId: "service-rangement-bois",
    essences: ["Service"],
    productIds: ["service-rangement-bois"]
  };
}

function buildDefaultServiceProduct() {
  return normalizeProductInput({
    id: "service-rangement-bois",
    slug: "rangement-du-bois",
    name: "Rangement du bois",
    cat: "Service",
    essence: "Service",
    category: "services",
    categoryId: "cat_services",
    family: "Services",
    sku: "SERVICE-RANGEMENT",
    price: 39,
    oldPrice: null,
    unit: "/ prestation TTC",
    badge: "Service utile",
    badgeTone: "warm",
    rating: "",
    reviews: "",
    length: "Sur devis",
    drying: "Ajoutable à la tournée",
    availableLengths: ["Sur devis"],
    availableDryingDurations: ["Ajoutable à la tournée"],
    humidity: "Intervention locale",
    desc: "Mise en place du bois au bûcher ou dans votre zone de stockage lors de la livraison.",
    origin: "Équipe locale",
    calorificValue: "Service complémentaire",
    imageKey: "deliveryImage",
    specs: [
      { k: "Prestation", v: "Rangement du bois livré" },
      { k: "Zone", v: "Autour du point de déchargement" },
      { k: "Tarif TTC", v: formatCurrency(39) },
      { k: "Organisation", v: "Ajoutée à la tournée confirmée" }
    ],
    tabs: {
      overview: {
        title: "Un service ajouté à votre livraison",
        paragraphs: [
          "Le rangement du bois permet de préparer l'espace avant notre passage et de faire positionner le bois directement dans la zone prévue.",
          "Cette prestation est proposée comme un complément simple, visible dans le panier et dans la commande finale."
        ],
        points: [
          "Ajoutable directement au panier.",
          "Facturation claire sur la commande.",
          "Planifiée sur le même créneau que la livraison."
        ]
      },
      livraison: {
        title: "Planification du service",
        paragraphs: [
          "Le service suit le même créneau que la commande principale pour éviter les doubles déplacements.",
          "L'équipe confirme si un accès ou une consigne spécifique est nécessaire avant le passage."
        ],
        points: [
          "Visible dans le tunnel de commande.",
          "Ajoutable jusqu'à la validation finale.",
          "Suivi avec le reste de la commande."
        ]
      }
    },
    stockQty: 999,
    threshold: 0,
    status: "active"
  });
}

function ensureDefaultServices(data) {
  const categories = Array.isArray(data.categories) ? [...data.categories] : [];
  const products = Array.isArray(data.products) ? [...data.products] : [];
  const hasCatalogContent = categories.length > 0 || products.length > 0;
  const hasServiceCategory = categories.some((category) => category?.slug === "services");
  const hasServiceProduct = products.some((product) => product?.id === "service-rangement-bois");

  if (!hasCatalogContent) {
    return {
      ...data,
      categories,
      products
    };
  }

  if (!hasServiceCategory) {
    categories.push(buildDefaultServiceCategory());
  }

  if (!hasServiceProduct) {
    products.unshift(buildDefaultServiceProduct());
  }

  return {
    ...data,
    categories: categories.map((category) => {
      if (category?.slug !== "services") return category;
      return {
        ...buildDefaultServiceCategory(),
        ...category,
        essences: uniqueValues([...(category.essences || []), "Service"]),
        productIds: uniqueValues([...(category.productIds || []), "service-rangement-bois"]),
        coverProductId: category.coverProductId || "service-rangement-bois"
      };
    }),
    products
  };
}

function normalizeStoreShape(data) {
  const nextData = ensureDefaultServices(data || {});
  return {
    ...nextData,
    settings: normalizeSettings(nextData?.settings),
    admins: Array.isArray(nextData?.admins) ? nextData.admins : []
  };
}

function buildBootstrapAdmin() {
  return {
    id: "admin_001",
    email: appConfig.admin.bootstrapEmail,
    firstName: appConfig.admin.bootstrapFirstName,
    lastName: appConfig.admin.bootstrapLastName,
    role: "super_admin",
    isActive: true,
    passwordHash: null,
    lastLoginAt: ""
  };
}

async function ensureAdminSeeded(data) {
  const admins = Array.isArray(data.admins) ? data.admins : [];
  if (admins.length > 0) {
    data.admins = admins;
    return false;
  }

  const bootstrapAdmin = buildBootstrapAdmin();
  bootstrapAdmin.passwordHash = await bcrypt.hash(appConfig.admin.bootstrapPassword, 10);
  data.admins = [bootstrapAdmin];
  return true;
}

function toAdminSession(admin) {
  const fullName = [admin.firstName, admin.lastName].filter(Boolean).join(" ").trim();
  return {
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName || "",
    lastName: admin.lastName || "",
    name: fullName || admin.email,
    role: admin.role || "editor"
  };
}

function buildCustomerSlots() {
  return [
    { day: "Mar. 15 sept.", hours: "8h30 - 12h30", desc: "Créneau matin confirmé après validation." },
    { day: "Jeu. 17 sept.", hours: "13h30 - 18h00", desc: "Créneau après-midi disponible." },
    { day: "Ven. 18 sept.", hours: "16h00 - 18h00", desc: "Dernier passage disponible cette semaine." }
  ];
}

function createCustomerId(data) {
  const nextId = data.customers.reduce((max, customer) => {
    const match = String(customer.id || "").match(/^cus_(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;

  return `cus_${String(nextId).padStart(3, "0")}`;
}

function createOrderId(data) {
  const year = new Date().getFullYear();
  const nextNumber = data.orders.reduce((max, order) => {
    const match = String(order.id || "").match(/^(?:LBB-\d{4}-)(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;

  return `LBB-${year}-${String(nextNumber).padStart(3, "0")}`;
}

function normalizeAddress(address, fallbackName = "") {
  return {
    name: normalizeText(address?.name) || fallbackName,
    line1: normalizeText(address?.line1),
    line2: normalizeText(address?.line2),
    postcode: normalizeText(address?.postcode),
    city: normalizeText(address?.city)
  };
}

function appendCustomerAddress(customer, address) {
  const key = [address.line1, address.postcode, address.city].filter(Boolean).join("|");
  if (!key) return;

  const addresses = Array.isArray(customer.addresses) ? customer.addresses : [];
  const alreadyExists = addresses.some((item) => [item.line1, item.postcode, item.city].filter(Boolean).join("|") === key);
  if (alreadyExists) {
    customer.addresses = addresses;
    return;
  }

  customer.addresses = [
    ...addresses,
    {
      label: addresses.length === 0 ? "Adresse principale" : `Adresse ${addresses.length + 1}`,
      line1: address.line1,
      line2: address.line2,
      postcode: address.postcode,
      city: address.city
    }
  ];
}

function toCustomerSession(customer) {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name
  };
}

function toInitials(name) {
  return (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getCustomerAddressCount(customer, orders) {
  const storedAddresses = Array.isArray(customer.addresses) ? customer.addresses.length : 0;
  if (storedAddresses > 0) return storedAddresses;

  const derived = new Set(
    orders
      .map((order) => {
        const address = order.deliveryAddress;
        if (!address) return "";
        return [address.line1, address.postcode, address.city].filter(Boolean).join("|");
      })
      .filter(Boolean)
  );

  return Math.max(derived.size, 1);
}

function buildTrackSteps(order) {
  if (!order) return [];

  const timeline = Array.isArray(order.timeline) ? order.timeline : [];
  if (timeline.length > 0) {
    return timeline.map((step) => ({
      label: step.label,
      when: formatMoment(step.at),
      desc: step.detail,
      active: true
    }));
  }

  return [
    {
      label: "Passage de commande",
      when: formatMoment(order.createdAt),
      desc: [order.channel, order.customer].filter(Boolean).join(" · "),
      active: true
    },
    {
      label: order.statusLabel || "",
      when: "",
      desc: [order.paymentMethod, order.paymentReference].filter(Boolean).join(" · "),
      active: true
    },
    {
      label: order.fulfillmentLabel || "",
      when: "",
      desc: [order.slot, order.logisticsNote].filter(Boolean).join(" · "),
      active: false
    }
  ].filter((step) => step.label || step.desc || step.when);
}

function buildAccountView(data, customerId = null) {
  const customer = customerId
    ? data.customers.find((item) => item.id === customerId)
    : data.customers[0];
  if (!customer) return null;

  const customerOrders = data.orders
    .filter((order) => order.customerId === customer.id)
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

  const activeOrder = customerOrders[0] || null;
  const seasonHistory = Array.isArray(customer.seasonHistory) ? customer.seasonHistory : [];
  const lifetime = Number(customer.lifetime || 0);
  const addressCount = getCustomerAddressCount(customer, customerOrders);
  const memberSince = customer.memberSince || (customerOrders.at(-1)?.createdAt ? String(new Date(customerOrders.at(-1).createdAt).getFullYear()) : "");

  return {
    id: customer.id,
    customer: customer.name,
    firstName: customer.name.split(" ")[0] || customer.name,
    initials: customer.initials || toInitials(customer.name),
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    memberSince,
    addresses: Array.isArray(customer.addresses) ? customer.addresses : [],
    stats: [
      { kicker: "Saison en cours", value: `${String((seasonHistory.at(-1) || 0)).replace(".", ",")} st`, desc: `Consommation suivie sur ${customer.orders} commande(s).` },
      { kicker: "Commande active", value: activeOrder?.id || "Aucune", desc: activeOrder ? `${activeOrder.fulfillmentLabel} · ${activeOrder.slot}` : "Pas de commande en cours." },
      { kicker: "Cumul client", value: formatCurrency(lifetime), desc: "Commandes et livraisons confondues" },
      { kicker: "Adresse suivie", value: String(addressCount), desc: addressCount > 1 ? "Livraison et retrait memorises" : "Adresse principale memorisee" }
    ],
    activeOrderHeadline: activeOrder?.items?.[0] ? `${activeOrder.id} — ${activeOrder.items[0].quantity} × ${activeOrder.items[0].name}` : "Aucune livraison en cours",
    activeOrderStatus: activeOrder?.fulfillment === "delivery" ? "En route" : activeOrder?.fulfillmentLabel || "",
    trackSteps: buildTrackSteps(activeOrder),
    orders: customerOrders.map((order) => ({
      ref: order.id,
      status: order.fulfillment === "delivery" ? "Livraison confirmée" : order.statusLabel,
      total: formatCurrency(order.total),
      date: formatDate(order.createdAt),
      note: order.timeline?.at(-1)?.detail || order.logisticsNote || "Suivi local disponible.",
      items: (order.items || []).map((item) => `${item.quantity} × ${item.name}${item.note ? ` · ${item.note}` : ""}`)
    })),
    deliveries: Array.isArray(customer.nextDeliverySlots) ? customer.nextDeliverySlots : [],
    seasonHistory,
    accessNote: customer.accessNote || ""
  };
}

function buildProductSpecs(input) {
  const label = input.essence || input.family || input.name;
  return [
    { k: "Essence", v: label || "Feuillus" },
    input.origin ? { k: "Origine", v: input.origin } : null,
    input.length ? { k: "Longueur", v: input.length } : null,
    input.humidity ? { k: "Humidite", v: input.humidity } : null,
    input.calorificValue ? { k: "Pouvoir calorifique", v: input.calorificValue } : null
  ].filter(Boolean);
}

function buildProductTabs(input) {
  const productName = input.name || "Ce lot";
  const family = input.essence || input.family || "bois";
  const length = normalizeText(input.length);
  const drying = normalizeText(input.drying);
  const desc = input.desc || `${productName} est prepare pour une chauffe reguliere et une utilisation simple au quotidien.`;
  const optionFragments = [
    length ? `une coupe ${length}` : "",
    drying ? `un lot ${drying.toLowerCase()}` : ""
  ].filter(Boolean);
  const optionSentence = optionFragments.length > 0
    ? `${family} propose ${optionFragments.join(" avec ")} pour un usage immediat.`
    : `${family} propose un lot prepare pour un usage immediat.`;

  return {
    overview: {
      title: `Pourquoi choisir ${productName}`,
      paragraphs: [
        desc,
        optionSentence
      ],
      points: [
        `Reference ${input.sku || input.id}.`,
        input.humidity ? `${input.humidity}.` : null,
        input.origin ? `${input.origin}.` : null
      ].filter(Boolean)
    },
    livraison: {
      title: "Livraison et disponibilite",
      paragraphs: [
        "Le produit peut etre integre aux tournees locales ou prepare pour un retrait depot selon la saison.",
        `Stock pilote en back office avec un seuil d'alerte a ${Number(input.threshold || 0)} unites.`
      ],
      points: [
        "Mise a jour immediate des stocks admin.",
        "Produit publiable directement sur le storefront."
      ]
    }
  };
}

function normalizeProductInput(input) {
  const price = Number(input.price);
  const stockQty = Number(input.stockQty ?? 0);
  const threshold = Number(input.threshold ?? 0);
  const oldPrice = input.oldPrice === "" || input.oldPrice === undefined ? null : Number(input.oldPrice);
  const reviewCount = Number(input.reviewCount ?? 0);
  const family = input.family || "Bois de chauffage";
  const slug = input.slug || input.id;
  const generatedSku = String(input.sku || input.id || slug || "PRODUIT").toUpperCase();
  const availableLengths = normalizeOptionalOptionList(input.availableLengths);
  const length = normalizeText(input.length) || availableLengths[0] || "";
  const dryingOptions = normalizeOptionalOptionList(input.availableDryingDurations);
  const drying = normalizeText(input.drying) || dryingOptions[0] || "";
  const lengthPrices = normalizeLengthPrices(input.lengthPrices, availableLengths, price);
  const defaultPrice = length ? getProductPriceForLength({ price, lengthPrices, length }, length) : roundCurrency(price);

  return {
    id: input.id,
    templateProductId: input.templateProductId || null,
    slug,
    name: input.name,
    cat: input.cat || family,
    essence: input.essence || family,
    category: input.category || "bois-de-chauffage",
    categoryId: input.categoryId || null,
    family,
    sku: generatedSku,
    price: defaultPrice,
    oldPrice: Number.isFinite(oldPrice) ? oldPrice : null,
    unit: stripDeliveredWording(input.unit) || "/ stere",
    badge: input.badge || "Nouveau",
    badgeTone: input.badgeTone || "green",
    rating: input.rating || "★★★★★",
    reviews: input.reviews || `${reviewCount} avis`,
    length,
    drying,
    availableLengths,
    lengthPrices,
    availableDryingDurations: dryingOptions,
    humidity: input.humidity || "",
    desc: input.desc || "",
    origin: input.origin || "",
    calorificValue: input.calorificValue || "",
    imageKey: input.imageKey || null,
    imageUrl: input.imageUrl || "",
    galleryKeys: Array.isArray(input.galleryKeys) ? uniqueValues(input.galleryKeys) : [],
    galleryUrls: Array.isArray(input.galleryUrls) ? uniqueValues(input.galleryUrls) : [],
    specs: Array.isArray(input.specs) && input.specs.length > 0 ? input.specs : buildProductSpecs(input),
    tabs: input.tabs?.overview && input.tabs?.livraison ? input.tabs : buildProductTabs(input),
    stockQty,
    threshold,
    status: input.status || "active"
  };
}

function assignProductToCategory(data, categoryId, product) {
  if (!categoryId) return;
  const category = data.categories.find((item) => item.id === categoryId);
  if (!category) return;

  category.productIds = uniqueValues([...(category.productIds || []), product.id]);
  category.essences = uniqueValues([...(category.essences || []), product.essence]);
}

function removeProductFromCategories(data, productId) {
  data.categories.forEach((category) => {
    const nextProductIds = (category.productIds || []).filter((item) => item !== productId);
    category.productIds = nextProductIds;

    if (category.coverProductId === productId) {
      category.coverProductId = "";
    }
  });
}

function makeProductView(product) {
  const thresholdBase = Math.max(product.threshold * 3, product.stockQty, 1);
  const stockPct = Math.max(5, Math.min(100, Math.round((product.stockQty / thresholdBase) * 100)));
  return {
    ...product,
    lengthPrices: normalizeLengthPrices(product.lengthPrices, product.availableLengths || [product.length], product.price),
    stockPct,
    stockLabel: `${product.stockQty} unités en stock`,
    isLowStock: product.stockQty <= product.threshold
  };
}

function pluralizeProducts(count) {
  return `${count} ${count > 1 ? "references" : "reference"}`;
}

function makeCategoryView(category, products) {
  const assignedProducts = products.filter((product) => category.productIds.includes(product.id) && product.status === "active");
  const minPrice = assignedProducts.length > 0 ? Math.min(...assignedProducts.map((product) => product.price)) : null;

  return {
    ...category,
    from: minPrice !== null ? `Des ${minPrice.toFixed(minPrice % 1 === 0 ? 0 : 2)} €` : "Bientot disponible",
    count: pluralizeProducts(assignedProducts.length)
  };
}

export async function getBootstrap() {
  const data = await readStore();
  const products = data.products.map(makeProductView);
  const lowStock = products.filter((product) => product.isLowStock).length;
  const paidToday = data.orders.reduce((sum, order) => sum + order.total, 0);
  const categories = data.categories.map((category) => makeCategoryView(category, data.products));

  return {
    profile: data.profile,
    stats: [
      { label: "CA du jour", value: `${paidToday.toFixed(0)} €`, detail: data.orders.length > 0 ? "Montant cumule des commandes" : "Aucune commande aujourd'hui" },
      { label: "Commandes a traiter", value: String(data.orders.length), detail: `${data.orders.filter((order) => order.status === "pending").length} en attente` },
      { label: "Livraisons du jour", value: String(data.deliveries.length), detail: data.deliveries.length > 0 ? `${data.deliveries.length} tournee(s) en cours` : "Aucune tournee en cours" },
      { label: "Stock sensible", value: `${lowStock} refs`, detail: lowStock > 0 ? "Seuil bas atteint" : "Aucune alerte stock" }
    ],
    categories,
    settings: data.settings,
    products,
    orders: data.orders,
    customers: data.customers,
    deliveries: data.deliveries
  };
}

export async function getSiteBootstrap() {
  const data = await readStore();
  return {
    categories: data.categories.map((category) => makeCategoryView(category, data.products)),
    settings: data.settings,
    products: data.products.map(makeProductView),
    account: buildAccountView(data)
  };
}

export async function getSettings() {
  const data = await readStore();
  return data.settings;
}

export async function updateSettings(input) {
  const data = await readStore();
  data.profile = normalizeProfile({
    ...data.profile,
    ...input?.profile
  }, data.profile);
  data.settings = normalizeSettings({
    ...data.settings,
    ...input,
    productOptions: {
      ...data.settings?.productOptions,
      ...input?.productOptions
    }
  });
  await writeStore(data);
  return data.settings;
}

export async function listCategories() {
  const data = await readStore();
  return data.categories.map((category) => makeCategoryView(category, data.products));
}

export async function createCategory(input) {
  const data = await readStore();
  const category = {
    id: input.id,
    slug: input.slug,
    label: input.label,
    kicker: input.kicker,
    heading: input.heading,
    description: input.description,
    shortDescription: input.shortDescription,
    imageUrl: input.imageUrl || "",
    coverProductId: input.coverProductId,
    essences: Array.isArray(input.essences) ? input.essences : [],
    productIds: Array.isArray(input.productIds) ? input.productIds : []
  };
  data.categories.unshift(category);
  await writeStore(data);
  return makeCategoryView(category, data.products);
}

export async function updateCategory(id, input) {
  const data = await readStore();
  const index = data.categories.findIndex((category) => category.id === id);
  if (index === -1) return null;
  data.categories[index] = {
    ...data.categories[index],
    ...input,
    essences: Array.isArray(input.essences) ? input.essences : data.categories[index].essences,
    productIds: Array.isArray(input.productIds) ? input.productIds : data.categories[index].productIds
  };
  await writeStore(data);
  return makeCategoryView(data.categories[index], data.products);
}

export async function deleteCategory(id) {
  const data = await readStore();
  const category = data.categories.find((item) => item.id === id);
  if (!category) return null;
  if (category.slug === "services") {
    throw httpError(400, "The services category cannot be deleted");
  }

  data.categories = data.categories.filter((item) => item.id !== id);
  data.products = data.products.map((product) => (
    product.categoryId === id
      ? { ...product, categoryId: null }
      : product
  ));

  await writeStore(data);
  return makeCategoryView(category, data.products);
}

export async function listProducts() {
  const data = await readStore();
  return data.products.map(makeProductView);
}

export async function createProduct(input) {
  const data = await readStore();
  if (data.products.some((product) => product.id === input.id)) {
    throw httpError(409, "A product with this ID already exists");
  }

  if (data.products.some((product) => product.slug === input.slug)) {
    throw httpError(409, "A product with this slug already exists");
  }

  const product = normalizeProductInput(input);

  if (!product.id || !product.name || !product.slug || !Number.isFinite(product.price)) {
    throw httpError(400, "Missing required product fields");
  }

  data.products.unshift(product);
  assignProductToCategory(data, product.categoryId, product);
  await writeStore(data);
  return makeProductView(product);
}

export async function updateProduct(id, input) {
  const data = await readStore();
  const index = data.products.findIndex((product) => product.id === id);
  if (index === -1) return null;
  const currentProduct = data.products[index];
  const nextProduct = normalizeProductInput({
    ...currentProduct,
    ...input,
    id: currentProduct.id,
    slug: input.slug || currentProduct.slug || currentProduct.id
  });
  data.products[index] = {
    ...currentProduct,
    ...nextProduct,
    specs: Array.isArray(input.specs) ? input.specs : currentProduct.specs,
    tabs: input.tabs?.overview && input.tabs?.livraison ? input.tabs : currentProduct.tabs
  };
  removeProductFromCategories(data, currentProduct.id);
  assignProductToCategory(data, data.products[index].categoryId, data.products[index]);
  await writeStore(data);
  return makeProductView(data.products[index]);
}

export async function deleteProduct(id) {
  const data = await readStore();
  const index = data.products.findIndex((product) => product.id === id);
  if (index === -1) return null;

  const [removedProduct] = data.products.splice(index, 1);
  removeProductFromCategories(data, removedProduct.id);
  data.categories.forEach((category) => {
    category.essences = uniqueValues(
      (category.essences || []).filter((essence) => data.products.some((product) => category.productIds.includes(product.id) && product.essence === essence))
    );
  });

  await writeStore(data);
  return makeProductView(removedProduct);
}

export async function updateProductStock(id, stockQty) {
  const data = await readStore();
  const product = data.products.find((item) => item.id === id);
  if (!product) return null;
  product.stockQty = Number(stockQty);
  await writeStore(data);
  return makeProductView(product);
}

export async function listOrders() {
  const data = await readStore();
  return data.orders;
}

export async function updateOrder(id, input) {
  const data = await readStore();
  const order = data.orders.find((item) => item.id === id);
  if (!order) return null;
  Object.assign(order, input);
  await writeStore(data);
  return order;
}

export async function listCustomers() {
  const data = await readStore();
  return data.customers;
}

export async function createCustomerAccount(input) {
  const data = await readStore();
  const name = normalizeText(input.name);
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");
  const phone = normalizeText(input.phone);
  const city = normalizeText(input.city);

  if (!name || !email || !password) {
    throw httpError(400, "Nom, email et mot de passe obligatoires.");
  }

  let customer = data.customers.find((item) => normalizeEmail(item.email) === email);

  if (customer?.password) {
    throw httpError(409, "Un compte existe déjà avec cet email.");
  }

  if (customer) {
    customer.name = customer.name || name;
    customer.phone = phone || customer.phone || "";
    customer.city = city || customer.city || "";
    customer.memberSince = customer.memberSince || String(new Date().getFullYear());
    customer.password = password;
    customer.nextDeliverySlots = Array.isArray(customer.nextDeliverySlots) ? customer.nextDeliverySlots : [];
    customer.addresses = Array.isArray(customer.addresses) ? customer.addresses : [];
    if (city && customer.addresses.length === 0) {
      customer.addresses.push({ label: "Adresse principale", city });
    }
  } else {
    customer = {
      id: createCustomerId(data),
      name,
      email,
      phone,
      city,
      memberSince: String(new Date().getFullYear()),
      orders: 0,
      lifetime: 0,
      advisor: "",
      seasonHistory: [],
      accessNote: "",
      addresses: city ? [{ label: "Adresse principale", city }] : [],
      nextDeliverySlots: [],
      password
    };
    data.customers.unshift(customer);
  }

  await writeStore(data);
  return {
    session: toCustomerSession(customer),
    account: buildAccountView(data, customer.id)
  };
}

export async function authenticateCustomer(input) {
  const data = await readStore();
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");
  const customer = data.customers.find((item) => normalizeEmail(item.email) === email);

  if (!customer || !customer.password || customer.password !== password) {
    throw httpError(401, "Identifiants client invalides.");
  }

  return {
    session: toCustomerSession(customer),
    account: buildAccountView(data, customer.id)
  };
}

export async function authenticateAdmin(input) {
  const data = await readStore();
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");
  const seeded = await ensureAdminSeeded(data);
  if (seeded) {
    await writeStore(data);
  }

  const admin = data.admins.find((item) => normalizeEmail(item.email) === email && item.isActive !== false);
  if (!admin?.passwordHash || !(await bcrypt.compare(password, admin.passwordHash))) {
    throw httpError(401, "Identifiants admin invalides.");
  }

  admin.lastLoginAt = new Date().toISOString();
  await writeStore(data);
  return toAdminSession(admin);
}

export async function getCustomerAccount(customerId) {
  const data = await readStore();
  const account = buildAccountView(data, customerId);
  if (!account) {
    throw httpError(404, "Compte client introuvable.");
  }
  return account;
}

export async function createOrder(input) {
  const data = await readStore();
  const existingOrder = input.paymentReference
    ? data.orders.find((item) => item.paymentReference === input.paymentReference)
    : null;
  if (existingOrder) {
    return {
      order: existingOrder,
      account: buildAccountView(data, existingOrder.customerId)
    };
  }

  const customer = data.customers.find((item) => item.id === input.customerId);
  if (!customer) {
    throw httpError(404, "Compte client introuvable.");
  }

  const requestedItems = Array.isArray(input.items) ? input.items : [];
  if (requestedItems.length === 0) {
    throw httpError(400, "Le panier est vide.");
  }

  const items = requestedItems.map((item) => {
    const product = data.products.find((entry) => entry.id === item.productId);
    const quantity = Number(item.quantity);
    const selectedLength = normalizeText(item.length) || product?.length || "";
    const selectedDrying = normalizeText(item.drying) || product?.drying || "";

    if (!product || product.status === "draft") {
      throw httpError(400, "Un produit du panier n'est plus disponible.");
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw httpError(400, "Quantité produit invalide.");
    }

    if (Number(product.stockQty || 0) < quantity) {
      throw httpError(409, `Stock insuffisant pour ${product.name}.`);
    }

    const requestedUnitPrice = Number(item.unitPrice);
    const unitPrice = Number.isFinite(requestedUnitPrice) ? roundCurrency(requestedUnitPrice) : getProductPriceForLength(product, selectedLength);
    return {
      product,
      quantity,
      selectedLength,
      selectedDrying,
      unitPrice,
      total: roundCurrency(unitPrice * quantity)
    };
  });

  const subtotal = roundCurrency(items.reduce((sum, item) => sum + item.total, 0));
  const discountItems = items.map((item) => ({ categorySlugs: getCategorySlugsForProduct(data.categories, item.product), price: item.unitPrice, quantity: item.quantity }));
  const volumeDiscount = computeVolumeDiscount(discountItems, data.settings?.promotions?.volumeDiscounts);
  const promoResult = validatePromoCode(input.promoCode, subtotal, data.settings?.promotions?.promoCodes);
  if (input.promoCode && !promoResult.valid) {
    throw httpError(400, promoResult.message || "Code promo invalide.");
  }
  const discountAmount = roundCurrency(volumeDiscount.amount + promoResult.amount);
  const paymentMethod = normalizeText(input.paymentMethod) || "Carte bancaire";
  const slot = normalizeText(input.slot) || "À planifier";
  const logisticsNote = normalizeText(input.logisticsNote);
  const contactEmail = normalizeEmail(input.contactEmail) || customer.email;
  const contactPhone = normalizeText(input.contactPhone) || customer.phone || "";
  const customerName = normalizeText(input.customerName) || customer.name;
  const deliveryAddress = normalizeAddress(input.deliveryAddress, customerName);
  const billingAddress = input.billingSameAsDelivery === false
    ? normalizeAddress(input.billingAddress, customerName)
    : { ...deliveryAddress };
  const shippingResult = computeShipping({ postcode: deliveryAddress.postcode });
  if (shippingResult.quoteRequired) {
    throw httpError(400, "Cette adresse est hors zone de livraison automatique. Contactez-nous pour établir un devis.");
  }
  const shippingAmount = shippingResult.amount;
  const total = roundCurrency(subtotal - discountAmount + shippingAmount);
  const taxAmount = roundCurrency(total / 6);
  const now = new Date().toISOString();
  const status = normalizeText(input.status) || (paymentMethod === "Paiement à la livraison" ? "pending" : "paid");
  const statusLabel = normalizeText(input.statusLabel) || (status === "paid" ? "Paiement accepté" : "En attente");
  const paymentReference = normalizeText(input.paymentReference) || `WEB-${Date.now().toString(36).toUpperCase()}`;

  items.forEach(({ product, quantity }) => {
    product.stockQty = Math.max(0, Number(product.stockQty || 0) - quantity);
  });

  customer.name = customerName;
  customer.email = contactEmail;
  customer.phone = contactPhone;
  customer.city = deliveryAddress.city || customer.city || "";
  customer.orders = Number(customer.orders || 0) + 1;
  customer.lifetime = roundCurrency(Number(customer.lifetime || 0) + total);
  customer.memberSince = customer.memberSince || String(new Date().getFullYear());
  customer.nextDeliverySlots = Array.isArray(customer.nextDeliverySlots) ? customer.nextDeliverySlots : [];
  if (logisticsNote) {
    customer.accessNote = logisticsNote;
  }
  appendCustomerAddress(customer, deliveryAddress);
  appendCustomerAddress(customer, billingAddress);

  const order = {
    id: createOrderId(data),
    customerId: customer.id,
    customer: customerName,
    status,
    statusLabel,
    fulfillment: "pending",
    fulfillmentLabel: "En attente",
    total,
    channel: "Site web",
    slot,
    createdAt: now,
    paymentMethod,
    paymentReference,
    shippingAmount,
    discountAmount,
    promoCode: promoResult.valid ? promoResult.code : "",
    taxAmount,
    contactEmail,
    contactPhone,
    deliveryTruck: "",
    deliveryAddress,
    billingAddress,
    logisticsNote,
    internalNoteTitle: "Commande web",
    internalNote: "Commande saisie depuis le site public.",
    items: items.map((item) => ({
      productId: item.product.id,
      sku: item.product.sku || item.product.id.toUpperCase(),
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      length: item.selectedLength,
      drying: item.selectedDrying,
      note: [item.selectedLength, item.selectedDrying].filter(Boolean).join(" · ")
    })),
    timeline: [
      {
        at: now,
        label: "Passage de commande",
        detail: `Site web · ${customerName}`
      },
      {
        at: now,
        label: status === "paid" ? "Paiement accepté" : "Paiement en attente",
        detail: paymentMethod
      },
      {
        at: "",
        label: "En attente",
        detail: slot
      }
    ]
  };

  data.orders.unshift(order);
  await writeStore(data);

  return {
    order,
    account: buildAccountView(data, customer.id)
  };
}