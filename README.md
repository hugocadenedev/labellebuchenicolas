# La Belle Buche

Base e-commerce React + Vite avec storefront navigable, espace client et premier back office admin branche sur une API locale.

## Ce qui est pret

- storefront navigable: accueil, categorie, fiche produit, panier, compte
- back office admin sur `/admin`
- API locale Express pour produits, commandes et clients
- persistance locale JSON pour tester les actions admin sans base branchee
- schema MySQL/MariaDB de reference dans `db/schema.sql`
- schema MySQL/MariaDB runtime dans `db/schema.mysql.sql`
- build statique compatible Hostinger cote front via `HashRouter`

## Demarrage local

Installer les dependances:

```bash
npm install
```

Lancer le front et l'API ensemble:

```bash
npm run dev:full
```

Ou separer les processus:

```bash
npm run dev:api
npm run dev
```

Le front tourne en general sur `http://localhost:5173` et l'API sur `http://localhost:3001`.

## Scripts utiles

```bash
npm run dev
npm run dev:api
npm run dev:full
npm run db:migrate
npm run db:import
npm run build
npm run preview
```

## Bascule MySQL ou MariaDB

Le backend supporte maintenant deux modes de persistance:

- `DATA_BACKEND=json`: mode local historique sur `server/data/store.json`
- `DATA_BACKEND=mysql`: mode SQL sur MySQL ou MariaDB

Initialiser la configuration locale:

```bash
copy .env.example .env
```

Puis renseigner au minimum:

```env
DATA_BACKEND=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=la_belle_buche
```

Variables Stripe pour le paiement carte:

```env
APP_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_CURRENCY=eur
```

Si `STRIPE_SECRET_KEY` est absent, le site continue de fonctionner mais le paiement carte via Stripe ne peut pas etre demarre.

Appliquer le schema runtime:

```bash
npm run db:migrate
```

Importer les donnees JSON actuelles vers MySQL:

```bash
npm run db:import
```

## Paiement Stripe

Le checkout carte bancaire peut maintenant passer par Stripe Checkout.

- creation de session: `POST /api/payments/stripe/checkout-session`
- confirmation serveur du paiement: `POST /api/payments/stripe/session/:sessionId/confirm`
- webhook Stripe: `POST /api/payments/stripe/webhook`
- retour front: `/#/commande/confirmation/stripe?session_id=...`

Le flux actuel est le suivant:

1. le client choisit `Carte bancaire`
2. le front cree une session Stripe via l'API
3. Stripe redirige vers sa page de paiement hebergee
4. au retour, le serveur verifie que la session est bien `paid`
5. la commande locale est ensuite creee de maniere idempotente

Pour une mise en ligne fiable, configurer aussi le webhook Stripe vers `/api/payments/stripe/webhook` avec l'evenement `checkout.session.completed`.

## Donnees et backend

- Donnees de test admin persistantes: `server/data/store.json`
- API locale Express: `server/app.js`
- Logique de stockage/transformation: `server/store.js`
- Selection du backend de donnees: `server/dataStore.js`
- Backend SQL: `server/sqlStore.js`
- Schema SQL cible: `db/schema.sql`
- Schema SQL runtime: `db/schema.mysql.sql`

L'API locale sert de couche de transition. Le back office React parle deja en HTTP et peut maintenant basculer vers MySQL ou MariaDB sans rewriter l'interface admin.

## Notes

