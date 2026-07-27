# ADR 0002 — Verified™-drempel is configureerbaar, geen vaste minimale score

**Status:** Geaccepteerd
**Datum:** Vastgesteld tijdens Stap 4 (UX & Product Design), verdiepingsfase Product Cloud/Commerce Cloud/Buy Box.
**Domein:** Product Cloud

## Context

Blueprint H13.6 stelt dat Verified™ wordt toegekend wanneer o.a. "een Product Quality Score die aan de minimale norm voldoet" is behaald, zonder een exact percentage te noemen. H14.10 noemt wél een platformbreed *gemiddeld* streefcijfer (Product Quality Score > 90%), maar dit is een KPI-doelstelling, geen per-product-drempel voor Verified™.

## Beslissing

Er wordt geen vaste minimale score (bijvoorbeeld 90%) vastgelegd in de Blueprint of in de functionele documentatie. Verified™ wordt toegekend wanneer een product voldoet aan **de door EuropMade vastgestelde kwaliteitscriteria**. De minimale Product Quality Score die hiervoor geldt, is een **configureerbare instelling**, beheerd door de Administrator.

## Consequenties

- De drempelwaarde kan worden aangescherpt naarmate het platform groeit, zonder codewijziging.
- Elke wijziging van de drempelwaarde wordt gelogd in de audittrail (Blueprint H13.11).
- De Verified™-voortgangsindicator die een producent ziet (welke voorwaarden nog ontbreken) rekent altijd met de op dat moment geldende, geconfigureerde drempel.
- Het platformbrede KPI-streefcijfer uit H14.10 (>90% gemiddeld) blijft een aparte, los meetbare KPI en is niet automatisch gelijk aan de Verified™-drempel per product.

## Referentie

Volledige uitwerking: [`03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md), sectie 1.10.
