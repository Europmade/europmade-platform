# ADR-0046 — Expliciete Productbeheerder per Product Cloud-product

**Status:** Geaccepteerd  
**Datum:** 2026-09-24  
**Domein:** Product Cloud, Admin, Seller authorization  
**Raakt:** Blueprint B.2 / B.9 (`current_owner_seller_id`, `ownership_record`); ADR-0009 (change proposals)

## Context

Centrale Product Cloud-bewerkingsrechten hingen af van `current_owner_seller_id` (sole catalog owner) en multi-offer heuristieken. Dat gaf onduidelijke of tegenstrijdige eigenaarstoestanden zodra meerdere sellers hetzelfde product aanboden.

## Beslissing

1. Per Product Cloud-product is er **maximaal één** expliciete **Productbeheerder**.
2. `product_manager_kind`: `seller` | `brand_owner` | `none`, plus optioneel `product_manager_seller_id` (alleen bij `seller`).
3. `current_owner_seller_id` blijft bestaan (claims, filters, historie) maar **verleent geen** automatische centrale editrechten meer.
4. Productbeheerder mag alle centrale PC-gegevens rechtstreeks bewerken; andere sellers: offers + gap-fill + wijzigingsvoorstellen.
5. Wijzigingsvoorstellen dekken **centrale** velden (titel, beschrijving, merk, fabrikant, attributen, media-notitie) via `proposed_fields` JSON; legacy `proposed_title`/`proposed_description` blijven geldig.
6. Admin wijst Productbeheerder toe uit: offer-sellers, geverifieerde merkeigenaar, of geen beheerder.
7. Wijzigingen worden geaudit via `ownership_record` (bij seller) + `pc_field_change` (`field_code=product_manager` / proposal apply).
8. Europese eigendom blijft merkniveau (ADR-0044) — buiten scope.
9. Made in Europe / fabrikantenlijst is een apart domein — geen Productbeheerder-logica.

## Consequenties

- Migratie `Migration20260924120000` op `pc_product`.
- Auth in `catalog-edit-auth` / `catalog-edit-guard`.
- Admin UI/API: Productbeheer-sectie.
