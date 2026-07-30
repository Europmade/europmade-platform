# ADR 0008 — Product Cloud Deel B-tabellen als custom module (naast Medusa Product)

**Status:** Geaccepteerd
**Datum:** 2026-07-30
**Domein:** Product Cloud, Medusa-architectuur

## Context

`11-medusa-architecture.md` wijst `Product`/`Category` als Medusa-standaard aan en noemt in de custom Product Cloud-lijst o.a. `product_family`, `product_version`, `identifier` — maar **niet** expliciet de Deel B-tabel `product`/`product_variant`/`category` met EuropMade-velden (`lifecycle_status`, `brand_id`, `variant_type`, …). Ticket **S3-03-01/02** eisen schema **exact conform** `02-database-model.md` Deel B. Medusa-coretabellen mogen niet worden geforkt (§2/§7.3).

## Beslissing

1. Deel B-entiteiten (`product`, `product_variant`, `category`, `product_category`, enz.) worden als **custom tabellen** in de `product-cloud`-module geïmplementeerd, met letterlijke Blueprint-kolommen/enums — hetzelfde patroon als Partner `seller` naast Medusa Customer.
2. Cross-module referenties naar Partner (`brand_id`, `manufacturer_id`, `seller_id`) zijn tekst-ID's, geen FK in Partner-tabellen.
3. Module Links naar Medusa Product/Category worden toegevoegd wanneer Commerce Cloud/cart die koppeling nodig heeft (niet blokkerend voor S3-03-01…03).
4. `moderation_case` en `product_origin` komen in aparte modules `moderation` en `verification` (conform `11-medusa-architecture.md` §3).

## Consequenties

- Exacte Deel B-schema-acceptatiecriteria zijn haalbaar zonder Medusa-core te wijzigen.
- Latere Commerce-integratie koppelt via Module Links, niet via overschrijven van Medusa Product.

## Referentie

- [`08-technical-blueprint/02-database-model.md`](../08-technical-blueprint/02-database-model.md) Deel B
- [`08-technical-blueprint/11-medusa-architecture.md`](../08-technical-blueprint/11-medusa-architecture.md) §2–§3, §7.3
- Partner-precedent: `apps/backend/src/modules/partner`, `src/links/seller-customer.ts`
