# ADR 0003 — Sponsored Products voorbereid in architectuur, buiten MVP-scope

**Status:** Geaccepteerd
**Datum:** Vastgesteld tijdens Stap 4 (UX & Product Design), verdiepingsfase Product Cloud/Commerce Cloud/Buy Box.
**Domein:** Buy Box, MVP-scope, Advertentieplatform

## Context

De Blueprint beschrijft in H5.6, H9.10 en H14.8–14.9 uitsluitend een **bannerplatform** (vaste posities: Hero Banner, Homepage Sliders, categorie-Sliders, verkocht per land/positie/week). Het concept **"Sponsored Products"** — betaalde promotie van individuele productvermeldingen binnen zoekresultaten/categorieën — komt in de Blueprint niet voor, maar is tijdens de UX-verdieping als aandachtspunt naar voren gekomen.

## Beslissing

Sponsored Products wordt **voorbereid in de architectuur** (datamodel en de scheiding met de Buy Box houden er al rekening mee), maar maakt **geen onderdeel uit van de MVP-functionaliteit**. De MVP gebruikt uitsluitend het bannerplatform zoals beschreven in de Blueprint.

Indien Sponsored Products in een latere fase wordt gebouwd, gelden vooraf de volgende, met het Buy Box-vertrouwensprincipe consistente regels:

1. Sponsored Products beïnvloeden nooit de Buy Box-winnaar op de productpagina.
2. Uitsluitend een plaatsingsmechanisme binnen zoekresultaten/categorieoverzichten, nooit een wijziging van de winnaar op een productpagina.
3. Elke plaatsing wordt altijd duidelijk gelabeld ("Gesponsord"/"Advertentie").
4. Gelijke toegang voor alle partners, zelfstandig boekbaar, geen voorkeur voor "eigen" producten (die bestaan niet, H5.12).
5. Een eventuele herinvesteringslogica (vergelijkbaar met H5.8 voor banners) vereist een aparte uitbreiding van het verdienmodel (H5.6) en het financieel model — dit wordt niet stilzwijgend aan de MVP-scope toegevoegd.

## Consequenties

- Geen ontwikkeltijd in de MVP-planning (2–3 maanden, H15.7) voor Sponsored Products.
- Het datamodel voor productplaatsing in zoekresultaten wordt zo ontworpen dat een toekomstige Sponsored-laag kan worden toegevoegd zonder herontwerp van de Buy Box-engine.
- Het financieel model v1.0 wordt op dit punt **niet** aangepast; Sponsored Products blijft, net als Premium Abonnementen, een voorbereide maar niet in de MVP-financiën opgenomen inkomstenbron (consistent met H5.6). **Correctie-aantekening (na de definitieve Affiliate-scopewijziging):** Affiliate-commissie hoort **niet langer** in dit rijtje thuis — die is per latere projectbeslissing een actieve MVP-inkomstenpost geworden (zie `00-context/blueprint-reference.md`). Deze ADR zelf (Sponsored Products binnen Buy Box, post-MVP) is door die wijziging niet geraakt en blijft ongewijzigd van kracht.

## Referentie

Volledige uitwerking: [`03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md`](../03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md), sectie 3.5.
