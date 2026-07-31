# ADR-0031 — Affiliate-module: tabelprefixen en minimale schema-uitbreidingen

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Affiliate, Finance  
**Raakt:** Deel G.1–G.6/G.10

## Beslissing

1. Tabellen `click`/`coupon`/`conversion` heten technisch `aff_click` / `aff_coupon` / `aff_conversion` om botsingen met toekomstige Medusa/core-namen te vermijden; kolommen blijven Blueprint-conform.
2. Extra (niet-Blueprint) velden voor MVP-operatie:
   - `affiliate.channel_url`, `affiliate.rejection_reason`
   - `aff_conversion.affiliate_id`, `aff_conversion.reversed_at`
   - `commission.status` (`Toegekend`/`Teruggedraaid`) voor Return-reversal
   - `affiliate_commission_setting` voor ADR-0030 defaults
3. Finance-module start met alleen `commission` (G.6); `invoice`/`payout` blijven S3-08-01.
