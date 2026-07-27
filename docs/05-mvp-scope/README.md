# 05 — MVP Scope

Overkoepelend overzicht van de MVP-afbakening (Must/Should/Could Have) over alle domeinen heen. De gedetailleerde tabellen staan in de brondocumenten zelf, om duplicatie te voorkomen; deze map bundelt uitsluitend de **verwijzingen en de status per domein**.

## Overzicht

| Domein | Bron | Status |
|---|---|---|
| UX-schermen (68 schermen, publiek/partner/admin/affiliate) | [`02-ux/ux-architecture.md`](../02-ux/ux-architecture.md), sectie 5 | Definitief |
| Bouwaard per schermgroep (Next.js/Medusa) | [`02-ux/ux-architecture.md`](../02-ux/ux-architecture.md), sectie 5.5 | Definitief |
| Product Cloud (structuur, claims, versies, Verified™) | [`03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md), sectie 6.1 | Definitief |
| Commerce Cloud (offers, prijzen, voorraad, landen) | [`03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md), sectie 6.2 | Definitief |
| Buy Box (scoreberekening, tiebreaker, Sponsored Products) | [`03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md), sectie 6.3 | Definitief |

## Platformbrede MVP-kaders (uit de Blueprint, H15.7)

- **Fase 1 (MVP), 2–3 maanden:** Marketplace, Product Cloud, Commerce Cloud, Partnerdashboard, betalingen, bannerplatform, basis-AI, basis-zoekfunctie, product- en verkopersreviews, **Affiliate Platform (definitief MVP, zie hieronder — vervangt H15.7/H15A.12 op dit punt)**.
- **Expliciet buiten MVP:** AI-geoptimaliseerde Order Routing (H8.6), Sponsored Products (ADR 0003), mobiele apps, Digital Product Passport-ondersteuning (Fase 3, H15.7), en de **Creator**-rol van het Affiliate & Creator Platform (H15A) — uitsluitend Creator blijft Post-MVP; Affiliate is losgetrokken en definitief MVP.
- **MVP-lancering:** 6 landen gelijktijdig — Nederland, België, Duitsland, Frankrijk, Italië, Spanje (H14.10).

## Definitieve scopewijziging: Affiliate Platform

Het Affiliate Platform (exclusief Creator) is per definitieve projectbeslissing onderdeel van de MVP — dit vervangt de eerdere classificatie in Blueprint H15.7/H15A.12. Zie [`00-context/blueprint-reference.md`](../00-context/blueprint-reference.md) voor de volledige toelichting en [`03-functional-specs/affiliate-platform/`](../03-functional-specs/affiliate-platform/README.md) voor de functionele uitwerking.

## Nieuwe MVP-domeinen (deze afronding)

| Domein | Bron | Status |
|---|---|---|
| Affiliate Platform | [`03-functional-specs/affiliate-platform/spec.md`](../03-functional-specs/affiliate-platform/spec.md) | Concept v1.0 |
| Retouren & Refunds | [`03-functional-specs/returns-and-refunds/spec.md`](../03-functional-specs/returns-and-refunds/spec.md) | Concept v1.0 |
| Finance (commissies/facturatie/uitbetalingen) | [`03-functional-specs/finance/spec.md`](../03-functional-specs/finance/spec.md) | Concept v1.0 |
| Seller Dashboard | [`03-functional-specs/seller-dashboard/spec.md`](../03-functional-specs/seller-dashboard/spec.md) | Concept v1.0 |
| Buyer Dashboard | [`03-functional-specs/buyer-dashboard/spec.md`](../03-functional-specs/buyer-dashboard/spec.md) | Concept v1.0 |
| Berichten, Reviews & Q&A | [`03-functional-specs/messaging-reviews-qa/spec.md`](../03-functional-specs/messaging-reviews-qa/spec.md) | Concept v1.0 |
| GDPR & Compliance | [`03-functional-specs/gdpr-compliance/spec.md`](../03-functional-specs/gdpr-compliance/spec.md) | Concept v1.0 |

## Wijzigingsproces

Nieuwe domeinen die worden uitgewerkt in `03-functional-specs/` krijgen hun eigen Must/Should/Could Have-tabel in dat document zelf; deze pagina wordt dan bijgewerkt met een verwijzing, niet met een gedupliceerde tabel.
