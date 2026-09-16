# Deploiement Hostinger

Ce document fige la procedure qui a effectivement fonctionne pour deployer La Belle Buche sur un hebergement Node.js Hostinger avec MySQL.

## Architecture retenue

- front React/Vite build dans `dist`
- API Express servie par la meme application Node
- base de donnees MySQL Hostinger
- paiement Stripe cote serveur, a configurer apres la base

## Preconditions Hostinger

- pack avec support `Applications Node.js`
- acces `SSH`
- base `MySQL`
- deploiement GitHub connecte au depot

## Reglages Node.js Hostinger

- framework: `Express`
- branche: `main`
- version Node: `22.x` ou `20.x LTS` si propose
- fichier d'entree: `server.js`
- gestionnaire de paquets: `npm`

Si Hostinger propose un champ de build, utiliser:

```bash
npm ci && npm run build
```

Si Hostinger propose un champ de start, utiliser:

```bash
npm start
```

## Variables d'environnement minimales

Valeurs a adapter a la prod:

```env
DATA_BACKEND=mysql
APP_URL=https://silver-mole-777031.hostingersite.com

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=u362859991_lbb
DB_USER=u362859991_lbb
DB_PASSWORD=REMPLACER
DB_POOL_SIZE=10

STRIPE_CURRENCY=eur
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

Notes:

- tant que Stripe n'est pas renseigne, le site peut tourner mais le paiement carte renverra `503`
- la base doit etre configuree avant d'esperer un site fonctionnel

## Fichiers importants cote projet

- `server.js`: point d'entree racine pour Hostinger
- `server/app.js`: sert l'API et le front build en prod
- `server/dataStore.js`: charge le backend JSON ou MySQL sans top-level await
- `db/schema.mysql.sql`: schema runtime a importer dans la base cible

## Probleme reel rencontre et correctifs

### 1. Erreur 503 apres deploiement

Cause reelle:

- variables d'environnement MySQL absentes ou base non initialisee

Resolution:

- renseigner les variables `DB_*`
- verifier que `DATA_BACKEND=mysql`
- importer le schema MySQL

### 2. Erreur Hostinger ESM

Erreur observee:

```text
Error [ERR_REQUIRE_ASYNC_MODULE]: require() cannot be used on an ESM graph with top-level await.
```

Cause reelle:

- `server/dataStore.js` utilisait `await import(...)` au niveau module
- le runtime Hostinger charge l'entree Node via `require()`

Resolution appliquee:

- suppression du top-level await
- remplacement par un chargement asynchrone via `backendPromise`

### 3. Echec import SQL sur Hostinger

Erreur observee:

```text
Access denied for user ... to database 'la_belle_buche'
```

Cause reelle:

- le schema commencait par `CREATE DATABASE la_belle_buche` puis `USE la_belle_buche`
- sur Hostinger, l'utilisateur n'a acces qu'a la base provisionnee `u362859991_lbb`

Resolution appliquee:

- retirer `CREATE DATABASE` et `USE` de `db/schema.mysql.sql`
- importer le schema dans la base deja selectionnee

## Verification de la base en SSH

Connexion SSH Hostinger utilisee:

```bash
ssh -p 65002 u362859991@178.16.128.170
```

Trouver le code source du deploiement:

```bash
cd /home/u362859991/domains/silver-mole-777031.hostingersite.com/hbuilds/last-source
ls
ls db
```

Importer le schema MySQL:

```bash
mysql -h 127.0.0.1 -P 3306 -u u362859991_lbb -p u362859991_lbb < db/schema.mysql.sql
```

Verifier les tables:

```bash
mysql -h 127.0.0.1 -P 3306 -u u362859991_lbb -p -e "USE u362859991_lbb; SHOW TABLES;"
```

## Checklist de redeploiement

1. pousser les commits sur `main`
2. verifier `server.js` comme fichier d'entree Hostinger
3. verifier les variables `DB_*`, `DATA_BACKEND`, `APP_URL`
4. redeployer l'application Node.js
5. si schema absent, se connecter en SSH et importer `db/schema.mysql.sql`
6. verifier les tables MySQL
7. tester le site public
8. tester `api/health` si besoin

## Signaux utiles de diagnostic

- `503` sur tout le site: souvent app Node en echec ou bootstrap API cassé
- `503` sur `/api/health`: probleme de runtime Node, pas juste de donnees storefront
- build Vite OK mais site HS: regarder les logs d'execution Hostinger, pas les logs de compilation
- `node: command not found` en SSH interactif: pas forcement bloquant, le runtime Node de Hostinger peut etre disponible seulement pour l'app geree

## Commandes de diagnostic utiles

Verifier le build source deploie:

```bash
cd /home/u362859991/domains/silver-mole-777031.hostingersite.com/hbuilds/last-source
cat package.json
cat server.js
tail -n 200 build-verification.log
```

Verifier MySQL:

```bash
mysql -h 127.0.0.1 -P 3306 -u u362859991_lbb -p -e "SHOW DATABASES;"
mysql -h 127.0.0.1 -P 3306 -u u362859991_lbb -p -e "USE u362859991_lbb; SHOW TABLES;"
```

## Etat attendu apres deploiement reussi

- le site public charge sans `503`
- la base MySQL repond
- les tables runtime existent
- le front est servi par l'application Node
- l'API `/api/health` repond `{"ok":true}`
