# Marketplace Core — Retailer Created End-to-End Flow

**Status:** Definitief. Functionele waarheid voor de gehele Marketplace Core, basis voor Sprint 1B.

## Inhoud

- [`spec.md`](./spec.md) — de volledige levenscyclus van een nieuw product vanaf "Nieuw product toevoegen" tot volledig actief op de marketplace: EAN-controle, nieuw Product Cloud-record, nieuwe Commerce Cloud-Offer, Buy Box-initialisatie, publicatie, claimproces, wijzigingsvoorstel-afhandeling, AI-validaties, Verified™-controle, Administrator-interventies, foutscenario's, edge cases, acceptatiecriteria, Medusa-standaard-vs-maatwerk, database-objecten, API's, achtergrondprocessen, meldingen, audit logging, security, rechten per rol, en één volledige end-to-end flow. Uitsluitend functionele architectuur — geen wireframes, geen HTML.

## Belangrijkste vastgelegde regels

- Buy Box-berekening kent **geen speciaal geval voor één aanbieder** — altijd hetzelfde codepad als bij meerdere aanbieders.
- Meerdere retailers kunnen gelijktijdig een niet-geclaimd Retailer Created-product verkopen.
- Verified™ is **architecturaal geblokkeerd** voor een product zolang het niet geclaimd is door een producent.
- Race conditions bij gelijktijdige aanmaak van dezelfde nieuwe EAN worden opgelost door de eerste succesvolle aanmaak te laten winnen; de tweede wordt omgeleid naar "voeg een aanbod toe".

## Openstaande beslissingen (blokkeren Sprint 1B-wireframes niet)

1. Verificatiemethode voor producent-/merkhouderclaims.
2. Synchrone vs. asynchrone AI-validatie + fallback-tijdslimiet.
3. Productstatus bij nul actieve aanbieders.
4. Minimale verplichte veldenlijst vóór publicatie (contentbeslissing).

## Relatie met andere mappen

- Bouwt voort op de functionele spec [`product-cloud-commerce-cloud-buy-box/`](../product-cloud-commerce-cloud-buy-box/README.md) (consolideert en maakt secties 1.6–1.10 operationeel) en op [`06-development/sprint-1b-architecture-risk-assessment.md`](../../06-development/sprint-1b-architecture-risk-assessment.md) (onderbouwt het eindadvies verder).
- Eerstvolgende wireframes (nog te bouwen, niet in dit document): schermen #34, #35/#31, #39, #37/#38 — in die volgorde.
