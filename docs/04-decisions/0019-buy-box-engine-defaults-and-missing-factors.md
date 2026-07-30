# ADR-0019 — Buy Box-engine: defaultweging en ontbrekende factoren (S3-04-02)

**Status:** Geaccepteerd  
**Datum:** 2026-07-30  
**Domein:** Buy Box, Commerce Cloud  
**Raakt:** ADR-0001 (configureerbare weging), ADR-0004 (tiebreaker), ADR-0014 (deferred recompute)

## Context

S3-04-02 eist de server-side Buy Box-engine. ADR-0001 vereist configureerbare percentages, maar er is nog geen Admin-UI voor weging. Levertijd, verkopersreview, Performance Score en retourprestaties hebben nog geen Commerce-/Review-datamodel in MVP (EPIC-05/06 later). Zonder ADR zou de engine ofwel factoren verzinnen, ofwel de Blueprint-factorlijst negeren.

## Beslissing

1. **Defaultweging** (tot Admin-configuratie bestaat), prioriteit ADR-0001 behouden, som = 1,0:

| Factor | Defaultgewicht |
|---|---|
| `price` (totaalprijs) | 0,40 |
| `delivery` | 0,20 |
| `seller_review` | 0,15 |
| `stock` | 0,12 |
| `performance` | 0,08 |
| `returns` | 0,05 |

2. **Ontbrekende factorinputs** (geen levertijd-/review-/performance-/retourdata): score **0,5 (neutraal)** voor die factor, zodat alle offers gelijk starten op die as en **prijs + voorraad** de ranking bepalen zonder nepdata.
3. **Voorraad 0** → offer **uitgesloten** (spec §3.4), niet meescoren.
4. **Prijsnormalisatie** over de in-stock kandidaten: laagste totale klantprijs (`base_price + shipping_cost`) → 1,0; hoogste → 0,0; bij gelijke prijzen → 1,0 voor allen.
5. **Voorraadscore** onder in-stock offers: hogere `quantity_available` scoort hoger (min-max normalisatie); bij gelijke qty → 1,0.
6. **Tiebreakers** exact ADR-0004: (1) performance-input indien verschillend, anders overslaan; (2) langste `seller.approved_at` (anders `created_at`); (3) deterministische dagrotatie `sha256(identifier|region|UTC-dag|offer_id)`.
7. **Persistatie:** schrijf/overschrijf `buy_box_computation` (C.4) bij elke herberekening; emit `BuyBoxRecomputed` via Event Bus. Dit dekt de engine-trigger; S3-04-05 blijft het aparte cachebeleid-/ADR-31-ticket.
8. ADR-0014’s “buy_box=deferred” op Offer-upsert wordt **vervangen** door echte herberekening.

## Consequenties

- Engine is testbaar zonder Review/Performance-modules.
- Latere epics vullen factorinputs; weging blijft via config overschrijfbaar zonder codewijziging.
- Geen client-side scoring (ADR-0005).
