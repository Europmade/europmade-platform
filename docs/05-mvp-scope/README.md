# 05 — MVP Scope

Overkoepelend overzicht van de MVP-afbakening (Must/Should/Could Have) over alle domeinen heen. De gedetailleerde tabellen staan in de brondocumenten zelf, om duplicatie te voorkomen; deze map bundelt uitsluitend de **verwijzingen en de status per domein**.

## Overzicht

| Domein | Bron | Status |
|---|---|---|
| UX-schermen (67 schermen, publiek/partner/admin/affiliate) | [`02-ux/ux-architecture.md`](../02-ux/ux-architecture.md), sectie 5 | Definitief |
| Bouwaard per schermgroep (Next.js/Medusa) | [`02-ux/ux-architecture.md`](../02-ux/ux-architecture.md), sectie 5.5 | Definitief |
| Product Cloud (structuur, claims, versies, Verified™) | [`03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md), sectie 6.1 | Definitief |
| Commerce Cloud (offers, prijzen, voorraad, landen) | [`03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md), sectie 6.2 | Definitief |
| Buy Box (scoreberekening, tiebreaker, Sponsored Products) | [`03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md), sectie 6.3 | Definitief |

## Platformbrede MVP-kaders (uit de Blueprint, H15.7)

- **Fase 1 (MVP), 2–3 maanden:** Marketplace, Product Cloud, Commerce Cloud, Partnerdashboard, betalingen, bannerplatform, basis-AI, basis-zoekfunctie, product- en verkopersreviews.
- **Expliciet buiten MVP:** Affiliate & Creator Platform (H15.7, H15A.12), AI-geoptimaliseerde Order Routing (H8.6), Sponsored Products (ADR 0003), mobiele apps en Digital Product Passport-ondersteuning (Fase 3, H15.7).
- **MVP-lancering:** 6 landen gelijktijdig — Nederland, België, Duitsland, Frankrijk, Italië, Spanje (H14.10).

## Wijzigingsproces

Nieuwe domeinen die worden uitgewerkt in `03-functional-specs/` krijgen hun eigen Must/Should/Could Have-tabel in dat document zelf; deze pagina wordt dan bijgewerkt met een verwijzing, niet met een gedupliceerde tabel.
