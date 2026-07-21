# EuropMade — Documentatie-index

Alle product-, UX-, functionele en technische documentatie van EuropMade, opgebouwd zodat deze direct als onderdeel van de repository in GitHub en Cursor gebruikt kan worden.

> Het Blueprint-einddocument zelf (docx/pdf) staat **niet** in deze map, maar in [`/blueprint/`](../blueprint/README.md) op de root van de repository — zie de toelichting daar voor waarom dit bewust gescheiden is.

> **Nieuw hier?** Begin met [`06-development/project-status-and-roadmap.md`](./06-development/project-status-and-roadmap.md) — het centrale overzicht van projectstatus, volledige scherminventarisatie, sprintplanning en eerstvolgende stappen. Zie ook [`06-development/sprint-1b-eindrapportage.md`](./06-development/sprint-1b-eindrapportage.md) voor de definitieve afsluiting van Sprint 1B.

## Leesvolgorde (aanbevolen voor nieuwe teamleden)

1. [`00-context/`](./00-context/README.md) — waar komt dit vandaan, herkomst van de Blueprint, begrippenlijst.
2. [`01-architecture/`](./01-architecture/README.md) — technische architectuur en het ontwerpprincipe "standard where possible, custom where it creates competitive advantage".
3. [`02-ux/`](./02-ux/README.md) — volledige UX-architectuur, wireframes, en de Customer Journey Audit.
4. [`03-functional-specs/`](./03-functional-specs/README.md) — diepgaande functionele specificaties per kernonderdeel (Product Cloud/Commerce Cloud/Buy Box, Checkout, Homepage).
5. [`04-decisions/`](./04-decisions/README.md) — formeel vastgestelde beslissingen (ADR's) die van of een aanvulling zijn op de Blueprint.
6. [`05-mvp-scope/`](./05-mvp-scope/README.md) — MVP-afbakening over alle domeinen heen (Must/Should/Could Have).
7. [`06-development/`](./06-development/README.md) — **centraal project status- en roadmapoverzicht**, plus roadmap/backlog/sprintplanning voor de daadwerkelijke ontwikkeling in Cursor.
8. [`07-design-system/`](./07-design-system/README.md) — UI-bouwstenen (componenten definitief, kleuren/typografie/iconen nog placeholder), Component ID-register, Coverage Matrix.

## Mapoverzicht

| Map | Inhoud | Status |
|---|---|---|
| `00-context/` | Blueprint-referentie, financieel model-referentie, begrippenlijst | Definitief (financieel model-bestand zelf ontbreekt nog fysiek, zie project-status-and-roadmap.md) |
| `01-architecture/` | Techstack, systeemarchitectuur, standaard-vs-maatwerk-principe | Definitief |
| `02-ux/` | UX-architectuur, wireframes (**Sprint 1A én Sprint 1B volledig afgerond**), Customer Journey Audit | Definitief; 9 van 68 schermen/flows als wireframe gereed (Sprint 1A-kern + volledige Sprint 1B: Winkelwagen, Orderbevestiging, Authenticatie incl. 2FA, Partner Onboarding) |
| `03-functional-specs/` | Product Cloud/Commerce Cloud/Buy Box, Checkout, Homepage, Marketplace Listing, Marketplace Core, Winkelwagen, Orderbevestiging, Authenticatie (incl. 2FA), Partner Onboarding | Acht domeinen definitief; overige domeinen (advertenties, compliance, affiliate/creator) nog niet gestart |
| `04-decisions/` | ADR's 0001 t/m 0005 | Definitief (proces), aantal groeit met nieuwe domeinen |
| `05-mvp-scope/` | Scherm- en featureprioritering | Definitief; wordt aangevuld naarmate nieuwe domeinen worden uitgewerkt |
| `06-development/` | **Project status & roadmap (definitief, bijgewerkt na Sprint 1B-afsluiting)**, roadmap/backlog/sprintplanning | Centraal overzicht definitief; sprint-uitvoeringsdocumenten nog placeholder |
| `07-design-system/` | Componenten (41, definitief), Coverage Matrix, spacing (bevestigd) | Structureel definitief; kleuren/typografie/iconen bewust nog placeholder (latere fase) |

## Wijzigingsproces

Zodra een document in dit repository de status "Definitief" heeft, wordt een inhoudelijke wijziging altijd behandeld als een nieuwe beslissing: voeg een ADR toe in `04-decisions/` die de wijziging en de reden vastlegt, en werk pas daarna het betreffende document bij. Zo blijft de geschiedenis van beslissingen traceerbaar, ook wanneer documenten zelf worden herschreven. Bevroren wireframes (Productpagina/Buy Box, Checkout, Homepage, Zoekresultaten, Categoriepagina — Sprint 1A; Winkelwagen, Orderbevestiging, Authenticatie-flow incl. 2FA, Partner Onboarding — Sprint 1B) volgen dezelfde regel: wijzigingen uitsluitend bij aantoonbare inconsistentie met de Blueprint of een ADR, of via een expliciet geautoriseerde, gecontroleerde synchronisatie-update (zoals toegepast op Checkout's BTW-weergave) — zie `02-ux/customer-journey-audit.md` en `checkout/spec.md` sectie 13 voor voorbeelden van hoe dat proces werkt.
