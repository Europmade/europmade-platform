# ADR 0009 — ChangeProposal-entiteit voor de bevroren Wijzigingsvoorstel-API

**Status:** Geaccepteerd
**Datum:** 2026-07-30
**Domein:** Product Cloud, Product Management

## Context

De bevroren **Wijzigingsvoorstel-API** is genoemd in `marketplace-core/spec.md` §19–20 (`ChangeProposal`) en in `product-management/spec.md` (secties 2/4/9/10). Ticket **S3-03-04** eist die workflow. `02-database-model.md` Deel B bevat echter **geen** `change_proposal`-tabel. B-PM3 stelt dat de conflictregel **geen nieuwe entiteit** toevoegt bovenop Concept + wijzigingsvoorstel — het wijzigingsvoorstel zelf is dus al als bestaand mechanisme aangenomen, maar ontbreekt structureel in Deel B.

## Beslissing

1. Voeg tabel **`change_proposal`** toe aan de Product Cloud-module (custom, ADR-0008-patroon).
2. Velden (minimaal voor de bevroren API):
   - `id`, `product_id`, `submitter_seller_id`
   - `proposed_title` / `proposed_description` (nullable — voorgestelde veldwijzigingen)
   - `toelichting` (verplicht)
   - `status`: `In behandeling` / `Goedgekeurd` / `Afgewezen`
   - `decision_reason` (verplicht bij afwijzing)
   - `decided_by_seller_id`, `decided_at` (nullable)
3. Acceptatie volgt product-management §4 B-PM3: bij bestaand actief Concept → merge in dat Concept; anders → nieuw Concept.
4. Dit is **geen** nieuwe businesscapaciteit — uitsluitend de ontbrekende persistentie voor een al bevroren API.

## Consequenties

- S3-03-04 kan de Wijzigingsvoorstel-workflow implementeren zonder Deel B stilzwijgend te negeren.
- Latere migratie/hernummering in `02-database-model.md` blijft documentatiewerk; de ADR is bindend tot die update.

## Referentie

- [`03-functional-specs/marketplace-core/spec.md`](../03-functional-specs/marketplace-core/spec.md) §10, §19–20
- [`03-functional-specs/product-management/spec.md`](../03-functional-specs/product-management/spec.md) §2, §4 (B-PM3), §9
- [`10-implementation/Sprint-3-Tickets.md`](../10-implementation/Sprint-3-Tickets.md) S3-03-04
