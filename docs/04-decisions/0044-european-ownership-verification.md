# ADR-0044 — Europese eigendom is een aparte verification-claim op merkniveau (niet Made in Europe)

**Status:** Geaccepteerd (bijgewerkt 2026-09-23)  
**Datum:** 2026-09-22  
**Domein:** Verification, Product Cloud, Partner/Brand, Storefront  
**Raakt:** ADR-0008, ADR-0041, ADR-0043; Blueprint H7.7 / H13 (aanbevolen formalisering); wireframe Sprint 1A EU-eigendom

## Context

"Gemaakt in Europa" (productielocatie / MiE-score) is niet hetzelfde als Europees eigendom van de producent/onderneming. Wireframes tonen al een aparte EU-eigendom-badge. De storefront vulde `euOwnershipPercent` ten onrechte met de Made-in-Europe-score.

Product Cloud `ownership_record` en partner `brand_ownership_claim` hebben andere betekenissen (info-eigenaarschap resp. officiële merkpagina / merkeigenaarschap).

Eerste implementatie koppelde EU-eigendom aan `manufacturer_id`. Functioneel hoort de claim bij het **merk**: één set gegevens per merk, hergebruikt door alle gekoppelde producten.

## Beslissing

1. **Europese eigendom is een aparte claim** op **brand-niveau** in de `verification`-module (`european_ownership_claim.brand_id`), met status-events voor audit.
2. **Geen invloed** op listability, Buy Box, product approval, toelating tot EuropMade, of `computeMadeInEuropeScore()`.
3. **Bands (geen vrije numerieke seller-invoer):** `0%`, `1–25%`, `26–50%`, `51–75%`, `76–99%`, `100%`, `Niet bekend`.
4. **Bron:** Merk/producent, Fabriek, Reseller, Andere. Reseller mag `Niet bekend` zonder bewijsplicht.
5. **Bewijs is standaard optioneel**; admin kan bij twijfel bewijs/aanvullende info opvragen via bestaande reviewpatronen (`approve` / `request_info` / `reject`) met **opmerking voor seller** (persistent + historie).
6. **Geen automatische classificatie** op basis van webdata; admin beslist handmatig.
7. **PDP** toont Europese eigendom **apart** van Made in Europe. MiE-score blijft productie; ownership komt uit de merkclaim.
8. Soft-refs naar brand/company (ADR-0008); geen duplicatie van brand- of company-records.
9. **Geen hergebruik** van `brand_ownership_claim` of `ownership_record` als opslag voor EU-% — wel dezelfde review-/bewijspatronen.
10. Seller productflow: bestaand merk → claim automatisch laden; nieuw merk (`+ Nieuw merk`) → claim op merkniveau vastleggen na koppeling.

## Consequenties

- Tabellen: `european_ownership_claim` (primary soft-ref `brand_id`), `european_ownership_status_event`.
- Legacy `manufacturer_id` blijft nullable voor migratie/compatibiliteit; lookups prefereren `brand_id`.
- Seller/admin UI + catalog-veld `european_ownership`.
- `euOwnershipPercent` mag niet langer de MiE-score proxy'en.

## Non-goals

- Geen wijziging van MiE-score-engine of Verified™-drempel (ADR-0002).
- Geen tweede Brand-model.
- Geen hergebruik van `brand_ownership_claim` of `ownership_record` voor EU-eigendomswaarden.