- Les exports Claude Design `.dc.html` et `support.js` sont conserves comme references visuelles, pas comme runtime.
- Certains fichiers importes ont des extensions ou noms trompeurs; ne pas les utiliser comme point d'entree applicatif.
        </div>

        <div style="display: grid; gap: 12px;">
          <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .08em; color: #8A9180;">SÉCHAGE</span>
          <div style="display: flex; gap: 9px; flex-wrap: wrap;">
            <sc-for list="{{ dryings }}" as="d" hint-placeholder-count="2">
              <button onClick="{{ d.onClick }}" style="font-family: 'DM Mono', monospace; font-size: 11.5px; letter-spacing: .04em; padding: 12px 18px; border-radius: 999px; cursor: pointer; border: 1px solid {{ d.border }}; background: {{ d.bg }}; color: {{ d.color }};">{{ d.label }}</button>
            </sc-for>
          </div>
        </div>

        <div style="height: 1px; background: rgba(35,41,31,.09);"></div>

        <div style="display: grid; gap: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
            <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .08em; color: #8A9180;">NOMBRE DE STÈRES</span>
            <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: {{ tierColor }};">{{ tierNote }}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 18px; border: 1px solid rgba(35,41,31,.14); border-radius: 999px; padding: 10px 20px;">
              <button onClick="{{ dec }}" style="background: transparent; border: 0; cursor: pointer; font-size: 19px; color: #55604F; line-height: 1;">−</button>
              <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 19px; min-width: 26px; text-align: center;">{{ qty }}</span>
              <button onClick="{{ inc }}" style="background: transparent; border: 0; cursor: pointer; font-size: 19px; color: #55604F; line-height: 1;">+</button>
            </div>
            <div style="display: grid; gap: 4px;">
              <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: #8A9180;">soit {{ volume }} de bois empilé</span>
              <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: #3E5C33;">{{ seasonNote }}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: end; justify-content: space-between; gap: 20px; flex-wrap: wrap;">
          <div style="display: grid; gap: 6px;">
            <div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;">
              <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 40px; letter-spacing: -.035em; line-height: 1;">{{ unitPrice }}</span>
              <span style="font-family: 'DM Mono', monospace; font-size: 11.5px; color: #A8AE9C; text-decoration: line-through;">{{ oldPrice }}</span>
              <span style="font-family: 'DM Mono', monospace; font-size: 11.5px; color: #8A9180;">/ stère livré</span>
            </div>
            <span style="font-family: 'DM Mono', monospace; font-size: 11px; color: #4E5647;">Total {{ qty }} stères · <span style="color: #23291F;">{{ total }}</span> · ou {{ monthly }} en 3× sans frais</span>
          </div>
          <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: #3E5C33; background: #EEF2E4; border-radius: 999px; padding: 9px 14px;">{{ freeShip }}</span>
        </div>

        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 10px;">
          <button onClick="{{ add }}" style="background: #33512F; color: #F4F7EC; border: 0; border-radius: 999px; padding: 18px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13.5px; letter-spacing: .06em; cursor: pointer; transition: background .2s ease;" style-hover="background: #23291F;">{{ addLabel }}</button>
          <a href="La Belle Buche - Boutique v2.dc.html#simulateur" style="border: 1px solid rgba(35,41,31,.16); border-radius: 999px; padding: 18px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: .05em; text-align: center; background: #FBFAF5;" style-hover="border-color: #6E8F4E; color: #3E5C33;">Demander un devis</a>
        </div>

        <div style="display: grid; gap: 10px; background: #F7F8F1; border-radius: 18px; padding: 18px 20px;">
          <div style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .07em; color: #8A9180;">LIVRAISON — VÉRIFIER MA COMMUNE</div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <input value="{{ postcode }}" onChange="{{ onPostcode }}" placeholder="Code postal" maxlength="5" style="background: #FFFFFF; border: 1px solid rgba(35,41,31,.14); color: #23291F; font-family: 'DM Mono', monospace; font-size: 13.5px; letter-spacing: .06em; padding: 12px 16px; width: 140px; border-radius: 999px; outline: 0;">
            <button onClick="{{ checkPostcode }}" style="background: #23291F; color: #FBFAF5; border: 0; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .06em; padding: 13px 22px; border-radius: 999px; cursor: pointer;" style-hover="background: #33512F;">Vérifier</button>
            <span style="font-family: 'DM Mono', monospace; font-size: 11.5px; color: {{ postcodeColor }};">{{ postcodeMsg }}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; font-family: 'DM Mono', monospace; font-size: 10.5px; line-height: 1.6; color: #6B7263;">
          <span>Créneau de 2 h<br>confirmé par SMS</span>
          <span>Humidimètre<br>présenté au déchargement</span>
          <span>Rangement au bûcher<br>+39 € / stère</span>
        </div>
      </div>

      <div style="display: flex; gap: 26px; flex-wrap: wrap; margin-top: 22px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .06em; color: #8A9180;">
        <span>NF Bois de chauffage</span><span>France Bois Bûche</span><span>PEFC 10-31-1487</span>
      </div>
    </div>
  </section>

  <section style="max-width: 1400px; margin: 0 auto; padding: 90px 32px 0;">
    <div style="display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid rgba(35,41,31,.1); padding-bottom: 0;">
      <sc-for list="{{ tabs }}" as="t" hint-placeholder-count="4">
        <button onClick="{{ t.onClick }}" style="background: transparent; border: 0; border-bottom: 2px solid {{ t.line }}; cursor: pointer; padding: 14px 18px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 14.5px; letter-spacing: .01em; color: {{ t.color }};">{{ t.label }}</button>
      </sc-for>
    </div>

    <div style="padding-top: 44px; display: grid; grid-template-columns: 1.1fr .9fr; gap: 72px; align-items: start;">
      <div>
        <h2 style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 28px; letter-spacing: -.028em; margin: 0 0 20px;">{{ tabTitle }}</h2>
        <sc-for list="{{ tabParas }}" as="para" hint-placeholder-count="3">
          <p style="font-size: 18.5px; line-height: 1.62; color: #4E5647; max-width: 62ch; margin: 0 0 18px; text-wrap: pretty;">{{ para }}</p>
        </sc-for>
        <div style="display: grid; gap: 12px; margin-top: 26px;">
          <sc-for list="{{ tabPoints }}" as="pt" hint-placeholder-count="3">
            <div style="display: grid; grid-template-columns: 18px 1fr; gap: 14px; align-items: baseline;">
              <span style="font-family: 'DM Mono', monospace; font-size: 12px; color: #6E8F4E;">✦</span>
              <span style="font-size: 17.5px; line-height: 1.55; color: #2F3629;">{{ pt }}</span>
            </div>
          </sc-for>
        </div>
      </div>

      <div style="background: #FFFFFF; border: 1px solid rgba(35,41,31,.08); border-radius: 28px; padding: 30px 32px;">
        <div style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .08em; color: #C05621; margin-bottom: 20px;">FICHE TECHNIQUE DU LOT</div>
        <sc-for list="{{ specs }}" as="sp" hint-placeholder-count="9">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 20px; padding: 13px 0; border-bottom: 1px solid rgba(35,41,31,.07); font-family: 'DM Mono', monospace; font-size: 11.5px;">
            <span style="color: #8A9180; letter-spacing: .03em;">{{ sp.k }}</span>
            <span style="color: #23291F; text-align: right;">{{ sp.v }}</span>
          </div>
        </sc-for>
        <p style="margin: 20px 0 0; font-family: 'DM Mono', monospace; font-size: 10.5px; line-height: 1.7; color: #A8AE9C;">Valeurs relevées sur le lot en cours au parc de Muret, contrôle hebdomadaire à l'humidimètre à pointes.</p>
      </div>
    </div>
  </section>

  <section id="avis" style="max-width: 1400px; margin: 0 auto; padding: 96px 32px 0;">
    <div style="display: grid; grid-template-columns: .62fr 1.38fr; gap: 64px; align-items: start;">
      <div style="background: #EEF2E4; border-radius: 30px; padding: 34px;">
        <div style="font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .08em; color: #C05621; margin-bottom: 16px;">AVIS VÉRIFIÉS</div>
        <div style="display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px;">
          <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 54px; line-height: 1; letter-spacing: -.04em; color: #23291F;">4,9</span>
          <span style="font-family: 'DM Mono', monospace; font-size: 12px; color: #6B7263;">/ 5</span>
        </div>
        <div style="font-family: 'DM Mono', monospace; font-size: 11.5px; color: #C05621; letter-spacing: .12em; margin-bottom: 24px;">★★★★★ <span style="color: #6B7263; letter-spacing: .04em;">412 avis</span></div>
        <div style="display: grid; gap: 9px;">
          <sc-for list="{{ histogram }}" as="h" hint-placeholder-count="5">
            <div style="display: grid; grid-template-columns: 34px 1fr 38px; gap: 12px; align-items: center; font-family: 'DM Mono', monospace; font-size: 10.5px; color: #6B7263;">
              <span>{{ h.label }}</span>
              <span style="height: 6px; border-radius: 999px; background: #DCE2D0; overflow: hidden; display: block;">
                <span style="display: block; height: 100%; width: {{ h.pct }}; background: #6E8F4E; border-radius: 999px;"></span>
              </span>
              <span style="text-align: right;">{{ h.n }}</span>
            </div>
          </sc-for>
        </div>
        <div style="height: 1px; background: rgba(35,41,31,.12); margin: 26px 0;"></div>
        <div style="display: grid; gap: 12px;">
          <sc-for list="{{ criteria }}" as="c" hint-placeholder-count="3">
            <div style="display: flex; justify-content: space-between; font-family: 'DM Mono', monospace; font-size: 11px; color: #4E5647;">
              <span>{{ c.k }}</span><span style="color: #33512F;">{{ c.v }}</span>
            </div>
          </sc-for>
        </div>
      </div>

      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 26px;">
          <h2 style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 28px; letter-spacing: -.028em; margin: 0;">Ce qu'en disent nos clients</h2>
          <div style="display: flex; gap: 4px; background: #EEF2E4; border-radius: 999px; padding: 4px;">
            <sc-for list="{{ reviewFilters }}" as="f" hint-placeholder-count="3">
              <button onClick="{{ f.onClick }}" style="font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .05em; padding: 9px 15px; border-radius: 999px; cursor: pointer; border: 0; background: {{ f.bg }}; color: {{ f.color }};">{{ f.label }}</button>
            </sc-for>
          </div>
        </div>
        <div style="display: grid; gap: 16px;">
          <sc-for list="{{ reviews }}" as="r" hint-placeholder-count="4">
            <figure style="margin: 0; background: #FFFFFF; border: 1px solid rgba(35,41,31,.08); border-radius: 24px; padding: 28px 30px; display: grid; gap: 14px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                <span style="font-family: 'DM Mono', monospace; font-size: 11.5px; color: #C05621; letter-spacing: .1em;">{{ r.stars }}</span>
                <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: #A8AE9C;">{{ r.date }}</span>
              </div>
              <blockquote style="margin: 0; font-size: 18.5px; line-height: 1.55; color: #2F3629; text-wrap: pretty;">{{ r.text }}</blockquote>
              <figcaption style="display: flex; align-items: center; gap: 12px;">
                <span style="width: 32px; height: 32px; border-radius: 999px; background: #E4E9D9;"></span>
                <span style="display: grid; gap: 2px;">
                  <span style="font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 13.5px;">{{ r.who }}</span>
                  <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: #A8AE9C;">{{ r.meta }}</span>
                </span>
              </figcaption>
            </figure>
          </sc-for>
        </div>
        <button onClick="{{ moreReviews }}" style="margin-top: 22px; background: transparent; border: 1px solid rgba(35,41,31,.16); border-radius: 999px; padding: 15px 26px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 12.5px; letter-spacing: .06em; cursor: pointer;" style-hover="border-color: #6E8F4E; color: #3E5C33;">{{ moreLabel }}</button>
      </div>
    </div>
  </section>

  <section style="max-width: 1400px; margin: 0 auto; padding: 96px 32px 0;">
    <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 30px;">
      <h2 style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: clamp(26px, 2.7vw, 36px); letter-spacing: -.03em; margin: 0;">Souvent commandé avec</h2>
      <a href="La Belle Buche - Categorie Template.dc.html" style="font-family: 'DM Mono', monospace; font-size: 11.5px; letter-spacing: .07em;">Toute la catégorie →</a>
    </div>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
      <sc-for list="{{ related }}" as="p" hint-placeholder-count="4">
        <article style="background: #FFFFFF; border: 1px solid rgba(35,41,31,.08); border-radius: 26px; padding: 18px; display: grid; gap: 15px; align-content: start; transition: border-color .25s ease, box-shadow .3s ease, transform .3s ease;" style-hover="border-color: rgba(110,143,78,.5); box-shadow: 0 30px 54px -34px rgba(35,41,31,.5); transform: translateY(-3px);">
          <div style="position: relative; aspect-ratio: 1.15; border-radius: 18px; overflow: hidden; background: #E4E9D9;">
            <image-slot id="{{ p.slotId }}" shape="rect" src="{{ p.photo }}" placeholder="{{ p.hint }}"></image-slot>
          </div>
          <div style="display: grid; gap: 6px;">
            <span style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .05em; color: #8A9180;">{{ p.cat }}</span>
            <h3 style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 16px; letter-spacing: -.012em; margin: 0; line-height: 1.25;">{{ p.name }}</h3>
          </div>
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 10px;">
            <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 21px; letter-spacing: -.025em;">{{ p.price }}</span>
            <button onClick="{{ p.add }}" style="background: #EEF2E4; color: #33512F; border: 0; border-radius: 999px; padding: 11px 17px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 11.5px; letter-spacing: .06em; cursor: pointer;" style-hover="background: #33512F; color: #F4F7EC;">Ajouter</button>
          </div>
        </article>
      </sc-for>
    </div>
  </section>

  <section style="max-width: 1400px; margin: 0 auto; padding: 96px 32px 0;">
    <div style="background: #23291F; color: #F4F7EC; border-radius: 34px; padding: 46px 48px; display: grid; grid-template-columns: 1.35fr auto; gap: 44px; align-items: center;">
      <div>
        <h2 style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 28px; letter-spacing: -.026em; margin: 0 0 10px;">Un doute sur la quantité ou l'accès&nbsp;?</h2>
        <p style="margin: 0; font-size: 18px; line-height: 1.55; color: #CFDCBE; max-width: 60ch;">Nos conseillers connaissent chaque commune de la zone : largeur de portail, pente d'allée, camion adapté. Deux minutes au téléphone évitent bien des surprises le jour J.</p>
      </div>
      <div style="display: grid; gap: 10px; justify-items: start;">
        <a href="#" style="background: #A3C47E; color: #23291F; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px; letter-spacing: .06em; padding: 17px 28px; border-radius: 999px; white-space: nowrap;" style-hover="background: #F4F7EC; color: #23291F;">06 30 46 09 35</a>
        <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: #8A9180;">Lun. au ven. 8h30–18h30</span>
      </div>
    </div>
  </section>

  <footer style="background: #23291F; color: #9AA391; margin-top: 100px;">
    <div style="max-width: 1400px; margin: 0 auto; padding: 76px 32px 30px; display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr; gap: 48px;">
      <div>
        <div style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 25px; letter-spacing: -.03em; color: #F4F7EC; margin-bottom: 14px;">La Belle Bûche</div>
        <div style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .08em; color: #C05621; margin-bottom: 16px;">Bois de chauffage vendu au stère</div>
        <p style="margin: 0; font-size: 16px; line-height: 1.55; max-width: 40ch;">Bûcherons-négociants dans le Sud-Ouest. Du bois coupé près de chez vous, séché deux ans, livré et rangé.</p>
      </div>
      <div style="display: grid; gap: 11px; align-content: start; font-size: 16px;">
        <div style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 12.5px; letter-spacing: .05em; color: #F4F7EC; margin-bottom: 6px;">Dépôt de Toulouse</div>
        <span>06 30 46 09 35</span>
        <span>14 chemin des Charbonniers<br>31200 Toulouse</span>
      </div>
      <div style="display: grid; gap: 11px; align-content: start; font-size: 16px;">
        <div style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 12.5px; letter-spacing: .05em; color: #F4F7EC; margin-bottom: 6px;">Parc à bois de Muret</div>
        <span>05 61 76 70 78</span>
        <span>ZA de Joffrery, av. des Pins<br>31600 Muret</span>
      </div>
      <div style="display: grid; gap: 11px; align-content: start; font-size: 16px;">
        <div style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 12.5px; letter-spacing: .05em; color: #F4F7EC; margin-bottom: 6px;">Informations</div>
        <a href="#">Livraison</a><a href="#">Qu'est-ce qu'un stère ?</a><a href="#">CGV — CGU</a><a href="#">Mentions légales</a>
      </div>
    </div>
    <div style="max-width: 1400px; margin: 0 auto; padding: 22px 32px 130px; border-top: 1px solid rgba(244,247,236,.1); font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .07em; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap;">
      <span>© 2026 La Belle Bûche — Maquette</span>
      <span>Paiement CB · Virement · 3× sans frais</span>
    </div>
  </footer>

  <div style="position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; background: rgba(251,250,245,.94); backdrop-filter: blur(16px); border-top: 1px solid rgba(35,41,31,.1);">
    <div style="max-width: 1400px; margin: 0 auto; padding: 16px 32px; display: flex; align-items: center; gap: 28px; flex-wrap: wrap;">
      <div style="width: 46px; height: 46px; border-radius: 13px; overflow: hidden; background: #E4E9D9 url(photos/wood/chene-33.jpg) center/cover; flex-shrink: 0;"></div>
      <div style="display: grid; gap: 3px;">
        <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 15px; letter-spacing: -.012em;">{{ stickyName }}</span>
        <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: #8A9180;">{{ stickyMeta }}</span>
      </div>
      <div style="margin-left: auto; display: flex; align-items: center; gap: 22px; flex-wrap: wrap;">
        <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 22px; letter-spacing: -.028em;">{{ total }}</span>
        <button onClick="{{ add }}" style="background: #33512F; color: #F4F7EC; border: 0; border-radius: 999px; padding: 15px 30px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 12.5px; letter-spacing: .06em; cursor: pointer;" style-hover="background: #23291F;">{{ addLabel }}</button>
      </div>
    </div>
  </div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props="{&quot;basePrice&quot;:{&quot;editor&quot;:&quot;int&quot;,&quot;default&quot;:119,&quot;min&quot;:79,&quot;max&quot;:179,&quot;unit&quot;:&quot;€&quot;,&quot;tsType&quot;:&quot;number&quot;,&quot;section&quot;:&quot;Produit&quot;}}">
