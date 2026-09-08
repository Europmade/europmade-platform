"use client"

import type { CmsLocale } from "../../lib/cms-i18n"
import type { CmsViewport } from "./cms-editor-shell"

const WIDTH: Record<CmsViewport, number> = {
  desktop: 1160,
  tablet: 768,
  mobile: 390,
}

export function CmsStorefrontCanvas({
  viewport,
  locale,
  children,
  note,
}: {
  viewport: CmsViewport
  locale: CmsLocale
  children: React.ReactNode
  note?: string
}) {
  const width = WIDTH[viewport]
  return (
    <div className="overflow-auto">
      <p className="mb-2 text-[11px] text-wf-500">
        {note ??
          "Preview gebruikt EuropMade-design tokens (wf-*). Admin en storefront zijn aparte Next-apps, dus componenten worden visueel nagebouwd — geen tweede CMS."}
      </p>
      <div
        className="mx-auto overflow-hidden rounded-xl border border-wf-200 bg-white shadow-sm"
        style={{ width: "min(100%, " + width + "px)" }}
      >
        <div className="border-b border-wf-900 bg-wf-900 px-4 py-1.5 text-center text-[11px] text-white">
          EuropMade — uitsluitend Europese merken
        </div>
        <div className="flex items-center justify-between border-b border-wf-200 px-4 py-2.5">
          <p className="text-[15px] font-bold tracking-tight text-wf-900">EuropMade</p>
          <p className="text-[10px] uppercase tracking-wide text-wf-400">{locale.toUpperCase()}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export function CmsProductCardPreview({
  title,
  brand,
  image,
  price,
}: {
  title: string
  brand?: string
  image?: string | null
  price?: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-wf-200 bg-white">
      <div className="flex h-28 items-center justify-center bg-wf-50">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-contain p-2" />
        ) : (
          <span className="text-[11px] text-wf-400">Product</span>
        )}
      </div>
      <div className="p-2">
        {brand ? <p className="text-[10px] text-wf-500">{brand}</p> : null}
        <p className="line-clamp-2 text-[12px] font-semibold text-wf-900">{title}</p>
        {price ? <p className="mt-0.5 text-[12px] font-bold text-wf-800">{price}</p> : null}
      </div>
    </div>
  )
}
