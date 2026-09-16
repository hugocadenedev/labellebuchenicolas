import heroImage from "../ChatGPT Image 11 sept. 2026, 10_06_45.png";
import woodYardImage from "../parc.jpg";
import deliveryImage from "../livraison.jpg";
import chene33 from "../chene-33.jpg";
import chene25 from "../chene-25.jpg";
import chene50 from "../chene-50.jpg";
import charme33 from "../charme-33.jpg";
import charmeCloseup from "../charme-closeup.jpg";
import cheneSplit from "../chene-split.jpg";
import frene50 from "../frene-50.jpg";
import hetre25 from "../hetre-25.jpg";
import melange33 from "../melange-33.jpg";
import kindling from "../kindling.jpg";
import forestImage from "../foret.jpg";
import closeupImage from "../closeup.jpg";
import rondins1m from "../rondins-1m.jpg";
import etuve33 from "../etuve-33.jpg";
import lot5 from "../lot5.jpg";
import logoImage from "../logo-la-belle-buche-reel.png";
import headerLogoImage from "../logo pour site web.png";

export const brand = {
  name: "La Belle Bûche",
  baseline: "Bois de chauffage, allumage et livraison locale",
  phone: "06 30 46 09 35",
  advisorPhone: "05 61 76 70 78",
  email: "contact@labellebuche.fr",
  logo: logoImage,
  headerLogo: headerLogoImage,
  heroImage,
  woodYardImage,
  deliveryImage,
  forestImage,
  closeupImage
};

export const productMediaLibrary = {
  heroImage: { label: "Pile sous auvent", src: heroImage },
  woodYardImage: { label: "Parc a bois", src: woodYardImage },
  deliveryImage: { label: "Livraison", src: deliveryImage },
  chene33: { label: "Chene 33 cm", src: chene33 },
  chene25: { label: "Chene 25 cm", src: chene25 },
  charme33: { label: "Charme 33 cm", src: charme33 },
  charmeCloseup: { label: "Gros plan charme", src: charmeCloseup },
  cheneSplit: { label: "Chene fendu", src: cheneSplit },
  frene50: { label: "Frene 50 cm", src: frene50 },
  melange33: { label: "Melange feuillus", src: melange33 },
  kindling: { label: "Allume-feu", src: kindling },
  forestImage: { label: "Foret", src: forestImage },
  closeupImage: { label: "Texture bois", src: closeupImage },
  rondins1m: { label: "Buches 1 m", src: rondins1m },
  etuve33: { label: "Bois etuve", src: etuve33 },
  lot5: { label: "Lot 5 steres", src: lot5 }
};

function buildCatalogProduct({
  id,
  slug,
  name,
  cat,
  essence,
  category = "bois-de-chauffage",
  family,
  price,
  unit,
  badge,
  badgeTone,
  stockPct,
  stockLabel,
  length,
  drying,
  humidity,
  desc,
  image,
  gallery,
  origin,
  calorificValue,
  overviewTitle,
  overviewParagraphs,
  overviewPoints,
  deliveryTitle,
  deliveryParagraphs,
  deliveryPoints,
  specsExtras = []
}) {
  return {
    id,
    slug,
    name,
    cat,
    essence,
    category,
    family,
    price,
    unit,
    badge,
    badgeTone,
    stockPct,
    stockLabel,
    length,
    drying,
    humidity,
    desc,
    shot: name,
    image,
    gallery,
    origin,
    specs: [
      { k: category === "accessoires" ? "Produit" : "Essence", v: essence },
      { k: "Origine", v: origin },
      { k: category === "accessoires" ? "Conditionnement" : "Longueur", v: length },
      { k: category === "accessoires" ? "Usage" : "Humidité", v: humidity },
      ...specsExtras,
      { k: category === "accessoires" ? "Tarif TTC" : "Pouvoir calorifique", v: calorificValue }
    ],
    tabs: {
      overview: {
        title: overviewTitle,
        paragraphs: overviewParagraphs,
        points: overviewPoints
      },
      livraison: {
        title: deliveryTitle,
        paragraphs: deliveryParagraphs,
        points: deliveryPoints
      }
    }
  };
}

