# Checkout

**Status:** Definitief (v1.0)

## Inhoud

- [`spec.md`](./spec.md) — volledige UX-specificatie: architecturale grondbeslissing (één betaling, server-side ordersplitsing per aanbieder), flow-overzicht, en per stap (Stap 0: gast/account, Stap 1: verzending + besteloverzicht, Stap 2: betaling, Stap 3: controle & bevestigen) doel, gebruikersverhaal, desktop/tablet/mobiel, componenten, interacties, validaties, foutmeldingen, edge cases, API-afhankelijkheden, Medusa-standaard vs. maatwerk, en acceptatiecriteria. Inclusief interne UX-review (vóór oplevering verwerkt) en consistentiecontrole tegen Blueprint/UX-architectuur/Product Cloud/Commerce Cloud/ADR's/Wireframe Strategy.

## Gerelateerde beslissingen

- [ADR 0005](../../../04-decisions/0005-buy-box-server-side-only.md) — server-side-only-eis, hier uitgebreid toegepast op de volledige order-plaatsing en -splitsing (niet alleen de Buy Box-weergave op de Productpagina).

## Relatie met andere mappen

- Wireframes (Desktop/Tablet/Mobiel, Stap 0/1/3): [`02-ux/wireframes/sprint-1a/`](../../02-ux/wireframes/sprint-1a/README.md) — bestanden `02-checkout-desktop.html`, `-tablet.html`, `-mobile.html`.
- Bouwt voort op de bevroren Productpagina + Buy Box (`02-ux/wireframes/sprint-1a/01-productpagina-buybox-*.html`) — Checkout begint waar die eindigt (gevulde winkelwagen).
- Volgende stap in Sprint 1A: Homepage, Zoekresultaten, Categoriepagina.
