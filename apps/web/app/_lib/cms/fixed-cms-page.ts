import type { Metadata } from "next"
import type { StorefrontLocale } from "../i18n/locales"
import { cmsSlugForPublicPath } from "./cms-fixed-pages"
import { resolveCmsPage, type ResolvedCmsPage } from "./resolve-cms-page"
import { resolvedCmsPageHasContent } from "./resolve-cms-page-draft"

/**
 * Load CMS content for a fixed public path, or null → use hardcoded fallback.
 */
export async function loadFixedCmsPage(input: {
  path: string
  locale: StorefrontLocale
}): Promise<ResolvedCmsPage | null> {
  const slug = cmsSlugForPublicPath(input.path)
  if (!slug) return null
  const resolved = await resolveCmsPage({
    slug,
    locale: input.locale,
    publicPath: input.path,
  })
  if (resolved.source !== "cms" || resolved.sections.length === 0) {
    return null
  }
  // Empty / hero-only stubs must not replace storefront fallbacks.
  if (!resolvedCmsPageHasContent(resolved)) return null
  return resolved
}

export function metadataFromCmsPage(
  page: ResolvedCmsPage,
  fallback: Metadata
): Metadata {
  return {
    ...fallback,
    title: page.seo.title
      ? page.seo.title.includes("EuropMade")
        ? page.seo.title
        : `${page.seo.title} — EuropMade`
      : fallback.title,
    description: page.seo.description || fallback.description,
    alternates: {
      ...(typeof fallback.alternates === "object" ? fallback.alternates : {}),
      canonical: page.seo.canonical || inputCanonical(fallback) || page.publicPath,
    },
  }
}

function inputCanonical(fallback: Metadata): string | undefined {
  const alt = fallback.alternates
  if (!alt || typeof alt !== "object") return undefined
  const c = (alt as { canonical?: string | URL | null }).canonical
  if (typeof c === "string") return c
  if (c instanceof URL) return c.pathname
  return undefined
}