export const products = [
  buildCatalogProduct({
    id: "chene-25",
    slug: "chene-25-cm",
    name: "Stère de chêne 25 cm",
    cat: "Chêne",
    essence: "Chêne",
    family: "Chêne",
    price: 140,
    unit: "/ stère TTC",
    badge: "Séché 2 ans et demi",
    badgeTone: "warm",
    stockPct: 72,
    stockLabel: "Disponible au dépôt et en livraison",
    length: "25 cm",
    drying: "Séché 2 ans et demi",
    humidity: "Bois sec prêt à brûler",
    desc: "Coupe courte en chêne pour inserts compacts et chargements plus fréquents mais très réguliers.",
    image: chene25,
    gallery: [chene25, chene33, cheneSplit, closeupImage],
    origin: "Sud-Ouest",
    calorificValue: "1 900 kWh / stère",
    overviewTitle: "Le chêne court pour foyers compacts",
    overviewParagraphs: [
      "Cette coupe 25 cm reprend le tarif réel de la grille et convient bien aux inserts et petits poêles.",
      "Le bois est séché deux ans et demi pour une chauffe dense et stable sur la durée."
    ],
    overviewPoints: ["Tarif TTC: 140,00 €.", "Coupe 25 cm.", "Séché 2 ans et demi."],
    deliveryTitle: "Livraison et rangement",
    deliveryParagraphs: [
      "Livraison jusqu'à 30 km: 44,00 € TTC. De 31 à 60 km: 66,00 € TTC.",
      "Rangement possible: 55,00 € TTC pour 1 stère, 165,00 € TTC pour 4 stères, 220,00 € TTC pour 6 stères."
    ],
    deliveryPoints: ["Livraison offerte dès 5 stères dans 30 km.", "10 allume-feu offerts dès 2 stères.", "Au-delà de 60 km: sur devis."]
  }),
  buildCatalogProduct({
    id: "chene-33",
    slug: "chene-33-cm",
    name: "Stère de chêne 33 cm",
    cat: "Chêne",
    essence: "Chêne",
    family: "Chêne",
    price: 130,
    unit: "/ stère TTC",
    badge: "Référence foyer",
    badgeTone: "dark",
    stockPct: 78,
    stockLabel: "Format le plus polyvalent",
    length: "33 cm",
    drying: "Séché 2 ans et demi",
    humidity: "Bois sec prêt à brûler",
    desc: "Le format chêne le plus passe-partout pour inserts, poêles et chauffe principale.",
    image: chene33,
    gallery: [chene33, cheneSplit, chene25, forestImage],
    origin: "Sud-Ouest",
    calorificValue: "1 900 kWh / stère",
    overviewTitle: "Le chêne 33 cm, format de référence",
    overviewParagraphs: [
      "À 130,00 € TTC, c'est la coupe de chêne la plus équilibrée de la grille tarifaire.",
      "Elle reste adaptée à la majorité des appareils domestiques et à la chauffe quotidienne."
    ],
    overviewPoints: ["Tarif TTC: 130,00 €.", "Séché 2 ans et demi.", "Idéal pour un usage principal."],
    deliveryTitle: "Conditions de livraison",
    deliveryParagraphs: [
      "La livraison locale reste facturée séparément selon la distance réelle.",
      "L'offre de lancement 4 stères achetés = le 5e offert s'applique jusqu'au 20/11/2026."
    ],
    deliveryPoints: ["44,00 € TTC jusqu'à 30 km.", "66,00 € TTC de 31 à 60 km.", "Livraison gratuite dès 5 stères dans 30 km."]
  }),
  buildCatalogProduct({
    id: "chene-50",
    slug: "chene-50-cm",
    name: "Stère de chêne 50 cm",
    cat: "Chêne",
    essence: "Chêne",
    family: "Chêne",
    price: 120,
    unit: "/ stère TTC",
    badge: "Grand foyer",
    badgeTone: "warm",
    stockPct: 64,
    stockLabel: "Pour foyers acceptant les longues bûches",
    length: "50 cm",
    drying: "Séché 2 ans et demi",
    humidity: "Bois sec prêt à brûler",
    desc: "Un chêne en bûches plus longues, pensé pour réduire la fréquence des rechargements.",
    image: chene50,
    gallery: [chene50, chene33, woodYardImage, forestImage],
    origin: "Sud-Ouest",
    calorificValue: "1 900 kWh / stère",
    overviewTitle: "Pour les appareils qui acceptent le 50 cm",
    overviewParagraphs: [
      "Le 50 cm conserve la densité du chêne avec un tarif TTC de 120,00 €.",
      "Cette coupe s'adresse surtout aux foyers plus larges et aux utilisateurs qui veulent moins manipuler."
    ],
    overviewPoints: ["Tarif TTC: 120,00 €.", "Coupe 50 cm.", "Séché 2 ans et demi."],
    deliveryTitle: "Livraison adaptée au volume",
    deliveryParagraphs: [
      "Comme pour le reste de la gamme, la livraison démarre à 44,00 € TTC jusqu'à 30 km.",
      "Le rangement reste possible en option si l'accès est praticable."
    ],
    deliveryPoints: ["Rangement 1 stère: 55,00 € TTC.", "Rangement 4 stères: 165,00 € TTC.", "Rangement 6 stères: 220,00 € TTC."]
  }),
  buildCatalogProduct({
    id: "chene-2m",
    slug: "chene-2-m",
    name: "Stère de chêne 2 m",
    cat: "Chêne",
    essence: "Chêne",
    family: "Chêne",
    price: 90,
    unit: "/ stère TTC",
    badge: "Grand stockage",
    badgeTone: "green",
    stockPct: 48,
    stockLabel: "Pour coupe longue et recoupe sur place",
    length: "2 m",
    drying: "Séché 2 ans et demi",
    humidity: "Bois sec prêt à brûler",
    desc: "Le chêne au plus bas tarif de la grille, destiné aux très grands espaces de stockage.",
    image: rondins1m,
    gallery: [rondins1m, woodYardImage, forestImage, deliveryImage],
    origin: "Sud-Ouest",
    calorificValue: "1 900 kWh / stère",
    overviewTitle: "Le tarif chêne le plus bas de la grille",
    overviewParagraphs: [
      "À 90,00 € TTC, cette coupe 2 m s'adresse aux clients capables de manipuler et recouper sur place.",
      "Elle garde le même bois sec, avec une logistique qui demande plus d'anticipation."
    ],
    overviewPoints: ["Tarif TTC: 90,00 €.", "Coupe 2 m.", "Séché 2 ans et demi."],
    deliveryTitle: "Privilégier un accès simple",
    deliveryParagraphs: [
      "Les longues bûches demandent un point de déchargement clair et accessible.",
      "Au-delà de 60 km, le transport est établi sur devis."
    ],
    deliveryPoints: ["44,00 € TTC jusqu'à 30 km.", "66,00 € TTC de 31 à 60 km.", "Sur devis au-delà."]
  }),
  buildCatalogProduct({
    id: "hetre-25",
    slug: "hetre-25-cm",
    name: "Stère de hêtre 25 cm",
    cat: "Hêtre",
    essence: "Hêtre",
    family: "Hêtre",
    price: 120,
    unit: "/ stère TTC",
    badge: "Petit appareil",
    badgeTone: "warm",
    stockPct: 68,
    stockLabel: "Disponible sur la coupe courte",
    length: "25 cm",
    drying: "Séché 2 ans",
    humidity: "Bois sec prêt à brûler",
    desc: "Le hêtre 25 cm combine allumage vif et encombrement réduit pour les foyers plus petits.",
    image: hetre25,
    gallery: [hetre25, closeupImage, forestImage, deliveryImage],
    origin: "Sud-Ouest",
    calorificValue: "1 850 kWh / stère",
    overviewTitle: "Le hêtre en coupe courte",
    overviewParagraphs: [
      "Le hêtre 25 cm est proposé à 120,00 € TTC avec un séchage de 2 ans.",
      "Il convient bien aux appareils demandant un rechargement simple et rapide."
    ],
    overviewPoints: ["Tarif TTC: 120,00 €.", "Séché 2 ans.", "Format 25 cm."],
    deliveryTitle: "Même grille de services",
    deliveryParagraphs: [
      "Le hêtre suit la même tarification de livraison et de rangement que le chêne.",
      "Les offres allume-feu et livraison offerte restent valables selon les volumes commandés."
    ],
    deliveryPoints: ["10 allume-feu offerts dès 2 stères.", "Livraison offerte dès 5 stères dans 30 km.", "Sur devis au-delà de 60 km."]
  }),
  buildCatalogProduct({
    id: "hetre-33",
    slug: "hetre-33-cm",
    name: "Stère de hêtre 33 cm",
    cat: "Hêtre",
    essence: "Hêtre",
    family: "Hêtre",
    price: 110,
    unit: "/ stère TTC",
    badge: "Bon compromis",
    badgeTone: "green",
    stockPct: 74,
    stockLabel: "Format courant en hêtre",
    length: "33 cm",
    drying: "Séché 2 ans",
    humidity: "Bois sec prêt à brûler",
    desc: "Une coupe de hêtre polyvalente pour une flambée vive et un chargement facile au quotidien.",
    image: hetre25,
    gallery: [hetre25, closeupImage, woodYardImage, forestImage],
    origin: "Sud-Ouest",
    calorificValue: "1 850 kWh / stère",
    overviewTitle: "Le hêtre 33 cm pour la chauffe régulière",
    overviewParagraphs: [
      "À 110,00 € TTC, il constitue la référence hêtre la plus équilibrée de la grille.",
      "Le séchage de 2 ans le rend prêt à l'emploi pour une flambée nerveuse et propre."
    ],
    overviewPoints: ["Tarif TTC: 110,00 €.", "Coupe 33 cm.", "Séché 2 ans."],
    deliveryTitle: "Livraison locale ou retrait",
    deliveryParagraphs: [
      "Le retrait dépôt reste possible en complément des tournées de livraison.",
      "La grille tarifaire indiquée est TTC, TVA 10 % comprise."
    ],
    deliveryPoints: ["44,00 € TTC jusqu'à 30 km.", "66,00 € TTC de 31 à 60 km.", "Retrait dépôt possible."]
  }),
  buildCatalogProduct({
    id: "hetre-50",
    slug: "hetre-50-cm",
    name: "Stère de hêtre 50 cm",
    cat: "Hêtre",
    essence: "Hêtre",
    family: "Hêtre",
    price: 100,
    unit: "/ stère TTC",
    badge: "Longue coupe",
    badgeTone: "dark",
    stockPct: 58,
    stockLabel: "Pour foyers plus généreux",
    length: "50 cm",
    drying: "Séché 2 ans",
    humidity: "Bois sec prêt à brûler",
    desc: "Le hêtre 50 cm garde une chauffe vive sur les appareils qui acceptent les bûches longues.",
    image: woodYardImage,
    gallery: [woodYardImage, hetre25, closeupImage, deliveryImage],
    origin: "Sud-Ouest",
    calorificValue: "1 850 kWh / stère",
    overviewTitle: "Le hêtre long à tarif contenu",
    overviewParagraphs: [
      "Cette coupe 50 cm est affichée à 100,00 € TTC dans la grille fournie.",
      "Elle convient aux foyers qui veulent conserver la vivacité du hêtre avec moins de manipulations."
    ],
    overviewPoints: ["Tarif TTC: 100,00 €.", "Séché 2 ans.", "Coupe 50 cm."],
    deliveryTitle: "Distance et options",
    deliveryParagraphs: [
      "Les conditions de livraison sont identiques à toute la gamme bois de chauffage.",
      "Le rangement est disponible selon le volume livré et l'accès au lieu de stockage."
    ],
    deliveryPoints: ["Rangement 1 stère: 55,00 € TTC.", "Rangement 4 stères: 165,00 € TTC.", "Rangement 6 stères: 220,00 € TTC."]
  }),
  buildCatalogProduct({
    id: "charme-50",
    slug: "charme-50-cm",
    name: "Stère de charme 50 cm",
    cat: "Charme",
    essence: "Charme",
    family: "Charme",
    price: 115,
    unit: "/ stère TTC",
    badge: "Flambée vive",
    badgeTone: "green",
    stockPct: 55,
    stockLabel: "Essence vive et régulière",
    length: "50 cm",
    drying: "Séché 2 ans",
    humidity: "Bois sec prêt à brûler",
    desc: "Le charme 50 cm est destiné aux foyers capables d'encaisser une montée en température rapide.",
    image: charme33,
    gallery: [charme33, charmeCloseup, woodYardImage, forestImage],
    origin: "Sud-Ouest",
    calorificValue: "1 860 kWh / stère",
    overviewTitle: "Le charme pour une chauffe vive",
    overviewParagraphs: [
      "Affiché à 115,00 € TTC, ce lot garde la nervosité typique du charme sur une coupe 50 cm.",
      "Il complète bien un besoin de chauffe rapide sur grands foyers."
    ],
    overviewPoints: ["Tarif TTC: 115,00 €.", "Séché 2 ans.", "Coupe 50 cm."],
    deliveryTitle: "Même service, autre essence",
    deliveryParagraphs: [
      "Le charme bénéficie des mêmes conditions de livraison et de rangement que les autres stères.",
      "L'offre allume-feu et la livraison offerte à partir de 5 stères s'appliquent aussi."
    ],
    deliveryPoints: ["10 allume-feu offerts dès 2 stères.", "Livraison offerte dans 30 km dès 5 stères.", "Au-delà de 60 km: sur devis."]
  }),
  buildCatalogProduct({
    id: "chataignier-50",
    slug: "chataignier-50-cm",
    name: "Stère de châtaignier 50 cm",
    cat: "Châtaignier",
    essence: "Châtaignier",
    family: "Châtaignier",
    price: 95,
    unit: "/ stère TTC",
    badge: "Tarif doux",
    badgeTone: "warm",
    stockPct: 46,
    stockLabel: "Essence disponible sur la coupe 50 cm",
    length: "50 cm",
    drying: "Séché 2 ans",
    humidity: "Bois sec prêt à brûler",
    desc: "Le châtaignier 50 cm propose l'une des entrées de prix les plus accessibles de la grille.",
    image: melange33,
    gallery: [melange33, woodYardImage, forestImage, deliveryImage],
    origin: "Sud-Ouest",
    calorificValue: "1 700 kWh / stère",
    overviewTitle: "Le châtaignier au tarif le plus accessible",
    overviewParagraphs: [
      "Avec un prix TTC de 95,00 €, cette coupe 50 cm sert de point d'entrée sur les bois feuillus séchés 2 ans.",
      "Elle convient bien aux besoins d'appoint ou de complément de commande."
    ],
    overviewPoints: ["Tarif TTC: 95,00 €.", "Séché 2 ans.", "Coupe 50 cm."],
    deliveryTitle: "Livraison sur la même grille kilométrique",
    deliveryParagraphs: [
      "Les frais de livraison et de rangement sont identiques à ceux du reste du catalogue bois.",
      "Au-delà de 60 km, la prestation est chiffrée sur devis."
    ],
    deliveryPoints: ["44,00 € TTC jusqu'à 30 km.", "66,00 € TTC de 31 à 60 km.", "Sur devis au-delà."]
  }),
  buildCatalogProduct({
    id: "allume-feu",
    slug: "boite-30-allume-feu-naturel",
    name: "Boîte de 30 allume-feu naturels",
    cat: "Allumage",
    essence: "Allume-feu naturel",
    category: "accessoires",
    family: "Allumage",
    price: 7.9,
    unit: "/ boîte TTC",
    badge: "Complément",
    badgeTone: "green",
    stockPct: 88,
    stockLabel: "À ajouter à toute commande bois",
    length: "Boîte de 30",
    drying: "Copeaux de résineux",
    humidity: "Allumage naturel",
    desc: "Une boîte de 30 allume-feu naturels pour sécuriser les départs de feu sans papier ni accélérant.",
    image: kindling,
    gallery: [kindling, closeupImage, deliveryImage, woodYardImage],
    origin: "Atelier partenaire",
    calorificValue: "7,90 € TTC",
    overviewTitle: "Le complément simple pour démarrer proprement",
    overviewParagraphs: [
      "La boîte de 30 allume-feu naturels est proposée à 7,90 € TTC.",
      "Elle s'ajoute à une livraison de bois ou à un retrait dépôt sans logistique spécifique."
    ],
    overviewPoints: ["Prix TTC: 7,90 €.", "Copeaux de résineux naturels.", "Compatible livraison ou retrait."],
    deliveryTitle: "Même tournée, même retrait",
    deliveryParagraphs: [
      "Les allume-feu peuvent être ajoutés à n'importe quelle commande de bois.",
      "À partir de 2 stères achetés, 10 allume-feu sont offerts dans le cadre de l'avantage annoncé."
    ],
    deliveryPoints: ["Ajout simple à la commande.", "Retrait dépôt possible.", "Offerts dès 2 stères selon l'offre en cours."],
    specsExtras: [{ k: "Compatibilité", v: "Livraison ou retrait" }]
  }),
  buildCatalogProduct({
    id: "filet-bois-allumage-50l",
    slug: "filet-bois-allumage-50-l",
    name: "Filet de 50 L bois d'allumage",
    cat: "Allumage",
    essence: "Bois d'allumage",
    category: "accessoires",
    family: "Allumage",
    price: 12.9,
    unit: "/ filet TTC",
    badge: "Petit bois",
    badgeTone: "warm",
    stockPct: 82,
    stockLabel: "Complément utile pour le démarrage",
    length: "Filet 50 L",
    drying: "Petit bois sec",
    humidity: "Allumage rapide",
    desc: "Le petit bois d'allumage en filet 50 L pour préparer les flambées plus rapidement.",
    image: kindling,
    gallery: [kindling, deliveryImage, closeupImage, woodYardImage],
    origin: "Sud-Ouest",
    calorificValue: "12,90 € TTC",
    overviewTitle: "Le filet d'allumage à garder sous la main",
    overviewParagraphs: [
      "Ce filet de 50 L est affiché à 12,90 € TTC dans la grille tarifaire.",
      "Il complète naturellement un achat de stères pour simplifier les premières flambées."
    ],
    overviewPoints: ["Prix TTC: 12,90 €.", "Filet de 50 L.", "Petit bois sec."],
    deliveryTitle: "Ajouté à la même logistique",
    deliveryParagraphs: [
      "Le filet voyage avec les commandes bois ou peut être retiré au dépôt.",
      "Il permet d'avoir un démarrage plus propre sans multiplier les petits achats séparés."
    ],
    deliveryPoints: ["Ajout à la tournée.", "Retrait dépôt.", "Pas de surcoût logistique dédié."],
    specsExtras: [{ k: "Compatibilité", v: "Livraison ou retrait" }]
  })
];

