# Finance — Functionele Specificatie

**Status:** v1.0, concept
**MVP-status:** Must Have — geen enkele marketplace kan wettelijk of operationeel functioneren zonder facturatie, uitbetaling en een vastgelegde commissieberekening.
**Basis:** financieel model (10% verkoperscommissie, bannerplatform als tweede inkomstenbron, nu aangevuld met Affiliate-commissie als derde, actieve MVP-inkomstenpost — zie `affiliate-platform/spec.md`), Partner Onboarding (IBAN al vastgelegd bij aanmelding).

---

## 1. Doel

Regelt drie, onderling samenhangende geldstromen: (a) commissieberekening op elke verkoop, (b) facturatie richting Klant/Seller, (c) periodieke uitbetaling aan Sellers en Affiliates.

---

## 2. Rollen & rechten

| Rol | Rechten |
|---|---|
| **Seller** | Inzien van eigen commissieafschriften, facturen en uitbetalingshistorie. |
| **Affiliate** | Inzien van eigen commissieafschriften en uitbetalingshistorie (zie `affiliate-platform/spec.md`). |
| **Klant** | Ontvangt een orderbevestiging/factuur bij aankoop (reeds deels gedekt door `orderbevestiging/spec.md`; deze spec voegt de formele factuur toe). |
| **Beheerder** | Instellen van het commissiepercentage (Seller: vast 10% per financieel model; Affiliate: configureerbaar, `affiliate-platform/spec.md`), inzien van alle geldstromen, handmatig corrigeren bij een uitzonderingsgeval (aansluitend op het bestaande Order Management Center-uitzonderingspatroon). |

---

## 3. Kernproces

### 3.1 Commissieberekening
Bij elke voltooide Order (`OrderSplit`-event) wordt de platformcommissie (10%, financieel model H5.6) berekend over de ordersubtotaal per Seller. Bij een Affiliate-geattribueerde conversie wordt daarnaast de affiliate-commissie berekend (zie `affiliate-platform/spec.md` sectie 3, stap 7) — deze komt ten laste van de platformmarge, niet als extra kosten voor de Seller.

### 3.2 Facturatie
- **Klant-factuur:** een OSS-conforme factuur/kwitantie per Order, met BTW-uitsplitsing (bouwt voort op de al bevroren BTW/OSS-berekening in `checkout/spec.md` en `orderbevestiging/spec.md`).
- **Seller-commissiefactuur:** periodiek overzicht van de ingehouden platformcommissie per Seller.

### 3.3 Uitbetaling
- Periodieke uitbetaling (bijv. wekelijks/maandelijks — **exacte cadans: nog niet vastgesteld**) van het netto-orderbedrag (na commissie-inhouding) naar het bij onboarding vastgelegde IBAN van de Seller, en van de affiliate-commissie naar het IBAN van de Affiliate.
- Uitbetaling wordt nooit uitgevoerd binnen de wettelijke retourtermijn van de onderliggende order (koppeling met `returns-and-refunds/spec.md`).

---

## 4. Datastructuur — raakvlak met Sprint 2

- **Invoice** — nieuw, licht domeinconcept: een factuurregistratie gekoppeld aan een Order (klant-factuur) of aan een Seller/periode (commissiefactuur).
- **Payout** — nieuw domeinconcept: een uitbetalingsregistratie, gekoppeld aan een Seller óf een Affiliate (gedeeld patroon, één object met een ontvanger-type-onderscheid, consistent met hoe `Review` in Sprint 2 al twee subtypen — product-/verkopersreview — in één domeinobject combineert).
- **Commission** — reeds geïntroduceerd in `affiliate-platform/spec.md`; hier hergebruikt voor de Seller-commissie (10%, vast) naast de Affiliate-commissie (configureerbaar).

---

## 5. MVP-prioritering

| Onderdeel | Prioriteit |
|---|---|
| Commissieberekening (Seller, vast 10%) | Must Have |
| Commissieberekening (Affiliate) | Must Have |
| Klant-factuur/kwitantie | Must Have |
| Seller-commissiefactuur | Must Have |
| Uitbetaling aan Seller | Must Have |
| Uitbetaling aan Affiliate | Must Have |
| PSP-keuze (Stripe Connect/Adyen of vergelijkbaar) | Must Have — **nog niet besloten, zie ADR-01 (Sprint 2)** |
| Wallet/tegoed-functionaliteit | Buiten scope — niet in de nieuwe MVP-functielijst genoemd |
| Multi-valuta-weergave | Should Have — 6-landen-launch impliceert dit, exacte aanpak nog niet vastgesteld |

---

## 6. Businessregels

- Commissieberekening gebeurt altijd server-side, nooit client-side afgeleid (consistent met het platformbrede server-side-autoriteitsprincipe).
- Een factuur wordt nooit met terugwerkende kracht gewijzigd — een correctie krijgt een nieuwe, aanvullende factuurregel (creditnota-patroon), consistent met het "nooit stilzwijgend overschrijven"-principe dat Sprint 2 overal toepast.
- Uitbetaling is afhankelijk van een gekozen PSP (Stripe Connect/Adyen of vergelijkbaar) — dit is zelf nog geen besluit, zie Sprint 2 ADR-01.

---

## 7. Openstaande punten

- Exacte PSP-keuze (Stripe Connect versus Adyen versus anders) — dit is al het Kritieke ADR-01 in Sprint 2; deze spec neemt die keuze niet over, maar is er wel volledig van afhankelijk.
- Uitbetalingscadans (wekelijks/maandelijks).
- Wettelijke factuurvereisten per van de zes launch-landen (mogelijk landspecifieke verschillen) — niet in deze specificatie uitgewerkt.
