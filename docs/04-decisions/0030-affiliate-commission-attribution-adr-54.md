# ADR-0030 — Affiliate-commissie & attributieperiode (Blueprint ADR-54) — S3-07-00

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Affiliate, Finance  
**Sluit af:** Blueprint ADR-54; `affiliate-platform/spec.md` §7

## Context

Open punten: exacte attributieperiode en default commissiepercentage. Beheerder-configureerbaar is het doelmodel; MVP heeft een default nodig.

## Beslissing

1. **Attributieperiode:** **30 dagen** vanaf `click.created_at` → `attribution_expires_at`. Coupon-attributie heeft geen cookie-expiry; geldig zolang coupon `Actief` is op moment van OrderSplit. Attributie gebruikt de meest recente succesvolle affiliate click die momenteel in de affiliate tracking cookie (`em_aff_clk`) staat; er is geen first-click model.
2. **Ordercommissie:** vervangen door [ADR-0048](./0048-affiliate-commission-paid-by-selling-seller.md). Het percentage komt uit de sellerinstelling van de offer die op de order staat, plus de EuropMade-bijdrage, en wordt op de commissieregel vastgelegd. `affiliate_commission_setting.percentage` is niet langer de ordercommissie.
3. **Commissie bij Return:** bij `RefundExecuted` op een order met Conversion → `ConversionReversed` + commission-bedrag op 0 / status teruggedraaid (geen uitbetaling).
4. **Zelf-attributie:** als `order.customer_id === affiliate.customer_id` → géén conversion; wel ModerationCase `Fraude-signaal`.

## Consequenties

- Buy Box/Seller-commissie (10%) blijft ongewijzigd (EPIC-08).
- Finance-module krijgt `commission`-rijen voor Affiliate bij OrderSplit (G.6).