export const families = [
  { label: "Chêne", from: "Dès 90 €", count: "4 références", photo: chene33 },
  { label: "Hêtre", from: "Dès 100 €", count: "3 références", photo: hetre25 },
  { label: "Charme", from: "115 €", count: "1 référence", photo: charme33 },
  { label: "Châtaignier", from: "95 €", count: "1 référence", photo: melange33 },
  { label: "Allumage", from: "Dès 7,90 €", count: "2 références", photo: kindling }
];

export const compareRows = [
  { label: "Coupes disponibles", values: ["25 / 33 / 50 cm / 2 m", "25 / 33 / 50 cm", "50 cm", "50 cm"] },
  { label: "Séchage", values: ["2 ans et demi", "2 ans", "2 ans", "2 ans"] },
  { label: "Prix TTC", values: ["90 € à 140 €", "100 € à 120 €", "115 €", "95 €"] },
  { label: "Livraison jusqu'à 30 km", values: ["44,00 €", "44,00 €", "44,00 €", "44,00 €"] },
  { label: "Usage conseillé", values: ["Chauffe principale", "Flambée vive", "Relance rapide", "Appoint / complément"] }
];

export const services = [
  {
    kicker: "Service 01",
    title: "Rangement du bois",
    desc: "55,00 € TTC pour 1 stère, 165,00 € TTC pour 4 stères et 220,00 € TTC pour 6 stères."
  },
  {
    kicker: "Service 02",
    title: "Livraison locale",
    desc: "44,00 € TTC jusqu'à 30 km, 66,00 € TTC de 31 à 60 km, puis sur devis au-delà."
  },
  {
    kicker: "Service 03",
    title: "Option palox consigne",
    desc: "Caution de 60 € par chèque non encaissé, avec conservation possible du bois dans le palox."
  }
];

