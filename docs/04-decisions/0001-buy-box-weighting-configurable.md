# ADR 0001 — Buy Box-weging is configureerbaar, geen vaste percentages

**Status:** Geaccepteerd
**Datum:** Vastgesteld tijdens Stap 4 (UX & Product Design), verdiepingsfase Product Cloud/Commerce Cloud/Buy Box.
**Domein:** Buy Box

## Context

Blueprint H8.5 stelt dat de Buy Box wordt bepaald op basis van "prijs, levertijd, klantwaardering, voorraad, betrouwbaarheid en retourprestaties" via een "transparant algoritme", en dat "de exacte weging openbaar wordt beschreven, zodat partners weten waarop zij kunnen sturen." De Blueprint legt echter **geen exacte percentages** vast.

## Beslissing

Er worden geen vaste wegingspercentages vastgelegd in de Blueprint of in de functionele documentatie. In plaats daarvan wordt de **relatieve prioriteit** van de factoren vastgelegd (prijs hoogste prioriteit, gevolgd door levertijd en klantwaardering, dan voorraad, dan Performance Score, dan retourprestaties als laagste prioriteit). De exacte weging (percentages) wordt een **configureerbare instelling** binnen de Administrator-omgeving.

## Consequenties

- De Administrator kan de weging aanpassen zonder een nieuwe releasecyclus van de applicatie.
- Elke wijziging van de weging wordt gelogd in de audittrail (Blueprint H13.11).
- De **actuele** configuratie wordt te allen tijde openbaar en actueel gepubliceerd richting partners (borgt H8.5), inclusief een real-time Buy Box-positie-indicator in het Partnerdashboard.
- De configuratie is begrensd door [ADR-onafhankelijk ontwerpprincipe: "de Buy Box dient altijd het belang van de klant"] (vastgelegd in `03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`, sectie 3.0): advertenties, commissies en platformbelang mogen nooit als configureerbare factor worden toegevoegd.
- Technisch: de weging wordt als parameter opgeslagen (niet hardgecodeerd) in de Buy Box-berekeningslogica — relevant voor de technische spike die de order-splitsing/Buy Box-engine valideert (zie `01-architecture/standard-vs-custom.md`).

## Referentie

Volledige uitwerking: [`03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md), sectie 3.1.
