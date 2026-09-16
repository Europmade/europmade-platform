# ADR-0041 — Eén Partner-account: RETAILER, BRAND_OWNER en PRODUCER

**Status:** Geaccepteerd  
**Datum:** 2026-08-17  
**Domein:** Partner, Seller Dashboard, merken, facilities  
**Raakt:** Blueprint Deel A.3 (`is_producer_or_brand_owner`); geen vervanging van ADR-0006

## Context

De Blueprint kent op `seller` optelbare vlaggen `is_retailer` en `is_producer_or_brand_owner`. De productvraag is nu één Partner-omgeving waarin een account tegelijk Retailer, Merkeigenaar en/of Producent kan zijn — zonder drie portals. Merkbeschrijving mag alleen door merkeigenaar (of admin) worden gewijzigd; facilities/Made in Europe horen bij producent (en merkeigenaar met facility-recht).

## Beslissing

1. **Eén Seller/Partner-record per customer** blijft de accountentiteit. Geen aparte retailer-/merk-/producent-accounts.
2. **Nieuwe vlaggen** `is_brand_owner` en `is_producer` op `seller`. De Blueprint-vlag `is_producer_or_brand_owner` blijft bestaan en is de OR van beide (plus legacy-data).
3. **Rechten** worden afgeleid uit rollen (permission-laag) en server-side afgedwongen. UI verbergt acties, maar is geen autorisatie.
4. **Legacy:** bestaande rijen met alleen `is_producer_or_brand_owner = true` krijgen beide split-vlaggen `true`, zodat huidige partners geen rechten verliezen totdat admin ze uitsplitst.
5. **Admin** mag rollen op een goedgekeurde partner aanpassen. Onboarding mag merkeigenaar en producent apart kiezen.

## Consequenties

- Seller-routes (`/seller/*`) blijven de Partner-omgeving; "Seller" is technische naam.
- Retailer zonder BRAND_OWNER kan gekoppelde merken bekijken, niet de merkbeschrijving wijzigen.
- Producent zonder BRAND_OWNER beheert facilities/Made in Europe, niet de merkbeschrijving.
- Product-approval (seller indienen, admin goedkeuren) blijft ongewijzigd.
