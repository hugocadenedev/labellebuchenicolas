# La Belle Buche - Etat du projet

Ce document fige l'etat du projet a date pour garder une trace claire de ce qui a ete construit, valide et de ce qui reste a faire.

## Objectif du projet

Transformer un export de maquettes non runnable en un vrai projet e-commerce demarrable en local, avec:

- un storefront navigable et fidele a la direction de la maquette
- un espace client
- un vrai back office admin separe du site public
- une API locale pour piloter categories, produits, commandes et clients
- une base de travail propre pour brancher ensuite MySQL/MariaDB et un vrai backend de production

## Situation de depart

Le workspace contenait surtout des exports Claude Design et des assets heterogenes:

- plusieurs fichiers `.dc.html` servant de references visuelles uniquement
- un `support.js` non exploitable comme point d'entree applicatif
- aucun vrai projet front runnable
- des noms ou extensions de fichiers parfois trompeurs

Le premier travail a donc ete de reconstruire une vraie base projet executable.

## Ce qui a ete construit

## 1. Base front runnable

- mise en place d'une application React + Vite
- configuration de build statique compatible deploiement Hostinger
- usage de `HashRouter` pour garder une navigation stable sur hebergement statique
- structuration d'un vrai point d'entree front dans `src`

## 2. Storefront e-commerce

Le site public contient maintenant des pages reelles et navigables:

- accueil
- boutique
- pages categories dynamiques
- fiches produits dynamiques
- panier
- espace client

Le storefront s'appuie sur:

- un catalogue riche dans `src/catalog.js`
- un shell applicatif React dans `src/App.jsx`
- un style global dans `src/styles.css`

## 3. Fidelite visuelle

Le projet a ete recale vers le design souhaite au lieu d'une reinterpretation generique:

- reintegration du vrai logo
- conservation de l'esprit visuel de la maquette importee
- reuse des images produit et ambiance du projet
- maintien d'une structure plus web et navigable que l'export original

## 4. API locale admin

Un backend local Express a ete ajoute:

- `server/app.js` pour exposer l'API
- `server/store.js` pour la logique metier et les transformations
- `server/data/store.json` pour la persistance locale de dev
- `server/dataStore.js` pour basculer entre JSON et MySQL selon l'environnement
- `server/sqlStore.js` pour la persistance SQL compatible avec l'API existante

Endpoints actuellement en place:

- `GET /api/health`
- `GET /api/site/bootstrap`
- `GET /api/admin/bootstrap`
- `GET/POST/PUT /api/admin/categories`
- `GET/POST/PUT/PATCH /api/admin/products`
- `GET/PATCH /api/admin/orders`
- `GET /api/admin/customers`

## 5. Categories dynamiques

Les pages categories ne sont plus statiques:

- les categories sont stockees cote API
- chaque categorie possede slug, label, heading, description, accroche, produit cover et liste de produits relies
- la navigation du site lit ces categories
- les pages `/categorie/:slug` sont alimentees depuis le back office
- les produits admin peuvent etre rattaches a une categorie et remonter automatiquement sur le site

## 6. Vrai systeme produit

Le systeme produit a ete fortement enrichi.

Avant:

- un produit admin etait surtout une ligne de prix/stock

Maintenant:

- un produit peut etre un vrai produit storefront complet
- il peut avoir un id, un slug, une famille, une essence, une categorie storefront, un SKU
- il a des prix, du stock, un seuil d'alerte, un statut, un badge et une unite
- il a une description exploitable en carte et en fiche
- il a une fiche technique structuree
- il a des contenus d'onglets pour la fiche produit
- il peut avoir une image principale, une galerie, des URLs d'images et des medias issus de la bibliotheque locale

Le rendu public materialise les produits admin pour qu'ils puissent apparaitre comme de vrais produits sur:

- les listes categories
- la boutique
- les fiches produit

## 7. Gestion des images produit

Le back office permet maintenant:

- de choisir une image principale depuis une bibliotheque media interne
- de choisir une galerie depuis cette meme bibliotheque
- d'ajouter une URL d'image externe
- d'importer une image locale pour l'image principale
- d'importer plusieurs images locales pour la galerie
- de previsualiser les images importees dans le formulaire admin

Note technique actuelle:

- en local, les imports images sont stockes dans le JSON sous forme de data URLs
- c'est pratique pour le dev, mais devra etre remplace par un vrai stockage media serveur ou objet en production

## 8. Back office admin separe du site public

L'admin n'est plus integre dans le shell du storefront.

Ce qui existe maintenant:

- une vraie page de login admin plein ecran
- une session locale persistante en developpement
- un shell admin autonome sans header/footer du site public
- une topbar admin dediee
- une sidebar de navigation CMS dediee

Acces actuel de developpement:

- email: `admin@labellebuche.local`
- mot de passe: `labellebuche-admin`