export const reviews = [
  {
    author: "Camille, Tournefeuille",
    quote: "Le chêne 33 cm est arrivé bien sec et le rangement demandé a été respecté du début à la fin.",
    initial: "CT"
  },
  {
    author: "Jérôme, Muret",
    quote: "Le filet d'allumage en complément de livraison est pratique et la coupe 50 cm correspondait exactement à la commande.",
    initial: "JM"
  },
  {
    author: "Nadia, Auterive",
    quote: "La grille tarifaire est claire, surtout avec les frais de livraison et l'offre du 5e stère bien affichés.",
    initial: "NA"
  }
];

export const faqs = [
  {
    q: "La livraison est-elle comprise dans le prix du stère ?",
    a: "Non. Les prix produits sont affichés TTC avec TVA à 10 %. La livraison est à 44,00 € TTC jusqu'à 30 km, puis 66,00 € TTC de 31 à 60 km. Au-delà, le tarif est sur devis."
  },
  {
    q: "Quelle offre est en cours sur les gros volumes ?",
    a: "L'offre de lancement en cours est: 4 stères achetés = le 5e offert. Elle est valable jusqu'au 20/11/2026 et n'est pas cumulable avec la livraison offerte dès 5 stères."
  },
  {
    q: "Quand la livraison devient-elle offerte ?",
    a: "La livraison est offerte dès 5 stères dans un rayon de 30 km à partir du dépôt."
  },
  {
    q: "Comment fonctionne l'option palox consigne ?",
    a: "Une caution de 60 € par chèque non encaissé est demandée. Le bois peut rester rangé dans le palox. Si le palox n'est pas restitué ou récupéré sous 1 an, la caution est encaissée."
  }
];

