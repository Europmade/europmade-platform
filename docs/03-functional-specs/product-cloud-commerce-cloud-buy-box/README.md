# Product Cloud, Commerce Cloud & Buy Box

**Status:** Definitief

## Inhoud

- [`spec.md`](./spec.md) — volledige functionele UX-specificatie: productstructuur, rollen (Producent/Merkhouder/Retailer/Distributeur), productclaims, eigenaarschap, mutaties, versies, verificatie en Verified™ (Product Cloud) · aanbiedingen, prijzen, voorraad, levertijden, verzendkosten, landen, valuta, retourvoorwaarden (Commerce Cloud) · volledige Buy Box-beslislogica inclusief het ontwerpprincipe "de Buy Box dient altijd het belang van de klant" · rollenmatrix · UX per rol · MVP-prioritering · controle tegen Blueprint en Next.js + Medusa-architectuur.

## Gerelateerde beslissingen (ADR's)

Dit document verwijst naar vier formeel vastgestelde beslissingen die niet letterlijk in de Blueprint stonden:

- [ADR 0001 — Buy Box-weging is configureerbaar, geen vaste percentages](../../04-decisions/0001-buy-box-weighting-configurable.md)
- [ADR 0002 — Verified™-drempel is configureerbaar, geen vaste minimale score](../../04-decisions/0002-verified-threshold-configurable.md)
- [ADR 0003 — Sponsored Products voorbereid in architectuur, buiten MVP-scope](../../04-decisions/0003-sponsored-products-post-mvp.md)
- [ADR 0004 — Buy Box-tiebreaker-volgorde](../../04-decisions/0004-buy-box-tiebreaker-order.md)

## Relatie met andere mappen

- Bouwt voort op [`01-architecture/standard-vs-custom.md`](../../01-architecture/standard-vs-custom.md) (de reden waarom dit domein het grootste maatwerk-onderdeel van EuropMade is).
- Verdiept de scherminventarisatie uit [`02-ux/ux-architecture.md`](../../02-ux/ux-architecture.md) (sectie 5.5) voor de Product Cloud/Commerce Cloud/Buy Box-schermen.
- Eerstvolgende stap: wireframes in [`02-ux/wireframes/`](../../02-ux/wireframes/README.md), te beginnen bij de productpagina/Buy Box en de checkout met order-splitsing.
