# EuropMade

Het meest transparante, betrouwbare en eerlijke marketplace-platform van Europa, voor producten die daadwerkelijk in Europa zijn geproduceerd.

Dit repository bevat zowel de broncode als de volledige product-, UX- en architectuurdocumentatie van EuropMade. De broncode-mappen (`apps/`, `packages/`) bevatten een volledig geconfigureerde, werkende Turborepo-monorepo waarop de marketplace verder wordt gebouwd, volgens de bevroren specificaties in `docs/03-functional-specs/`. Zie de sectie "Development" hieronder voor hoe je dit lokaal opstart.

## Status

Zie [`docs/06-development/project-status-and-roadmap.md`](./docs/06-development/project-status-and-roadmap.md) voor het volledige, actuele overzicht (schermeninventarisatie, sprintplanning, eerstvolgende stappen). Samenvatting:

| Onderdeel | Status |
|---|---|
| Business & Financieel (Blueprint v2.1 / Financieel model v1.0) | Definitief (financieel model-bestand zelf nog niet fysiek in de repo) |
| Technische architectuur (Next.js + Medusa) | Definitief; eerste Technical Blueprint-hoofdstuk (TB-01, System Architecture) opgeleverd in `docs/08-technical-blueprint/` |
| UX-architectuur (rollen, flows, sitemap, navigatie, schermen) | Definitief |
| Functionele specificaties | 16 hoofddomeinen definitief uitgewerkt (Product Cloud/Commerce Cloud/Buy Box, Checkout, Homepage, Marketplace Listing, Marketplace Core, Winkelwagen, Orderbevestiging, Authenticatie incl. 2FA, Partner Onboarding, plus zeven Sprint 1C-beheermodules: Product Cloud Architecture, Product Management, Admin Shell & Dashboard Framework, Moderation Center, Verification Center, Partner Center, Order Management Center) |
| Repository-/documentstructuur | Definitief |
| Wireframes | **Sprint 1A en Sprint 1B volledig afgerond en bevroren** — 9 van 68 schermen/flows (Homepage, Productpagina + Buy Box, Checkout, Zoekresultaten, Categoriepagina, Winkelwagen, Orderbevestiging, Authenticatie-flow incl. 2FA, Partner Onboarding); daarnaast is het Verification Center (Sprint 1C-beheermodule) als eerste tot wireframe-niveau uitgewerkt |
| Design System | Structureel definitief — **41 componenten** (CMP-001–CMP-041), kleuren/typografie/iconen nog placeholder |
| Customer Journey Audit | Definitief — Sprint 1A architectonisch gevalideerd |
| Development (roadmap/backlog/sprints) | Centraal statusoverzicht definitief (`docs/06-development/project-status-and-roadmap.md`), sprint-uitvoeringsdocumenten nog placeholder |

## Structuur

```
.
├── README.md                 ← dit bestand
├── .gitignore
├── .env.example               ← gedeelde environment-variabelen (PostgreSQL)
├── docker-compose.yml         ← lokale PostgreSQL voor ontwikkeling
├── package.json                ← root workspace + Turborepo-scripts
├── pnpm-workspace.yaml
├── turbo.json
├── eslint.config.mjs           ← gedeelde basisregels (root)
├── .prettierrc.json / .prettierignore
├── .github/
│   └── workflows/
│       └── ci.yml              ← install → lint → build
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
│   ├── 07-design-system/     ← kleuren, typografie, spacing, iconen, componenten
│   ├── 08-technical-blueprint/ ← Technical Blueprint (domeinmodel t/m technische roadmap, ADR-overzicht) voor senior software engineers
│   ├── 09-implementation-blueprint/ ← Sprint 3-implementatiestrategie (bouwvolgorde, modulevolgorde, geen nieuwe architectuur)
│   └── 10-implementation/    ← Sprint 3-implementatieplanning: Epics, Tickets, Backlog, Progress, Change Requests (Blueprint Freeze v1.0)
├── apps/
│   ├── web/                  ← Next.js 15 — publieke frontend (huidige stand: uitsluitend homepage)
│   └── admin/                ← Next.js 15 — Admin Shell (huidige stand: lege dashboardpagina, Auth.js-basisconfiguratie)
└── packages/
    ├── ui/                   ← gedeelde componentbibliotheek (shadcn/ui-gebaseerd)
    ├── config/                ← gedeelde tsconfig-/ESLint-/Tailwind-presets
    ├── types/                 ← gedeelde, generieke TypeScript-types (nog geen domeintypes)
    └── utils/                 ← gedeelde utility-functies (o.a. `cn()`)
```

