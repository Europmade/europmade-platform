# CMS Pages — Fase 2A (algemene pagina's)

## Architectuur

```
cms_page (bestaand Medusa CMS-model)
  → GET /store/cms/pages/:slug  (published + visible + schedule)
  → resolveCmsPage / loadFixedCmsPage
  → CmsPageView  (zelfde render voor live + preview)
  → vaste publieke URL blijft bestaan (/over, …)
```

Geen parallel CMS, geen nieuwe page-builder, geen productrails van de homepage.

## Fixed route mapping

Bron van waarheid: `@europmade/utils` → `CMS_FIXED_PAGES` / `cmsSlugForPublicPath` / `defaultCanonicalForSlug`.

| Publieke URL | cms_page.slug | Migratie |
| --- | --- | --- |
| `/over` | `over` | ja (bridge + fallback) |
| `/waarom-kopen` | `waarom-kopen` | ja |
| `/made-in-europe` | `made-in-europe` | ja |
| `/klantenservice` | `klantenservice` | ja |
| `/werken-bij` | `werken-bij` | ja |
| `/waarom-verkopen` | `waarom-verkopen` | ja |
| `/affiliate` | `affiliate` | ja |
| `/verified` | `verified` | ja (ContentPage) |
| `/duurzaam` | `duurzaam` | ja (ContentPage) |
| `/juridisch/…` | `juridisch/…` | cms-ready (bridge; content nog hardcoded fallback) |
| `/cookie-preferences` | — | **niet** (consent UI) |
| `/buy-box` | — | **niet** (commerciële uitleg) |

Ad-hoc CMS-pagina's blijven op `/pagina/[slug]`.

## Source of truth & fallback

1. Als `cms_page` voor de slug **live** is (published + visible + binnen `publish_at`/`expires_at`) → CMS-content.
2. Anders → bestaande hardcoded / i18n-fallback op dezelfde URL (geen 404).

Zodra een pagina inhoudelijk in CMS is gepubliceerd, is CMS de bron; fallback blijft als vangnet tot content migratie compleet is.

## Scheduling

Eén mechanisme (`isCmsPageLive` in `@europmade/utils`):

| Afgeleide status | Regel |
| --- | --- |
| Concept | `published = false` |
| Gepland | published + `publish_at` > now |
| Actief | published + visible + binnen window |
| Verlopen | `expires_at` ≤ now |

Geen aparte status-enum in de database. Store-API en resolve gebruiken dezelfde check. Preview mag draft/planned/expired tonen.

## Preview

- Admin Page Studio → iframe `/cms-preview/page/{slug}`
- Zelfde `resolveCmsPageFromDraft` / `CmsPageView` als live
- Theme/header/footer blijven sitebreed

## SEO

- Velden: `seo_title`, `seo_description`, `seo_canonical`
- Canonical voor fixed routes = publieke path (`/over`), nooit `/pagina/over`
- `generateMetadata` gebruikt CMS SEO wanneer live; anders bestaande fallback

## Localization

Bestaande `{ nl, en, de, fr }` + locale toolbar + translate API. Geen nieuw i18n-systeem.

## Rich text

Sectie-body: plain of HTML → `sanitizeCmsHtml` (allowlist: p, br, strong/em, h2–h4, ul/ol/li, a).

## Secties

Bestaande keys: `hero`, `text`, `image_text`, `cards`/`usps`, `steps`, `score_breakdown`, `threshold`, `funnel`, `pricing_highlight`, `roles`, `faq`, `cta`, `cta_group`, `offer_band`, `banner`.

Gestructureerde velden (items/ctas/stages) zitten in `cms_page.document` (JSONB) — geen aparte migratie.

**Niet** overgenomen van homepage: featured/newest/best sellers, campaigns, partners, newsletter, seller CTA, paid ads.

## Content seed & rich text

- Lege of generieke fixed stubs (`isGenericFixedPageStub`): `cms-fixed-page-seed.ts` vult vanuit storefront i18n (exacte teksten).
- `/made-in-europe`, `/waarom-kopen`, `/waarom-verkopen` gebruiken gestructureerde sectietypen (geen platte samenvatting).
- Studio hydrateert alleen lege/generieke stubs — nooit non-empty echte CMS-content overschrijven bij openen (pas na Save).
- Live storefront: CMS wint alleen bij gepubliceerde pagina **met bruikbare content** (`resolvedCmsPageHasContent`).
- Visuele editor: TipTap; opslag = gesanitizede HTML.

## Adminlijst (CMS → Pagina's)

- Merge `listableFixedCmsPages()` + bestaande DB-rijen.
- Ontbrekend → status “Nog niet in CMS” + **Aanmaken** (unpublished stub, juiste slug/canonical).
- Lijst toont vaste publieke paths (`/over`, …), niet blind `/pagina/…`.
- Ad-hoc pagina’s (bijv. UAT) blijven onderaan zichtbaar.

## Preview (client-safe)

- Client: `resolve-cms-page-draft.ts` (geen `fetch-store-cms` / `next/headers`).
- Live: `resolve-cms-page.ts` mag server-fetch gebruiken.

## Centrale code

- `packages/utils/src/cms-publish.ts`, `cms-fixed-pages.ts`, `sanitize-html.ts`
- `apps/web/app/_lib/cms/resolve-cms-page-draft.ts`, `resolve-cms-page.ts`, `fixed-cms-page.ts`
- `apps/web/app/_components/cms/cms-page-view.tsx`
- `apps/admin/app/(shell)/cms/pages/page.tsx`, `cms-page-studio.tsx`
- Store: `apps/backend/src/api/store/cms/pages/[slug]/route.ts`

## Harness

```bash
npx tsx .tmp-verify/cms-pages-fase2a-verify.mts
```

## Bewust buiten scope (Fase 2A)

- Cookie preferences CMS
- Buy-box CMS-migratie
- Seller Brand Page / Actions
- Homepage productrails op pages
- Juridische content herschrijven (alleen route bridge)
- Commit van andere dirty tree (orders/MFA/finance/…)
