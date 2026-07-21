# Homepage

**Status:** Definitief (v1.0)

## Inhoud

- [`spec.md`](./spec.md) — commerciële strategie en volledige sectiespecificatie: per sectie doel, commerciële waarde, UX-waarde, SEO-waarde, KPI's, gebruikte Component ID's, Medusa-vs-maatwerk, advertentiemogelijkheden en conversiebijdrage. Inclusief interne UX-/CRO-/Marketplace-review, twee nieuwe Design System-componenten (CMP-032 Category Tile, CMP-033 Advertisement Banner Slot), een consistentiecontrole, een **sectiedoelclassificatie** (welke sectie primair conversie/advertentie-inkomsten/SEO/vertrouwen/merkpositionering dient) en een **lange-termijn schaalbaarheidsparagraaf** (MVP → miljoenen bezoekers: caching, Core Web Vitals, SEO op schaal, advertenties op schaal, catalogusschaal, internationalisering, A/B-testbaarheid).

## Wireframes

Desktop/Tablet/Mobiel: [`02-ux/wireframes/sprint-1a/03-homepage-desktop.html`](../../02-ux/wireframes/sprint-1a/03-homepage-desktop.html), `-tablet.html`, `-mobile.html`.

## Belangrijkste besluiten

- Sectievolgorde lost de spanning tussen advertentie-inkomsten en conversie bewust op: geen advertentie vóór Categorieën + Uitgelichte producten.
- "Uitgelichte producten" en "Uitgelichte retailers" zijn nooit gesponsord — zelfde neutraliteitsprincipe als de Buy Box (functionele spec Product Cloud/Commerce Cloud/Buy Box, sectie 3.0).
- Uitgelichte retailers roteren verplicht — voorkomt permanente bevoordeling van dezelfde partners.
- Advertentieslots (CMP-033) hebben een verplichte, niet-lege fallback-staat en krijgen `rel="sponsored"` op links.
- Precies één `<h1>` (Hero) voor SEO-structuur; overige sectiekoppen zijn `<h2>`.
