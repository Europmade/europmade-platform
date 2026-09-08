"use client"

import { useMemo } from "react"
import type { PdpDetail } from "../../_lib/pdp-seed"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { ProductDetailPage } from "../product/product-detail"
import { CmsThemeStyle } from "../cms/cms-theme-style"
import {
  postPreviewSelect,
  useCmsPreviewHost,
} from "../../_lib/cms/use-cms-preview-host"
import { resolveProductPage } from "../../_lib/cms/resolve-product-page"
import type { StoreCmsBanner } from "../../_lib/cms/fetch-store-cms"

function asLocale(value: string | undefined): StorefrontLocale {
  if (value === "en" || value === "de" || value === "fr" || value === "nl") {
    return value
  }
  return DEFAULT_STOREFRONT_LOCALE
}

export function ProductPreviewClient({
  initialDetail,
  templateDocument = null,
  banners = null,
}: {
  initialDetail: PdpDetail | null
  templateDocument?: unknown | null
  banners?: StoreCmsBanner[] | null
}) {
  const { draft, theme } = useCmsPreviewHost()
  const locale = asLocale(draft?.locale)

  const resolved = useMemo(() => {
    if (!initialDetail) return null
    const draftAny = draft as
      | (NonNullable<typeof draft> & { templateDocument?: unknown })
      | null
    const isTemplateDraft = draftAny?.slug === "template"
    const templateFromDraft = draftAny?.templateDocument
    const template =
      templateFromDraft !== undefined && templateFromDraft !== null
        ? templateFromDraft
        : isTemplateDraft
          ? (draftAny?.document ?? templateDocument)
          : templateDocument
    const productDocument = isTemplateDraft
      ? null
      : (draftAny?.document ?? null)

    return resolveProductPage({
      detail: initialDetail,
      locale,
      templateDocument: template,
      productDocument,
      banners:
        Array.isArray(draftAny?.banners) && draftAny.banners.length > 0
          ? (draftAny.banners as StoreCmsBanner[])
          : banners,
      preview: true,
    })
  }, [banners, draft, initialDetail, locale, templateDocument])

  if (!initialDetail || !resolved) {
    return (
      <div className="p-8 text-sm text-wf-500">
        Geen Product Cloud-producten beschikbaar
      </div>
    )
  }

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
      <ProductDetailPage
        detail={resolved.detail}
        presentation={resolved.presentation}
        banner={resolved.banner}
        locale={locale}
      />
      {draft?.selectedId ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-cms-section="${draft.selectedId}"]{outline:2px solid #38bdf8;outline-offset:-2px;}`,
          }}
        />
      ) : null}
    </div>
  )
}
