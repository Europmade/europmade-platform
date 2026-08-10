# Changelog — Documentatie

Alle inhoudelijke wijzigingen aan de definitieve documentatie worden hier bijgehouden, in aanvulling op de ADR's in `docs/04-decisions/` (die de *reden* van een beslissing vastleggen; dit changelog volgt de *chronologie*).

## [Onuitgebracht]

### Afgerond
- **Product Cloud translation workflow (ADR-0039) — workflow compleet** (2026-08-10). Centrale productcontent-vertalingen via `pc_translation` + `PRODUCT_CLOUD_ACTIVE_LANGUAGES` (nl/en/fr/de, willekeurige bron→targets). Statusmapping sprint-labels ↔ ADR-enum; `markTranslationsStale` bij concept title/description-wijziging; enqueue/retranslate filters `only_missing` / `only_stale` / `only_failed`; manual `origin` bescherming; provider `none` zonder neptekst. DeepL **niet** productief geactiveerd (env-only later). UI-teksten blijven `messages.ts`.
- **Storefront internationalization & automatic language detection — AFGEROND** (2026-08-10). Ondersteunde UI-locales: `nl` / `en` / `de` / `fr`. Prioriteit: handmatige keuze → `em_storefront_locale` cookie/localStorage → Accept-Language / `navigator.language` → NL-fallback. Auto-detectie schrijft geen cookie/storage. Locale-aware o.a. homepage, mega-menu, categorie/PDP/Buy Box/FAQ/specs, buyer/seller portals, partner onboarding, auth, content/juridisch, footer, cookievoorkeuren + consent-banner, statuslabels, metadata. Architectuur uitsluitend: `messages.ts`, `StorefrontLocaleProvider`, `em_storefront_locale`, locale helpers, `detect-locale.ts` (geen tweede i18n-systeem). Product-/merk-/sellernamen blijven brondata. Niet opnieuw als open sprintwerk opnemen tenzij concreet bug of nieuwe taal.

### Aangepast
- Footer legal-links naar echte routes (`/juridisch/privacybeleid`, `/cookie-preferences`, `/juridisch/algemene-voorwaarden`).
- Merk-label vertaalbaar; merknamen/productnamen/seller-namen ongewijzigd.

### Toegevoegd
- ADR-0039 — Translation Layer MVP: actieve talen NL/EN/FR/DE, DeepL-provider, source_version/origin, stale (`Verouderd`), manual override-bescherming, publish-only storefront-resolve.
- Migratie `Migration20260810140000` (`source_version`, `origin`, `updated_by`, statussen Verouderd/Mislukt).
- Admin: `translations/publish`, `translations/manual`, `translations/mark-stale`, `translations/retranslate` (+ uitgebreide enqueue).
- Technische-tokenvalidatie voor productcontent; contentType-context op TranslateRequest.

### Toegevoegd (3B.8 / ADR-0038)
- ADR-0038 — Product Cloud storefront-koppeling + vertaalprovider-abstractie (NL/FR/DE actief; EU-talen uitbreidbaar; geen nep-MT).
- Store: `GET /store/product-cloud/categories?locale=`, `GET /store/product-cloud/translations` (resolve + fallback).
- Admin: `POST /admin/product-cloud/translations/enqueue` (source → targets; zonder credentials → status `Ontbreekt`).
- Centrale taal-/veldenconfig + TranslationProvider (`none` default) + resolve helpers.
- Storefront: `product-cloud-store.ts` + categoriepagina koppelt PC-slug/attrs met CMS-fallback.

### Toegevoegd (3B.7 / ADR-0037)
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
