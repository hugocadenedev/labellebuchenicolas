# Base de donnees e-commerce

Ce dossier contient un schema SQL de depart pour un site e-commerce classique, pense pour MySQL 8 ou MariaDB recente.

Deux schemas coexistent maintenant:

- `db/schema.sql`: schema de reference conceptuel
- `db/schema.mysql.sql`: schema runtime aligne sur le backend SQL du projet

## Ce que couvre le schema

- catalogue: `categories`, `products`, `product_variants`, `product_images`, `product_categories`
- comptes: `customers`, `customer_addresses`, `admins`
- tunnel d'achat: `carts`, `cart_items`, `orders`, `order_items`, `order_addresses`
- commerce: `coupons`, `coupon_redemptions`, `payments`, `shipments`, `shipping_methods`
- suivi: `order_status_history`, `inventory_movements`

## Pourquoi cette structure

- `products` porte la fiche produit globale
- `product_variants` porte les combinaisons vendables: taille, couleur, coupe, conditionnement, etc.
- `orders` garde les montants et statuts
- `order_addresses` fige les adresses a la date de commande, meme si le client modifie ensuite son profil
- `order_items` fige le nom, le SKU et le prix achete pour conserver l'historique

## Import du schema

Exemple MySQL local:

```bash
mysql -u root -p < db/schema.sql
```

Pour la pile runtime actuelle, preferer:

```bash
npm run db:migrate
```

## Suite logique

- brancher un backend API sur ce schema
- ajouter des migrations versionnees
- creer des donnees de seed pour le catalogue
- construire ensuite le back-office sur les tables `products`, `orders`, `customers` et `shipments`

## Bridge runtime

Le backend peut maintenant s'appuyer sur MySQL ou MariaDB via:

- `server/dataStore.js`
- `server/sqlStore.js`
- `.env` avec `DATA_BACKEND=mysql`

Pour recuperer les donnees locales deja saisies:

```bash
npm run db:import
```