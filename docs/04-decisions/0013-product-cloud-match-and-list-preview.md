# ADR-0013 — Product Cloud-preview op EAN-match en cataloguslijst

## Status

Geaccepteerd

## Context

Seller Match-UI en Productoverzicht (#31) hebben titel/categorie/identifier nodig. `GET /store/product-cloud/products` gaf alleen Product-rijen zonder version-titel. `GET .../products/:id` voor niet-eigenaren liet `versions` leeg — te mager voor EAN-matchweergave van een bestaand Product Cloud-record.

## Beslissing

1. `POST /store/product-cloud/ean-match` verrijkt de workflow-resultaat met optionele `product_preview` (exact) en/of `candidate_previews` (uncertain): publieke Product Cloud-weergavevelden (`title`, `brand_id`, `manufacturer_id`, `lifecycle_status`, `category_names`, identifier) — geen ownership-/concept-details van derden.
2. `GET /store/product-cloud/products` (eigen catalogus) verrijkt elke rij met `title` (voorkeur: gepubliceerde versie, anders hoogste concept) en primaire identifier indien aanwezig.

Geen cross-module FK’s; uitsluitend reads binnen de Product Cloud-module.

## Consequenties

- UI hoeft geen N+1 detail-GETs voor overzicht/match-preview.
- Volledige eigenaar-detail-API blijft ongewijzigd voor beheerflows.
