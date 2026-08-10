# Changelog — Documentatie

Alle inhoudelijke wijzigingen aan de definitieve documentatie worden hier bijgehouden, in aanvulling op de ADR's in `docs/04-decisions/` (die de *reden* van een beslissing vastleggen; dit changelog volgt de *chronologie*).

## [Onuitgebracht]

### Toegevoegd
- ADR-0037 — Product Cloud centrale laag: `pc_document`, `pc_translation`, `pc_product_relation`, category `slug`, attribute metadata (`code`/filterable/comparable), `use_case_tags` + vertaalstatusvelden.
- Migratie `Migration20260810120000` + servicehelpers (`ensureCategoryAttributeCatalog`, vertalingen/documenten/relaties) en category-attribute catalogs (elektronica/tuin/mode).
- Admin/store Product Cloud category + attribute + translation API’s (architectuur; geen frontend-koppeling).
- `@europmade/types` Product Cloud DTO-surface (identity, attributes, translations, use-case tags).
- Unit tests voor `category-attributes` helpers.

### Toegevoegd (eerder)
- `blueprint/` — Blueprint-einddocument (.docx + .pdf) gescheiden van `docs/` op de repository-root.
- `docs/06-development/` — roadmap, backlog, sprint-01, sprint-02 (placeholder, wordt gevuld na de wireframe-fase).
- `docs/07-design-system/` — colors, typography, spacing, icons, components (placeholder, wordt gevuld tijdens/na de wireframe-fase).
- `.cursor/rules/europmade.mdc` — projectcontext voor Cursor's AI-agent, verwijst naar verplicht te raadplegen documentatie.
- `.gitignore` — standaard voor een Next.js + Medusa + Node-monorepo.
- Volledige documentstructuur opgezet (`docs/00-context` t/m `docs/05-mvp-scope`), klaar voor gebruik in Cursor en GitHub.
- `docs/01-architecture/` — technische architectuur (Next.js + Medusa + PostgreSQL + TransIP) en het principe "standard where possible, custom where it creates competitive advantage".
- `docs/02-ux/ux-architecture.md` — UX-architectuur Stap 4: rollen, user flows, sitemap, navigatie, scherminventarisatie, UX-review.
- `docs/03-functional-specs/product-cloud-commerce-cloud-buy-box/spec.md` — volledige functionele specificatie Product Cloud, Commerce Cloud en Buy Box.
- `docs/04-decisions/0001` t/m `0004` — ADR's voor Buy Box-weging, Verified™-drempel, Sponsored Products en de Buy Box-tiebreaker.
- `docs/05-mvp-scope/README.md` — overkoepelend MVP-scope-overzicht.
