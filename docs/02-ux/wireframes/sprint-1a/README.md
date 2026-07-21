# Sprint 1A — Marketplace Core (wireframes)

**Status: ✅ DEFINITIEF AFGESLOTEN**, met een tweede PO-geautoriseerde gerichte revisie (Productpagina/Buy Box → v1.2, Marketplace Listing → v1.1).

> ❄ **Bevroren:** Productpagina + Buy Box (**v1.2**), Checkout (v1.0), Homepage (v1.0) en Marketplace Listing (**v1.3**) zijn definitief. Wijzigingen uitsluitend bij aantoonbare inconsistentie met de Blueprint/ADR, of een expliciete PO-geautoriseerde, gerichte uitzondering (zoals deze revisies).
>
> **Design System v1.0:** 38 componenten (CMP-001–CMP-038), ongewijzigd in aantal sinds de laatste revisie — zie [`07-design-system/components.md`](../../07-design-system/components.md).

## Bestanden

| Bestand | Status | Inhoud |
|---|---|---|
| `00-design-system-foundation.html` | v0.2 | Grijswaarden-kit: type/spacing/grid, universele atomen, domeinspecifieke componenten |
| `01-productpagina-buybox-desktop.html` / `-tablet.html` / `-mobile.html` | **v1.2, bevroren** | Productvarianten, Past goed bij, Omschrijving/Geschikt voor als tabs, EU-eigendom, geverifieerde-aankoop-reviews, Meer tonen/uitklappen, top-3 aanbieders, swipebare tabs op mobiel |
| `review-01-productpagina-buybox.md` / `signoff-01-productpagina-buybox-v1.0.md` | Afgerond | UX-review en verwerking (v1.0-ronde) |
| `02-checkout-desktop.html` / `-tablet.html` / `-mobile.html` | **v1.0, bevroren** | Checkout — Stap 0/1/3, drie breakpoints |
| `03-homepage-desktop.html` / `-tablet.html` / `-mobile.html` | **v1.0, bevroren** | Homepage — 11 secties, drie breakpoints |
| `04-marketplace-listing-desktop.html` / `-tablet.html` / `-mobile.html` | **v1.3, bevroren** | Korting/sterren/kenmerken/directe koopknop; grote paginagrootte voor een volwassen-marketplace-gevoel: Desktop 30 producten (5×6-grid), Tablet 27 producten (3×9-grid), Mobiel ongewijzigd (20, verticale lijst) — canonieke 1:1-fotoratio op alle breakpoints |

Volledige UX-specificaties: [`03-functional-specs/checkout/spec.md`](../../03-functional-specs/checkout/README.md), [`03-functional-specs/homepage/spec.md`](../../03-functional-specs/homepage/README.md), [`03-functional-specs/marketplace-listing/spec.md`](../../03-functional-specs/marketplace-listing/README.md), [`03-functional-specs/product-content/spec.md`](../../03-functional-specs/product-content/README.md).

## Belangrijkste besluiten uit de paginagrootte-revisie (derde Marketplace Listing-ronde)

- Desktop: grid-stijl behouden (5 kolommen i.p.v. 4, om 30 producten in exact 6 rijen te tonen zonder rommelige laatste rij).
- Tablet: grid-stijl behouden (3 kolommen, uitgebreid naar 9 rijen = 27 producten).
- Mobiel: bewust **niet aangeraakt** — al goedgekeurd in de vorige ronde.
- Alle eerdere verbeteringen (grote foto's, gelijke 1:1-ratio, reviewsterren, kortinglabels, kenmerken, directe koopknop, gelijke kaarthoogtes via CSS Grid-stretch) intact — uitsluitend de hoeveelheid zichtbare producten per pagina is vergroot, geen componenten gewijzigd.

## Belangrijkste besluiten uit de gerichte revisie (Productpagina + Marketplace Listing)

- **Twee nieuwe componenten:** CMP-037 (Variant Selector) en CMP-038 (Expandable Text/Show More, hergebruikt voor zowel tekst als de aanbiederstabel — bewust één component in plaats van twee).
- **EU-eigendom** toegevoegd als nieuw badge-veld bij producentinformatie — **staat niet in de Blueprint**, expliciet gevonden bij de consistentiecontrole; opgenomen op PO-instructie, met aanbeveling om dit alsnog in de Blueprint (H7.7/H13) te formaliseren.
- **Omschrijving/Geschikt voor** verplaatst van altijd-zichtbare secties naar tabs — een bewuste ombuiging van de eerdere SEO/AI Search-redenering (Product Content-spec v1.1); zie de aanbevelingen hieronder voor de afweging.
- Variant-wissel en aanbiederwissel volgen beide ADR 0005 (server-side-only) — geen uitzondering voor varianten.
- "In winkelwagen" op de Product Card (Marketplace Listing) gebruikt altijd de servergevalideerde Buy Box-uitkomst — geen client-side aanname.
- Buy Box-logica, Product Cloud- en Commerce Cloud-datamodellen: **ongewijzigd**.

## Belangrijkste besluiten uit eerdere stappen (ter herinnering)

- Eén betaaltransactie voor de volledige winkelwagen; server-side ordersplitsing in aparte orders per aanbieder ná bevestigde betaling (ADR 0005).
- Buy Box-label is neutraal, geen "Buy Box"-jargon of suggestieve taal zichtbaar voor de klant (F10/F11).
- Verified™ is uitsluitend een producteigenschap, nooit een eigenschap van een specifieke aanbieder (F12).
- "Uitgelichte producten"/"Uitgelichte retailers" op de Homepage zijn nooit gesponsord — Buy Box-neutraliteitsprincipe hergebruikt.
- Elk kernscherm wordt vanaf de Productpagina in Desktop, Tablet én Mobiel uitgewerkt (F14-beleid).
- Customer Journey Audit: prijsweergave op Homepage gecorrigeerd naar de "Vanaf"-regel; minimumvereisten voor Orderbevestiging (Sprint 1B) vastgelegd.
