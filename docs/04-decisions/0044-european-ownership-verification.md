# ADR-0044 — Europese eigendom is een aparte verification-claim (niet Made in Europe)

**Status:** Geaccepteerd  
**Datum:** 2026-09-22  
**Domein:** Verification, Product Cloud, Storefront  
**Raakt:** ADR-0008, ADR-0041, ADR-0043; Blueprint H7.7 / H13 (aanbevolen formalisering); wireframe Sprint 1A EU-eigendom

## Context

"Gemaakt in Europa" (productielocatie / MiE-score) is niet hetzelfde als Europees eigendom van de producent/onderneming. Wireframes tonen al een aparte EU-eigendom-badge. De storefront vulde `euOwnershipPercent` ten onrechte met de Made-in-Europe-score.

Product Cloud `ownership_record` en partner `brand_ownership_claim` hebben andere betekenissen (info-eigenaarschap resp. officiële merkpagina).

## Beslissing

1. **Europese eigendom is een aparte claim** op **manufacturer/company-niveau** in de `verification`-module (`european_ownership_claim`), met status-events voor audit.
2. **Geen invloed** op listability, Buy Box, product approval, toelating tot EuropMade, of `computeMadeInEuropeScore()`.
3. **Bands (geen vrije numerieke seller-invoer):** `0%`, `1–25%`, `26–50%`, `51–75%`, `76–99%`, `100%`, `Niet bekend`.
4. **Bron:** Merk/producent, Fabriek, Reseller, Andere. Reseller mag `Niet bekend` zonder bewijsplicht.
5. **Bewijs is standaard optioneel**; admin kan bij twijfel bewijs/aanvullende info opvragen via bestaande reviewpatronen (`approve` / `request_info` / `reject`) met **opmerking voor seller** (persistent + historie).
6. **Geen automatische classificatie** op basis van webdata; admin beslist handmatig.
7. **PDP** toont Europese eigendom **apart** van Made in Europe. MiE-score blijft productie; ownership komt uit de claim.
8. Soft-refs naar manufacturer/company (ADR-0008); geen duplicatie van company-records.

## Consequenties

- Nieuwe tabellen: `european_ownership_claim`, `european_ownership_status_event`.
- Seller/admin UI + catalog-veld `european_ownership`.
- `euOwnershipPercent` mag niet langer de MiE-score proxy'en.

## Non-goals

- Geen wijziging van MiE-score-engine of Verified™-drempel (ADR-0002).
- Geen hergebruik van `brand_ownership_claim` of `ownership_record` voor EU-eigendom.