const LENGTHS = [
  { label: "25 cm", delta: "+6 €", add: 6, vol: 0.65 },
  { label: "33 cm", delta: "référence", add: 0, vol: 0.70 },
  { label: "50 cm", delta: "−20 €", add: -20, vol: 0.80 },
  { label: "1 m", delta: "−50 €", add: -50, vol: 1.00 }
];

const DRYINGS = [
  { label: "Séché 24 mois · 17 %", add: 0, humid: "17 %", ready: "Prêt à brûler" },
  { label: "Étuvé · 12 %", add: 30, humid: "12 %", ready: "Prêt à brûler, rendement max." }
];

const TABS = {
  "Description": {
    title: "Un chêne de pays, séché deux étés",
    paras: [
      "Le chêne est le bois de chauffage le plus recherché du Sud-Ouest, et pour une bonne raison : sa densité lui donne une combustion lente et régulière, avec un lit de braises qui tient la nuit entière dans un insert bien réglé. Nous ne travaillons que du chêne pédonculé et du chêne sessile issus de coupes d'éclaircie du Comminges et du Volvestre, à moins de 100 km de nos deux dépôts.",
      "Coupé entre novembre et février, quand la sève est descendue, le bois est fendu dès le printemps suivant puis empilé sous auvent ventilé pendant deux étés complets. C'est ce séchage lent — et non un passage rapide en four — qui donne un bois stable, sans nervosité à l'allumage et sans dépôt sur la vitre."
    ],
    points: [
      "Flambée longue : 1 h 30 à 2 h par recharge dans un insert de 8 kW.",
      "Braises tenaces : redémarrage possible au matin sans allume-feu.",
      "Peu de bistre : la vitre reste claire tant que l'appareil tire correctement.",
      "Écorce sèche et propre, très peu de fines dans le fond du camion."
    ]
  },
  "Caractéristiques": {
    title: "Ce que vous recevez exactement",
    paras: [
      "Un stère correspond à un mètre cube de bûches d'un mètre empilées. En 33 cm, le même volume de bois occupe environ 0,70 m³ apparent parce que les bûches s'imbriquent mieux : la quantité de bois est identique, seul l'encombrement change. Nos prix sont toujours donnés pour un stère réel, jamais pour un volume apparent.",
      "Chaque lot est contrôlé à l'humidimètre à pointes au moment du chargement, puis à nouveau devant vous au déchargement. Si la mesure dépasse la valeur annoncée, le stère vous est offert."
    ],
    points: [
      "Bûches fendues, calibre 8 à 14 cm, écorce conservée.",
      "Tolérance de longueur : ±2 cm sur la coupe.",
      "Aucun bois traité, aucune palette, aucun résineux dans nos stères feuillus.",
      "Livraison en camion benne 6 m³ ou plateau grue selon l'accès."
    ]
  },
  "Livraison & rangement": {
    title: "Du parc à bois à votre bûcher",
    paras: [
      "Nous livrons en Haute-Garonne et dans les sept départements limitrophes avec nos propres camions et nos propres chauffeurs. Un chauffeur vous appelle la veille pour valider l'accès : largeur de portail, pente de l'allée, hauteur sous branches, emplacement exact du tas.",
      "Le déchargement en benne prend une dizaine de minutes. Si le camion ne peut pas approcher, nous basculons sur le plateau grue ou, en dernier recours, sur la brouette — c'est déjà arrivé et nous n'avons jamais laissé un client sans bois."
    ],
    points: [
      "Créneau de 2 h confirmé par SMS au départ du parc.",
      "Livraison offerte dès 4 stères en Haute-Garonne.",
      "Rangement au bûcher bûche par bûche : 39 € par stère.",
      "Enlèvement possible aux dépôts de Toulouse et Muret sous 2 h."
    ]
  },
  "Stockage": {
    title: "Garder un bois sec toute la saison",
    paras: [
      "Un bois livré à 17 % ne demande qu'une chose : rester à l'abri de la pluie tout en respirant. Surélevez la pile sur des palettes, laissez 10 cm entre le tas et le mur, et couvrez uniquement le dessus — une bâche descendue jusqu'au sol transforme le tas en serre humide.",
      "Stocké correctement, notre chêne se conserve trois à quatre saisons sans reprendre d'humidité et sans perdre de pouvoir calorifique."
    ],
    points: [
      "Palettes ou tasseaux sous la pile, jamais à même la terre.",
      "Couverture du dessus seulement, côtés dégagés.",
      "Sortez la quantité de la semaine à l'intérieur, deux jours avant usage.",
      "Comptez 1 m linéaire de bûcher par stère en 33 cm sur 2 m de haut."
    ]
  }
};