Important:

- ce login est un acces local de dev uniquement
- ce n'est pas encore une vraie authentification backend securisee

## 9. CMS admin a pages independantes

Le back office fonctionne maintenant comme une base de CMS avec des pages separees, chacune sur sa propre route:

- `/admin`
- `/admin/login`
- `/admin/products`
- `/admin/products/new`
- `/admin/categories`
- `/admin/categories/new`
- `/admin/orders`
- `/admin/customers`
- `/admin/settings`

Chaque page est pensee comme un ecran independant plein format, au lieu d'un simple systeme d'onglets.

## 10. Dashboard admin

Le dashboard admin affiche deja:

- KPI principaux
- commandes a traiter
- tournees/livraisons
- alertes stock
- apercu categories
- apercu clients
- liens rapides vers les ecrans CMS

## Fichiers principaux du projet

### Front

- `src/App.jsx`: shell applicatif principal, storefront + CMS admin
- `src/catalog.js`: source riche des templates et medias storefront
- `src/styles.css`: styles globaux storefront + admin
- `src/main.jsx`: point d'entree React

### Back

- `server/app.js`: serveur Express et routes API
- `server/store.js`: transformations, validation, creation de categories/produits, bootstraps site/admin
- `server/data/store.json`: donnees persistantes locales

### Base de donnees cible

- `db/schema.sql`: schema MySQL/MariaDB de reference pour la suite
- `db/schema.mysql.sql`: schema MySQL/MariaDB runtime pour le backend branche

### Documentation

- `README.md`: demarrage rapide du projet
- `PROJECT_STATUS.md`: ce recapitulatif complet

## Commandes utiles

Installer:

```bash
npm install
```

Lancer front + API:

```bash
npm run dev:full
```

Lancer separement:

```bash
npm run dev
npm run dev:api
```

Build production:

```bash
npm run build
```

## Bascule SQL ajoutee

Le projet peut maintenant fonctionner avec un backend MySQL ou MariaDB en plus du stockage JSON local.

Ce qui a ete ajoute:

- `server/dataStore.js` choisit automatiquement le backend selon `DATA_BACKEND`
- `server/sqlStore.js` persiste les memes objets metier dans des tables SQL
- `db/schema.mysql.sql` fournit un schema runtime directement exploitable
- `npm run db:migrate` applique le schema
- `npm run db:import` importe les donnees actuelles de `server/data/store.json`

Concretement, le front reste inchange et l'API conserve la meme surface fonctionnelle.

## Validations deja faites

Ont ete verifies a plusieurs reprises:

- le build Vite via `npm run build`
- le fonctionnement du storefront et des routes categories
- l'ouverture de l'admin separe du site public
- la redirection vers la page login admin
- le chargement du dashboard admin autonome
- l'ouverture de la vraie page CMS d'ajout produit sur `/admin/products/new`

## Limitations actuelles

Le projet est proprement runnable et largement structure, mais plusieurs briques restent a finir pour un vrai usage production.

### Authentification admin

- login de dev seulement
- pas encore de comptes admin en base
- pas encore de hash mot de passe, session serveur ni permissions

### Medias

- pas encore de vrai stockage serveur pour les images
- pas encore de bibliotheque media persistante type CMS
- pas encore de suppression/edition complete des assets

### Produits

- creation produit riche disponible
- pas encore de vraie page d'edition produit existant `/admin/products/:id`
- pas encore de suppression produit
- pas encore de workflow brouillon/publication plus avance

### Categories

- creation et edition de base disponibles
- pas encore de vraie page detaillee d'edition categorie distincte par id

### Backend / BDD

- persistance encore en JSON local
- schema SQL pret mais non branche a l'execution
- pas encore de couche MySQL/MariaDB runtime

### Refactor technique

- `src/App.jsx` concentre encore beaucoup de logique
- l'etape logique suivante sera de splitter le CMS et le storefront en plusieurs fichiers/composants

## Prochaines etapes recommandees

Ordre logique conseille:

1. ajouter les vraies pages d'edition produit et categorie
2. ajouter suppression, publication/brouillon et actions de masse
3. brancher une vraie authentification admin backend
4. brancher un vrai stockage media serveur
5. remplacer la persistance JSON par MySQL/MariaDB via `db/schema.sql`
6. decouper le gros `src/App.jsx` en modules propres

## Resume court

Le projet n'est plus un export de maquette casse.

Il s'agit maintenant d'une vraie application React + Vite avec:

- storefront navigable
- espace client
- API locale Express
- categories dynamiques
- vrais produits CMS avec medias et contenus
- back office admin separe du site public
- pages CMS admin independantes pour gerer le catalogue et l'exploitation

La base de travail est donc serieuse et exploitable localement. La suite consiste surtout a industrialiser: auth reelle, medias reels, edition complete, et branchement SQL.