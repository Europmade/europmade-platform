# ADR-0048 — Affiliatecommissie betaalt de verkopende seller

**Status:** Geaccepteerd  
**Datum:** 2026-10-08  
**Domein:** Affiliate, Seller, Finance  
**Vervangt:** ADR-0030 punt 2 (vast platformpercentage als ordercommissie) en ADR-0045 punt 6 (seller-tarieven alleen als demo)

## Context

De affiliateportal toonde één percentage voor elk product. Seller Settings bewaarden de standaard- en productcommissie niet. Een promotielink legde bovendien het percentage van de landingsaanbieding vast, ook als de klant daarna bij een andere seller kocht.

## Beslissing

1. **Opslag:** standaardcommissie en productcommissies staan op de bestaande seller (`affiliate_commission_settings`). Leeg betekent standaard 8% en geen productregels. Een productregel hoort bij seller + product.
2. **Tarief:** productcommissie van die seller voor dat product, anders de standaard van die seller, plus 3 procentpunt EuropMade-bijdrage.
3. **Referral:** een affiliate-link legt affiliate, product en tracking vast. Offer en seller zijn alleen een landingsvoorkeur. Het linkpercentage is geen ordercommissie.
4. **Betaler:** de seller van de offer op de orderregel betaalt. Koopt de klant bij een andere seller dan de landingsaanbieding, dan geldt het tarief van de verkopende seller.
5. **Snapshot:** bij de order wordt percentage, bedrag, offer en seller op de commissieregel geschreven. Een latere wijziging van sellerinstellingen wijzigt die regel niet. Een refund wijzigt bedrag of status, niet het percentage.

## Consequenties

- Affiliate-lijst en -detail lezen dezelfde sellerinstellingen. Meerdere verkoopbare offers tonen de hoogste commissie als “Tot X%”.
- `affiliate_commission_setting.percentage` (ADR-0030) bepaalt niet meer de ordercommissie. De attributieperiode van 30 dagen blijft gelden.
