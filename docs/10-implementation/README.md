# Sprint 3 — Implementatieplanning

**Status:** v1.0 — eerste, volledige implementatieplanning, gebaseerd op **Blueprint Freeze v1.0**.
**Basis:** uitsluitend de bevroren Functionele Blueprint (`03-functional-specs/`), Technical Blueprint (`08-technical-blueprint/`), UX Blueprint/wireframes (`02-ux/`), ADR's (`04-decisions/`, `08-technical-blueprint/09-adr-overview.md`) en MVP-scope (`05-mvp-scope/`). Geen nieuwe functionaliteit of architectuur geïntroduceerd — elke Epic en elk ticket is direct herleidbaar naar een bestaand Blueprint-document.
**Scope:** planning uitsluitend. Nog geen code geschreven, geen implementatie uitgevoerd.

---

## Inhoud

- [`Sprint-3-Epics.md`](./Sprint-3-Epics.md) — 14 Epics, direct afgeleid van de Bouwvolgorde (`09-implementation-blueprint/01-implementation-strategy.md` sectie 4/Bijlage B), elk met doel, fase, afhankelijkheden en Blueprint-bronnen.
- [`Sprint-3-Tickets.md`](./Sprint-3-Tickets.md) — 67 tickets, elk met uniek ID, titel, beschrijving, afhankelijkheden, verwachte oplevering, acceptatiecriteria en Blueprint-verwijzing.
- [`Sprint-3-Backlog.md`](./Sprint-3-Backlog.md) — alle 67 tickets in afhankelijkheidsvolgorde, één geprioriteerde lijst.
- [`Sprint-3-Progress.md`](./Sprint-3-Progress.md) — voortgangsregistratie per ticket; bij aanvang van Sprint 3 staat alles op "Niet gestart."
- [`Sprint-3-Change-Requests.md`](./Sprint-3-Change-Requests.md) — proces en log voor wijzigingen die tijdens Sprint 3 aan het licht komen; een Blueprint-document wordt nooit stilzwijgend gewijzigd.

## Structuur van de planning

14 Epics, in bouwvolgorde:

| Epic | Naam | Fase |
|---|---|---|
| EPIC-00 | Fase 0 — Kritieke ADR-besluitvorming | Vóór alle code |
| EPIC-01 | Identiteit & Authenticatie | Stap 3 |
| EPIC-02 | Partner-service | Stap 3 |
| EPIC-03 | Product Cloud-service | Stap 4 |
| EPIC-04 | Commerce Cloud / Buy Box-service | Stap 5 |
| EPIC-05 | Order-service (incl. Retouren & Berichten) | Stap 6 |
| EPIC-06 | Review-service | Stap 7 |
| EPIC-07 | Affiliate-service | Stap 8 |
| EPIC-08 | Finance-service | Stap 9 |
| EPIC-09 | AI-ondersteuningsservice | Doorlopend vanaf stap 4 |
| EPIC-10 | Platformbrede gedeelde services | Doorlopend vanaf stap 3 |
| EPIC-11 | Admin Shell & Admin-modules | Parallel vanaf stap 3 |
| EPIC-12 | GDPR & Compliance | Parallel, urgent |
| EPIC-13 | Dashboard-Shells (Buyer & Seller) | Vroeg, parallel aan stap 3-4 |

## Uitgangspunten

- Deze planning wijzigt geen enkel Blueprint-document (`00-context/` t/m `09-implementation-blueprint/`) — zij herschikt uitsluitend wat daar al is vastgelegd.
- Elk ticket citeert expliciet zijn Blueprint-bron(nen); een ticket zonder aanwijsbare bron hoort hier niet thuis (zie `Sprint-3-Change-Requests.md` voor de procedure als dat toch nodig blijkt).
- Fase 0 (EPIC-00, ADR-01/02/03/13) blijft de enige harde voorwaarde vóór de eerste regel code — ongewijzigd sinds `10-technical-roadmap.md`.
