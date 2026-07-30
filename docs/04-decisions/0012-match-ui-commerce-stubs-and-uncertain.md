# ADR-0012 — Match-UI stubs: Commerce Cloud en uncertain zonder P0-wireframe

## Status

Geaccepteerd

## Context

Wireframe `product-02` (Match gevonden) toont prijs-/voorraadvelden en “Aanbod aanmaken”. Dat is Commerce Cloud / Offer (EPIC-04, S3-03-06), nog niet beschikbaar.

API-outcome `uncertain` (ADR-0007 / MatchCandidate) heeft geen Sprint 3 P0-wireframe, terwijl S3-03-05 eist dat AI-matchbetrouwbaarheid zichtbaar is en nooit doorslaggevend.

“Nieuw product aanmaken” landt op product-04 (S3-03-06), buiten deze batch.

## Beslissing

1. **Exact match (product-02):** UI toont gevonden Product Cloud-gegevens + AI-box (“EAN-match: 100% zekerheid”, deterministisch). Prijs/voorraad + “Aanbod aanmaken” staan in de UI conform wireframe maar zijn **niet functioneel** (disabled + notice) tot Commerce Cloud.
2. **Geen match (product-03):** Conform wireframe; CTA “Nieuw product aanmaken” navigeert naar een stub-route tot S3-03-06.
3. **Uncertain:** Geen P0-wireframe → apart advisory-scherm met zichtbare betrouwbaarheid &lt; 100%, tekst dat AI alleen ondersteunt; mens kiest “Opnieuw zoeken” of “Nieuw product aanmaken”. Geen auto-koppeling.

## Consequenties

- Geen Offer-/Inventory-/Price-persistatie in S3-03-05.
- S3-03-06 activeert nieuw-productformulier; EPIC-04 activeert “Aanbod aanmaken”.
