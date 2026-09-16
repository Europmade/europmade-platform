# ADR-0040 — Leveringsdatum als anker voor retourtermijn + seller fulfilment-documenten

**Status:** Geaccepteerd  
**Datum:** 2026-08-15  
**Domein:** Order-service, Retouren, Seller fulfilment  
**Raakt:** ADR-0023 (gedeeltelijk vervangen); `returns-and-refunds/spec.md`; Deel D.4–D.5

## Context

ADR-0023 ankert de herroepingstermijn tijdelijk op `em_order.created_at` omdat Shipment nog Open was. Shipment bestaat structureel (`tracking_code`, `delivered_at`) maar zonder seller-API’s. Seller Orders UI gebruikte demo/localStorage voor factuur, pakbon en Track & Trace. De productvraag is nu: echte T&T, afleverdatum, retourtermijn vanaf levering, seller-upload van factuur/pakbon, en retouren vanuit order/messages — zonder parallelle systemen.

## Beslissing

1. **Retourtermijn-anker:** **30 kalenderdagen** vanaf **`shipment.delivered_at`**. Zonder afleverdatum is er **geen** deadline (UI toont `—` / “start na levering”). Geen fallback meer op `em_order.created_at`.
2. **Shipment schrijven door seller:** carrier, tracking_code, tracking_url (optioneel expliciet), status, delivered_at. Tracking-URL mag worden opgebouwd uit carrier+nummer of expliciet opgeslagen.
3. **Orderdocumenten:** `order_document` met types `invoice` | `packing_slip` (File-module URL + metadata). Geen hergebruik van finance `invoice` (ADR-0034 = platformfacturatie).
4. **Retour-tracking:** optionele `carrier` / `tracking_code` / `tracking_url` op `em_return`. Statusenum: `Aangevraagd` → `Bevestigd` → `Onderweg` → `Ontvangen` → `Verwerkt` (refund door seller) | `Afgewezen`.
5. **Refund:** via `RefundService`-interface (lokaal: `SimulatedRefundService`). Statussen: `requested` | `processing` | `processed` | `failed` | `forced`. Geen automatische refund bij aanmaken; alleen bij seller `approve`/`Verwerkt` (of admin force).
6. **Gedeelde berekening:** `computeReturnPeriod` in `@europmade/utils` (30 dagen) is de bron voor UI (seller/buyer/admin).
7. **Productlabels:** orderregels tonen catalogusnamen via offer → identifier → product_variant → product_version (geen technische IDs in UI).

## Consequenties

- Seller order detail, message detail en returns gebruiken dezelfde order/shipment/return-data.
- Demo download-knoppen voor factuur/pakbon verdwijnen ten gunste van upload/view.
- Bestaande `cooling_off_ends_at` op open retouren blijft geldig; nieuwe retouren herberekenen vanaf delivery-anker.
