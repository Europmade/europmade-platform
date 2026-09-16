/**
 * Live CMS page resolve (server). Uses store fetch + schedule checks.
 * Client preview must import `resolve-cms-page-draft` instead.
 */

import { isCmsPageLive } from "@europmade/utils"
import type { StorefrontLocale } from "../i18n/locales"
import { defaultCanonicalForSlug } from "./cms-fixed-pages"
import { fetchStoreCmsPage } from "./fetch-store-cms"
import {
  emptyResolvedCmsPage,
  resolveCmsPageFromDraft,
  type CmsPageDraftInput,
  type ResolvedCmsPage,
} from "./resolve-cms-page-draft"

export type {
  CmsPageDraftInput,
  ResolvedCmsPage,
  ResolvedCmsPageSection,
} from "./resolve-cms-page-draft"
export { resolveCmsPageFromDraft } from "./resolve-cms-page-draft"

/**
 * Resolve a CMS page for live storefront (or preview with draft override).
 *
 * - Live: only published + visible + schedule via store API.
 * - Preview + draft: pure draft resolve (no fetch).
 */
export async function resolveCmsPage(input: {
  slug: string
  locale: StorefrontLocale
  /** Public URL path for canonical / bridge (e.g. "/over"). */
  publicPath?: string
  preview?: boolean
  draft?: CmsPageDraftInput | null
}): Promise<ResolvedCmsPage> {
  const slug = input.slug.trim().toLowerCase()
  const publicPath =
    input.publicPath?.trim() || defaultCanonicalForSlug(slug)

  if (input.preview && input.draft) {
    return resolveCmsPageFromDraft(
      { ...input.draft, slug: input.draft.slug ?? slug },
      input.locale,
      publicPath
    )
  }

  const remote = await fetchStoreCmsPage(slug)
  if (!remote?.page) {
    return emptyResolvedCmsPage(slug, publicPath)
  }

  const page = remote.page
  if (
    !input.preview &&
    !isCmsPageLive({
      published: page.published,
      visible: page.visible,
      publish_at: page.publish_at ?? null,
      expires_at: page.expires_at ?? null,
    })
  ) {
    return {
      ...emptyResolvedCmsPage(slug, publicPath),
      published: page.published,
      visible: page.visible,
      publishAt: page.publish_at ?? null,
      expiresAt: page.expires_at ?? null,
    }
  }

  return resolveCmsPageFromDraft(
    {
      slug: page.slug,
      title: page.title,
      body: page.body,
      cover_url: page.cover_url,
      document: page.document,
      seo_title: page.seo_title,
      seo_description: page.seo_description,
      seo_canonical: page.seo_canonical,
      published: page.published,
      visible: page.visible,
      publish_at: page.publish_at ?? null,
      expires_at: page.expires_at ?? null,
    },
    input.locale,
    publicPath
  )
}
