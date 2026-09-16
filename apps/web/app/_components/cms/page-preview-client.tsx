"use client"

import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { defaultCanonicalForSlug } from "../../_lib/cms/cms-fixed-pages"
import { resolveCmsPageFromDraft } from "../../_lib/cms/resolve-cms-page-draft"
import { CmsThemeStyle } from "../cms/cms-theme-style"
import { CmsPageView } from "./cms-page-view"
import {
  postPreviewSelect,
  useCmsPreviewHost,
} from "../../_lib/cms/use-cms-preview-host"

function asLocale(value: string | undefined): StorefrontLocale {
  if (value === "en" || value === "de" || value === "fr" || value === "nl") {
    return value
  }
  return DEFAULT_STOREFRONT_LOCALE
}

export function PagePreviewClient() {
  const { draft, theme } = useCmsPreviewHost()
  const locale = asLocale(draft?.locale)
  const slug =
    (typeof draft?.slug === "string" && draft.slug) ||
    (typeof draft?.document === "object" &&
    draft?.document &&
    "slug" in (draft.document as object)
      ? String((draft.document as { slug?: string }).slug ?? "")
      : "") ||
    "concept"
  const publicPath = defaultCanonicalForSlug(slug)
  const page = resolveCmsPageFromDraft(
    {
      slug,
      document: draft?.document,
      title: undefined,
      body: undefined,
      published: false,
      visible: true,
    },
    locale,
    publicPath
  )

  return (
    <div
      className="em-cms-theme"
      onClick={(e) => {
        const el = (e.target as HTMLElement).closest("[data-cms-section]")
        if (el instanceof HTMLElement && el.dataset.cmsSection) {
          postPreviewSelect(el.dataset.cmsSection)
        }
      }}
    >
      <CmsThemeStyle theme={theme} />
      <CmsPageView
        page={page}
        locale={locale}
        selectedId={draft?.selectedId ?? null}
        interactive
      />
    </div>
  )
}
