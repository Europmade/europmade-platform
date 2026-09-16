# ADR-0023 — Return-statuslifecycle en gesimuleerde Refund (S3-05-04)

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Order-service, Retouren & Refunds  
**Raakt:** ADR-0021; ADR-0018; `returns-and-refunds/spec.md`; Deel D.5

## Context

`returns-and-refunds/spec.md` vult Return in (statusverloop + Refund via PSP) terwijl Deel D.5 en domeinmodel §17 statuswaarden nog “Open” laten. Medusa Order Module returns/refunds verwachten Medusa Order/Payment-graph; EuropMade-orders zitten in custom `orderService` (ADR-0021). Stripe-refunds volgen ADR-0018 maar keys/provider zijn nog niet productieklaar.

## Beslissing

1. **Return blijft in `orderService`** (`em_return`), gekoppeld aan `order_line` (Deel D.5). Geen Medusa Order-return-module tot Module Links Order↔Offer bestaan.
2. **Statusenum (NL, bindend voor MVP):**  
   `Aangevraagd` → `Bevestigd` → `Ontvangen` → `Verwerkt` | `Afgewezen` → (optioneel) `Geëscaleerd`.
3. **Herroepingstermijn:** ~~14 kalenderdagen vanaf `em_order.created_at`~~ → **vervangen door ADR-0040:** 14 kalenderdagen vanaf `shipment.delivered_at` (fallback `em_order.created_at`). Aanmelden buiten termijn → geweigerd.
4. **Refund:** lichtgewicht velden op `em_return` (`refund_amount`, `refund_status`, `refund_reference`, `refund_executed_at`) — geen aparte Refund-tabel (`returns-and-refunds/spec.md` §4).
5. **Normaal pad:** Refund (`refund_status=Uitgevoerd`) alleen bij transitie `Ontvangen` → `Verwerkt` (Seller bevestigt ontvangst + akkoord).
6. **Force-pad:** Beheerder mag Refund forceren (`refund_status=Geforceerd`) met verplichte `force_reason` (+ `force_admin_user_id`); slaat Seller-ontvangst over. Audit via deze velden + event.
7. **PSP:** tot Stripe-refund beschikbaar is (ADR-0018), **gesimuleerde refund** in non-prod (zelfde fail-closed-geest als ADR-0021 simulated payment). Productie zonder echte PSP-refund blijft geblokkeerd tenzij expliciet toegestaan.
8. **MVP-scope:** één open Return per `order_line` (geen parallelle open returns); gedeeltelijke qty-retour en retourlabel/Shipment buiten deze ADR.

## Consequenties

- S3-05-04 levert store/admin Return-API’s op dit model.
- S3-05-05/06 bouwen UI hierop; notificaties (S3-05-09) consumeren `ReturnRequested` / `ReturnStatusChanged` / `RefundExecuted`.
- Affiliate `ConversionReversed` volgt wanneer Affiliate-module bestaat.
