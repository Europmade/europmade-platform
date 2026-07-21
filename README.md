# EuropMade

Het meest transparante, betrouwbare en eerlijke marketplace-platform van Europa, voor producten die daadwerkelijk in Europa zijn geproduceerd.

Dit repository bevat (uiteindelijk) zowel de broncode als de volledige product-, UX- en architectuurdocumentatie van EuropMade. Deze fase van het project bevat uitsluitend documentatie — de broncode-mappen (`apps/`, `packages/`) worden toegevoegd zodra de ontwikkeling start.

## Status

Zie [`docs/06-development/project-status-and-roadmap.md`](./docs/06-development/project-status-and-roadmap.md) voor het volledige, actuele overzicht (schermeninventarisatie, sprintplanning, eerstvolgende stappen). Samenvatting:

| Onderdeel | Status |
|---|---|
| Business & Financieel (Blueprint v2.1 / Financieel model v1.0) | Definitief (financieel model-bestand zelf nog niet fysiek in de repo) |
| Technische architectuur (Next.js + Medusa) | Definitief |
| UX-architectuur (rollen, flows, sitemap, navigatie, schermen) | Definitief |
| Functionele specificaties (Product Cloud/Commerce Cloud/Buy Box, Checkout, Homepage, Marketplace Listing) | Definitief (4 van ~7 domeinen) |
| Repository-/documentstructuur | Definitief |
| Wireframes | **Sprint 1A volledig afgerond** — 5 van 68 schermen bevroren (Homepage, Productpagina + Buy Box, Checkout, Zoekresultaten, Categoriepagina) |
| Design System | Structureel definitief (33 componenten), kleuren/typografie nog placeholder |
| Customer Journey Audit | Definitief — Sprint 1A architectonisch gevalideerd |
| Development (roadmap/backlog/sprints) | Centraal statusoverzicht definitief, sprint-uitvoeringsdocumenten nog placeholder |

## Structuur

```
.
├── README.md                 ← dit bestand
├── .gitignore
├── .cursor/
│   └── rules/
│       └── europmade.mdc     ← projectcontext voor Cursor's AI-agent
├── blueprint/                ← het business-einddocument (los van technische documentatie)
│   ├── README.md
│   ├── EuropMade_Blueprint_V2_1.docx
│   └── EuropMade_Blueprint_V2_1.pdf
├── docs/                     ← alle product-, UX- en architectuurdocumentatie (Markdown)
│   ├── 00-context/           ← herkomst, definities, verwijzing naar Blueprint & financieel model
│   ├── 01-architecture/      ← technische architectuur (Next.js + Medusa + PostgreSQL)
│   ├── 02-ux/                ← UX-architectuur, user flows, sitemap, navigatie, schermen, wireframes
│   ├── 03-functional-specs/  ← diepgaande functionele specificaties per domein
│   ├── 04-decisions/         ← Architecture Decision Records (ADR's) — formeel vastgestelde keuzes
│   ├── 05-mvp-scope/         ← MVP-afbakening (Must/Should/Could Have) over alle domeinen heen
│   ├── 06-development/       ← roadmap, backlog, sprintplanning (voor ontwikkeling in Cursor)
│   └── 07-design-system/     ← kleuren, typografie, spacing, iconen, componenten
├── apps/                     ← (nog leeg) toekomstige broncode: storefront (Next.js), backend (Medusa)
└── packages/                 ← (nog leeg) toekomstige gedeelde packages (types, UI-componenten, config)
```

Zie [`docs/README.md`](./docs/README.md) voor de volledige documentatie-index en [`blueprint/README.md`](./blueprint/README.md) voor de toelichting op het gescheiden houden van het business-einddocument.

## Documentatieconventies

- **Formaat:** uitsluitend Markdown (`.md`), zodat documentatie leesbaar is in GitHub, Cursor en elke standaard editor zonder extra tooling.
- **Bestandsnamen:** kebab-case, geen spaties of hoofdletters (bijv. `buy-box-logica.md`).
- **Mapnummering:** de hoofdmappen onder `docs/` zijn genummerd (`00-`, `01-`, ...) om de logische leesvolgorde vast te leggen; dit is puur organisatorisch en heeft geen technische betekenis.
- **Elke map bevat een `README.md`** die de inhoud van die map indexeert en samenvat, zodat navigatie ook direct in de GitHub-bestandsbrowser werkt.
- **Beslissingen die afwijken van of een aanvulling zijn op de Blueprint** worden vastgelegd als een genummerd ADR in `docs/04-decisions/`, nooit stilzwijgend verwerkt in een ander document.
- **Brontraceerbaarheid:** functionele en UX-documentatie verwijst waar relevant naar het bronhoofdstuk van de Blueprint (bijv. "H8.5"), zodat elke keuze herleidbaar blijft.
- **Blueprint gescheiden van documentatie:** het Blueprint-einddocument (docx/pdf) staat in `blueprint/` op de root, niet in `docs/` — het is een vastgesteld business-document, geen levende technische/UX-documentatie die meebeweegt met de ontwikkeling.
- **Cursor:** `.cursor/rules/europmade.mdc` legt vast welke documentatie een AI-agent in Cursor moet raadplegen vóór het voorstellen of wijzigen van code, zodat code nooit stilzwijgend afwijkt van de vastgestelde architectuur- en functionele beslissingen.