const REVIEWS = [
  { stars: "★★★★★", date: "18 août 2026", text: "Quatre stères déchargés au fond du jardin parce que le camion ne passait pas le portail. Deux heures de brouette pour le chauffeur, sans un mot de travers. Bois magnifique, régulier, très sec.", who: "Marie-Hélène D.", meta: "Auterive (31) · 4 stères chêne 33 cm", top: true },
  { stars: "★★★★★", date: "09 août 2026", text: "Humidité mesurée devant moi à 16,4 %. Le bois prend en une allumette, la vitre reste propre toute la soirée. Troisième année que je commande, jamais déçu.", who: "Julien R.", meta: "Muret (31) · 6 stères chêne 33 cm", top: true },
  { stars: "★★★★☆", date: "27 juil. 2026", text: "Excellent bois, livraison au créneau annoncé. Je retire une étoile pour les fines au fond de la benne, mais franchement c'est du détail sur un stère de cette qualité.", who: "Christophe B.", meta: "Villefranche (31) · 3 stères", top: false },
  { stars: "★★★★★", date: "14 juil. 2026", text: "Commandé en juillet pour l'hiver, prix bien plus bas qu'en octobre. Le conseiller m'a dit exactement combien de stères il me fallait pour 140 m² : cinq, et c'était juste.", who: "Sandrine V.", meta: "Portet-sur-Garonne (31) · 5 stères", top: true },
  { stars: "★★★★★", date: "02 juil. 2026", text: "Le rangement au bûcher à 39 € le stère vaut chaque centime quand on a une cave en sous-sol. Pile impeccable, rien à reprendre.", who: "Patrick L.", meta: "Toulouse (31) · 4 stères + rangement", top: false },
  { stars: "★★★★★", date: "21 juin 2026", text: "Chauffage principal d'une maison de 1930. Huit stères, deux livraisons, aucune mauvaise surprise sur le volume. Ça change des marchands de bois du bon coin.", who: "Nadia K.", meta: "Cugnaux (31) · 8 stères", top: true }
];

