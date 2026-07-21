# Productpagina — Product Content-sectie

**Status:** Definitief (v1.1). Gerichte, PO-geautoriseerde uitzondering op de bevriezing van de Productpagina.

## Inhoud

- [`spec.md`](./spec.md) — architectuuranalyse (hoe een professionele marketplace-productpagina logisch is opgebouwd), de bijgewerkte content-architectuur, vijf nieuwe secties volledig gespecificeerd (Korte introductie, Productomschrijving, Geschikt voor, tab Omschrijving, Veelgestelde vragen), een controle tegen SEO/AI Search/CRO/Europese producenten/Product Cloud, en de wireframe-wijzigingen.

## Aanleiding

Product Owner-review: de Productpagina (v1.0) toonde kenmerken/badges maar geen volwaardige productomschrijving — een gat voor SEO, AI Search, conversie, vertrouwen en Product Cloud-benutting.

## Nadrukkelijk ongewijzigd

Buy Box, aanbiederstabel, Checkout, Product Cloud (brondocument), Commerce Cloud. Uitsluitend de contentlaag van de Productpagina is aangepast.

## Belangrijkste besluiten

- Volledige productomschrijving staat **altijd zichtbaar** direct na de aanbiederstabel — niet uitsluitend achter een tab-klik (SEO/AI Search-reden).
- Tab "Omschrijving" is een **ankerlink** naar die al zichtbare sectie, geen dubbele content.
- Veelgestelde vragen zijn **altijd volledig zichtbaar** (geen accordion) — bewuste keuze om geen nieuw Design System-component nodig te hebben én om SEO/AI Search-extractie te optimaliseren.
- **Geen nieuwe Design System-componenten nodig** — alle vijf secties hergebruiken bestaande typografie-/lijstpatronen.
- Introductie, omschrijving en "Geschikt voor" putten volledig uit het al bestaande `omschrijving`-veld in Product Cloud (functionele spec sectie 1.2) — geen datamodelwijziging. FAQ vereist een klein, nog niet uitgewerkt nieuw contentveld (benoemd, niet gespecificeerd — het Product Cloud-brondocument blijft ongewijzigd).

## Relatie met andere mappen

- Wireframes bijgewerkt: [`02-ux/wireframes/sprint-1a/`](../../02-ux/wireframes/sprint-1a/README.md) — `01-productpagina-buybox-desktop.html`, `-tablet.html`, `-mobile.html`, alle drie nu v1.1.
- Sluit Sprint 1A definitief af — zie [`06-development/project-status-and-roadmap.md`](../../06-development/project-status-and-roadmap.md).
