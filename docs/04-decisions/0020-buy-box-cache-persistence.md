# ADR-0020 — Buy Box-cache-persistentie (Blueprint ADR-31)

**Status:** Geaccepteerd  
**Datum:** 2026-07-30  
**Domein:** Buy Box, Commerce Cloud, Caching  
**Blueprint-catalogus:** ADR-31 (`09-adr-overview.md`)  
**Raakt:** `02-database-model.md` Inconsistentie #3; `05-service-architecture.md` §13; ADR-0019 §7

## Context

`buy_box_computation` (C.4) is in het datamodel al als **afgeleide/cache-tabel** gemodelleerd, maar Inconsistentie #3 vroeg of Buy Box-uitkomsten überhaupt gepersisteerd mogen worden. Service-architecture §13 bevriest alleen dat C.4 de cache-tabel is; TTL, read-path en invalidatie ontbraken. S3-04-05 eist die vastlegging én implementatie.

Medusa biedt geen native Buy Box- of marketplace-winner-cache; Event Bus + custom module blijven maatwerk (standard-vs-custom).

## Beslissing

1. **Persistentie: ja.** De laatst berekende winnaar per `identifier_id` × `region_code` wordt opgeslagen in PostgreSQL-tabel `buy_box_computation` (C.4). Geen aparte Redis-/CDN-cache voor Buy Box in MVP.
2. **Inhoud van de cache:** uitsluitend C.4-kolommen (`winning_offer_id`, `computed_at`, …). Volledige ranking/scores/weging **horen niet** in C.4; die worden bij behoefte server-side herberekend (ADR-0005).
3. **Write-through bij mutatie:** elke relevante Offer-/Inventory-/Price-wijziging (en soft-withdraw) herberekent synchroon in hetzelfde request, overschrijft of wist C.4, en emit `BuyBoxRecomputed`. Geen periodieke batch-herberekening.
4. **Read-beleid:**
   - APIs die **ranking, rank of weging** nodig hebben (seller positie-UI, `GET …/buy-box` zonder cache-flag): **read-through recompute** — herbereken server-side en ververs C.4.
   - APIs/consumenten die alleen de **huidige winnaar-id** nodig hebben: mogen C.4 **direct lezen** zonder herberekening (`prefer_cache=true`). Eventual consistency na een mutatie is aanvaardbaar (`04-event-model.md` §12).
5. **Invalidatie:** uitsluitend via herberekening of wissen van de C.4-rij (geen TTL). Ontbrekende cache bij `prefer_cache` → fall back naar recompute.
6. Dit **bevestigt** de datamodel-aanname van Inconsistentie #3: persistente cache-tabel is correct voor de Buy Box-positie-indicator.

## Consequenties

- S3-04-02’s write-path blijft; S3-04-05 voegt het leesbeleid + ADR toe.
- Storefront kan later goedkoop de winnaar tonen via C.4 zonder scoring client-side.
- Seller Buy Box-positie blijft server-side ranked (geen client-side weging).
