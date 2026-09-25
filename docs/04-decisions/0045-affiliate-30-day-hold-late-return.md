# ADR-0045 — Affiliate 30-dagen payout-hold & late-return risico

**Status:** Geaccepteerd  
**Datum:** 2026-09-23  
**Domein:** Affiliate, Finance  
**Raakt:** ADR-0030, ADR-0034 (seller hold blijft 14 dagen)

## Context

MVP-commerciële regel: affiliatecommissie wordt pas uitbetaalbaar na **30 dagen** retour-/risicoperiode. Refunds/returns **na** die periode mogen de affiliatecommissie niet meer terugdraaien; het financiële risico ligt dan bij de seller.

ADR-0034 stelde een algemene 14-dagen `eligible_at` hold in (seller + affiliate deelden `RETURN_HOLD_DAYS`).

## Beslissing

1. **Affiliate payout hold:** `AFFILIATE_RETURN_HOLD_DAYS = 30`. Affiliate `eligible_at = order.created_at + 30d`.
2. **Seller hold:** blijft `RETURN_HOLD_DAYS = 14` (ADR-0034 ongewijzigd voor sellers).
3. **Binnen 30 dagen:** full refund/cancel → commission reverse + Gepland payout annuleren; partial refund → commission/payout prorateren.
4. **Na 30 dagen:** `executeReverseConversionForOrder` locked — geen reverse/prorate van affiliatecommissie; Gepland affiliate-payouts worden niet geannuleerd bij latere `RefundExecuted`.
5. **Platform affiliate %:** blijft één actieve `affiliate_commission_setting.percentage` (ADR-0030), Admin-bewerkbaar via `/admin/affiliates/commission-settings`. Historische `commission.percentage`/`amount` wijzigen niet mee.
6. **Seller + EuropMade-split:** niet onderdeel van deze ADR — seller affiliate-tarieven bestaan alleen als demo-UI en zijn niet backend-gekoppeld; finance-spec stelt dat affiliatecommissie uit de **platformmarge** komt.

## Consequenties

- Affiliate dashboard toont Pending / Eligible / Paid / Reversed op basis van hold + payout-status.
- Settlement/afrekening beschikbaar na `eligible_at` via bestaande payout-data (geen aparte BTW-regels verzonnen).
