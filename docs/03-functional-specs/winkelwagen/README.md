# Winkelwagen

**Status:** v1.0 — definitief, klaar voor bevriezing.

## Inhoud

- [`spec.md`](./spec.md) — architectuuranalyse (afhankelijkheden met Productpagina/Buy Box, Checkout, Product Cloud, Commerce Cloud), componentinventarisatie, één nieuw component (CMP-039, vooraf vastgelegd in het Design System), volledige UX-specificatie, **Guest Cart Merge** (sectie 5A) en **prijs-/voorraadwijzigingen tijdens het winkelen** (sectie 5B), en een consistentiecontrole.

## Belangrijkste architecturale vaststellingen

- Een winkelwagenregel is gebonden aan een specifieke Offer, niet aan "de huidige Buy Box-winnaar" — voorkomt een stille aanbiederwissel tussen toevoegen en afrekenen.
- Hergebruikt CMP-025 (Besteloverzicht/Order Summary) als kernweergave — geen nieuw lijst-component.
- Eén nieuw component: CMP-039 (Quantity Stepper) — enige aantoonbaar noodzakelijke toevoeging.
- Variant-wijziging vanuit dit scherm is bewust buiten de MVP-scope gehouden.
- **Guest Cart Merge:** identieke Offer → aantallen samenvoegen (voorraad-geclipt); zelfde product/andere Offer → apart; niet-beschikbare Offers → gemarkeerd met alternatief; uitsluitend server-side, maatwerk op de Medusa Workflow-engine.
- **Prijs-/voorraadwijzigingen:** prijs nooit vastgezet vóór orderplaatsing; prijsverhoging (`notice--warning`, neutraal) vs. -verlaging (`notice--info`, positief) visueel onderscheiden; uitverkocht blokkeert checkout zonder de regel te verwijderen; een verdwenen Offer kan direct binnen de Winkelwagen vervangen worden door een geldig alternatief.

## Openstaande punten

1. Variant-wijziging vanuit de Winkelwagen — bewuste, gemotiveerde MVP-scopebeperking, geen tekortkoming.

## Relatie met andere mappen

- Wireframes (ongewijzigd door deze aanvulling): [`02-ux/wireframes/sprint-1b/`](../../02-ux/wireframes/sprint-1b/README.md).
- Bouwt voort op [`checkout/`](../checkout/README.md) (CMP-025, validatieservice) en [`product-cloud-commerce-cloud-buy-box/`](../product-cloud-commerce-cloud-buy-box/README.md) (Offer-model, Buy Box).

