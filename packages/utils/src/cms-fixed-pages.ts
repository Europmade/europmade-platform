/**
 * Fixed public storefront routes ↔ cms_page.slug
 * Canonical URLs stay on these paths (never /pagina/... for migrated routes).
 */

export type CmsFixedPageDef = {
  /** Public pathname, e.g. "/over" */
  path: string
  /** cms_page.slug, e.g. "over" or "juridisch/privacybeleid" */
  slug: string
  /** Default NL title for stubs / admin list */
  label: string
  /** Fase 2A migration intent */
  migrate: "yes" | "cms_ready" | "no"
  note?: string
}

/**
 * Single source of truth for fixed-route bridges.
 */
export const CMS_FIXED_PAGES: readonly CmsFixedPageDef[] = [
  { path: "/over", slug: "over", label: "Over EuropMade", migrate: "yes" },
  {
    path: "/waarom-kopen",
    slug: "waarom-kopen",
    label: "Waarom kopen",
    migrate: "yes",
  },
  {
    path: "/made-in-europe",
    slug: "made-in-europe",
    label: "Made in Europe",
    migrate: "yes",
  },
  {
    path: "/klantenservice",
    slug: "klantenservice",
    label: "Klantenservice",
    migrate: "yes",
  },
  {
    path: "/werken-bij",
    slug: "werken-bij",
    label: "Werken bij EuropMade",
    migrate: "yes",
  },
  {
    path: "/waarom-verkopen",
    slug: "waarom-verkopen",
    label: "Waarom verkopen",
    migrate: "yes",
  },
  { path: "/affiliate", slug: "affiliate", label: "Affiliate", migrate: "yes" },
  {
    path: "/verified",
    slug: "verified",
    label: "Verified™",
    migrate: "yes",
    note: "ContentPage-achtig",
  },
  {
    path: "/duurzaam",
    slug: "duurzaam",
    label: "Duurzame producten",
    migrate: "yes",
    note: "ContentPage-achtig",
  },
  {
    path: "/juridisch/privacybeleid",
    slug: "juridisch/privacybeleid",
    label: "Privacybeleid",
    migrate: "cms_ready",
    note: "Juridisch: exacte teksten behouden bij content-migratie",
  },
  {
    path: "/juridisch/algemene-voorwaarden",
    slug: "juridisch/algemene-voorwaarden",
    label: "Algemene voorwaarden",
    migrate: "cms_ready",
  },
  {
    path: "/juridisch/verzending",
    slug: "juridisch/verzending",
    label: "Verzending",
    migrate: "cms_ready",
  },
  {
    path: "/juridisch/retourneren",
    slug: "juridisch/retourneren",
    label: "Retourneren",
    migrate: "cms_ready",
  },
  {
    path: "/juridisch/contact",
    slug: "juridisch/contact",
    label: "Contact",
    migrate: "cms_ready",
  },
  {
    path: "/juridisch/betaalmethoden",
    slug: "juridisch/betaalmethoden",
    label: "Betaalmethoden",
    migrate: "cms_ready",
  },
  {
    path: "/juridisch/disclaimer",
    slug: "juridisch/disclaimer",
    label: "Disclaimer",
    migrate: "cms_ready",
  },
  {
    path: "/juridisch/copyright",
    slug: "juridisch/copyright",
    label: "Copyright",
    migrate: "cms_ready",
  },
  {
    path: "/juridisch/garanties",
    slug: "juridisch/garanties",
    label: "Garanties",
    migrate: "cms_ready",
  },
  {
    path: "/juridisch/terugbetalingsbeleid",
    slug: "juridisch/terugbetalingsbeleid",
    label: "Terugbetalingsbeleid",
    migrate: "cms_ready",
  },
  {
    path: "/cookie-preferences",
    slug: "cookie-preferences",
    label: "Cookievoorkeuren",
    migrate: "no",
    note: "Functionele consent-UI — niet CMS in Fase 2A",
  },
  {
    path: "/buy-box",
    slug: "buy-box",
    label: "Buy Box",
    migrate: "no",
    note: "Commerciële uitleg — niet automatisch migreren",
  },
] as const

const BY_PATH = new Map(CMS_FIXED_PAGES.map((p) => [p.path, p]))
const BY_SLUG = new Map(CMS_FIXED_PAGES.map((p) => [p.slug, p]))

/** Fixed pages that belong in CMS → Pagina's (exclude consent/buy-box). */
export function listableFixedCmsPages(): CmsFixedPageDef[] {
  return CMS_FIXED_PAGES.filter((p) => p.migrate !== "no")
}

export function getFixedPageByPath(path: string): CmsFixedPageDef | undefined {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return BY_PATH.get(normalized.replace(/\/+$/, "") || "/")
}

export function getFixedPageBySlug(slug: string): CmsFixedPageDef | undefined {
  return BY_SLUG.get(slug.trim().toLowerCase())
}

export function cmsSlugForPublicPath(path: string): string | null {
  const def = getFixedPageByPath(path)
  return def && def.migrate !== "no" ? def.slug : null
}

export function publicPathForCmsSlug(slug: string): string | null {
  return getFixedPageBySlug(slug)?.path ?? null
}

/** Default canonical for studio / SEO when slug maps to a fixed route. */
export function defaultCanonicalForSlug(slug: string): string {
  const path = publicPathForCmsSlug(slug)
  if (path) return path
  return `/pagina/${slug}`
}
