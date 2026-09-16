<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; background: #FBFAF5; font-family: "Newsreader", Georgia, serif; -webkit-font-smoothing: antialiased; }
  a { color: inherit; text-decoration: none; }
  a:hover { color: #3E5C33; }
  input, button, select { font-family: inherit; }
  @keyframes riseIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  ::selection { background: #DCE5CE; color: #23291F; }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: #CFD8C2; border-radius: 999px; }
</style>
<script src="./image-slot.js"></script>
</helmet>

<div style="background: #FBFAF5; color: #23291F; min-height: 100vh; overflow-x: hidden;">

  <div style="background: #EEF2E4; color: #3E5C33; font-family: 'DM Mono', monospace; font-size: 11.5px; letter-spacing: .06em; display: flex; justify-content: center; gap: 44px; padding: 11px 32px; flex-wrap: wrap;">
    <span>Livraison Occitanie sous 5 jours ouvrés</span>
    <span style="color: #C05621;">Dépôts Toulouse &amp; Muret — Lun. au Ven. 8h30–18h30</span>
    <span>Paiement en 3× sans frais</span>
  </div>

  <header style="position: sticky; top: 0; z-index: 40; background: rgba(251,250,245,.9); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(35,41,31,.08);">
    <div style="max-width: 1400px; margin: 0 auto; padding: 18px 32px; display: flex; align-items: center; gap: 36px;">
      <a href="La Belle Buche - Boutique v2.dc.html" style="display: flex; align-items: center; flex-shrink: 0;">
        <img src="logo-la-belle-buche.png" alt="La Belle Bûche — bois de chauffage au stère" style="height: 72px; width: auto; display: block;">
      </a>
      <div style="flex: 1; display: flex; align-items: center; gap: 12px; background: #FFFFFF; border: 1px solid rgba(35,41,31,.1); border-radius: 999px; padding: 13px 22px; max-width: 430px; box-shadow: 0 1px 2px rgba(35,41,31,.04);">
        <span style="font-family: 'DM Mono', monospace; font-size: 13px; color: #8A9180;">⌕</span>
        <input placeholder="Chêne, charme, 33 cm, stère…" style="border: 0; outline: 0; background: transparent; font-family: 'Newsreader', serif; font-size: 15px; width: 100%; color: #23291F;">
        <span style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .06em; color: #A8AE9C; border: 1px solid rgba(35,41,31,.12); border-radius: 6px; padding: 2px 6px;">⌘K</span>
      </div>
      <div style="display: flex; align-items: center; gap: 24px; margin-left: auto; font-family: 'DM Mono', monospace; font-size: 11.5px; letter-spacing: .05em;">
        <div style="display: grid; gap: 3px; text-align: right; line-height: 1.3;">
          <span style="color: #23291F;">06 30 46 09 35</span>
          <span style="color: #8A9180;">Rappel gratuit sous 2 h</span>
        </div>
        <a href="La Belle Buche - Espace Client.dc.html" style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 30px; height: 30px; border-radius: 999px; background: #EEF2E4; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; color: #3E5C33;">◦</span>
          Compte
        </a>
        <span style="font-family: 'DM Mono', monospace; font-size: 11.5px; letter-spacing: .05em; background: #33512F; color: #F4F7EC; border-radius: 999px; padding: 12px 16px 12px 20px; display: flex; align-items: center; gap: 10px;">
          Panier <span style="background: #C05621; color: #fff; border-radius: 999px; min-width: 21px; height: 21px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px;">{{ cartCount }}</span>
        </span>
      </div>
    </div>
  </header>

  <div style="max-width: 1400px; margin: 0 auto; padding: 22px 32px 0; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .06em; color: #8A9180; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
    <a href="La Belle Buche - Boutique v2.dc.html">Accueil</a><span>/</span>
    <span style="color: #23291F;">Panier</span>
    <a href="La Belle Buche - Categorie Template.dc.html" style="margin-left: auto;">← Continuer mes achats</a>
  </div>

  <section style="max-width: 1400px; margin: 0 auto; padding: 26px 32px 0; animation: riseIn .6s ease both;">
    <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; flex-wrap: wrap; margin-bottom: 30px;">
      <div>
        <div style="font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .08em; color: #C05621; margin-bottom: 12px;">Étape 1 sur 3 — Vérification du chargement</div>
        <h1 style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: clamp(34px, 3.6vw, 48px); line-height: 1.02; letter-spacing: -.034em; margin: 0;">Votre panier</h1>
      </div>
      <div style="display: flex; align-items: center; gap: 14px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .06em;">
        <span style="display: flex; align-items: center; gap: 9px; color: #23291F;"><span style="width: 24px; height: 24px; border-radius: 999px; background: #33512F; color: #F4F7EC; display: inline-flex; align-items: center; justify-content: center;">1</span> Panier</span>
        <span style="width: 34px; height: 1px; background: rgba(35,41,31,.18);"></span>
        <span style="display: flex; align-items: center; gap: 9px; color: #A8AE9C;"><span style="width: 24px; height: 24px; border-radius: 999px; background: #EEF2E4; color: #8A9180; display: inline-flex; align-items: center; justify-content: center;">2</span> Livraison</span>
        <span style="width: 34px; height: 1px; background: rgba(35,41,31,.18);"></span>
        <span style="display: flex; align-items: center; gap: 9px; color: #A8AE9C;"><span style="width: 24px; height: 24px; border-radius: 999px; background: #EEF2E4; color: #8A9180; display: inline-flex; align-items: center; justify-content: center;">3</span> Paiement</span>
      </div>
    </div>
  </section>

  <sc-if value="{{ isEmpty }}">
    <section style="max-width: 1400px; margin: 0 auto; padding: 10px 32px 100px;">
      <div style="background: #FFFFFF; border: 1px solid rgba(35,41,31,.09); border-radius: 32px; padding: 74px 48px; text-align: center; box-shadow: 0 24px 54px -46px rgba(35,41,31,.6);">
        <div style="font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .08em; color: #C05621; margin-bottom: 16px;">Panier vide</div>
        <h2 style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 34px; letter-spacing: -.03em; margin: 0 0 14px;">Rien dans la remorque</h2>
        <p style="font-size: 19px; line-height: 1.6; color: #4E5647; max-width: 44ch; margin: 0 auto 32px; text-wrap: pretty;">Comptez 6 à 8 stères pour chauffer une maison de 120 m² sur une saison complète. On vous aide à calculer si vous hésitez.</p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="La Belle Buche - Categorie Template.dc.html" style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px; letter-spacing: .05em; background: #33512F; color: #F4F7EC; border-radius: 999px; padding: 16px 30px;" style-hover="background: #23291F; color: #F4F7EC;">Voir le bois au stère</a>
          <a href="#" style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px; letter-spacing: .05em; border: 1px solid rgba(35,41,31,.16); border-radius: 999px; padding: 16px 30px;">Calculer mon besoin</a>
        </div>
      </div>
    </section>
  </sc-if>

  <sc-if value="{{ hasItems }}" hint-placeholder-val="{{ true }}">
  <section style="max-width: 1400px; margin: 0 auto; padding: 10px 32px 90px; display: flex; flex-wrap: wrap; gap: 44px; align-items: flex-start;">

    <div style="flex: 1 1 540px; min-width: 0; display: grid; gap: 18px;">

      <div style="background: #FFFFFF; border: 1px solid rgba(35,41,31,.09); border-radius: 28px; overflow: hidden; box-shadow: 0 24px 54px -48px rgba(35,41,31,.6);">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 22px 28px; border-bottom: 1px solid rgba(35,41,31,.08); font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .08em; color: #8A9180;">
          <span>{{ lineCountLabel }}</span>
          <span>{{ volumeLabel }}</span>
        </div>

        <sc-for list="{{ lines }}" as="l" hint-placeholder-count="3">
          <div style="display: flex; flex-wrap: wrap; gap: 24px; padding: 26px 28px; border-bottom: 1px solid rgba(35,41,31,.07); align-items: flex-start;">
            <div style="flex: 0 0 132px; width: 132px; aspect-ratio: 1; border-radius: 20px; overflow: hidden; background: #E4E9D9;">
              <image-slot id="{{ l.slotId }}" shape="rect" src="{{ l.photo }}" placeholder="{{ l.hint }}"></image-slot>
            </div>
            <div style="flex: 1 1 260px; min-width: 0; display: grid; gap: 10px;">
              <div style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .08em; color: #C05621;">{{ l.ref }}</div>
              <a href="La Belle Buche - Fiche Produit.dc.html" style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 22px; letter-spacing: -.024em; line-height: 1.15;">{{ l.name }}</a>
              <div style="font-size: 16.5px; line-height: 1.5; color: #4E5647; max-width: 44ch;">{{ l.spec }}</div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap; font-family: 'DM Mono', monospace; font-size: 9.5px; letter-spacing: .05em;">
                <span style="background: #EEF2E4; color: #3E5C33; border-radius: 999px; padding: 6px 11px;">{{ l.tagA }}</span>
                <span style="background: #F5EFE2; color: #8A6B3C; border-radius: 999px; padding: 6px 11px;">{{ l.tagB }}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-top: 4px; font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .05em;">
                <div style="flex: 0 0 auto; display: flex; align-items: center; gap: 0; border: 1px solid rgba(35,41,31,.14); border-radius: 999px; overflow: hidden;">
                  <button onClick="{{ l.dec }}" style="border: 0; background: transparent; cursor: pointer; flex: 0 0 38px; width: 38px; height: 38px; font-size: 15px; color: #3E5C33;" style-hover="background: #EEF2E4;">−</button>
                  <span style="flex: 0 0 auto; min-width: 58px; text-align: center; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 14px; color: #23291F;">{{ l.qtyLabel }}</span>
                  <button onClick="{{ l.inc }}" style="border: 0; background: transparent; cursor: pointer; flex: 0 0 38px; width: 38px; height: 38px; font-size: 15px; color: #3E5C33;" style-hover="background: #EEF2E4;">+</button>
                </div>
                <span style="color: #8A9180;">{{ l.unitLabel }}</span>
                <button onClick="{{ l.remove }}" style="border: 0; background: transparent; cursor: pointer; font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .06em; color: #A8AE9C; padding: 0;" style-hover="color: #C05621;">Retirer</button>
              </div>
            </div>
            <div style="flex: 1 1 150px; margin-left: auto; text-align: right; display: grid; gap: 6px; justify-items: end; align-content: start;">
              <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 25px; letter-spacing: -.03em;">{{ l.total }}</span>
              <span style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .05em; color: #8A9180;">{{ l.unitPrice }}</span>
              <span style="font-family: 'DM Mono', monospace; font-size: 9.5px; letter-spacing: .05em; color: #3E5C33; background: #EEF2E4; border-radius: 999px; padding: 5px 10px; margin-top: 4px;">{{ l.stock }}</span>
            </div>
          </div>
        </sc-for>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 28px; background: #F7F4EA;">
          <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .06em; color: #6B7263;">{{ palletNote }}</span>
          <a href="La Belle Buche - Categorie Template.dc.html" style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .06em; color: #3E5C33; border-bottom: 1px solid rgba(62,92,51,.35);">Ajouter un autre bois</a>
        </div>
      </div>

      <div style="background: #FFFFFF; border: 1px solid rgba(35,41,31,.09); border-radius: 28px; padding: 28px; box-shadow: 0 24px 54px -48px rgba(35,41,31,.6);">
        <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 20px; margin-bottom: 20px;">
          <h2 style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 21px; letter-spacing: -.024em; margin: 0;">Comment on vous livre</h2>
          <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .06em; color: #8A9180;">31200 Toulouse — zone 1</span>
        </div>
        <div style="display: grid; gap: 11px;">
          <sc-for list="{{ deliveries }}" as="d" hint-placeholder-count="3">
            <button onClick="{{ d.onClick }}" style="display: flex; flex-wrap: wrap; gap: 18px; align-items: center; text-align: left; cursor: pointer; border: 1px solid {{ d.border }}; background: {{ d.bg }}; border-radius: 20px; padding: 20px 22px; transition: border-color .2s ease, background .2s ease;">
              <span style="flex: 0 0 20px; width: 20px; height: 20px; border-radius: 999px; border: 5px solid {{ d.dot }}; background: #FFFFFF; transition: border-color .2s ease;"></span>
              <span style="flex: 1 1 240px; min-width: 0; display: grid; gap: 5px;">
                <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 16.5px; letter-spacing: -.015em;">{{ d.label }}</span>
                <span style="font-size: 16px; line-height: 1.45; color: #4E5647;">{{ d.desc }}</span>
                <span style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .06em; color: #8A9180;">{{ d.eta }}</span>
              </span>
              <span style="margin-left: auto; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 17px; letter-spacing: -.02em; color: {{ d.priceColor }};">{{ d.price }}</span>
            </button>
          </sc-for>
        </div>
        <div style="margin-top: 18px; background: #EEF2E4; border-radius: 18px; padding: 18px 20px; display: flex; gap: 14px; align-items: flex-start;">
          <span style="font-family: 'DM Mono', monospace; font-size: 11px; color: #3E5C33;">◈</span>
          <p style="margin: 0; font-size: 16.5px; line-height: 1.5; color: #3E5C33; max-width: 62ch;">{{ deliveryNote }}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px;">
        <sc-for list="{{ reassurance }}" as="r" hint-placeholder-count="3">
          <div style="background: #F7F4EA; border-radius: 20px; padding: 20px 22px; display: grid; gap: 7px;">
            <span style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .08em; color: #C05621;">{{ r.kicker }}</span>
            <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 15.5px; letter-spacing: -.015em;">{{ r.title }}</span>
            <span style="font-size: 15.5px; line-height: 1.45; color: #4E5647;">{{ r.desc }}</span>
          </div>
        </sc-for>
      </div>

      <div style="background: #FFFFFF; border: 1px solid rgba(35,41,31,.09); border-radius: 28px; padding: 28px;">
        <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 20px; margin-bottom: 20px;">
          <h2 style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 21px; letter-spacing: -.024em; margin: 0;">On y ajoute souvent</h2>
          <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .06em; color: #8A9180;">Même camion, pas de frais en plus</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px;">
          <sc-for list="{{ crossSell }}" as="c" hint-placeholder-count="3">
            <div style="display: grid; gap: 12px; border: 1px solid rgba(35,41,31,.08); border-radius: 22px; padding: 16px;">
              <div style="aspect-ratio: 4/3; border-radius: 15px; overflow: hidden; background: #E4E9D9;">
                <image-slot id="{{ c.slotId }}" shape="rect" src="{{ c.photo }}" placeholder="{{ c.hint }}"></image-slot>
              </div>
              <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 16px; letter-spacing: -.018em; line-height: 1.2;">{{ c.name }}</span>
              <span style="font-size: 15.5px; line-height: 1.4; color: #4E5647;">{{ c.desc }}</span>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 2px;">
                <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 17px; letter-spacing: -.02em;">{{ c.price }}</span>
                <button onClick="{{ c.onAdd }}" style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .06em; border: 1px solid rgba(35,41,31,.16); background: transparent; border-radius: 999px; padding: 9px 15px; cursor: pointer; color: #23291F;" style-hover="background: #33512F; color: #F4F7EC; border-color: #33512F;">{{ c.cta }}</button>
              </div>
            </div>
          </sc-for>
        </div>
      </div>
    </div>

    <div style="flex: 1 1 320px; min-width: 0; display: grid; gap: 16px; position: sticky; top: 140px;">
      <div style="background: #FFFFFF; border: 1px solid rgba(35,41,31,.09); border-radius: 28px; padding: 28px; box-shadow: 0 24px 54px -44px rgba(35,41,31,.65);">
        <h2 style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 21px; letter-spacing: -.024em; margin: 0 0 22px;">Récapitulatif</h2>

        <div style="display: grid; gap: 13px; font-size: 17px; color: #4E5647;">
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span>Sous-total bois</span><span style="color: #23291F;">{{ subtotal }}</span>
          </div>
          <sc-if value="{{ hasDiscount }}">
            <div style="display: flex; justify-content: space-between; gap: 16px; color: #C05621;">
              <span>{{ discountLabel }}</span><span>{{ discountValue }}</span>
            </div>
          </sc-if>
          <div style="display: flex; justify-content: space-between; gap: 16px;">
            <span>{{ shippingLabel }}</span><span style="color: #23291F;">{{ shippingValue }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 16px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .05em; color: #8A9180;">
            <span>dont TVA 20 %</span><span>{{ vat }}</span>
          </div>
        </div>

        <div style="height: 1px; background: rgba(35,41,31,.1); margin: 22px 0;"></div>

        <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 16px;">
          <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 17px; letter-spacing: -.02em;">Total TTC</span>
          <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 34px; letter-spacing: -.035em;">{{ total }}</span>
        </div>
        <div style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .05em; color: #8A9180; margin-top: 8px;">{{ installments }}</div>

        <button style="width: 100%; margin-top: 22px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 14.5px; letter-spacing: .04em; background: #33512F; color: #F4F7EC; border: 0; border-radius: 999px; padding: 19px; cursor: pointer;" style-hover="background: #23291F;">Choisir mon créneau de livraison</button>
        <div style="text-align: center; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .06em; color: #A8AE9C; margin-top: 12px;">Aucun prélèvement avant confirmation du créneau</div>

        <div style="height: 1px; background: rgba(35,41,31,.1); margin: 22px 0;"></div>

        <div style="display: grid; gap: 10px;">
          <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .08em; color: #8A9180;">CODE PROMO OU BON FIDÉLITÉ</span>
          <div style="display: flex; gap: 9px;">
            <input value="{{ promoInput }}" onChange="{{ onPromoChange }}" placeholder="BUCHE10" style="flex: 1; min-width: 0; border: 1px solid rgba(35,41,31,.14); border-radius: 999px; padding: 13px 18px; font-family: 'DM Mono', monospace; font-size: 11.5px; letter-spacing: .06em; outline: 0; background: #FBFAF5; color: #23291F;">
            <button onClick="{{ applyPromo }}" style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .06em; border: 1px solid rgba(35,41,31,.16); background: transparent; border-radius: 999px; padding: 13px 18px; cursor: pointer; color: #23291F;" style-hover="background: #EEF2E4;">Valider</button>
          </div>
          <span style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .05em; color: {{ promoColor }};">{{ promoMessage }}</span>
        </div>
      </div>

      <div style="background: #23291F; color: #E7EBDD; border-radius: 28px; padding: 26px 28px;">
        <div style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .08em; color: #C05621; margin-bottom: 12px;">FIDÉLITÉ — {{ loyaltyPoints }}</div>
        <p style="margin: 0 0 16px; font-size: 16.5px; line-height: 1.5; max-width: 34ch;">{{ loyaltyText }}</p>
        <a href="La Belle Buche - Espace Client.dc.html" style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .06em; color: #F4F7EC; border-bottom: 1px solid rgba(244,247,236,.35);">Voir mon espace client →</a>
      </div>

      <div style="background: #F5EFE2; border-radius: 28px; padding: 24px 26px; display: grid; gap: 12px;">
        <span style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 16px; letter-spacing: -.018em;">Un doute sur la quantité ?</span>
        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #4E5647;">Appelez le dépôt, on calcule votre besoin en trois questions : surface, isolation, appareil.</p>
        <span style="font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: .05em; color: #23291F;">06 30 46 09 35</span>
      </div>
    </div>
  </section>
  </sc-if>

  <footer style="background: #23291F; color: #9AA391;">
    <div style="max-width: 1400px; margin: 0 auto; padding: 80px 32px 30px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 48px;">
      <div>
        <div style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 25px; letter-spacing: -.03em; color: #F4F7EC; margin-bottom: 14px;">La Belle Bûche</div>
        <div style="font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .08em; color: #C05621; margin-bottom: 16px;">Bois de chauffage vendu au stère</div>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.55; max-width: 40ch;">Bûcherons-négociants dans le Sud-Ouest. Du bois coupé près de chez vous, séché deux ans, livré et rangé.</p>
        <div style="display: flex; gap: 16px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .07em;">
          <a href="#">Facebook</a><a href="#">YouTube</a><a href="#">LinkedIn</a>
        </div>
      </div>
      <div style="display: grid; gap: 11px; align-content: start; font-size: 16px;">
        <div style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 12.5px; letter-spacing: .05em; color: #F4F7EC; margin-bottom: 6px;">Dépôt de Toulouse</div>
        <span>06 30 46 09 35</span>
        <span>14 chemin des Charbonniers<br>31200 Toulouse</span>
        <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: #6E7A63;">Enlèvement au stère sous 2 h</span>
      </div>
      <div style="display: grid; gap: 11px; align-content: start; font-size: 16px;">
        <div style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 12.5px; letter-spacing: .05em; color: #F4F7EC; margin-bottom: 6px;">Parc à bois de Muret</div>
        <span>05 61 76 70 78</span>
        <span>ZA de Joffrery, av. des Pins<br>31600 Muret</span>
        <span style="font-family: 'DM Mono', monospace; font-size: 10.5px; color: #6E7A63;">Chargement remorque sur place</span>
      </div>
      <div style="display: grid; gap: 11px; align-content: start; font-size: 16px;">
        <div style="font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 12.5px; letter-spacing: .05em; color: #F4F7EC; margin-bottom: 6px;">Informations</div>
        <a href="#">Livraison</a><a href="#">Qu'est-ce qu'un stère ?</a><a href="La Belle Buche - Espace Client.dc.html">Programme de fidélité</a><a href="#">CGV — CGU</a><a href="#">Mentions légales</a>
      </div>
    </div>
    <div style="max-width: 1400px; margin: 0 auto; padding: 22px 32px 40px; border-top: 1px solid rgba(244,247,236,.1); font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: .07em; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap;">
      <span>© 2026 La Belle Bûche — Maquette</span>
      <span>Paiement CB · Virement · 3× sans frais</span>
    </div>
  </footer>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props="{&quot;panierVide&quot;:{&quot;editor&quot;:&quot;boolean&quot;,&quot;default&quot;:false,&quot;tsType&quot;:&quot;boolean&quot;,&quot;section&quot;:&quot;États&quot;},&quot;codePromoActif&quot;:{&quot;editor&quot;:&quot;boolean&quot;,&quot;default&quot;:false,&quot;tsType&quot;:&quot;boolean&quot;,&quot;section&quot;:&quot;États&quot;},&quot;modeLivraison&quot;:{&quot;editor&quot;:&quot;enum&quot;,&quot;options&quot;:[&quot;Livraison déposée&quot;,&quot;Livraison rangée au tas&quot;,&quot;Enlèvement au dépôt&quot;],&quot;default&quot;:&quot;Livraison rangée au tas&quot;,&quot;tsType&quot;:&quot;string&quot;,&quot;section&quot;:&quot;États&quot;}}">
const CATALOG = {
  ch33: { ref: "CH33-ST · Comminges", name: "Chêne 33 cm", spec: "Séché 24 mois sous auvent, humidité 16 %. Longue flambée, braises tenaces.", price: 89, unit: "stère", unitWord: "stères", tagA: "Humidité 16 %", tagB: "Séché 24 mois", stock: "1 240 stères en parc", photo: "photos/wood/chene-33.jpg", hint: "Chêne 33 cm empilé", slotId: "cart-ch33" },
  cm25: { ref: "CM25-ST · Lauragais", name: "Charme 25 cm", spec: "Bois dur à combustion vive, idéal pour lancer une flambée d'insert.", price: 99, unit: "stère", unitWord: "stères", tagA: "Humidité 15 %", tagB: "Petit foyer", stock: "460 stères en parc", photo: "photos/wood/charme-33.jpg", hint: "Charme 25 cm fendu", slotId: "cart-cm25" },
  dens: { ref: "DENS-PAL · Palette 96 bûches", name: "Bûches densifiées nuit", spec: "Palette de 96 bûches compressées, 8 h de combustion lente par bûche.", price: 349, unit: "palette", unitWord: "palettes", tagA: "Sans additif", tagB: "8 h de feu", stock: "38 palettes prêtes", photo: "", hint: "Palette de bûches densifiées", slotId: "cart-dens" },
  allume: { ref: "ALL-5K · Sac 5 kg", name: "Allume-feu résineux", spec: "Sac de 5 kg de petit bois résineux, sec, pour un départ de feu sans papier.", price: 12.9, unit: "sac", unitWord: "sacs", tagA: "Sac 5 kg", tagB: "Résineux", stock: "En stock", photo: "photos/kindling.jpg", hint: "Sac d'allume-feu", slotId: "cart-allume" },
  cendres: { ref: "SEAU-CE · Acier noirci", name: "Seau à cendres", spec: "Seau acier 15 L avec pelle, couvercle étanche.", price: 44, unit: "pièce", unitWord: "pièces", tagA: "Acier 15 L", tagB: "Avec pelle", stock: "En stock", photo: "", hint: "Seau à cendres acier", slotId: "cart-cendres" },
  gants: { ref: "GANT-CU · Cuir croûte", name: "Gants de manutention", spec: "Cuir croûte doublé, poignet long pour porter les bûches.", price: 29, unit: "paire", unitWord: "paires", tagA: "Cuir", tagB: "Taille unique", stock: "En stock", photo: "", hint: "Gants en cuir", slotId: "cart-gants" }
};

const DELIVERIES = [
  { id: "depose", label: "Livraison déposée", desc: "Camion-grue, dépose en vrac devant chez vous, au plus près de l'accès.", eta: "Mar. 15 sept. — créneau 8h30–12h30", price: 49 },
  { id: "rangee", label: "Livraison rangée au tas", desc: "Deux bûcherons rangent le bois à l'endroit choisi, jusqu'à 25 m du camion.", eta: "Jeu. 17 sept. — créneau 13h30–18h", price: 89 },
  { id: "depot", label: "Enlèvement au dépôt", desc: "Chargement de votre remorque à Toulouse ou Muret, sanglage offert.", eta: "Dès demain 8h30, sans rendez-vous", price: 0 }
];

class Component extends DCLogic {
  constructor(props) {
    super(props);
    const empty = props.panierVide === true;
    this.state = {
      items: empty ? [] : [
        { key: "ch33", qty: 4 },
        { key: "cm25", qty: 2 },
        { key: "allume", qty: 3 }
      ],
      delivery: props.modeLivraison === "Enlèvement au dépôt" ? "depot" : (props.modeLivraison === "Livraison déposée" ? "depose" : "rangee"),
      promoInput: props.codePromoActif ? "BUCHE10" : "",
      promo: props.codePromoActif ? "BUCHE10" : null,
      promoMsg: props.codePromoActif ? "BUCHE10 appliqué — 10 % sur le bois" : "Un code par commande. Les bons fidélité sont cumulables.",
      promoOk: props.codePromoActif === true
    };
  }

  eur(n) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u202f/g, " ") + " €";
  }

  setQty(key, delta) {
    this.setState(s => ({
      items: s.items
        .map(i => (i.key === key ? { key: i.key, qty: Math.max(0, i.qty + delta) } : i))
        .filter(i => i.qty > 0)
    }));
  }

  add(key) {
    this.setState(s => {
      const found = s.items.some(i => i.key === key);
      return { items: found ? s.items.map(i => (i.key === key ? { key: i.key, qty: i.qty + 1 } : i)) : s.items.concat([{ key: key, qty: 1 }]) };
    });
  }

  applyPromo() {
    const code = (this.state.promoInput || "").trim().toUpperCase();
    if (code === "BUCHE10") this.setState({ promo: code, promoOk: true, promoMsg: "BUCHE10 appliqué — 10 % sur le bois" });
    else if (code === "") this.setState({ promo: null, promoOk: false, promoMsg: "Saisissez un code pour l'appliquer." });
    else this.setState({ promo: null, promoOk: false, promoMsg: "Code inconnu ou expiré." });
  }

  renderVals() {
    const s = this.state;
    const lines = s.items.map(i => {
      const p = CATALOG[i.key];
      const word = i.qty > 1 ? p.unitWord : p.unit;
      return {
        key: i.key,
        ref: p.ref, name: p.name, spec: p.spec, tagA: p.tagA, tagB: p.tagB, stock: p.stock,
        photo: p.photo, hint: p.hint, slotId: p.slotId,
        qtyLabel: i.qty + " " + word,
        unitLabel: this.eur(p.price) + " / " + p.unit,
        unitPrice: "soit " + this.eur(p.price) + " le " + p.unit,
        total: this.eur(p.price * i.qty),
        inc: () => this.setQty(i.key, 1),
        dec: () => this.setQty(i.key, -1),
        remove: () => this.setState(st => ({ items: st.items.filter(x => x.key !== i.key) }))
      };
    });

    const subtotal = s.items.reduce((a, i) => a + CATALOG[i.key].price * i.qty, 0);
    const steres = s.items.filter(i => CATALOG[i.key].unit === "stère").reduce((a, i) => a + i.qty, 0);
    const disc = s.promo === "BUCHE10" ? subtotal * 0.1 : 0;
    const deliv = DELIVERIES.find(d => d.id === s.delivery) || DELIVERIES[1];
    const shipping = s.delivery === "depot" ? 0 : (subtotal - disc >= 600 ? 0 : deliv.price);
    const total = subtotal - disc + shipping;
    const count = s.items.reduce((a, i) => a + i.qty, 0);

    const freeLeft = 600 - (subtotal - disc);
    const note = s.delivery === "depot"
      ? "Enlèvement gratuit : présentez-vous au dépôt avec une remorque freinée. On charge, on sangle, on pèse."
      : (shipping === 0
        ? "Livraison offerte : votre commande dépasse 600 € sur la zone 1."
        : "Encore " + this.eur(freeLeft) + " de bois et la livraison passe à 0 € sur la zone 1.");

    return {
      cartCount: count,
      lines: lines,
      isEmpty: s.items.length === 0,
      hasItems: s.items.length > 0,
      lineCountLabel: s.items.length + (s.items.length > 1 ? " références dans la remorque" : " référence dans la remorque"),
      volumeLabel: steres > 0 ? steres + " stères — env. " + (steres * 450) + " kg" : "Aucun stère, colis seuls",
      palletNote: "Palettes et sacs voyagent dans le même camion que les stères.",

      deliveries: DELIVERIES.map(d => {
        const on = d.id === s.delivery;
        const free = d.id !== "depot" && subtotal - disc >= 600;
        return {
          key: d.id,
          label: d.label, desc: d.desc, eta: d.eta,
          price: d.price === 0 ? "Gratuit" : (free ? "Offerte" : this.eur(d.price)),
          priceColor: d.price === 0 || free ? "#3E5C33" : "#23291F",
          border: on ? "#33512F" : "rgba(35,41,31,.12)",
          bg: on ? "#F3F7EA" : "#FFFFFF",
          dot: on ? "#33512F" : "#D8DECB",
          onClick: () => this.setState({ delivery: d.id })
        };
      }),
      deliveryNote: note,

      reassurance: [
        { key: "r1", kicker: "MESURE", title: "Humidité contrôlée devant vous", desc: "Le livreur sonde trois bûches au hasard. Au-dessus de 20 %, on remporte le chargement." },
        { key: "r2", kicker: "VOLUME", title: "Stère garanti au cordage", desc: "Bois rangé et mesuré au parc, pas au tas. Photo du cordage envoyée avant départ." },
        { key: "r3", kicker: "PAIEMENT", title: "3× sans frais dès 300 €", desc: "Premier tiers au créneau confirmé, les deux autres à 30 et 60 jours." }
      ],

      crossSell: [
        { key: "dens", name: CATALOG.dens.name, desc: "Pour les nuits froides sans recharger le poêle.", price: this.eur(CATALOG.dens.price), photo: CATALOG.dens.photo, hint: CATALOG.dens.hint, slotId: "cross-dens", cta: "Ajouter", onAdd: () => this.add("dens") },
        { key: "cendres", name: CATALOG.cendres.name, desc: "Vidange propre du foyer, couvercle étanche.", price: this.eur(CATALOG.cendres.price), photo: CATALOG.cendres.photo, hint: CATALOG.cendres.hint, slotId: "cross-cendres", cta: "Ajouter", onAdd: () => this.add("cendres") },
        { key: "gants", name: CATALOG.gants.name, desc: "Poignet long, pour rentrer le bois sans écharde.", price: this.eur(CATALOG.gants.price), photo: CATALOG.gants.photo, hint: CATALOG.gants.hint, slotId: "cross-gants", cta: "Ajouter", onAdd: () => this.add("gants") }
      ],

      subtotal: this.eur(subtotal),
      hasDiscount: disc > 0,
      discountLabel: "Remise BUCHE10 (−10 %)",
      discountValue: "− " + this.eur(disc),
      shippingLabel: s.delivery === "depot" ? "Enlèvement au dépôt" : deliv.label,
      shippingValue: shipping === 0 ? "Offerte" : this.eur(shipping),
      vat: this.eur(total - total / 1.2),
      total: this.eur(total),
      installments: total >= 300 ? "ou 3 × " + this.eur(total / 3) + " sans frais" : "Paiement en 3× dès 300 € de commande",

      promoInput: s.promoInput,
      onPromoChange: e => this.setState({ promoInput: e.target.value }),
      applyPromo: () => this.applyPromo(),
      promoMessage: s.promoMsg,
      promoColor: s.promoOk ? "#3E5C33" : "#A8AE9C",

      loyaltyPoints: steres > 0 ? steres + " stères cette saison" : "Programme au stère",
      loyaltyText: "Au 10ᵉ stère de la saison, un sac d'allume-feu et le rangement au tas vous sont offerts."
    };
  }
}
</script>
</body>
</html>
