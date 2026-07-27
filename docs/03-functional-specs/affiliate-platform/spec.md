# Affiliate Platform — Functionele Specificatie

**Status:** v1.0, concept — eerste uitwerking na de definitieve scopewijziging
**MVP-status:** **MVP (definitief)** — vervangt de eerdere Post-MVP-classificatie uit Blueprint H15.7/H15A.12, `docs/05-mvp-scope/README.md` en `docs/02-ux/ux-architecture.md`. Zie `docs/00-context/blueprint-reference.md` voor de formele scopewijziging.
**Basis:** Blueprint H15A (Affiliate & Creator Platform), financieel model (Affiliate-commissie, voorheen "toekomstige inkomstenbron," nu actieve MVP-post), en de bestaande Product Cloud/Commerce Cloud/Buy Box-architectuur waarop dit domein voortbouwt.

---

## 0. Scope-afbakening: Affiliate versus Creator — **DEFINITIEF BESLOTEN (ADR-52)**

**Definitief besluit (ADR-52, `09-adr-overview.md`):** deze specificatie behandelt uitsluitend de **Affiliate**-rol (linkgedreven verwijzingsmarketing met commissie op conversie). De **Creator**-rol (contentmakers met een eigen storefront/profiel, Blueprint H15A) blijft **Post-MVP** — de nieuwe projectinstructie noemt expliciet "Affiliate Platform," niet Creator, en Creator vereist een wezenlijk ander mechanisme (contentbeheer, profielpagina's) dat niet in de opgegeven MVP-functielijst voorkomt. Waar bestaande documenten (`ux-architecture.md` #65–67) Affiliate en Creator als gedeelde schermen behandelden, is dat losgetrokken: Affiliate-registratie en -dashboard zijn MVP; Creator-registratie en Creator Storefront blijven Post-MVP. **Dit was eerder een open punt; het is nu definitief afgesloten** en vereist geen verdere bevestiging.

---

## 1. Doel

Stelt externe partijen (affiliates) in staat om via unieke trackinglinks bezoekers naar EuropMade te verwijzen, en ontvangt daarvoor een commissie op daadwerkelijk gerealiseerde conversies (orders). Dit is de tweede, nieuwe MVP-inkomstenroute naast de al bestaande verkoperscommissie (10%, financieel model) en het bannerplatform.

---

## 2. Rollen & rechten

| Rol | Rechten |
|---|---|
| **Affiliate** | Eigen account (rol op het bestaande Customer-account, zelfde patroon als Seller — zie `01-domain-model.md` §1: "een Seller is altijd een rol op een al bestaand Consument-account"; Affiliate volgt ditzelfde patroon). Toegang tot: eigen dashboard, eigen trackinglinks aanmaken, eigen statistieken (klikken/conversies/commissies), eigen uitbetalingshistorie. **Geen** toegang tot productinformatie-beheer, klantgegevens, of andere affiliates' data. |
| **Beheerder** | Goedkeuren/afwijzen van affiliate-aanmeldingen, instellen van het commissiepercentage (platformbreed of per affiliate), inzien van alle affiliate-statistieken, blokkeren van een affiliate-account bij fraude (click-fraude, zelf-conversie). |

---

## 3. Kernproces

1. **Registratie** — een geregistreerde, e-mail-geverifieerde Consument kan een Affiliate-aanvraag indienen (zelfde e-mailverificatie-gate als Partner Onboarding, `authenticatie/spec.md` §1.8). Aanvraag bevat: naam/bedrijfsnaam, website/kanaal waarop gepromoot wordt, IBAN voor uitbetaling.
2. **Beoordeling** — Beheerder keurt goed/af (zelfde statusverloop-patroon als Partner Onboarding: Ingediend → In beoordeling → Goedgekeurd/Afgekeurd). Geen automatische goedkeuring — menselijke beoordeling, consistent met het platformbrede "nooit stilzwijgend"-principe.
3. **Linkgeneratie** — een goedgekeurde Affiliate genereert een unieke trackinglink naar een product-, categorie- of homepage-URL. De link bevat een affiliate-identificerende parameter.
4. **Click-tracking** — een bezoeker die de link volgt, wordt geregistreerd (tijdstip, herkomstlink, geanonimiseerd IP/user-agent) en krijgt een trackingcookie met een vastgestelde attributieperiode (bijv. 30 dagen — **exacte duur: nog niet vastgesteld, zie Openstaand punt**).
5. **Coupon-tracking (alternatieve attributieroute)** — een Affiliate kan in plaats van (of naast) een link een unieke kortingscode uitgeven; een bestelling die deze code gebruikt, wordt aan dezelfde Affiliate toegeschreven als een cookie-based click, zonder dat een cookie vereist is. Dit vereist het nieuwe, minimale Coupon-domeinobject (zie `01-domain-model.md`-uitbreiding).
6. **Conversie-attributie** — een voltooide Order (`OrderSplit`-event, `04-event-model.md`) binnen de attributieperiode van een geregistreerde click, óf een Order met een affiliate-couponcode, wordt aan de Affiliate toegeschreven als conversie.
7. **Commissieberekening** — een vastgesteld percentage (Beheerder-configureerbaar, zelfde ontwerp als de al bestaande, configureerbare Buy Box-weging en Verified-drempel, ADR 0001/0002) van de ordersubtotaal wordt als commissie aan de Affiliate toegekend.
8. **Uitbetaling** — periodieke uitbetaling aan de Affiliate, via hetzelfde uitbetalingsmechanisme als Sellers (zie `finance/spec.md`).

---

## 4. Datastructuur — raakvlak met Sprint 2

Dit document introduceert geen databasedetails zelf (dat blijft de rol van `02-database-model.md`), maar benoemt welke nieuwe domeinconcepten nodig zijn:

- **Affiliate** — rol op Customer, analoog aan Seller.
- **AffiliateLink** — trackinglink, gekoppeld aan Affiliate + doel-URL.
- **Click** — click-registratie, gekoppeld aan AffiliateLink, met tijdstip en attributieperiode-vervaldatum.
- **Conversion** — conversieregistratie, gekoppeld aan Click óf Coupon, en aan een Order.
- **Coupon** — minimale versie: uitsluitend een unieke code gekoppeld aan een Affiliate, voor attributiedoeleinden. **Geen** generiek kortingenplatform (dat blijft Post-MVP, zie `05-mvp-scope/`).
- **Commission** — commissieregistratie per Conversion, gebruikt door zowel Seller- als Affiliate-uitbetaling (zie `finance/spec.md`).

---

## 5. MVP-prioritering

| Onderdeel | Prioriteit |
|---|---|
| Affiliate-registratie & -goedkeuring | Must Have |
| Linkgeneratie & click-tracking | Must Have |
| Conversie-attributie (link-based) | Must Have |
| Commissieberekening | Must Have |
| Affiliate-dashboard (statistieken: klikken/conversies/commissies) | Must Have |
| Uitbetalingen | Must Have |
| Coupon-tracking (alternatieve attributie) | Should Have |
| Admin-beheer (percentage-instelling, fraudeblokkering) | Must Have |
| Marketingmateriaal (widgets/banners/feeds) | Could Have — expliciet genoemd in `ux-architecture.md` §2, niet in de nieuwe MVP-functielijst; **buiten scope van deze afronding** |

---

## 6. Businessregels

- Een Affiliate mag zichzelf niet als koper attribueren (zelf-conversie) — dit wordt als fraudesignaal behandeld, consistent met het al bestaande Moderation Center-patroon (fraude-signalering, `moderation-center/spec.md`).
- Commissie wordt nooit uitgekeerd vóór de wettelijke herroepingstermijn van de onderliggende order is verstreken (voorkomt uitbetaling op een nog te retourneren order) — zie `returns-and-refunds/spec.md`.
- Server-side attributie, altijd — nooit een client-side (JavaScript) bepaalde toeschrijving, consistent met het platformbrede server-side-autoriteitsprincipe (`03-api-model.md` sectie 1).
- Elke commissietoekenning en -uitbetaling wordt gelogd (Audit Log, consistent met het "nooit stilzwijgend"-principe).

---

## 7. Openstaande punten

- **Exacte attributieperiode** (cookie-vervaldatum) — nog niet vastgesteld.
- **Exact commissiepercentage** — Beheerder-configureerbaar naar ontwerp, geen standaardwaarde vastgesteld.
- ~~Affiliate versus Creator-scope-vraag~~ — **definitief besloten (ADR-52), zie sectie 0.**
- **Cookie-toestemming (GDPR)** — click-tracking is een AVG-gevoelig mechanisme; zie `gdpr-compliance/spec.md` voor de vereiste consent-koppeling.
