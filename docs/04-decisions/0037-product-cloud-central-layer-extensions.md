# ADR-0037 — Product Cloud-uitbreiding: slug, attributen-metadata, vertalingen, documenten, relaties

**Status:** Geaccepteerd  
**Datum:** 2026-08-10  
**Domein:** Product Cloud (Deel B-uitbreiding naast bevroren `02-database-model.md`)

## Context

De Product Cloud-module (ADR-0008) dekt de kern van Deel B, maar mist voor de centrale productlaag:

1. **B.15 `document`** en **B.16 `translation`** (nog niet geïmplementeerd).
2. Een **stabiele category-`slug`** voor latere storefront-koppeling (`/categorie/[slug]`) zonder de frontend nu te wijzigen.
3. **Attribuut-metadata** (`code`, filter/compare-flags, unit, opties) zodat filters, koopgidsen en toplijsten later op echte Product Cloud-data kunnen leunen i.p.v. hardcoded teksten.
4. **Vertaalstatusvelden** (bronwaarde, status, versie) die Blueprint B.16 structureel open liet.
5. Lichte **productrelaties** en **use-case tags** als voorbereiding op “vaak samen gekocht” / toplijst-persona’s — zonder ranking-engine.

Dit mag Deel B niet tegenspreken; het vult open/ontbrekende stukken aan.

## Beslissing

1. Voeg `pc_document` toe conform B.15 (`document_type`, `storage_reference`, soft refs naar `product_version_id` en optioneel `distributor_authorization_id`).
2. Voeg `pc_translation` toe conform B.16 polymorf model, plus:
   - `source_language_code`, `source_value`
   - `translation_status` (`Ontbreekt` | `Concept` | `Machine` | `Beoordeeld` | `Gepubliceerd`)
   - `translation_version` (number)
3. Voeg `slug` (uniek, nullable→later verplicht bij seed) toe aan `pc_category`.
4. Breid `attribute_definition` uit met: `code`, `unit`, `is_filterable`, `is_comparable`, `sort_order`, `option_values` (JSON-tekst voor Keuzelijst).
5. Voeg `pc_product_relation` toe: `from_product_id`, `to_product_id`, `relation_type` (`Vergelijkbaar` | `Accessoire` | `Gerelateerd` | `VaakSamenGekocht` | `Alternatief`).
6. Voeg optioneel `use_case_tags` (JSON-tekst) toe aan `product_version` voor latere toplijst/persona-signalen (geen ranking-logica).
7. Exporteer gedeelde DTO’s in `@europmade/types` (Product Cloud-surface only).
8. Geen wijzigingen aan homepage, categorie-UI, PDP, checkout, Commerce Cloud Offer-koppeling (blijft `identifier_id`).

## Consequenties

- Storefront kan later `slug` + attribute `code` gebruiken zonder datamodel-omweg.
- Vertalingen en documenten zijn persisteerbaar zonder AI-vertaalservice of CMS-rebuild.
- Ranking/AI-content blijft buiten scope; alleen datastructuur.

## Referentie

- [`08-technical-blueprint/02-database-model.md`](../08-technical-blueprint/02-database-model.md) B.6, B.8, B.15, B.16
- [`04-decisions/0008-product-cloud-custom-deel-b-tables.md`](./0008-product-cloud-custom-deel-b-tables.md)
- [`03-functional-specs/product-cloud-architecture/spec.md`](../03-functional-specs/product-cloud-architecture/spec.md)
