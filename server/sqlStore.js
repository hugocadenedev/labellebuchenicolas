import bcrypt from "bcryptjs";
import { getDbPool, withTransaction } from "./db.js";
import { appConfig } from "./config.js";

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

const defaultProfile = {
  name: "Remi Lacaze",
  role: "Manager depot Montgaillard-Lauragais",
  initials: "RL"
};

const defaultDeliveries = [
  { truck: "Camion A", driver: "Lucas", zone: "Sud Toulouse", progress: 72, nextStop: "Auterive · 15:20" },
  { truck: "Camion B", driver: "Mehdi", zone: "Ouest", progress: 48, nextStop: "Tournefeuille · 14:35" },
  { truck: "Camion C", driver: "Anais", zone: "Nord", progress: 16, nextStop: "Balma · 16:10" }
];

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
  return {
    productOptions: {
      lengths: normalizeOptionList(productOptions.lengths, defaultProductOptionSettings.lengths),
      dryingDurations: normalizeOptionList(productOptions.dryingDurations, defaultProductOptionSettings.dryingDurations)
    },
    deliverySlots: normalizeOptionList(input?.deliverySlots, []),
    announcementBar: {
      primaryText: normalizeAnnouncementText(announcementBar.primaryText, "Tarifs TTC · TVA 10 %"),
      secondaryText: normalizeAnnouncementText(announcementBar.secondaryText, "Livraison jusqu'a 30 km : 44,00 EUR TTC"),
      tertiaryText: normalizeAnnouncementText(announcementBar.tertiaryText, "Au-dela de 60 km : sur devis"),
      backgroundColor: normalizeText(announcementBar.backgroundColor) || "#5B321D",
      textColor: normalizeText(announcementBar.textColor) || "#FBF6EE"
    },
    heroProof: {
      primaryText: normalizeAnnouncementText(heroProof.primaryText, "Tarifs TTC avec TVA 10 %"),
      secondaryText: normalizeAnnouncementText(heroProof.secondaryText, "Livraison offerte des 5 steres dans 30 km"),
      tertiaryText: normalizeAnnouncementText(heroProof.tertiaryText, "Offre 4 steres achetes = le 5e offert")
    }
  };
}

function normalizeProfile(input = {}, fallback = defaultProfile) {
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
    profile: nextData.profile || defaultProfile,
    deliveries: Array.isArray(nextData.deliveries) ? nextData.deliveries : defaultDeliveries,
    orders: Array.isArray(nextData.orders) ? nextData.orders : [],
    customers: Array.isArray(nextData.customers) ? nextData.customers : [],
    products: Array.isArray(nextData.products) ? nextData.products : [],
    categories: Array.isArray(nextData.categories) ? nextData.categories : []
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
    { k: "Origine", v: input.origin || "Sud-Ouest" },
    { k: "Longueur", v: input.length || "33 cm" },
    { k: "Humidite", v: input.humidity || "16 %" },
    { k: "Pouvoir calorifique", v: input.calorificValue || "1 800 kWh / stere" }
  ];
}

