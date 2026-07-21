# ADR 0004 — Buy Box-tiebreaker-volgorde bij exact gelijke score

**Status:** Geaccepteerd
**Datum:** Vastgesteld tijdens Stap 4 (UX & Product Design), verdiepingsfase Product Cloud/Commerce Cloud/Buy Box.
**Domein:** Buy Box

## Context

De Blueprint beschrijft de Buy Box-criteria (H8.5) maar behandelt niet het scenario waarin meerdere aanbieders exact gelijk scoren. Zonder een vastgelegde tiebreaker-regel zou dit tot willekeurige of onvoorspelbare uitkomsten kunnen leiden, wat het eerlijkheidsprincipe van H8.5 zou ondermijnen.

## Beslissing

Bij een exact gelijke Buy Box-score geldt de volgende vaste volgorde:

1. **Hoogste Performance Score** (H8.10) — objectieve, reeds bestaande betrouwbaarheidsmaatstaf.
2. **Langste positieve prestaties op EuropMade** — bewezen trackrecord, niet enkel kale anciënniteit.
3. **Willekeurige eerlijke rotatie** — als ook dit gelijk is, wisselt de Buy Box via een eerlijk rotatiemechanisme tussen de gelijk scorende aanbieders, zodat geen enkele aanbieder structureel wordt bevoordeeld of benadeeld.

## Consequenties

- Voor de klant blijft dit onzichtbaar: er is altijd precies één Buy Box-winnaar zichtbaar; de rotatielogica speelt zich volledig server-side af.
- Sluit aan bij het ontwerpprincipe "de Buy Box dient altijd het belang van de klant" (`spec.md`, sectie 3.0): geen van de drie tiebreakers introduceert platformbelang, advertenties of commissies als factor.
- Relevant voor de technische spike die de Buy Box-engine valideert vóór de wireframe-fase (zie `01-architecture/standard-vs-custom.md`).

## Referentie

Volledige uitwerking: [`03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md), sectie 3.6.