Zie [`docs/README.md`](./docs/README.md) voor de volledige documentatie-index en [`blueprint/README.md`](./blueprint/README.md) voor de toelichting op het gescheiden houden van het business-einddocument.

## Development

**Vereisten:** Node.js ≥ 20, [pnpm](https://pnpm.io) ≥ 9, Docker (voor lokale PostgreSQL).

```bash
# 1. Dependencies installeren
pnpm install

# 2. Lokale PostgreSQL starten
docker compose up -d

# 3. Environment-bestanden aanmaken (kopieer en vul lokaal in)
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local

# 4. Alle apps starten (Turborepo)
pnpm dev
```

`apps/web` draait vervolgens op `http://localhost:3000`, `apps/admin` op `http://localhost:3001`.

Overige scripts (op elk niveau via Turborepo): `pnpm build`, `pnpm lint`, `pnpm type-check`, `pnpm format`.

**Huidige stand, expliciet:** `apps/web` en `apps/admin` bevatten op dit moment uitsluitend placeholder-pagina's — nog geen Medusa-backend, geen API's, geen authenticatie-flow, geen marketplace-, product- of verificatiefunctionaliteit. Dit is de definitieve repository waarop die functionaliteit vervolgens wordt gebouwd, conform de bevroren specificaties in `docs/03-functional-specs/`. Zie [`docs/06-development/project-status-and-roadmap.md`](./docs/06-development/project-status-and-roadmap.md) voor de eerstvolgende geplande stappen.

## Documentatieconventies

- **Formaat:** uitsluitend Markdown (`.md`), zodat documentatie leesbaar is in GitHub, Cursor en elke standaard editor zonder extra tooling.
- **Bestandsnamen:** kebab-case, geen spaties of hoofdletters (bijv. `buy-box-logica.md`).
- **Mapnummering:** de hoofdmappen onder `docs/` zijn genummerd (`00-`, `01-`, ...) om de logische leesvolgorde vast te leggen; dit is puur organisatorisch en heeft geen technische betekenis.
- **Elke map bevat een `README.md`** die de inhoud van die map indexeert en samenvat, zodat navigatie ook direct in de GitHub-bestandsbrowser werkt.
- **Beslissingen die afwijken van of een aanvulling zijn op de Blueprint** worden vastgelegd als een genummerd ADR in `docs/04-decisions/`, nooit stilzwijgend verwerkt in een ander document.
- **Brontraceerbaarheid:** functionele en UX-documentatie verwijst waar relevant naar het bronhoofdstuk van de Blueprint (bijv. "H8.5"), zodat elke keuze herleidbaar blijft.
- **Blueprint gescheiden van documentatie:** het Blueprint-einddocument (docx/pdf) staat in `blueprint/` op de root, niet in `docs/` — het is een vastgesteld business-document, geen levende technische/UX-documentatie die meebeweegt met de ontwikkeling.
- **Cursor:** `.cursor/rules/europmade.mdc` legt vast welke documentatie een AI-agent in Cursor moet raadplegen vóór het voorstellen of wijzigen van code, zodat code nooit stilzwijgend afwijkt van de vastgestelde architectuur- en functionele beslissingen.
