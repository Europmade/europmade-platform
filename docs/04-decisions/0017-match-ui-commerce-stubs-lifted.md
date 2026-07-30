# ADR-0017 — Match-UI Commerce-stubs opgeheven door S3-03-06 / Offer-CRUD

## Status

Geaccepteerd (vervangt de stub-delen van ADR-0012)

## Context

ADR-0012 zette prijs/voorraad en “Aanbod aanmaken” uit tot Commerce Cloud, en “Nieuw product” tot S3-03-06. Deze batch levert S3-04-01 + minimale Offer-CRUD (ADR-0014) en S3-03-06 (product-04/05).

## Beslissing

1. Exact-match CTA **Aanbod aanmaken** navigeert naar product-05 (`/seller/products/offer?identifier_id=…`) en is functioneel.
2. Product-04 (Retailer Created) is een werkend concept-formulier (ADR-0016).
3. Uncertain-advies-UI uit ADR-0012 blijft ongewijzigd (geen P0-wireframe).

## Consequenties

- ADR-0012 blijft historisch relevant voor uncertain; Commerce-stubs daarin zijn achterhaald.
- Buy Box-positie blijft placeholder (ADR-0014).
