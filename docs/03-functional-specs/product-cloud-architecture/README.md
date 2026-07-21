# Product Cloud — Volledige Architectuur (Sprint 1C)

**Status:** v1.1 — **definitief bevroren**, na een onafhankelijke architectuurreview (acht bevindingen verwerkt: B1–B8). Eerste onderdeel van Sprint 1C. Uitsluitend architectuur — geen UX, geen wireframes, geen dashboards, geen formulieren, geen componenten.

## Inhoud

- [`spec.md`](./spec.md) — het volledige architectuurdocument: datamodel-overzicht, domeinmodel, relatieschema, producteigendom, productclaims, product matching, Verified Made in Europe, versiebeheer, publicatiestatussen, moderatie, statusdiagrammen, voorgestelde ADR's (0006–0012), risicoanalyse, openstaande ontwerpkeuzes, architectuurcontrole en een zelfreview.

## Belangrijkste nieuwe architecturale beslissingen

- **Productfamilie** — nieuw, optioneel concept boven Product, zuiver navigatie-/samenhang, geen eigendoms-/verkoopimplicaties.
- **EAN als GTIN-subtype** — één matchinglogica voor beide, geen parallelle identifier-systemen.
- **Product Matching** — volledig nieuwe pijplijn: EAN-matching (deterministisch) → AI-matching (probabilistisch, altijd door mens bevestigd) → handmatige matching. Merge/split uitsluitend een Beheerder-bevoegdheid, altijd omkeerbaar en volledig gelogd — merge herwijst uitsluitend Identifiers, nooit Offer-records; kettingsamenvoegingen resolveren altijd transitief.
- **Verified Made in Europe — twee-laags model:** bedrijfsniveau (Partner Onboarding, hergebruikt) als harde voorwaarde voor productniveau (nieuw uitgewerkt) — nooit andersom. Elke Verified-status is gebonden aan één specifieke, beoordeelde ProductVersion; een rollback naar een andere versie of een merge trekt het badge automatisch in.
- **Drie orthogonale statusassen** (Productlevenscyclus, Publicatiestatus, Verificatiestatus) plus een vierde, uitdrukkelijk **afgeleide** Visibility-status — nooit apart opgeslagen, altijd berekend.
- **Claims, geschillen, eigendomsoverdrachten en fraudesignalen** blijven altijd handmatige Beheerder-beslissingen, AI ondersteunt maar beslist nooit. Geschillen zijn een eigen, auditeerbare Dispute-entiteit; een centrale AuditLogEntry vult de entiteit-eigen historie aan.

## Onafhankelijke architectuurreview — verwerkt

Acht goedgekeurde bevindingen (B1–B8) volledig verwerkt vóór bevriezing — waaronder drie kritieke: een interne inconsistentie tussen de merge-mechaniek en de Product/Offer-grens (B1), een niet-versiegebonden Verified-badge die via rollback naast ongecontroleerde content kon blijven staan (B2), en het ontbreken van een resolutieregel voor kettingsamenvoegingen (B3). B9–B12 zijn op uitdrukkelijk verzoek niet verwerkt. Volledige bevindingen: zie de architectuurreview in de projectgeschiedenis; volledige verwerking: zie `spec.md`, met name Deel 3.1, 5.3–5.4, 7.3, 7.6, 8.1, 8.5–8.6, 10.4–10.6, en de bijgewerkte ADR's 0008–0009, 0011–0012, plus het nieuwe ADR-0013.

## Verhouding tot bevroren documenten

Dit document **wijzigt niets** aan `product-cloud-commerce-cloud-buy-box/spec.md`, `partner-onboarding/spec.md`, `authenticatie/spec.md`, of enig ander bevroren Sprint 1A/1B-document — het bouwt uitsluitend voort op wat daar al vastligt en werkt onderdelen die daar op hoofdlijnen stonden (productclaims, productversies, Verified™) tot in architecturale diepte uit.

## Relatie met andere mappen

- Bouwt voort op [`product-cloud-commerce-cloud-buy-box/`](../product-cloud-commerce-cloud-buy-box/README.md) (bevroren basis) en [`partner-onboarding/`](../partner-onboarding/README.md) (bedrijfsniveau-verificatie, hergebruikt als Laag 1 van Verified Made in Europe).
- Voorbereidend op de UX/wireframe-uitwerking van het Retailer/Producent Dashboard en het Admin-skelet (Partnerbeheer, Categorie-/filterbeheer) — die volgen pas ná akkoord op dit architectuurdocument, conform de expliciete scope-afbakening van Sprint 1C's eerste stap.