function buildProductTabs(input) {
  const productName = input.name || "Ce lot";
  const family = input.essence || input.family || "bois";
  const length = String(input.length || "33 cm");
  const drying = String(input.drying || "Seche 18 mois");
  const desc = input.desc || `${productName} est prepare pour une chauffe reguliere et une utilisation simple au quotidien.`;

  return {
    overview: {
      title: `Pourquoi choisir ${productName}`,
      paragraphs: [
        desc,
        `${family} propose une coupe ${length} avec un lot ${drying.toLowerCase()} pour un usage immediat.`
      ],
      points: [
        `Reference ${input.sku || input.id}.`,
        `${input.humidity || "16 % humidite"}.`,
        `${input.origin || "Origine Sud-Ouest"}.`
      ]
    },
    livraison: {
      title: "Livraison et disponibilite",
      paragraphs: [
        "Le produit peut etre integre aux tournees locales ou prepare pour un retrait depot selon la saison.",
        `Stock pilote en back office avec un seuil d'alerte a ${Number(input.threshold || 0)} unites.`
      ],
      points: [
        "Confirmation de creneau par SMS.",
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
  const length = input.length || "33 cm";
  const drying = input.drying || "Seche 18 mois";
  const availableLengths = normalizeOptionList(input.availableLengths, [length]);
  const lengthPrices = normalizeLengthPrices(input.lengthPrices, availableLengths, price);
  const defaultPrice = getProductPriceForLength({ price, lengthPrices, length }, length);

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
    unit: input.unit || "/ stere livre",
    badge: input.badge || "Nouveau",
    badgeTone: input.badgeTone || "green",
    rating: input.rating || "★★★★★",
    reviews: input.reviews || `${reviewCount} avis`,
    length,
    drying,
    availableLengths,
    lengthPrices,
    availableDryingDurations: normalizeOptionList(input.availableDryingDurations, [drying]),
    humidity: input.humidity || "16 % humidite",
    desc: input.desc || "",
    origin: input.origin || "Sud-Ouest",
    calorificValue: input.calorificValue || "1 800 kWh / stere",
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

function splitName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "Client", lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toJson(value) {
  return JSON.stringify(value ?? null);
}

function toIsoString(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function toAdminSession(row) {
  const firstName = row.first_name || "";
  const lastName = row.last_name || "";
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || row.email;
  return {
    id: String(row.id),
    email: row.email,
    firstName,
    lastName,
    name,
    role: row.role || "editor"
  };
}

async function ensureAdminSeeded(connection) {
  const [rows] = await connection.query("SELECT id FROM admins ORDER BY id ASC LIMIT 1");
  if (rows.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(appConfig.admin.bootstrapPassword, 10);
  await connection.query(
    `INSERT INTO admins (first_name, last_name, email, password_hash, role, is_active)
     VALUES (?, ?, ?, ?, 'super_admin', 1)`,
    [
      appConfig.admin.bootstrapFirstName,
      appConfig.admin.bootstrapLastName,
      appConfig.admin.bootstrapEmail,
      passwordHash
    ]
  );
}

async function getSettingMap(connection) {
  const [rows] = await connection.query("SELECT setting_key, value_json FROM app_settings");
  return Object.fromEntries(rows.map((row) => [row.setting_key, parseJson(row.value_json, null)]));
}

async function readSqlState() {
  const connection = getDbPool();
  const settings = await getSettingMap(connection);

  const [categoryRows] = await connection.query(`
    SELECT
      c.id,
      c.external_id,
      c.slug,
      c.label,
      c.kicker,
      c.heading,
      c.description,
      c.short_description,
      c.cover_product_external_id,
      c.essences_json,
      p.external_id AS product_external_id
    FROM categories c
    LEFT JOIN product_categories pc ON pc.category_id = c.id
    LEFT JOIN products p ON p.id = pc.product_id
    ORDER BY c.id DESC, pc.is_primary DESC, p.id ASC
  `);

  const categoryMap = new Map();
  categoryRows.forEach((row) => {
    if (!categoryMap.has(row.external_id)) {
      categoryMap.set(row.external_id, {
        id: row.external_id,
        slug: row.slug,
        label: row.label || row.slug,
        kicker: row.kicker || "",
        heading: row.heading || row.label || row.slug,
        description: row.description || "",
        shortDescription: row.short_description || "",
        coverProductId: row.cover_product_external_id || "",
        essences: parseJson(row.essences_json, []) || [],
        productIds: []
      });
    }

    if (row.product_external_id) {
      categoryMap.get(row.external_id).productIds.push(row.product_external_id);
    }
  });

  const categories = Array.from(categoryMap.values()).map((category) => ({
    ...category,
    productIds: uniqueValues(category.productIds),
    essences: uniqueValues(category.essences)
  }));

  const [productRows] = await connection.query(`
    SELECT
      p.external_id,
      p.template_product_external_id,
      p.slug,
      p.name,
      p.cat_label,
      p.essence_name,
      p.legacy_category_slug,
      p.family_name,
      p.sku,
      pv.price,
      p.old_price,
      p.unit_label,
      p.badge,
      p.badge_tone,
      p.rating_label,
      p.reviews_label,
      p.default_length,
      p.available_lengths_json,
      p.length_prices_json,
      p.default_drying,
      p.available_drying_durations_json,
      p.humidity_label,
      p.description,
      p.origin_label,
      p.calorific_value_label,
      p.image_key,
      p.image_url,
      p.gallery_keys_json,
      p.gallery_urls_json,
      p.specs_json,
      p.tabs_json,
      pv.stock_qty,
      pv.low_stock_threshold,
      p.status
    FROM products p
    LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = 1
    ORDER BY p.id DESC
  `);

  const products = productRows.map((row) => ({
    id: row.external_id,
    templateProductId: row.template_product_external_id,
    slug: row.slug,
    name: row.name,
    cat: row.cat_label || row.family_name || row.name,
    essence: row.essence_name || row.family_name || row.name,
    category: row.legacy_category_slug || "bois-de-chauffage",
    categoryId: categories.find((category) => category.productIds.includes(row.external_id))?.id || null,
    family: row.family_name || "Bois de chauffage",
    sku: row.sku,
    price: Number(row.price || 0),
    oldPrice: row.old_price === null ? null : Number(row.old_price),
    unit: row.unit_label || "/ stere livre",
    badge: row.badge || "Nouveau",
    badgeTone: row.badge_tone || "green",
    rating: row.rating_label || "",
    reviews: row.reviews_label || "",
    length: row.default_length || "33 cm",
    drying: row.default_drying || "Seche 18 mois",
    availableLengths: parseJson(row.available_lengths_json, [row.default_length || "33 cm"]),
    lengthPrices: parseJson(row.length_prices_json, {}),
    availableDryingDurations: parseJson(row.available_drying_durations_json, [row.default_drying || "Seche 18 mois"]),
    humidity: row.humidity_label || "16 % humidite",
    desc: row.description || "",
    origin: row.origin_label || "Sud-Ouest",
    calorificValue: row.calorific_value_label || "1 800 kWh / stere",
    imageKey: row.image_key || null,
    imageUrl: row.image_url || "",
    galleryKeys: parseJson(row.gallery_keys_json, []),
    galleryUrls: parseJson(row.gallery_urls_json, []),
    specs: parseJson(row.specs_json, []),
    tabs: parseJson(row.tabs_json, buildProductTabs({ name: row.name, sku: row.sku })),
    stockQty: Number(row.stock_qty || 0),
    threshold: Number(row.low_stock_threshold || 0),
    status: row.status || "active"
  }));

  const [customerRows] = await connection.query(`
    SELECT
      id,
      external_id,
      display_name,
      initials,
      email,
      phone,
      city,
      member_since,
      orders_count,
      lifetime_amount,
      advisor_name,
      season_history_json,
      next_delivery_slots_json,
      access_note,
      password_hash
    FROM customers
    ORDER BY id ASC
  `);
  const [customerAddressRows] = await connection.query(`
    SELECT
      ca.customer_id,
      ca.label,
      ca.address_line_1,
      ca.address_line_2,
      ca.postal_code,
      ca.city
    FROM customer_addresses ca
    ORDER BY ca.id ASC
  `);

  const addressesByCustomerId = new Map();
  customerAddressRows.forEach((row) => {
    const bucket = addressesByCustomerId.get(row.customer_id) || [];
    bucket.push({
      label: row.label || "Adresse",
      line1: row.address_line_1 || "",
      line2: row.address_line_2 || "",
      postcode: row.postal_code || "",
      city: row.city || ""
    });
    addressesByCustomerId.set(row.customer_id, bucket);
  });

  const customers = customerRows.map((row) => ({
    id: row.external_id,
    name: row.display_name,
    initials: row.initials || toInitials(row.display_name),
    email: row.email,
    phone: row.phone || "",
    city: row.city || "",
    memberSince: row.member_since || "",
    orders: Number(row.orders_count || 0),
    lifetime: Number(row.lifetime_amount || 0),
    advisor: row.advisor_name || "",
    seasonHistory: parseJson(row.season_history_json, []),
    accessNote: row.access_note || "",
    addresses: addressesByCustomerId.get(row.id) || [],
    nextDeliverySlots: parseJson(row.next_delivery_slots_json, []),
    passwordHash: row.password_hash || null
  }));

  const [orderRows] = await connection.query(`
    SELECT
      o.id,
      o.external_id,
      c.external_id AS customer_external_id,
      o.customer_name,
      o.status,
      o.status_label,
      o.fulfillment_status,
      o.fulfillment_label,
      o.total_amount,
      o.channel,
      o.slot_label,
      o.created_at,
      o.payment_method_label,
      o.payment_reference,
      o.shipping_amount,
      o.tax_amount,
      o.customer_email,
      o.customer_phone,
      o.delivery_truck,
      o.logistics_note,
      o.internal_note_title,
      o.internal_note,
      o.timeline_json
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    ORDER BY o.created_at DESC, o.id DESC
  `);
  const [orderAddressRows] = await connection.query(`
    SELECT
      oa.order_id,
      oa.address_type,
      oa.first_name,
      oa.last_name,
      oa.address_line_1,
      oa.address_line_2,
      oa.postal_code,
      oa.city
    FROM order_addresses oa
    ORDER BY oa.id ASC
  `);
  const [orderItemRows] = await connection.query(`
    SELECT
      oi.order_id,
      p.external_id AS product_external_id,
      oi.sku,
      oi.product_name,
      oi.quantity,
      oi.unit_price,
      oi.line_total,
      oi.note,
      oi.selected_length,
      oi.selected_drying
    FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
    ORDER BY oi.id ASC
  `);

  const orderAddressesByOrder = new Map();
  orderAddressRows.forEach((row) => {
    const bucket = orderAddressesByOrder.get(row.order_id) || {};
    bucket[row.address_type] = {
      name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim(),
      line1: row.address_line_1 || "",
      line2: row.address_line_2 || "",
      postcode: row.postal_code || "",
      city: row.city || ""
    };
    orderAddressesByOrder.set(row.order_id, bucket);
  });

  const orderItemsByOrder = new Map();
  orderItemRows.forEach((row) => {
    const bucket = orderItemsByOrder.get(row.order_id) || [];
    bucket.push({
      productId: row.product_external_id,
      sku: row.sku,
      name: row.product_name,
      quantity: Number(row.quantity || 0),
      unitPrice: Number(row.unit_price || 0),
      total: Number(row.line_total || 0),
      length: row.selected_length || "",
      drying: row.selected_drying || "",
      note: row.note || ""
    });
    orderItemsByOrder.set(row.order_id, bucket);
  });

  const orders = orderRows.map((row) => {
    const addresses = orderAddressesByOrder.get(row.id) || {};
    return {
      id: row.external_id,
      customerId: row.customer_external_id,
      customer: row.customer_name,
      status: row.status,
      statusLabel: row.status_label || "",
      fulfillment: row.fulfillment_status || "pending",
      fulfillmentLabel: row.fulfillment_label || "",
      total: Number(row.total_amount || 0),
      channel: row.channel || "",
      slot: row.slot_label || "",
      createdAt: toIsoString(row.created_at),
      paymentMethod: row.payment_method_label || "",
      paymentReference: row.payment_reference || "",
      shippingAmount: Number(row.shipping_amount || 0),
      taxAmount: Number(row.tax_amount || 0),
      contactEmail: row.customer_email || "",
      contactPhone: row.customer_phone || "",
      deliveryTruck: row.delivery_truck || "",
      deliveryAddress: addresses.shipping || { name: "", line1: "", line2: "", postcode: "", city: "" },
      billingAddress: addresses.billing || { name: "", line1: "", line2: "", postcode: "", city: "" },
      logisticsNote: row.logistics_note || "",
      internalNoteTitle: row.internal_note_title || "",
      internalNote: row.internal_note || "",
      items: orderItemsByOrder.get(row.id) || [],
      timeline: parseJson(row.timeline_json, [])
    };
  });

  return normalizeStoreShape(sanitizeStoreStrings({
    profile: settings.profile || defaultProfile,
    settings: settings.product_options || { productOptions: defaultProductOptionSettings },
    deliveries: settings.deliveries || defaultDeliveries,
    categories,
    products,
    orders,
    customers
  }));
}

export async function replaceAllDataFromSnapshot(snapshot) {
  const normalized = normalizeStoreShape(sanitizeStoreStrings(snapshot || {}));

  await withTransaction(async (connection) => {
    await connection.query("DELETE FROM order_status_history");
    await connection.query("DELETE FROM coupon_redemptions");
    await connection.query("DELETE FROM payments");
    await connection.query("DELETE FROM shipments");
    await connection.query("DELETE FROM order_items");
    await connection.query("DELETE FROM order_addresses");
    await connection.query("DELETE FROM orders");
    await connection.query("DELETE FROM cart_items");
    await connection.query("DELETE FROM carts");
    await connection.query("DELETE FROM customer_addresses");
    await connection.query("DELETE FROM customers");
    await connection.query("DELETE FROM product_images");
    await connection.query("DELETE FROM inventory_movements");
    await connection.query("DELETE FROM product_variants");
    await connection.query("DELETE FROM product_categories");
    await connection.query("DELETE FROM categories");
    await connection.query("DELETE FROM products");
    await connection.query("DELETE FROM app_settings");

    await connection.query(
      "INSERT INTO app_settings (setting_key, value_json) VALUES (?, ?), (?, ?), (?, ?)",
      [
        "profile", toJson(normalized.profile || defaultProfile),
        "product_options", toJson(normalized.settings || { productOptions: defaultProductOptionSettings }),
        "deliveries", toJson(normalized.deliveries || defaultDeliveries)
      ]
    );

    for (const category of normalized.categories) {
      await connection.query(
        `INSERT INTO categories
          (external_id, name, label, slug, kicker, heading, description, short_description, cover_product_external_id, essences_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          category.id,
          category.label || category.slug || category.id,
          category.label || category.slug || category.id,
          category.slug,
          category.kicker || null,
          category.heading || category.label || category.slug,
          category.description || null,
          category.shortDescription || null,
          category.coverProductId || null,
          toJson(uniqueValues(category.essences || []))
        ]
      );
    }

    const [categoryIdRows] = await connection.query("SELECT id, external_id FROM categories");
    const categoryIdMap = new Map(categoryIdRows.map((row) => [row.external_id, row.id]));

    for (const productInput of normalized.products) {
      const product = normalizeProductInput(productInput);
      const productType = String(product.family || "").toLowerCase().includes("service") ? "service" : "physical";
      await connection.query(
        `INSERT INTO products
          (external_id, template_product_external_id, name, slug, sku, cat_label, essence_name, family_name, legacy_category_slug, short_description, description, unit_label, badge, badge_tone, rating_label, reviews_label, default_length, available_lengths_json, length_prices_json, default_drying, available_drying_durations_json, humidity_label, origin_label, calorific_value_label, image_key, image_url, gallery_keys_json, gallery_urls_json, specs_json, tabs_json, old_price, status, product_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.templateProductId || null,
          product.name,
          product.slug,
          product.sku,
          product.cat || null,
          product.essence || null,
          product.family || null,
          product.category || null,
          product.desc || null,
          product.desc || null,
          product.unit || null,
          product.badge || null,
          product.badgeTone || null,
          product.rating || null,
          product.reviews || null,
          product.length || null,
          toJson(product.availableLengths || []),
          toJson(product.lengthPrices || {}),
          product.drying || null,
          toJson(product.availableDryingDurations || []),
          product.humidity || null,
          product.origin || null,
          product.calorificValue || null,
          product.imageKey || null,
          product.imageUrl || null,
          toJson(product.galleryKeys || []),
          toJson(product.galleryUrls || []),
          toJson(product.specs || []),
          toJson(product.tabs || {}),
          product.oldPrice,
          product.status || "active",
          productType
        ]
      );
    }

    const [productIdRows] = await connection.query("SELECT id, external_id FROM products");
    const productIdMap = new Map(productIdRows.map((row) => [row.external_id, row.id]));

    for (const productInput of normalized.products) {
      const product = normalizeProductInput(productInput);
      const productId = productIdMap.get(product.id);
      await connection.query(
        `INSERT INTO product_variants
          (product_id, sku, title, option_value_1, option_value_2, price, compare_at_price, stock_qty, low_stock_threshold, is_default, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          productId,
          product.sku,
          product.name,
          product.length || null,
          product.drying || null,
          product.price,
          product.oldPrice,
          product.stockQty,
          product.threshold,
          product.status === "active" ? 1 : 0
        ]
      );
    }

    const categoryLinks = new Set();
    normalized.categories.forEach((category) => {
      for (const productExternalId of category.productIds || []) {
        if (productIdMap.has(productExternalId) && categoryIdMap.has(category.id)) {
          categoryLinks.add(`${productExternalId}::${category.id}`);
        }
      }
    });
    normalized.products.forEach((productInput) => {
      const product = normalizeProductInput(productInput);
      if (product.categoryId && productIdMap.has(product.id) && categoryIdMap.has(product.categoryId)) {
        categoryLinks.add(`${product.id}::${product.categoryId}`);
      }
    });

    for (const link of categoryLinks) {
      const [productExternalId, categoryExternalId] = link.split("::");
      await connection.query(
        "INSERT INTO product_categories (product_id, category_id, is_primary) VALUES (?, ?, ?)",
        [productIdMap.get(productExternalId), categoryIdMap.get(categoryExternalId), 1]
      );
    }

    for (const customerInput of normalized.customers) {
      const customerName = customerInput.name || "Client";
      const name = splitName(customerName);
      const passwordHash = customerInput.passwordHash
        || (customerInput.password ? await bcrypt.hash(String(customerInput.password), 10) : null);
      await connection.query(
        `INSERT INTO customers
          (external_id, first_name, last_name, display_name, initials, email, phone, city, password_hash, member_since, orders_count, lifetime_amount, advisor_name, season_history_json, next_delivery_slots_json, access_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerInput.id,
          name.firstName,
          name.lastName,
          customerName,
          customerInput.initials || toInitials(customerName),
          normalizeEmail(customerInput.email),
          customerInput.phone || null,
          customerInput.city || null,
          passwordHash,
          customerInput.memberSince || null,
          Number(customerInput.orders || 0),
          Number(customerInput.lifetime || 0),
          customerInput.advisor || null,
          toJson(customerInput.seasonHistory || []),
          toJson(customerInput.nextDeliverySlots || []),
          customerInput.accessNote || null
        ]
      );
    }

    const [customerIdRows] = await connection.query("SELECT id, external_id FROM customers");
    const customerIdMap = new Map(customerIdRows.map((row) => [row.external_id, row.id]));

    for (const customerInput of normalized.customers) {
      const customerId = customerIdMap.get(customerInput.id);
      const customerName = splitName(customerInput.name || "Client");
      for (const [index, address] of (customerInput.addresses || []).entries()) {
        await connection.query(
          `INSERT INTO customer_addresses
            (customer_id, label, first_name, last_name, address_line_1, address_line_2, postal_code, city, is_default_shipping, is_default_billing)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            customerId,
            address.label || `Adresse ${index + 1}`,
            customerName.firstName,
            customerName.lastName,
            address.line1 || "",
            address.line2 || null,
            address.postcode || "",
            address.city || customerInput.city || "",
            index === 0 ? 1 : 0,
            index === 0 ? 1 : 0
          ]
        );
      }
    }

    const [variantRows] = await connection.query(`
      SELECT pv.id, p.external_id
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      WHERE pv.is_default = 1
    `);
    const variantIdMap = new Map(variantRows.map((row) => [row.external_id, row.id]));

    for (const orderInput of normalized.orders) {
      const status = orderInput.status || "pending";
      const paymentStatus = status === "paid"
        ? "paid"
        : status === "partial_refund"
          ? "partially_refunded"
          : status === "refunded"
            ? "refunded"
            : "pending";
      await connection.query(
        `INSERT INTO orders
          (external_id, order_number, customer_id, status, status_label, payment_status, fulfillment_status, fulfillment_label, customer_name, customer_email, customer_phone, channel, slot_label, payment_method_label, payment_reference, delivery_truck, subtotal_amount, shipping_amount, tax_amount, total_amount, logistics_note, internal_note_title, internal_note, timeline_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          orderInput.id,
          orderInput.id,
          customerIdMap.get(orderInput.customerId) || null,
          status,
          orderInput.statusLabel || null,
          paymentStatus,
          orderInput.fulfillment || "pending",
          orderInput.fulfillmentLabel || null,
          orderInput.customer || null,
          normalizeEmail(orderInput.contactEmail),
          orderInput.contactPhone || null,
          orderInput.channel || null,
          orderInput.slot || null,
          orderInput.paymentMethod || null,
          orderInput.paymentReference || null,
          orderInput.deliveryTruck || null,
          Number((orderInput.items || []).reduce((sum, item) => sum + Number(item.total || 0), 0)),
          Number(orderInput.shippingAmount || 0),
          Number(orderInput.taxAmount || 0),
          Number(orderInput.total || 0),
          orderInput.logisticsNote || null,
          orderInput.internalNoteTitle || null,
          orderInput.internalNote || null,
          toJson(orderInput.timeline || []),
          orderInput.createdAt ? new Date(orderInput.createdAt) : new Date(),
          orderInput.createdAt ? new Date(orderInput.createdAt) : new Date()
        ]
      );
    }

    const [orderIdRows] = await connection.query("SELECT id, external_id FROM orders");
    const orderIdMap = new Map(orderIdRows.map((row) => [row.external_id, row.id]));

    for (const orderInput of normalized.orders) {
      const orderId = orderIdMap.get(orderInput.id);
      const shippingName = splitName(orderInput.deliveryAddress?.name || orderInput.customer || "Client");
      const billingName = splitName(orderInput.billingAddress?.name || orderInput.customer || "Client");
      await connection.query(
        `INSERT INTO order_addresses
          (order_id, address_type, first_name, last_name, address_line_1, address_line_2, postal_code, city)
         VALUES (?, 'shipping', ?, ?, ?, ?, ?, ?), (?, 'billing', ?, ?, ?, ?, ?, ?)` ,
        [
          orderId,
          shippingName.firstName,
          shippingName.lastName,
          orderInput.deliveryAddress?.line1 || "",
          orderInput.deliveryAddress?.line2 || null,
          orderInput.deliveryAddress?.postcode || "",
          orderInput.deliveryAddress?.city || "",
          orderId,
          billingName.firstName,
          billingName.lastName,
          orderInput.billingAddress?.line1 || "",
          orderInput.billingAddress?.line2 || null,
          orderInput.billingAddress?.postcode || "",
          orderInput.billingAddress?.city || ""
        ]
      );

      for (const item of orderInput.items || []) {
        await connection.query(
          `INSERT INTO order_items
            (order_id, product_id, variant_id, sku, product_name, variant_title, note, selected_length, selected_drying, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            productIdMap.get(item.productId) || null,
            variantIdMap.get(item.productId) || null,
            item.sku || String(item.productId || "PRODUIT").toUpperCase(),
            item.name,
            [item.length, item.drying].filter(Boolean).join(" · ") || null,
            item.note || null,
            item.length || null,
            item.drying || null,
            Number(item.quantity || 0),
            Number(item.unitPrice || 0),
            Number(item.total || 0)
          ]
        );
      }
    }
  });
}

async function readStore() {
  return readSqlState();
}

async function writeStore(data) {
  await replaceAllDataFromSnapshot(data);
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

export async function updateSettings(input) {
  const data = await readStore();
  data.profile = normalizeProfile({
    ...data.profile,
    ...input?.profile
  }, data.profile || defaultProfile);
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
  return data.customers.map(({ passwordHash, ...customer }) => customer);
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

  if (customer?.passwordHash) {
    throw httpError(409, "Un compte existe déjà avec cet email.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  if (customer) {
    customer.name = customer.name || name;
    customer.phone = phone || customer.phone || "";
    customer.city = city || customer.city || "";
    customer.memberSince = customer.memberSince || String(new Date().getFullYear());
    customer.passwordHash = passwordHash;
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
      passwordHash
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

  if (!customer?.passwordHash || !(await bcrypt.compare(password, customer.passwordHash))) {
    throw httpError(401, "Identifiants client invalides.");
  }

  return {
    session: toCustomerSession(customer),
    account: buildAccountView(data, customer.id)
  };
}

export async function authenticateAdmin(input) {
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");
  if (!email || !password) {
    throw httpError(400, "Email et mot de passe admin requis.");
  }

  const connection = getDbPool();
  await ensureAdminSeeded(connection);
  const [rows] = await connection.query(
    `SELECT id, first_name, last_name, email, password_hash, role, is_active
     FROM admins
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  const admin = rows[0];
  if (!admin || !admin.is_active || !(await bcrypt.compare(password, admin.password_hash || ""))) {
    throw httpError(401, "Identifiants admin invalides.");
  }

  await connection.query("UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [admin.id]);
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
  const shippingAmount = Number.isFinite(Number(input.shippingAmount))
    ? roundCurrency(Number(input.shippingAmount))
    : subtotal >= 600 ? 0 : 49;
  const total = roundCurrency(subtotal + shippingAmount);
  const taxAmount = roundCurrency(total / 6);
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