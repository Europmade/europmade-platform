"use client"

import { overlayProductEditorial } from "../../_lib/cms/overlay-product-editorial"
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

function asLocale(value: string | undefined): StorefrontLocale {
  if (value === "en" || value === "de" || value === "fr" || value === "nl") {
    return value
  }
  return DEFAULT_STOREFRONT_LOCALE
}

export function ProductPreviewClient({
  initialDetail,
}: {
  initialDetail: PdpDetail | null
}) {
  const { draft, theme } = useCmsPreviewHost()
  const locale = asLocale(draft?.locale)

  if (!initialDetail) {
    return (
      <div className="p-8 text-sm text-wf-500">
        Geen Product Cloud-producten beschikbaar
      </div>
    )
  }

  const detail = overlayProductEditorial(
    initialDetail,
    draft?.document ?? {},
    locale
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
      <ProductDetailPage detail={detail} locale={locale} />
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
