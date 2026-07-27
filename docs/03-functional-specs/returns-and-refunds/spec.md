# Retouren & Refunds — Functionele Specificatie

**Status:** v1.0, concept
**MVP-status:** Must Have — een B2C-marketplace binnen de EU kan niet zonder retourproces lanceren (wettelijk herroepingsrecht).
**Basis:** bestaand `Return`-domeinobject (`08-technical-blueprint/01-domain-model.md` §17, tot nu toe Status Open), Order Management Center (bevroren, sluit expliciet retourfunctionaliteit uit van zijn eigen scope — "geen... retour... functionaliteit").

---

## 1. Doel

Stelt een Klant in staat een (deel van een) Order te retourneren, en regelt de bijbehorende terugbetaling — zonder de al bevroren Order Management Center-scope te doorbreken (dat blijft uitsluitend lezend, deze spec introduceert het daadwerkelijke retour-/refundproces ernaast).

---

## 2. Rollen & rechten

| Rol | Rechten |
|---|---|
| **Klant** | Retour aanmelden voor een eigen Order(regel), binnen de herroepingstermijn; status van eigen retour inzien. |
| **Seller (Retailer/Producent)** | Retour beoordelen (ontvangen bevestigen, akkoord/afwijzing bij een niet-standaardgeval). |
| **Beheerder** | Ingrijpen bij een geschil tussen Klant en Seller over een retour (aansluitend op het al bestaande Dispute-mechanisme, `01-domain-model.md` §8/Product Cloud). |

---

## 3. Kernproces

1. **Aanmelden** — Klant meldt een retour aan voor een specifieke Orderregel, met reden.
2. **Bevestiging aan Seller** — Seller ontvangt notificatie (bestaand Notification-domeinobject/event).
3. **Verzending & ontvangst** — buiten deze specificatie (afhankelijk van het nog niet uitgewerkte Shipment-domeinobject, `01-domain-model.md` §16, blijft Status Open).
4. **Beoordeling** — Seller bevestigt ontvangst en akkoord, of wijst af met reden (bijv. product buiten retourtermijn, beschadigd door gebruik).
5. **Refund-uitvoering** — bij akkoord: terugbetaling via de PSP (zelfde integratiepunt als de oorspronkelijke betaling, `08-integration-architecture.md` sectie 4) voor het orderbedrag van de geretourneerde regel.
6. **Geschil (uitzondering)** — bij afwijzing door de Seller die de Klant betwist: escalatie naar Beheerder, zelfde patroon als het bestaande Dispute-mechanisme.

---

## 4. Datastructuur — raakvlak met Sprint 2

- **Return** — bestaat al als domeinobject (§17), tot nu toe zonder lifecycle/businessregels ("Status Open"). Deze specificatie vult dat in: status `Aangevraagd → Bevestigd door Seller → Ontvangen → Verwerkt (Refund uitgevoerd) / Afgewezen → (optioneel) Geëscaleerd`.
- **Refund** — nieuw, licht domeinconcept: een terugbetalingsregistratie gekoppeld aan een Return en de oorspronkelijke Order-betaaltransactie. Bewust **geen** eigen, zwaar uitgewerkt domeinobject — een Refund is in essentie een status en een bedrag op een Return, geen zelfstandige entiteit met eigen levenscyclus.

---

## 5. MVP-prioritering

| Onderdeel | Prioriteit |
|---|---|
| Retour aanmelden (Klant) | Must Have |
| Retour beoordelen (Seller) | Must Have |
| Refund-uitvoering (via PSP) | Must Have |
| Geschilafhandeling (Beheerder) | Must Have |
| Retourlabel-generatie / verzendlogistiek | Should Have — afhankelijk van Shipment (Status Open) |
| Gedeeltelijke retour (meerdere producten, één Order) | Should Have |
| Automatische goedkeuring bij lage-risico-retouren | Could Have |

---

## 6. Businessregels

- Een retour kan uitsluitend worden aangemeld binnen de wettelijke herroepingstermijn (14 dagen, EU-recht) — geen platformspecifieke uitzondering hierop.
- Een Refund wordt nooit uitgevoerd zonder Seller-bevestiging van ontvangst, tenzij een Beheerder dit bij een geschil expliciet forceert (met verplichte reden, Audit Log).
- Een affiliate-commissie op een orderregel die wordt geretourneerd, wordt teruggedraaid — directe koppeling met `affiliate-platform/spec.md` sectie 6.
- Nooit stilzwijgend: elke statuswijziging van een Return wordt aan de Klant gemeld (Notification).

---

## 7. Openstaande punten

- Exacte retourtermijn per productcategorie (sommige categorieën kunnen wettelijk uitgezonderd zijn van herroeping — bijv. verzegelde hygiëneproducten).
- Verzendlogistiek voor retourzendingen — volledig afhankelijk van het nog uit te werken Shipment-domeinobject.
- Wie draagt de retourverzendkosten (Klant/Seller/platform) — nog niet vastgesteld.
