# ADR-0011 — Minimale Seller-shell als scaffold voor S3-03-05

## Status

Geaccepteerd

## Context

S3-03-05 (Productoverzicht + EAN-zoeken) hangt af van S3-13-02 (Seller Dashboard-shell). S3-13-02 is nog niet opgeleverd, terwijl de Sprint 3 P0-wireframes `product-01/02/03` de shell-chrome (sidebar, header, breadcrumb) vereisen om “exact conform wireframe” te zijn.

## Beslissing

Voor S3-03-05 leveren we een **minimale Seller-shell** op (`/seller/*`) met:

- Navigatiestructuur exact conform het Sprint 3 P0-shell-wireframe (labels/volgorde).
- Werkende routes voor Producten (overzicht + EAN-zoeken).
- Overige nav-items zichtbaar maar zonder functionele modules (placeholder tot hun epic/ticket).

**Buiten S3-03-05 / voorbehouden aan S3-13-02:** Dashboard Home (#30) met KPI’s/taken-widgets, en functionele bestemmingen voor Orders/Retouren/Berichten/Financiën/Rapportages/Instellingen.

## Consequenties

- Seller-schermen in EPIC-03 bouwen voort op `/seller` layout.
- S3-13-02 vervangt/verrijkt placeholders en home; mag de bestaande nav-chrome niet breken.