export const posts = [
  {
    title: "Comment profiter de l'offre 4 stères achetés = le 5e offert",
    meta: "Offre de saison · 3 min",
    image: lot5
  },
  {
    title: "Quelle coupe choisir entre 25, 33, 50 cm et 2 m ?",
    meta: "Guide pratique · 5 min",
    image: closeupImage
  },
  {
    title: "Palox, rangement et livraison: ce qu'il faut prévoir avant la tournée",
    meta: "Livraison · 4 min",
    image: deliveryImage
  }
];

export const accountData = {
  customer: "Camille Vasseur",
  initials: "CV",
  advisor: "Rémi — dépôt de Montgaillard-Lauragais",
  memberSince: "2021",
  stats: [
    { kicker: "Saison en cours", value: "6,8 st", desc: "Consommation moyenne sur les 3 derniers hivers" },
    { kicker: "Commande active", value: "LB-2609", desc: "4 stères de chêne 33 cm en route" },
    { kicker: "Cumul annuel", value: "2 490 €", desc: "Commandes bois, allumage et livraison comprises" },
    { kicker: "Adresse suivie", value: "2", desc: "Montgaillard-Lauragais et maison familiale à Auterive" }
  ],
  activeOrderHeadline: "LBB-2026-091 — 4 × Stère de chêne 33 cm",
  activeOrderStatus: "En route",
  trackSteps: [
    { label: "Commande confirmée", when: "Aujourd'hui · 08:12", desc: "Paiement validé et lot réservé au dépôt de Montgaillard-Lauragais.", active: true },
    { label: "Chargement du camion", when: "Aujourd'hui · 10:05", desc: "Le lot est en cours de préparation avec contrôle humidité.", active: true },
    { label: "En route vers Auterive", when: "Aujourd'hui · 13:20", desc: "Le chauffeur vous appelle 30 minutes avant arrivée.", active: true },
    { label: "Déchargement", when: "Prévu entre 15:00 et 17:00", desc: "Rangement au bûcher demandé sur accès jardin.", active: false }
  ],
  orders: [
    {
      ref: "LBB-2026-091",
      status: "Livraison confirmée",
      total: "445,00 €",
      date: "03 sept. 2026",
      note: "Créneau confirmé par SMS.",
      items: ["4 stères de chêne 33 cm", "1 boîte de 30 allume-feu naturels"]
    },
    {
      ref: "LBB-2026-074",
      status: "Retiré au dépôt",
      total: "190,80 €",
      date: "18 août 2026",
      note: "Chargement remorque effectué à Montgaillard-Lauragais.",
      items: ["1 stère de hêtre 33 cm", "1 filet de 50 L bois d'allumage"]
    },
    {
      ref: "LBB-2026-021",
      status: "Terminée",
      total: "534,00 €",
      date: "12 juin 2026",
      note: "Commande groupée voisinage.",
      items: ["4 stères de chêne 33 cm", "5e stère offert"]
    }
  ],
  deliveries: [
    { day: "Mar. 15 sept.", hours: "8h30 – 12h30", desc: "Créneau matin avec dépôt sous auvent." },
    { day: "Jeu. 17 sept.", hours: "13h30 – 18h00", desc: "Créneau après-midi avec rangement au tas." },
    { day: "Ven. 18 sept.", hours: "16h00 – 18h00", desc: "Dernier passage disponible cette semaine." }
  ],
  seasonHistory: [5.1, 6.4, 7.2, 6.9, 6.8],
  accessNote: "Portail de 2,10 m côté impasse, gravier stable. Décharger côté bûcher, ne pas passer sur la pelouse."
};

