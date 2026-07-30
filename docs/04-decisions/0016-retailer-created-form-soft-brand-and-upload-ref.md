# ADR-0016 — Retailer Created-formulier: vrije merktekst en media-referentie

## Status

Geaccepteerd

## Context

Wireframe product-04 heeft “Merk” als vrije tekst en een eenvoudige upload-UI. Product Cloud create-API vereist `brand_id` / `manufacturer_id` (soft refs) en `storage_reference` voor media. Er is nog geen Brand-beheer-UI of object-storage-upload in MVP.

## Beslissing

1. Merknaam uit het formulier wordt als `brand_id` (trimmed tekst) opgeslagen; `manufacturer_id` krijgt dezelfde waarde tot Brand/Manufacturer-UI bestaat.
2. Ontbrekende beschrijving op het wireframe → server gebruikt titel als initiële `description` (concept).
3. Gekozen bestand wordt als `storage_reference` `upload://{bestandsnaam}` vastgelegd zonder blob-persistatie in deze batch (publicatie blijft geblokkeerd zonder echte Hoofdafbeelding-URL in latere opslag-ticket; concept-aanmaak mag de referentie wel zetten).
4. Identifier: gebruiker vult EAN/GTIN of MPN in (minstens één waarde); type GTIN als louter cijfers (8–14), anders MPN.

## Consequenties

- Geen stille inventie van Brand-entiteiten.
- Latere Brand-onboarding kan soft refs normaliseren.
