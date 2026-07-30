# ADR 0007 — Onzekere productmatches leveren MatchCandidate op, geen ModerationCase

**Status:** Geaccepteerd
**Datum:** 2026-07-30
**Domein:** Product Cloud, Matching, MVP-scope

## Context

Sprint-ticket **S3-03-03** (acceptatiecriterium) stelt: *"Onzekere matches genereren een ModerationCase."* De bevroren specificatie **Product Cloud Architecture** (v1.1) en het database-model Deel B plaatsen onzekere/AI-/duplicaat-matches echter op **`match_candidate`** (Deel 5 / B.11). `moderation_case` (B.13) kent uitsluitend de case-types *Fraude-signaal / Melding derde partij / Hoog-risico wijziging* — geen matching-type.

## Beslissing

1. Bij onzekere of niet-deterministische matches wordt een **`MatchCandidate`** aangemaakt (status `Kandidaat`).
2. Er wordt **geen** `ModerationCase` geopend voor matchingonzekerheid.
3. Een 100%-zekere EAN/GTIN-hit koppelt automatisch aan het bestaande Product — geen menselijke beoordeling, geen MatchCandidate.

## Consequenties

- S3-03-03 volgt `product-cloud-architecture/spec.md` Deel 2.4/5 en Deel B.11, niet de letterlijke ticketformulering.
- Moderation Center blijft beperkt tot fraude/meldingen/hoog-risico wijzigingen (eigen tickets).

## Referentie

- [`03-functional-specs/product-cloud-architecture/spec.md`](../03-functional-specs/product-cloud-architecture/spec.md) Deel 5
- [`08-technical-blueprint/02-database-model.md`](../08-technical-blueprint/02-database-model.md) B.11, B.13
- [`10-implementation/Sprint-3-Tickets.md`](../10-implementation/Sprint-3-Tickets.md) S3-03-03
