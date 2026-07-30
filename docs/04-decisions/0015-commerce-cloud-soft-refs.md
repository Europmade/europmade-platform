# ADR-0015 — Commerce Cloud soft refs naar Seller en Identifier

## Status

Geaccepteerd

## Context

Blueprint C.1 noemt FK’s `seller_id` → seller en `identifier_id` → identifier. Seller zit in Partner-module, Identifier in Product Cloud. Cross-module DB-FK’s zijn niet toegestaan (ADR-0008-patroon).

## Beslissing

In de `commerceCloud`-module:

- `offer.seller_id` en `offer.identifier_id` zijn **tekst-ID’s** (soft refs), geen MikroORM/`belongsTo` over modulegrenzen.
- `inventory.offer_id` en `price.offer_id` zijn **echte FK’s** binnen dezelfde module.
- Unieke constraint `(seller_id, identifier_id, region_code)` WHERE `deleted_at IS NULL` blijft gehandhaafd op soft-ref kolommen.
- Fysieke tabelnamen: `offer`, `cc_inventory`, `cc_price` — prefix `cc_` op inventory/price om botsing met Medusa Inventory/Pricing-kern tabellen te vermijden; kolommen blijven exact C.2/C.3.

## Consequenties

- Integriteit van seller/identifier wordt in de API gevalideerd (bestaande seller + bestaande identifier).
- Geen DB-cascade bij soft-delete van seller/identifier.
- Module Links naar Medusa Inventory/Pricing kunnen later; bron van waarheid voor Seller-aanbod blijft C.1–C.3.
