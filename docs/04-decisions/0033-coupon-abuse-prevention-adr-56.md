# ADR-0033 — Coupon-misbruikpreventie (Blueprint ADR-56) — S3-07-06

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Affiliate, Moderation  
**Sluit af:** Blueprint ADR-56; `affiliate-platform/spec.md` §6  
**Bouwt op:** ADR-0030 (commissie/attributie), ADR-0032 (fraude → Moderation)

## Context

Affiliate-coupons zijn attributie-only (geen Medusa Promotion). Misbruikregels (zelfgebruik, herhaald gebruik) moeten server-side bij OrderSplit.

## Beslissing (MVP)

1. **Zelfgebruik (`coupon_self_use`):** `order.customer_id === affiliate.customer_id` → geen Conversion/Commission; `ModerationCase` Fraude-signaal (zelfde pad als self-attribution via click).
2. **Herhaald gebruik (`coupon_reuse`):** dezelfde `customer_id` + dezelfde actieve coupon op **> 3** geslaagde Conversion-records binnen **24 uur** → géén nieuwe Conversion; wel Fraude-signaal.
3. **Coupon blijft `Actief`** tot Beheerder/Affiliate intrekt; detectie blokkeert alleen attributie, trekt de code niet automatisch in (geen stille invalidatie).
4. **AI beslist nooit**; Beheerder kiest Geen actie / Geëscaleerd in Moderation Center.

## Consequenties

- Controles in `executeAttributeConversion` (coupon-pad).
- Signalen in wachtrij Fraude-signalen met `signal_code`.
