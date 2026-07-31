# ADR-0024 — Buyer Dashboard-shell onder `/account` (S3-13-01)

**Status:** Geaccepteerd  
**Datum:** 2026-07-31  
**Domein:** Buyer Dashboard, UX  
**Raakt:** S3-13-01; S3-05-05; `buyer-dashboard/spec.md`

## Context

S3-13-01 eist een herbruikbare Buyer-shell conform Sprint 3 P0-wireframes (“Mijn EuropMade”). Seller gebruikt al `/seller/*` (ADR-0011). Er is geen Medusa Customer Portal die custom `em_order`/returns toont.

## Beslissing

1. Buyer-shell en Buyer-schermen leven onder **`/account/*`** (niet `/buyer`), met sidebar-label **Mijn EuropMade** en header-module **Buyer**.
2. Navigatievolgorde exact als P0-wireframe: Dashboard, Mijn bestellingen, Retouren, Berichten, Reviews, Account — niet-gebouwde items als disabled placeholders.
3. Authenticatie via bestaande Medusa customer-session (zelfde patroon als cart/checkout).

## Consequenties

- S3-05-05/06/07 Buyer-UI bouwt voort op `/account` zonder eigen chrome.
- Storefront “Account”-link wijst naar `/account`.
