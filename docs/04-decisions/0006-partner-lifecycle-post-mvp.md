# ADR 0006 — Partner Lifecycle Management (Blokkeren/schorsen) buiten MVP-scope

**Status:** Geaccepteerd
**Datum:** 2026-07-29
**Domein:** Partner Center, Partner Onboarding, MVP-scope

## Context

Sprint-ticket **S3-02-05** en de Sprint 3 P0-wireframes (`partner-05-blokkeren-*`) noemen een Beheerder-actie **Blokkeren** (verplichte reden, Audit Log). De bevroren specificatie **Partner Center** (v1.1) en eerder bevroren bronnen plaatsen Partner Lifecycle Management echter expliciet buiten de MVP:

- `partner-center/spec.md` §1.2 / §4 / §5 — geen status ná "Goedgekeurd"; geen schorsen/deactiveren/blokkeren.
- Partner Onboarding — "Bewust niet verwerkte aanbevelingen" / openstaand punt Lifecycle.
- Product Cloud Architecture Deel 9.3 — escalatiepad raakt Lifecycle, niet opnieuw uitgewerkt in MVP.
- Moderation Center §5/§6 — "Geëscaleerd" als lokaal eindpunt zonder vervolgmechanisme.

Een implementatie van Blokkeren zou nieuwe architectuur introduceren (status/velden ná Goedgekeurd), wat de opdracht expliciet uitsluit.

## Beslissing

1. **Blokkeren / schorsen / deactiveren** wordt **niet** gebouwd in de MVP (inclusief niet in S3-02-05).
2. S3-02-05 levert uitsluitend: Partneroverzicht, Partnerdetail, **Goedkeuren**, **Afwijzen** (verplichte reden), en **Aanvullende informatie opvragen** (verplicht verzoek) — voor aanvragen in het onboarding-statusverloop; plus de read-only weergave van reeds goedgekeurde partners (Partner Center-scope).
3. Partner Lifecycle Management blijft een **expliciet openstaand backlog-/ADR-punt** voor een latere iteratie. Bij hervatting is eerst een nieuwe ADR + bijwerking van `partner-center/spec.md` / Partner Onboarding vereist vóór enige implementatie.

## Consequenties

- Geen `POST …/block`-endpoint, geen Blokkeren-UI, geen lifecycle-status in het bevroren `onboarding_status`-enum.
- Eventuele eerder toegevoegde `is_blocked`/`blocked_*`-kolommen worden verwijderd of ongebruikt gelaten tot een toekomstige, gedocumenteerde Lifecycle-ADR; in de MVP-codepaden worden ze niet meer gelezen of geschreven.
- Tickettekst/wireframe `partner-05` blijven historisch; de bevroren specs prevaleren (projectregel: documentatie is leidend).

## Referentie

- [`03-functional-specs/partner-center/spec.md`](../03-functional-specs/partner-center/spec.md) §1.2, §4, §5
- [`10-implementation/Sprint-3-Tickets.md`](../10-implementation/Sprint-3-Tickets.md) S3-02-05
- Wireframes: `02-ux/wireframes/sprint-3-p0/partner-05-blokkeren-*`
