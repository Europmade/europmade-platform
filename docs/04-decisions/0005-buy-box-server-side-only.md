# ADR 0005 — Buy Box wordt uitsluitend server-side berekend

**Status:** Geaccepteerd
**Datum:** Vastgesteld naar aanleiding van de UX Design Review op de Productpagina + Buy Box-wireframe (bevinding F24).
**Domein:** Buy Box, technische architectuur

## Context

De Productpagina/Buy Box-wireframe suggereerde dat het wisselen van aanbieder in de "alle aanbieders"-tabel de Buy Box direct, lokaal bijwerkt. Bij UX-review (F24) is vastgesteld dat dit een architecturaal risico is: als de Buy Box-score(berekening) (mede) client-side zou plaatsvinden, kan de uitkomst gemanipuleerd of omzeild worden, en kan de weergegeven "winnaar" gaan afwijken van de daadwerkelijke, serverzijdig vastgestelde uitkomst — een directe schending van het ontwerpprincipe "de Buy Box dient altijd het belang van de klant" (functionele spec, sectie 3.0), dat vereist dat de uitkomst altijd correct en niet-manipuleerbaar is.

## Beslissing

De Buy Box-scoreberekening en -selectie vinden **uitsluitend server-side** plaats, in een custom Medusa-module (zie `01-architecture/standard-vs-custom.md`). De Next.js-frontend (storefront) ontvangt van de server altijd een reeds bepaalde uitkomst (welke Offer wint, in welke volgorde de overige Offers getoond worden) en voert zelf **geen** scoreberekening, weging of sortering op basis van Buy Box-criteria uit.

Concreet:

1. Bij het laden van de Productpagina levert de server de Buy Box-winnaar en de gesorteerde aanbiederslijst kant-en-klaar aan (bijv. via server-side rendering of een server-component-fetch in Next.js).
2. Wanneer een klant in de "alle aanbieders"-lijst een andere aanbieding kiest om te bekijken/kopen, gaat dit via een serverzijdig gevalideerde request (API-route of Server Action) — nooit via lokale (client-side) herberekening van de Buy Box-logica.
3. De eerder in de wireframe-interactienotitie gebruikte formulering "client-side, geen page reload" is onjuist gebleken en wordt vervangen door: "geen volledige pagina-herlaad, wél een serverzijdig gevalideerde call" — het onderscheid zit in de afwezigheid van een full page reload, niet in de afwezigheid van een serverroundtrip.
4. Dezelfde regel geldt voor de order-splitsing bij checkout (UX-architectuur, ADR-achtergrond in de functionele spec): welke aanbieder per productregel in de order komt, wordt serverzijdig vastgesteld en gevalideerd vóór de order daadwerkelijk wordt geplaatst — een client mag nooit alleen op basis van eigen state bepalen welke aanbieder wordt afgerekend.

## Consequenties

- Elke aanbiederwissel op de Productpagina is een nieuwe, serverzijdig gevalideerde requestronde (geen client-side herberekening van Buy Box-criteria).
- Dit bevestigt en verscherpt het bestaande technische aandachtspunt uit de UX-architectuur (voorstel 9: valideer de order-splitsing als technische spike vóór wireframes definitief worden) — die spike moet nu expliciet ook de server-side-only-eis voor Buy Box-berekening toetsen.
- Geen wijziging aan de klant-zichtbare UX: het gedrag ("geen page reload bij aanbiederwissel") blijft hetzelfde, alleen de onderliggende implementatie-eis is nu vastgelegd.
- Wireframe-interactienotities die "client-side" vermelden bij Buy Box-gerelateerd gedrag worden gecontroleerd en gecorrigeerd (zie sign-off-document bij de Productpagina-wireframe).
- **Uitbreiding bij de Checkout-uitwerking:** dezelfde eis geldt voor de volledige orderplaatsing — de omzetting van "één betaalde winkelwagen" naar "N orders, één per aanbieder" gebeurt uitsluitend server-side, ná bevestigde betaling, met een laatste server-side revalidatie vlak vóór het plaatsen (zie `03-functional-specs/checkout/spec.md`, sectie 0 en 6). Dit was in de oorspronkelijke ADR al impliciet bedoeld (punt 4 hierboven) en is bij de Checkout-specificatie expliciet uitgewerkt, niet gewijzigd.

## Referentie

Functionele basis: [`03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md), sectie 3.0 en 3.1.
Wireframe-context: [`02-ux/wireframes/sprint-1a/`](../02-ux/wireframes/sprint-1a/README.md).