const RELATED = [
  { cat: "Allumage", name: "Bûchettes d'allumage — sac de 8 kg", price: 12 },
  { cat: "Charme & hêtre · 33 cm", name: "Charme & hêtre 33 cm — 1 stère", price: 129 },
  { cat: "Service", name: "Rangement au bûcher — par stère", price: 39 },
  { cat: "Mesure", name: "Humidimètre à pointes", price: 34 }
];

class Component extends DCLogic {
  state = { len: 1, dry: 0, qty: 4, shot: 0, tab: "Description", cart: 0, postcode: "", msg: "", msgOk: null, rev: "Les plus utiles", all: false };

  eur(n) { return n.toFixed(2).replace(".", ",") + " €"; }

  renderVals() {
    const base = this.props.basePrice ?? 119;
    const st = this.state;
    const L = LENGTHS[st.len], D = DRYINGS[st.dry];
    const unit = base + L.add + D.add;
    const tier = st.qty >= 7 ? 0.08 : st.qty >= 4 ? 0.04 : 0;
    const net = unit * (1 - tier);
    const total = net * st.qty;

    const tab = TABS[st.tab];
    const revs = st.rev === "Les plus utiles" ? REVIEWS.filter(r => r.top) : st.rev === "5 étoiles" ? REVIEWS.filter(r => r.stars.indexOf("☆") < 0) : REVIEWS;
    const shown = st.all ? revs : revs.slice(0, 3);

    return {
      lengths: LENGTHS.map((l, i) => {
        const on = i === st.len;
        return { label: l.label, delta: l.delta, bg: on ? "#EEF2E4" : "#FBFAF5", border: on ? "#6E8F4E" : "rgba(35,41,31,.12)", color: on ? "#23291F" : "#4E5647", sub: on ? "#3E5C33" : "#A8AE9C", onClick: () => this.setState({ len: i }) };
      }),
      dryings: DRYINGS.map((d, i) => {
        const on = i === st.dry;
        return { label: d.label, bg: on ? "#33512F" : "#FBFAF5", color: on ? "#F4F7EC" : "#55604F", border: on ? "#33512F" : "rgba(35,41,31,.14)", onClick: () => this.setState({ dry: i }) };
      }),
      shots: ["Le stère", "Bûche fendue", "Coupe", "Livraison", "Bûcher rangé"].map((label, i) => ({
        label,
        slotId: "fp-shot-" + (i + 1),
        photo: "photos/wood/" + ["chene-33", "chene-25", "charme-33", "livraison", "bucher"][i] + ".jpg",
        hint: "Photo — " + ["stère de chêne 33 cm empilé", "bûche fendue, calibre 12 cm", "section de bûche, cernes serrés", "camion benne au déchargement", "bûcher rangé sous auvent"][i],
        opacity: i === st.shot ? 1 : 0,
        events: i === st.shot ? "auto" : "none",
        border: i === st.shot ? "#33512F" : "transparent",
        thumbImg: "url(photos/wood/" + ["chene-33", "chene-25", "charme-33", "livraison", "bucher"][i] + ".jpg)",
        onClick: () => this.setState({ shot: i })
      })),
      qty: st.qty,
      inc: () => this.setState(s => ({ qty: Math.min(30, s.qty + 1) })),
      dec: () => this.setState(s => ({ qty: Math.max(1, s.qty - 1) })),
      volume: (L.vol * st.qty).toFixed(2).replace(".", ",") + " m³",
      seasonNote: st.qty <= 3 ? "Appoint ou mi-saison" : st.qty <= 6 ? "Une saison, maison isolée de 100 m²" : "Chauffage principal, maison ancienne",
      tierNote: tier === 0 ? "Remise de volume dès 4 stères" : "Remise de volume −" + Math.round(tier * 100) + " % appliquée",
      tierColor: tier === 0 ? "#A8AE9C" : "#3E5C33",
      unitPrice: this.eur(net),
      oldPrice: tier > 0 ? this.eur(unit) : (L.add === 0 && D.add === 0 ? "129,00 €" : ""),
      total: this.eur(total),
      monthly: this.eur(total / 3) + " × 3",
      freeShip: st.qty >= 4 ? "Livraison offerte" : "Livraison 45 € — offerte dès 4 stères",
      add: () => this.setState(s => ({ cart: s.cart + s.qty })),
      addLabel: "Ajouter " + st.qty + (st.qty > 1 ? " stères" : " stère") + " au panier",
      cartCount: st.cart,
      stickyName: "Chêne " + L.label + " — " + D.humid + " d'humidité",
      stickyMeta: st.qty + (st.qty > 1 ? " stères · " : " stère · ") + this.eur(net) + " le stère · " + D.ready,
      specs: [
        { k: "Essence", v: "Chêne pédonculé & sessile" },
        { k: "Longueur de bûche", v: L.label + " (±2 cm)" },
        { k: "Humidité sur masse brute", v: D.humid },
        { k: "Séchage", v: st.dry === 0 ? "24 mois sous auvent" : "18 mois + étuve" },
        { k: "Énergie par stère", v: st.dry === 0 ? "≈ 1 900 kWh" : "≈ 2 050 kWh" },
        { k: "Volume apparent / stère", v: L.vol.toFixed(2).replace(".", ",") + " m³" },
        { k: "Masse indicative", v: "≈ 480 kg / stère" },
        { k: "Calibre", v: "8 à 14 cm, fendu" },
        { k: "Provenance", v: "Comminges & Volvestre (< 100 km)" },
        { k: "Certifications", v: "NF Bois de chauffage · PEFC" }
      ],
      tabs: Object.keys(TABS).map(label => {
        const on = label === st.tab;
        return { label, color: on ? "#23291F" : "#8A9180", line: on ? "#33512F" : "transparent", onClick: () => this.setState({ tab: label }) };
      }),
      tabTitle: tab.title,
      tabParas: tab.paras,
      tabPoints: tab.points,
      histogram: [
        { label: "5 ★", pct: "88%", n: "364" },
        { label: "4 ★", pct: "9%", n: "37" },
        { label: "3 ★", pct: "2%", n: "8" },
        { label: "2 ★", pct: "1%", n: "2" },
        { label: "1 ★", pct: "0%", n: "1" }
      ],
      criteria: [
        { k: "Qualité du bois", v: "4,9 / 5" },
        { k: "Séchage annoncé", v: "4,9 / 5" },
        { k: "Respect du volume", v: "4,8 / 5" },
        { k: "Livraison", v: "4,7 / 5" }
      ],
      reviewFilters: ["Les plus utiles", "5 étoiles", "Tous"].map(label => {
        const on = label === st.rev;
        return { label, bg: on ? "#FFFFFF" : "transparent", color: on ? "#23291F" : "#6B7263", onClick: () => this.setState({ rev: label, all: false }) };
      }),
      reviews: shown,
      moreLabel: st.all ? "Réduire les avis" : "Voir les " + revs.length + " avis de ce filtre",
      moreReviews: () => this.setState(s => ({ all: !s.all })),
      related: RELATED.map((r, i) => ({ ...r, slotId: "fp-rel-" + (i + 1), photo: "photos/wood/" + ["allumage", "charme-33", "bucher", "etuve-33"][i] + ".jpg", hint: "Photo " + r.cat.toLowerCase(), price: this.eur(r.price), add: () => this.setState(s => ({ cart: s.cart + 1 })) })),
      postcode: st.postcode,
      postcodeMsg: st.msg,
      postcodeColor: st.msgOk === false ? "#C05621" : "#3E5C33",
      onPostcode: (e) => this.setState({ postcode: e.target.value, msg: "" }),
      checkPostcode: () => {
        const cp = st.postcode.trim();
        if (!/^\d{5}$/.test(cp)) return this.setState({ msg: "Code postal à 5 chiffres", msgOk: false });
        const zone = ["31", "32", "81", "82", "09", "11", "65", "47"].includes(cp.slice(0, 2));
        this.setState({ msg: zone ? "✓ Créneau disponible dès vendredi" : "Hors zone — écrivez-nous", msgOk: zone });
      }
    };
  }
}
</script>
</body>
</html>
