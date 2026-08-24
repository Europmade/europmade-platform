# ADR-0030 — Affiliate-commissie & attributieperiode (Blueprint ADR-54) — S3-07-00

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Affiliate, Finance  
**Sluit af:** Blueprint ADR-54; `affiliate-platform/spec.md` §7

## Context

Open punten: exacte attributieperiode en default commissiepercentage. Beheerder-configureerbaar is het doelmodel; MVP heeft een default nodig.

## Beslissing

1. **Attributieperiode:** **30 dagen** vanaf `click.created_at` → `attribution_expires_at`. Coupon-attributie heeft geen cookie-expiry; geldig zolang coupon `Actief` is op moment van OrderSplit. Attributie gebruikt de meest recente succesvolle affiliate click die momenteel in de affiliate tracking cookie (`em_aff_clk`) staat; er is geen first-click model.
2. **Default affiliate-commissie:** **5%** van het orderregel-subtotaal (som `unit_price_snapshot × quantity` van de geattribueerde `em_order`, excl. verzending). Opgeslagen in `affiliate_commission_setting` (één actieve rij); Beheerder kan later wijzigen zonder code-deploy.
3. **Commissie bij Return:** bij `RefundExecuted` op een order met Conversion → `ConversionReversed` + commission-bedrag op 0 / status teruggedraaid (geen uitbetaling).
4. **Zelf-attributie:** als `order.customer_id === affiliate.customer_id` → géén conversion; wel ModerationCase `Fraude-signaal`.

## Consequenties

- Buy Box/Seller-commissie (10%) blijft ongewijzigd (EPIC-08).
- Finance-module krijgt `commission`-rijen voor Affiliate bij OrderSplit (G.6).
