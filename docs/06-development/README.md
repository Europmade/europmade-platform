# 06 — Development

Deze map wordt het operationele werkgebied voor de daadwerkelijke softwareontwikkeling van EuropMade in Cursor, zodra de wireframes zijn afgerond en de bouw van `apps/storefront`, `apps/partner` en `apps/backend` start.

## Inhoud

- [`project-status-and-roadmap.md`](./project-status-and-roadmap.md) — **Centraal projectoverzicht (definitief, bijgewerkt na Sprint 1B-afsluiting).** Projectstatus per onderdeel, volledige 68-schermeninventarisatie, sprintplanning, afhankelijkheden, architectuurcontrole, eindadvies.
- [`sprint-1b-eindrapportage.md`](./sprint-1b-eindrapportage.md) — **Definitieve Sprint 1B-eindrapportage.** Alle opgeleverde functionaliteiten, totaal aantal Design System-componenten (41) en definitief bevroren schermen (9), bekende MVP-beperkingen, openstaande onderwerpen voor Sprint 1C, en de afsluitende consistentiecontrole.
- [`sprint-1b-architecture-risk-assessment.md`](./sprint-1b-architecture-risk-assessment.md) — **Architectuurcontrole vóór Sprint 1B (definitief).** Risicobeoordeling van de negen kernonderdelen op technisch risico, functioneel risico, businessmodel-impact en ontwikkelafhankelijkheden, met een architectuurgedreven advies over het eerste te bouwen scherm.
- Volledige functionele uitwerking van dat advies: [`03-functional-specs/marketplace-core/spec.md`](../03-functional-specs/marketplace-core/README.md) — de Retailer Created end-to-end flow.
- [`roadmap.md`](./roadmap.md) — de ontwikkelfasering op hoofdlijnen (Fase 1/MVP, Fase 2, Fase 3), direct gekoppeld aan Blueprint H15.7. Zie `project-status-and-roadmap.md` voor de gedetailleerde, actuele versie.
- [`backlog.md`](./backlog.md) — het geprioriteerde ontwikkelbacklog, opgebouwd vanuit de scherminventarisatie (`02-ux/ux-architecture.md`) en de functionele specificaties (`03-functional-specs/`).
- [`sprint-01.md`](./sprint-01.md) — eerste sprint (nog te plannen: exacte inhoud volgt zodra de wireframes zijn afgerond).
- [`sprint-02.md`](./sprint-02.md) — tweede sprint (nog te plannen).

## Status

`project-status-and-roadmap.md` en `sprint-1b-eindrapportage.md` zijn beide **definitief**. `roadmap.md`, `backlog.md`, `sprint-01.md` en `sprint-02.md` blijven placeholder totdat de daadwerkelijke ontwikkeling (na Sprint 1A/1B-wireframes) start.

## Relatie met andere mappen

- `project-status-and-roadmap.md` is samengesteld uit `02-ux/ux-architecture.md`, `02-ux/wireframes/wireframe-strategie.md`, `02-ux/customer-journey-audit.md`, `03-functional-specs/`, `07-design-system/` en `04-decisions/` — geen nieuwe informatie, uitsluitend consolidatie.
- `roadmap.md` en `backlog.md` vertalen de MVP-scope uit [`05-mvp-scope/`](../05-mvp-scope/README.md) naar uitvoerbaar ontwikkelwerk.
- Elke sprint verwijst expliciet naar de wireframes (`02-ux/wireframes/`) en functionele specificaties (`03-functional-specs/`) die hij implementeert, zodat er nooit gebouwd wordt zonder vastgestelde UX/functionele basis.
- Technische keuzes tijdens ontwikkeling die niet expliciet in `01-architecture/` staan, worden alsnog vastgelegd als ADR in [`04-decisions/`](../04-decisions/README.md), niet stilzwijgend in een sprintdocument.