export const adminData = {
  profile: {
    name: "Rémi Lacaze",
    role: "Manager dépôt Montgaillard-Lauragais",
    initials: "RL"
  },
  stats: [
    { label: "CA du jour", value: "2 840 €", detail: "+14 % vs hier" },
    { label: "Commandes à traiter", value: "12", detail: "4 urgentes avant 14h" },
    { label: "Livraisons du jour", value: "7", detail: "2 tournées en cours" },
    { label: "Stock sensible", value: "3 refs", detail: "Seuil bas atteint" }
  ],
  orders: [
    {
      id: "LBB-2026-091",
      customer: "Camille Vasseur",
      status: "Paiement validé",
      fulfillment: "Préparation dépôt",
      total: "445,00 €",
      channel: "Site web",
      slot: "Aujourd'hui · 15:00 - 17:00"
    },
    {
      id: "LBB-2026-092",
      customer: "Jean Moulis",
      status: "En attente",
      fulfillment: "A planifier",
      total: "238,00 €",
      channel: "Téléphone",
      slot: "Demain · matin"
    },
    {
      id: "LBB-2026-093",
      customer: "Sonia Herrero",
      status: "Paiement validé",
      fulfillment: "En tournée",
      total: "612,00 €",
      channel: "Site web",
      slot: "Aujourd'hui · 13:30 - 16:00"
    },
    {
      id: "LBB-2026-094",
      customer: "Marc Dardenne",
      status: "Remboursement partiel",
      fulfillment: "Terminée",
      total: "124,00 €",
      channel: "Site web",
      slot: "Livré hier"
    }
  ],
  customers: [
    { name: "Camille Vasseur", email: "camille.vasseur@example.com", city: "Auterive", orders: 8, lifetime: "2 490 €" },
    { name: "Jean Moulis", email: "jean.moulis@example.com", city: "Muret", orders: 3, lifetime: "742 €" },
    { name: "Sonia Herrero", email: "sonia.herrero@example.com", city: "Tournefeuille", orders: 11, lifetime: "3 210 €" },
    { name: "Marc Dardenne", email: "marc.dardenne@example.com", city: "Toulouse", orders: 2, lifetime: "248 €" }
  ],
  deliveries: [
    { truck: "Camion A", driver: "Lucas", zone: "Sud Toulouse", progress: 72, nextStop: "Auterive · 15:20" },
    { truck: "Camion B", driver: "Mehdi", zone: "Ouest", progress: 48, nextStop: "Tournefeuille · 14:35" },
    { truck: "Camion C", driver: "Anais", zone: "Nord", progress: 16, nextStop: "Balma · 16:10" }
  ]
};