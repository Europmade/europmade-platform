# Sprint 3 — Tickets

**Status:** v1.0 — 67 tickets, verdeeld over 14 Epics. Elk ticket is direct herleidbaar naar een of meer Blueprint-documenten. Geen enkel ticket introduceert nieuwe functionaliteit.

**Nog geen code geschreven, geen implementatie uitgevoerd** — dit document is uitsluitend de planning.

---

## EPIC-00 — Fase 0 — Kritieke ADR-besluitvorming

### S3-00-01: ADR-01 besluiten — Integratiebeveiliging/Event Security

**Beschrijving:** Formeel ADR opstellen en besluiten over de authenticatie van inkomende PSP-webhooks (o.a. PaymentConfirmed/PaymentFailed). Dit is het meest urgente, Kritieke architectuurbesluit van de hele Blueprint.

**Afhankelijkheden:** Geen

**Verwachte oplevering:** Ondertekend ADR-document, vastgelegd in docs/04-decisions/.

**Acceptatiecriteria:**
- Besluit dekt zowel webhook-authenticatie als het algemenere webhook-protocolvraagstuk (09-adr-overview.md §6, D#1).
- Besluit is consistent met het platformbrede server-side-autoriteitsprincipe.
- PSP-keuze (Stripe Connect/Adyen of vergelijkbaar) is onderdeel van of direct gekoppeld aan dit besluit.

**Blueprint-verwijzing(en):** `09-adr-overview.md ADR-01`; `06-security-architecture.md §D#1`; `08-integration-architecture.md §5/16`

---

### S3-00-02: ADR-02 besluiten — Privacy & AVG

**Beschrijving:** Formeel ADR opstellen over de rechtmatige grondslag per gegevensverwerking, bewaartermijnen en het AVG-verzoekmechanisme.

**Afhankelijkheden:** Geen

**Verwachte oplevering:** Ondertekend ADR-document.

**Acceptatiecriteria:**
- Besluit dekt alle in gdpr-compliance/spec.md §3 genoemde functionele vereisten.
- Bewaartermijnen per gegevenscategorie zijn expliciet vastgesteld (spec.md §7, eerder Open punt).
- Besluit vormt de basis voor EPIC-12 (GDPR & Compliance).

**Blueprint-verwijzing(en):** `09-adr-overview.md ADR-02`; `gdpr-compliance/spec.md`; `06-security-architecture.md §10 (v0.2)`

---

### S3-00-03: ADR-03 besluiten — Encryptie

**Beschrijving:** Formeel ADR opstellen over encryptie at-rest en in-transit voor alle gevoelige gegevenscategorieën, met name Partner-service-data (IBAN, KvK, identiteitsdocumenten).

**Afhankelijkheden:** Geen

**Verwachte oplevering:** Ondertekend ADR-document.

**Acceptatiecriteria:**
- Besluit benoemt expliciet welke tabellen/velden versleuteld worden (koppeling aan 02-database-model.md Deel A.2).
- Besluit dekt zowel data-at-rest als data-in-transit.

**Blueprint-verwijzing(en):** `09-adr-overview.md ADR-03`; `06-security-architecture.md §6`

---

### S3-00-04: ADR-13 besluiten — Sessiebeheer

**Beschrijving:** Formeel ADR opstellen over het sessieconcept (Session-domeinobject), noodzakelijk vóórdat Authenticatie (Definitief) daadwerkelijk gebouwd kan worden.

**Afhankelijkheden:** Geen

**Verwachte oplevering:** Ondertekend ADR-document.

**Acceptatiecriteria:**
- Besluit vult het ontbrekende Session-domeinobject in (02-database-model.md Geconstateerde inconsistentie #2).
- Besluit is consistent met de al bevroren regel 'wachtwoordwijziging invalideert alle sessies' (03-api-model.md §5).

**Blueprint-verwijzing(en):** `09-adr-overview.md ADR-13`; `02-database-model.md Geconstateerde inconsistenties #2`

---

## EPIC-01 — Identiteit & Authenticatie

### S3-01-01: Datamodel: Customer, Session

**Beschrijving:** Database-migratie voor de customer-tabel en het bij ADR-13 besloten Session-concept.

**Afhankelijkheden:** S3-00-04

**Verwachte oplevering:** Migratiescript + geverifieerd schema.

**Acceptatiecriteria:**
- Schema komt exact overeen met 02-database-model.md Deel A.1.
- Sessiebeheer volgt het bij ADR-13 besloten model.

**Blueprint-verwijzing(en):** `02-database-model.md Deel A.1`

---

### S3-01-02: API: Registratie- en inlog-endpoints

**Beschrijving:** REST-endpoints voor registratie, inloggen, wachtwoord vergeten, uitloggen — één registratieflow zonder rolkeuze.

**Afhankelijkheden:** S3-01-01

**Verwachte oplevering:** Werkende API-endpoints, gedekt door de Definitieve regels van 03-api-model.md §5.

**Acceptatiecriteria:**
- Server-side sessiebeheer, geen client-side tokens met gevoelige claims.
- Elke actie consistent met authenticatie/spec.md (v1.1, bevroren).

**Blueprint-verwijzing(en):** `03-api-model.md §5 (Definitief)`; `authenticatie/spec.md`

---

### S3-01-03: 2FA-implementatie

**Beschrijving:** Optioneel voor Consument, verplicht voor Retailer/Producent/Beheerder/Affiliate — component CMP-040 (Code Input/OTP).

**Afhankelijkheden:** S3-01-02

**Verwachte oplevering:** Werkende 2FA-flow.

**Acceptatiecriteria:**
- 2FA-verplichting per rol exact conform authenticatie/spec.md §1.7-1.8.
- Affiliate-rol volgt dezelfde 2FA-verplichting als Retailer/Producent (financiële uitbetaling gekoppeld).

**Blueprint-verwijzing(en):** `authenticatie/spec.md §1.7/§1.9 (Affiliate-amendement)`; `07-design-system/components.md CMP-040`

---

### S3-01-04: RBAC-basisimplementatie

**Beschrijving:** Rolgebaseerde toegangscontrole voor Consument/Seller/Beheerder/Affiliate op API-niveau.

**Afhankelijkheden:** S3-01-02

**Verwachte oplevering:** Werkende autorisatielaag.

**Acceptatiecriteria:**
- Elke resource respecteert de Publiek/Seller/Intern-indeling uit 03-api-model.md Bijlage C.
- Affiliate-rol expliciet gedekt (v0.2-uitbreiding van die bijlage).

**Blueprint-verwijzing(en):** `03-api-model.md Bijlage C`; `06-security-architecture.md (RBAC, Definitief)`

---

### S3-01-05: UI: Inloggen/Registreren/Wachtwoord vergeten

**Beschrijving:** Bouw de al bevroren wireframes (Sprint 1B, schermen #9/#10) tot werkende schermen.

**Afhankelijkheden:** S3-01-02, S3-01-03

**Verwachte oplevering:** Werkende, responsieve schermen (desktop/tablet/mobiel).

**Acceptatiecriteria:**
- Exacte overeenkomst met de bevroren wireframe (geen eigen UX-interpretatie).
- 2FA-stap correct geïntegreerd.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-1b/ (authenticatie-flow)`; `authenticatie/spec.md`

---

### S3-01-06: Cookie-consent-integratie in de eerste-bezoek-flow

**Beschrijving:** Koppel het Cookie Consent-scherm (Sprint 3 P0) aan de daadwerkelijke sessie-/trackinglaag.

**Afhankelijkheden:** S3-01-01, S3-00-02

**Verwachte oplevering:** Werkende consent-registratie (ConsentRecord).

**Acceptatiecriteria:**
- Een ConsentRecord ontstaat bij elke bannerinteractie.
- Geen affiliate-trackingcookie zonder geldige, actieve toestemming.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/cookie-*`; `gdpr-compliance/spec.md §3`; `01-domain-model.md §35`

---

## EPIC-02 — Partner-service

### S3-02-01: Datamodel: Seller, Company, Brand, Manufacturer

**Beschrijving:** Database-migratie voor Deel A.2-A.5.

**Afhankelijkheden:** S3-01-01

**Verwachte oplevering:** Migratiescript + geverifieerd schema.

**Acceptatiecriteria:**
- Schema exact conform 02-database-model.md Deel A.2-A.5.

**Blueprint-verwijzing(en):** `02-database-model.md Deel A.2-A.5`

---

### S3-02-02: API + logica: Partner Onboarding-statusverloop

**Beschrijving:** Ingediend → In beoordeling → Goedgekeurd/Afgekeurd, meervoudige rolselectie, e-mailverificatie-gate.

**Afhankelijkheden:** S3-02-01, S3-01-02

**Verwachte oplevering:** Werkende onboarding-API.

**Acceptatiecriteria:**
- Exact het statusmodel uit partner-onboarding/spec.md (v1.1, incl. 'Aanvullende informatie vereist').
- Verplichte e-mailverificatie vóór start.

**Blueprint-verwijzing(en):** `partner-onboarding/spec.md (v1.1, definitief bevroren)`

---

### S3-02-03: UI: Partner Onboarding-flow

**Beschrijving:** Bouw de bevroren wireframes (schermen #26-28) tot werkende schermen.

**Afhankelijkheden:** S3-02-02

**Verwachte oplevering:** Werkende, responsieve flow.

**Acceptatiecriteria:**
- Conditionele flow per rol (Retailer/Producent/Distributeur) exact conform spec.
- CMP-041 File Upload met mobiele cameraopname.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-1b/ (partner-onboarding)`; `partner-onboarding/spec.md`

---

### S3-02-04: API: Partnerbeheer (admin, lezend)

**Beschrijving:** Uitsluitend-lezende overzichts-/detail-endpoints voor Beheerders.

**Afhankelijkheden:** S3-02-02

**Verwachte oplevering:** Werkende, read-only API.

**Acceptatiecriteria:**
- Geen enkele muterende actie buiten wat expliciet in partner-center/spec.md is toegestaan.

**Blueprint-verwijzing(en):** `partner-center/spec.md (v1.1, definitief bevroren, uitsluitend lezend)`

---

### S3-02-05: UI: Partnerbeheer (Overzicht/Detail/Goedkeuren/Afwijzen/Blokkeren)

**Beschrijving:** Bouw de Sprint 3 P0-wireframes tot werkende schermen.

**Afhankelijkheden:** S3-02-04, S3-11-01 (Admin Shell)

**Verwachte oplevering:** Werkende, responsieve schermen.

**Acceptatiecriteria:**
- Elke Afwijzen/Blokkeren-actie vereist een verplichte, vastgelegde reden (nooit stilzwijgend).
- Elke actie gelogd in Audit Log.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/partner-*`; `partner-center/spec.md`

---

## EPIC-03 — Product Cloud-service

### S3-03-01: Datamodel: Product, Variant, Category, Attribute

**Beschrijving:** Database-migratie voor Deel B (kernentiteiten).

**Afhankelijkheden:** S3-02-01

**Verwachte oplevering:** Migratiescript + geverifieerd schema.

**Acceptatiecriteria:**
- Schema exact conform 02-database-model.md Deel B.

**Blueprint-verwijzing(en):** `02-database-model.md Deel B`

---

### S3-03-02: Datamodel: OwnershipRecord, Claim, Dispute, MatchCandidate, ModerationCase, ProductOrigin

**Beschrijving:** Database-migratie voor het eigendoms-/matching-/verificatiegedeelte van Deel B.

**Afhankelijkheden:** S3-03-01

**Verwachte oplevering:** Migratiescript + geverifieerd schema.

**Acceptatiecriteria:**
- Schema exact conform 02-database-model.md Deel B (vervolg).

**Blueprint-verwijzing(en):** `02-database-model.md Deel B`

---

### S3-03-03: EAN-matchingpijplijn

**Beschrijving:** Deterministische EAN/GTIN-matching, MatchCandidate-generatie bij onzekere matches.

**Afhankelijkheden:** S3-03-02

**Verwachte oplevering:** Werkende matchinglogica.

**Acceptatiecriteria:**
- 100%-zekerheids-EAN-match vereist geen menselijke beoordeling (product-cloud-architecture/spec.md Deel 5).
- Onzekere matches genereren een ModerationCase.

**Blueprint-verwijzing(en):** `product-cloud-architecture/spec.md Deel 2.4/5`

---

### S3-03-04: API: Product-CRUD + Retailer Created-flow

**Beschrijving:** Endpoints voor productaanmaak (EAN-match en Retailer Created), wijzigingsvoorstellen, claims.

**Afhankelijkheden:** S3-03-03

**Verwachte oplevering:** Werkende API.

**Acceptatiecriteria:**
- Retailer Created-status correct toegepast (Deel 8.1).
- Wijzigingsvoorstel-workflow exact conform product-management/spec.md.

**Blueprint-verwijzing(en):** `product-management/spec.md (v1.1, definitief bevroren)`

---

### S3-03-05: UI: Seller Dashboard — Productoverzicht + EAN-zoeken

**Beschrijving:** Bouw de Sprint 3 P0-wireframes (product-01, en het niet-P0 Productoverzicht) tot werkende schermen.

**Afhankelijkheden:** S3-03-04, S3-13-02 (Seller-shell)

**Verwachte oplevering:** Werkende, responsieve schermen.

**Acceptatiecriteria:**
- Match gevonden/Geen match-uitkomsten exact conform wireframe.
- AI-matchbetrouwbaarheid zichtbaar, nooit doorslaggevend (AI ondersteunt, beslist nooit).

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/product-01/02/03`; `seller-dashboard/spec.md`

---

### S3-03-06: UI: Nieuw product aanmaken + Productdetail commercieel

**Beschrijving:** Bouw product-04 en product-05 (Sprint 3 P0) tot werkende schermen.

**Afhankelijkheden:** S3-03-05

**Verwachte oplevering:** Werkende, responsieve schermen.

**Acceptatiecriteria:**
- Verplichte velden vóór publicatie exact conform wireframe-notice.
- Prijs-/voorraadvelden koppelen correct aan Commerce Cloud (EPIC-04).

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/product-04/05`

---

### S3-03-07: Moderation Center-koppeling (productgerelateerde signalen)

**Beschrijving:** Zeven wachtrijtypen implementeren voor zover productgerelateerd (fraude-signalen, meldingen, hoog-risico wijzigingen).

**Afhankelijkheden:** S3-03-04, S3-11-01

**Verwachte oplevering:** Werkende wachtrij-API.

**Acceptatiecriteria:**
- Exact de businessregels/beslisregels uit moderation-center/spec.md (v1.1).
- 'Geen actie' wordt zelf ook gelogd als besluit.

**Blueprint-verwijzing(en):** `moderation-center/spec.md (v1.1, definitief bevroren)`

---

### S3-03-08: Verification Center-koppeling (Verified™-workflow)

**Beschrijving:** Twee wachtrijtypen: nieuwe aanvragen, periodieke hercontrole/intrekking.

**Afhankelijkheden:** S3-03-04, S3-11-01

**Verwachte oplevering:** Werkende verificatie-API + UI (hergebruikt bestaande Sprint 1C-wireframes).

**Acceptatiecriteria:**
- Harde scope-grens met Moderation Center en Product Management gerespecteerd.
- Zes bestaande wireframes (sprint-1c) zonder aanpassing hergebruikt.

**Blueprint-verwijzing(en):** `verification-center/spec.md (v1.1, definitief bevroren)`; `02-ux/wireframes/sprint-1c/`

---

## EPIC-04 — Commerce Cloud / Buy Box-service

### S3-04-01: Datamodel: Offer, Inventory, Price

**Beschrijving:** Database-migratie voor Deel C.1-C.3.

**Afhankelijkheden:** S3-03-01

**Verwachte oplevering:** Migratiescript + geverifieerd schema.

**Acceptatiecriteria:**
- Schema exact conform 02-database-model.md Deel C.1-C.3.

**Blueprint-verwijzing(en):** `02-database-model.md Deel C`

---

### S3-04-02: Buy Box-berekeningsengine (server-side only)

**Beschrijving:** Implementeer de Buy Box-weging, tiebreaker-volgorde, server-side-only-eis.

**Afhankelijkheden:** S3-04-01

**Verwachte oplevering:** Werkende, geteste berekeningsengine.

**Acceptatiecriteria:**
- Berekening gebeurt uitsluitend server-side (ADR-0005, geen enkele client-side afleiding).
- Tiebreaker-volgorde exact conform ADR-0004.

**Blueprint-verwijzing(en):** `ADR 0001/0002/0004/0005`; `product-cloud-commerce-cloud-buy-box/spec.md`

---

### S3-04-03: API: Offer-CRUD (prijs/voorraad)

**Beschrijving:** Endpoints voor Seller-zijdig prijs- en voorraadbeheer per Offer.

**Afhankelijkheden:** S3-04-02

**Verwachte oplevering:** Werkende API.

**Acceptatiecriteria:**
- Elke wijziging triggert een BuyBoxRecomputed-event (04-event-model.md §2.2).

**Blueprint-verwijzing(en):** `04-event-model.md §2.2`

---

### S3-04-04: UI: Productdetail — Buy Box-positie-weergave

**Beschrijving:** Toon Buy Box-winnaarschap en wegingsfactoren aan de Seller.

**Afhankelijkheden:** S3-04-03, S3-03-06

**Verwachte oplevering:** Werkend scherm (onderdeel van product-05-wireframe).

**Acceptatiecriteria:**
- Weergave exact conform het al gebouwde wireframe (geen nieuwe UX).

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/product-05`

---

### S3-04-05: Buy Box-cache-persistentie

**Beschrijving:** Los het in Sprint 2 gesignaleerde Open punt op (H, Datamodel-verduidelijking).

**Afhankelijkheden:** S3-04-02

**Verwachte oplevering:** Vastgesteld en geïmplementeerd cache-mechanisme.

**Acceptatiecriteria:**
- Consistent met 05-service-architecture.md §13 (Caching, Voorlopig).

**Blueprint-verwijzing(en):** `09-adr-overview.md ADR-31 (Buy Box-cache-persistentie)`

---

## EPIC-05 — Order-service (incl. Retouren & Berichten)

### S3-05-01: Datamodel: OrderSet, Order, Message

**Beschrijving:** Database-migratie voor Deel D en G.9.

**Afhankelijkheden:** S3-04-01

**Verwachte oplevering:** Migratiescript + geverifieerd schema.

**Acceptatiecriteria:**
- Schema exact conform 02-database-model.md Deel D en G.9.

**Blueprint-verwijzing(en):** `02-database-model.md Deel D, G.9`

---

### S3-05-02: API + logica: Checkout, ordersplitsing, uitzonderingsafhandeling

**Beschrijving:** OrderPlaced/OrderSplit/OrderSplitFailed/OrderExceptionResolved-logica, PSP-integratie.

**Afhankelijkheden:** S3-05-01, S3-00-01 (ADR-01 PSP-keuze)

**Verwachte oplevering:** Werkende checkout- en ordersplit-API.

**Acceptatiecriteria:**
- Order Line bevat een onveranderlijke Offer-snapshot (01-domain-model.md §15).
- Uitzonderingsafhandeling exact conform order-management-center/spec.md.

**Blueprint-verwijzing(en):** `checkout/spec.md`; `order-management-center/spec.md (v1.1, definitief bevroren)`

---

### S3-05-03: UI: Checkout, Winkelwagen, Orderbevestiging

**Beschrijving:** Bouw de bevroren Sprint 1A/1B-wireframes tot werkende schermen.

**Afhankelijkheden:** S3-05-02

**Verwachte oplevering:** Werkende, responsieve schermen.

**Acceptatiecriteria:**
- BTW-weergavepatroon (label + info-icoon + tooltip) exact conform checkout/spec.md §13.
- OSS-conforme BTW-berekening correct toegepast.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-1a/`; `02-ux/wireframes/sprint-1b/`

---

### S3-05-04: Retouren & Refunds — datamodel en API

**Beschrijving:** Return-statusverloop (Aangevraagd→Bevestigd→Ontvangen→Verwerkt/Afgewezen), Refund-uitvoering via PSP.

**Afhankelijkheden:** S3-05-02

**Verwachte oplevering:** Werkende retour-API.

**Acceptatiecriteria:**
- Retour uitsluitend binnen de wettelijke herroepingstermijn.
- Refund nooit zonder Seller-bevestiging, tenzij Beheerder expliciet forceert met reden.

**Blueprint-verwijzing(en):** `returns-and-refunds/spec.md`

---

### S3-05-05: UI: Buyer Dashboard — Mijn bestellingen + Retour aanmelden

**Beschrijving:** Bouw buyer-mijn-bestellingen (Sprint 3 P0) plus het niet-P0 Retour-aanmeldscherm.

**Afhankelijkheden:** S3-05-04, S3-13-01 (Buyer-shell)

**Verwachte oplevering:** Werkende, responsieve schermen.

**Acceptatiecriteria:**
- Exacte overeenkomst met het Sprint 3 P0-wireframe.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/buyer-*`

---

### S3-05-06: UI: Seller Dashboard — Orders + Retour beoordelen

**Beschrijving:** Niet-P0 schermen #40/#41, te bouwen na de P0-basis.

**Afhankelijkheden:** S3-05-04, S3-13-02

**Verwachte oplevering:** Werkende, responsieve schermen.

**Acceptatiecriteria:**
- Retourbeoordeling triggert correcte Refund-status.

**Blueprint-verwijzing(en):** `seller-dashboard/spec.md`; `returns-and-refunds/spec.md`

---

### S3-05-07: Berichten — datamodel, API en UI (buyer + seller)

**Beschrijving:** Message-entiteit, gekoppeld aan Order, tussen Klant en Seller.

**Afhankelijkheden:** S3-05-01

**Verwachte oplevering:** Werkend berichtensysteem incl. UI.

**Acceptatiecriteria:**
- Uitsluitend binnen de context van een gedeelde Order — geen vrije messaging.
- Beheerder kan meelezen bij escalatie.

**Blueprint-verwijzing(en):** `messaging-reviews-qa/spec.md §1`; `01-domain-model.md §34`

---

### S3-05-08: Order Management Center — UI (admin)

**Beschrijving:** Uitsluitend-lezend overzichts-/detailscherm plus de smal begrensde uitzonderingsafhandeling.

**Afhankelijkheden:** S3-05-02, S3-11-01

**Verwachte oplevering:** Werkend scherm.

**Acceptatiecriteria:**
- Geen betalings-, fulfilment-, retour- of klantenservicefunctionaliteit binnen dit scherm zelf.

**Blueprint-verwijzing(en):** `order-management-center/spec.md`

---

### S3-05-09: Notificatiekoppeling voor Order-gebeurtenissen

**Beschrijving:** Elke relevante Order-/Message-/Return-gebeurtenis triggert een Notification (EPIC-10).

**Afhankelijkheden:** S3-05-02, S3-05-04, S3-05-07, S3-10-01

**Verwachte oplevering:** Werkende koppeling.

**Acceptatiecriteria:**
- Geen enkele statuswijziging blijft ongemeld aan de betrokkene.

**Blueprint-verwijzing(en):** `04-event-model.md §2.3`

---

## EPIC-06 — Review-service

### S3-06-01: Datamodel: Review

**Beschrijving:** Database-migratie voor Deel E.1 (Product-/Verkopersreview in één entiteit).

**Afhankelijkheden:** S3-05-01

**Verwachte oplevering:** Migratiescript + geverifieerd schema.

**Acceptatiecriteria:**
- Schema exact conform 02-database-model.md Deel E.1.

**Blueprint-verwijzing(en):** `02-database-model.md Deel E.1`

---

### S3-06-02: API: Review plaatsen (na aankoop)

**Beschrijving:** Koppeling aan Orderregel — voorkomt niet-kopers-reviews.

**Afhankelijkheden:** S3-06-01, S3-05-02

**Verwachte oplevering:** Werkende API.

**Acceptatiecriteria:**
- Review alleen mogelijk ná een voltooide Order van dat product/die Seller.
- Verkopersreview-score voedt de Buy Box-berekening (EPIC-04).

**Blueprint-verwijzing(en):** `messaging-reviews-qa/spec.md §2`

---

### S3-06-03: UI: Productreview en Verkopersreview plaatsen

**Beschrijving:** Niet-P0 schermen #15/#16.

**Afhankelijkheden:** S3-06-02, S3-13-01

**Verwachte oplevering:** Werkende, responsieve schermen.

**Acceptatiecriteria:**
- Score+tekst-formulier, publieke weergave op Productpagina.

**Blueprint-verwijzing(en):** `messaging-reviews-qa/spec.md §2`

---

## EPIC-07 — Affiliate-service

### S3-07-00: ADR-53/54 besluiten — Cookie-consent-mechanisme & commissiepercentage

**Beschrijving:** Aanvullende, urgente ADR's die specifiek deze Epic blokkeren (technisch consent-mechanisme, attributieperiode, commissiepercentage).

**Afhankelijkheden:** S3-00-02 (ADR-02)

**Verwachte oplevering:** Ondertekende ADR-documenten.

**Acceptatiecriteria:**
- ADR-53 dekt het technische consent-mechanisme (niet alleen het functionele 'dat er toestemming nodig is').
- ADR-54 stelt een concreet commissiepercentage en attributieperiode vast.

**Blueprint-verwijzing(en):** `09-adr-overview.md ADR-53/ADR-54`; `affiliate-platform/spec.md §7`

---

### S3-07-01: Datamodel: Affiliate, AffiliateLink, Click, Conversion, Coupon, ConsentRecord

**Beschrijving:** Database-migratie voor Deel G.1-G.5 en G.10.

**Afhankelijkheden:** S3-05-01, S3-07-00

**Verwachte oplevering:** Migratiescript + geverifieerd schema.

**Acceptatiecriteria:**
- Schema exact conform 02-database-model.md Deel G.1-G.5/G.10.
- Geen click zonder geldige ConsentRecord (businessregel).

**Blueprint-verwijzing(en):** `02-database-model.md Deel G.1-G.5/G.10`; `01-domain-model.md §26-30/35`

---

### S3-07-02: API + logica: Registratie, linkgeneratie, click-/coupon-tracking

**Beschrijving:** Server-side attributie, nooit client-side.

**Afhankelijkheden:** S3-07-01

**Verwachte oplevering:** Werkende API.

**Acceptatiecriteria:**
- Zelf-attributie (fraude) wordt gedetecteerd en gemeld aan Moderation Center.
- Coupon-route werkt zonder cookie (voor bezoekers zonder toestemming).

**Blueprint-verwijzing(en):** `affiliate-platform/spec.md §3/§6`

---

### S3-07-03: Conversie-attributie + commissieberekening

**Beschrijving:** ConversionRecorded/CommissionCalculated-events bij OrderSplit.

**Afhankelijkheden:** S3-07-02, S3-05-02

**Verwachte oplevering:** Werkende attributie- en commissielogica.

**Acceptatiecriteria:**
- Conversie binnen de bij ADR-54 vastgestelde attributieperiode.
- Commissie teruggedraaid bij een gekoppelde Return (EPIC-05).

**Blueprint-verwijzing(en):** `affiliate-platform/spec.md §3 stap 6-7`; `04-event-model.md §2.7`

---

### S3-07-04: UI: Affiliate-registratie

**Beschrijving:** Bouw affiliate-01 (Sprint 3 P0) tot werkend scherm.

**Afhankelijkheden:** S3-07-02, S3-01-05

**Verwachte oplevering:** Werkend, responsief scherm.

**Acceptatiecriteria:**
- Handmatige Beheerder-beoordeling, geen automatische goedkeuring.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/affiliate-01`

---

### S3-07-05: UI: Affiliate Dashboard, Statistieken, Commissies, Links

**Beschrijving:** Bouw affiliate-02 t/m affiliate-05 (Sprint 3 P0) tot werkende schermen.

**Afhankelijkheden:** S3-07-03, S3-07-04

**Verwachte oplevering:** Werkende, responsieve schermen.

**Acceptatiecriteria:**
- Exacte overeenkomst met de vier Sprint 3 P0-wireframes.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/affiliate-02/03/04/05`

---

### S3-07-06: Click-fraude- en coupon-misbruikpreventie

**Beschrijving:** Detectiemechanisme conform ADR-55/56.

**Afhankelijkheden:** S3-07-02, S3-03-07 (Moderation Center)

**Verwachte oplevering:** Werkend detectiemechanisme, gekoppeld aan Moderation Center.

**Acceptatiecriteria:**
- Signalen komen als nieuw wachtrijtype/-subtype in Moderatiewachtrij terecht.

**Blueprint-verwijzing(en):** `09-adr-overview.md ADR-55/ADR-56`

---

## EPIC-08 — Finance-service

### S3-08-01: Datamodel: Commission, Invoice, Payout

**Beschrijving:** Database-migratie voor Deel G.6-G.8.

**Afhankelijkheden:** S3-07-01

**Verwachte oplevering:** Migratiescript + geverifieerd schema.

**Acceptatiecriteria:**
- Schema exact conform 02-database-model.md Deel G.6-G.8.

**Blueprint-verwijzing(en):** `02-database-model.md Deel G.6-G.8`

---

### S3-08-02: Commissieberekening — Seller (vast 10%) + Affiliate

**Beschrijving:** Server-side berekening, gedeeld Commission-object voor beide typen.

**Afhankelijkheden:** S3-08-01, S3-05-02, S3-07-03

**Verwachte oplevering:** Werkende berekeningslogica.

**Acceptatiecriteria:**
- 10% platformcommissie exact conform het financieel model (H5.6).
- Affiliate-commissie via het bij ADR-54 vastgestelde percentage.

**Blueprint-verwijzing(en):** `finance/spec.md §3.1`

---

### S3-08-03: Facturatie — klant-factuur en Seller-commissiefactuur

**Beschrijving:** InvoiceIssued-event, OSS-conforme BTW-uitsplitsing.

**Afhankelijkheden:** S3-08-02

**Verwachte oplevering:** Werkende facturatielogica.

**Acceptatiecriteria:**
- Correctie via creditnota-patroon, nooit terugwerkende overschrijving.

**Blueprint-verwijzing(en):** `finance/spec.md §3.2`

---

### S3-08-04: Uitbetaling — Seller en Affiliate

**Beschrijving:** PayoutProcessed-event, periodieke uitbetaling naar geregistreerd IBAN.

**Afhankelijkheden:** S3-08-02, S3-00-01 (PSP)

**Verwachte oplevering:** Werkende uitbetalingslogica.

**Acceptatiecriteria:**
- Nooit uitbetaald binnen de wettelijke retourtermijn van de onderliggende orders.

**Blueprint-verwijzing(en):** `finance/spec.md §3.3`

---

### S3-08-05: UI: Finance Dashboard (Seller-zijde)

**Beschrijving:** Bouw finance-01 t/m finance-05 (Sprint 3 P0) tot werkende schermen.

**Afhankelijkheden:** S3-08-03, S3-08-04, S3-13-02

**Verwachte oplevering:** Werkende, responsieve schermen.

**Acceptatiecriteria:**
- Exacte overeenkomst met de vijf Sprint 3 P0-wireframes.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/finance-*`

---

## EPIC-09 — AI-ondersteuningsservice

### S3-09-01: Datamodel + API: AIMetadata

**Beschrijving:** Database-migratie Deel F.1, endpoint voor aanbevelingsgeneratie.

**Afhankelijkheden:** S3-03-01

**Verwachte oplevering:** Werkende API.

**Acceptatiecriteria:**
- AI-aanbeveling bevat altijd een betrouwbaarheidsscore.
- AI beslist nooit — uitsluitend advies (platformbreed principe).

**Blueprint-verwijzing(en):** `02-database-model.md Deel F.1`; `01-domain-model.md domeinobject 22`

---

### S3-09-02: Integratie AI-advies in Moderatiewachtrij en Verification Center

**Beschrijving:** AI-box-weergave (Sprint 3 P0-wireframe) koppelen aan echte aanbevelingen.

**Afhankelijkheden:** S3-09-01, S3-11-02

**Verwachte oplevering:** Werkende koppeling.

**Acceptatiecriteria:**
- Weergave exact conform het al gebouwde AI-box-component (moderatie-02-wireframe).

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/moderatie-02`

---

## EPIC-10 — Platformbrede gedeelde services

### S3-10-01: Datamodel + logica: AuditLogEntry

**Beschrijving:** Append-only audit-laag, universeel consument van alle domeingebeurtenissen.

**Afhankelijkheden:** S3-01-01

**Verwachte oplevering:** Werkende, geteste audit-laag.

**Acceptatiecriteria:**
- Nooit een update/delete op een bestaande Audit Log-rij.
- Elke ingrijpende actie in het hele platform gelogd (nooit stilzwijgend-principe).

**Blueprint-verwijzing(en):** `02-database-model.md Deel F.2`; `04-event-model.md §13`

---

### S3-10-02: Datamodel + logica: Notification

**Beschrijving:** NotificationDispatched als terminaal event.

**Afhankelijkheden:** S3-01-01

**Verwachte oplevering:** Werkende notificatielaag.

**Acceptatiecriteria:**
- Geen enkele andere service consumeert NotificationDispatched verder (architecturale afleiding, bevestigd).

**Blueprint-verwijzing(en):** `02-database-model.md Deel F.3`; `09-adr-overview.md (NotificationDispatched, terminaal event)`

---

### S3-10-03: UI: Meldingencentrum

**Beschrijving:** Niet-P0 scherm #51.

**Afhankelijkheden:** S3-10-02, S3-13-01, S3-13-02

**Verwachte oplevering:** Werkend, responsief scherm.

**Acceptatiecriteria:**
- Toont notificaties uit alle services zonder eigen, dubbele businesslogica.

**Blueprint-verwijzing(en):** `01-domain-model.md §24`

---

## EPIC-11 — Admin Shell & Admin-modules

### S3-11-01: Admin Shell — generiek modulecontract

**Beschrijving:** Naam/route/icoon/permissie/navigatiepositie/widgets/KPI's/notificatietypen/taken/deep links.

**Afhankelijkheden:** S3-01-04 (RBAC)

**Verwachte oplevering:** Werkende Shell-infrastructuur.

**Acceptatiecriteria:**
- Enige interactie tussen Shell en elke module is het modulecontract (geen module-specifieke Shell-code).
- Introduceert geen nieuwe rollen, API's of database-entiteiten.

**Blueprint-verwijzing(en):** `admin-shell/spec.md (v1.1, definitief bevroren)`

---

### S3-11-02: UI: Admin Dashboard Home

**Beschrijving:** Bouw admin-01 (Sprint 3 P0) tot werkend scherm.

**Afhankelijkheden:** S3-11-01

**Verwachte oplevering:** Werkend, responsief scherm.

**Acceptatiecriteria:**
- KPI's en moduletoegang exact conform het Sprint 3 P0-wireframe.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/admin-01`

---

### S3-11-03: UI: Moderatiewachtrij (Overzicht, Detail, Bulk-acties, Besluit)

**Beschrijving:** Bouw moderatie-01/02/03 (Sprint 3 P0) tot werkende schermen, gekoppeld aan S3-03-07/S3-07-06.

**Afhankelijkheden:** S3-03-07, S3-11-01

**Verwachte oplevering:** Werkende, responsieve schermen.

**Acceptatiecriteria:**
- Zeven wachtrijtypen correct gefilterd via tabs.
- Elk besluit, inclusief 'geen actie', gelogd met reden.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/moderatie-*`; `moderation-center/spec.md`

---

### S3-11-04: UI: Verification Center (hergebruik Sprint 1C-wireframes)

**Beschrijving:** Koppel de zes al bestaande wireframes aan de werkende Verification-API (S3-03-08).

**Afhankelijkheden:** S3-03-08, S3-11-01

**Verwachte oplevering:** Werkende, responsieve schermen.

**Acceptatiecriteria:**
- Geen enkele aanpassing aan de bestaande wireframes (uitsluitend backend-koppeling).

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-1c/`; `verification-center/spec.md`

---

### S3-11-05: Compliance Dashboard — functionele afbakening

**Beschrijving:** Vaststellen of/hoe dit scherm binnen Sprint 3 wordt opgepakt — de onderliggende functionele spec ('compliance-en-verified') bestaat nog niet.

**Afhankelijkheden:** S3-11-01

**Verwachte oplevering:** Beslisdocument: scope bevestigd of expliciet uitgesteld naar Post-MVP.

**Acceptatiecriteria:**
- Geen wireframe of implementatie zonder eerst de ontbrekende functionele spec te voltooien (geen nieuwe functionaliteit verzinnen binnen dit ticket).

**Blueprint-verwijzing(en):** `03-functional-specs/README.md ('compliance-en-verified', nog te ontwikkelen)`

---

## EPIC-12 — GDPR & Compliance

### S3-12-01: AVG-verzoekmechanisme — backend

**Beschrijving:** Inzage/export/verwijdering (via anonimisering, niet harde delete van Order-/Audit Log-data).

**Afhankelijkheden:** S3-00-02, S3-10-01

**Verwachte oplevering:** Werkende API.

**Acceptatiecriteria:**
- Verwijdering van een Klant anonimiseert historische Order-/Audit Log-records i.p.v. ze te verwijderen.
- Wettelijke doorlooptijd (30 dagen) bewaakt.

**Blueprint-verwijzing(en):** `gdpr-compliance/spec.md §3`

---

### S3-12-02: UI: AVG-verzoek indienen + Verzoekstatus

**Beschrijving:** Bouw avg-01/avg-02 (Sprint 3 P0) tot werkende schermen.

**Afhankelijkheden:** S3-12-01

**Verwachte oplevering:** Werkende, responsieve schermen.

**Acceptatiecriteria:**
- Typekeuze (inzage/export/verwijdering) exact conform het Sprint 3 P0-wireframe.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/avg-*`

---

### S3-12-03: Verwerkersovereenkomsten — juridisch, niet technisch

**Beschrijving:** Formaliseer overeenkomsten met PSP, verzender, AI-validatie-API, externe zoekservice.

**Afhankelijkheden:** S3-00-01, S3-00-02

**Verwachte oplevering:** Ondertekende overeenkomsten (buiten de codebase).

**Acceptatiecriteria:**
- Alle vier de in 08-integration-architecture.md genoemde externe partijen gedekt.

**Blueprint-verwijzing(en):** `gdpr-compliance/spec.md §3`; `08-integration-architecture.md`

---

## EPIC-13 — Dashboard-Shells (Buyer & Seller)

### S3-13-01: Buyer Dashboard-shell

**Beschrijving:** Bouw buyer-dashboard-home (Sprint 3 P0) als herbruikbaar skelet voor alle Buyer-schermen.

**Afhankelijkheden:** S3-01-05

**Verwachte oplevering:** Werkende, responsieve shell.

**Acceptatiecriteria:**
- Navigatiestructuur exact conform het Sprint 3 P0-wireframe.
- Elk overig Buyer-scherm (EPIC-05/06/10/12) bouwt hierop voort zonder eigen navigatie te verzinnen.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/buyer-dashboard-home`

---

### S3-13-02: Seller Dashboard-shell

**Beschrijving:** Bouw seller-dashboard-shell + seller-dashboard-home (Sprint 3 P0).

**Afhankelijkheden:** S3-01-05, S3-02-03

**Verwachte oplevering:** Werkende, responsieve shell.

**Acceptatiecriteria:**
- Navigatiestructuur exact conform het Sprint 3 P0-wireframe.
- Elk overig Seller-scherm (EPIC-03/04/05/08) bouwt hierop voort.

**Blueprint-verwijzing(en):** `02-ux/wireframes/sprint-3-p0/seller-dashboard-*`

---
