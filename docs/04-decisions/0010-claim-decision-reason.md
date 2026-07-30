# ADR 0010 — Claim `decision_reason` voor afwijzen-met-reden

**Status:** Geaccepteerd
**Datum:** 2026-07-30
**Domein:** Product Cloud, Claim-/eigenaarschap-API

## Context

`product-management/spec.md` §5 en de rechtenmatrix eisen bij claimafwijzing een **reden**. Deel B.10 `claim` kent alleen `status` + `ai_metadata_id` — geen opslagplek voor die reden. Notificatie-API (S3 later) is nog niet beschikbaar als enige opslag.

## Beslissing

Voeg nullable kolom **`decision_reason`** toe op `claim` (custom Product Cloud-module). Verplicht server-side bij status `Afgewezen`; null bij `In beoordeling` / `Goedgekeurd`.

## Consequenties

- Afwijzingsreden is auditbaar en later herbruikbaar voor notificaties.
- Geen nieuwe entiteit; uitsluitend de ontbrekende persistentie voor een bevroren API-eis.

## Referentie

- [`03-functional-specs/product-management/spec.md`](../03-functional-specs/product-management/spec.md) §5
- [`08-technical-blueprint/02-database-model.md`](../08-technical-blueprint/02-database-model.md) B.10
