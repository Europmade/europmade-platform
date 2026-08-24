"use client"

import Link from "next/link"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"
import {
  productIdFromAffiliateTarget,
  publicProductHref,
} from "../../_lib/affiliate-product-label"

export function AffiliateProductLabel({
  targetUrl,
  title,
  trackingParam,
}: {
  targetUrl: string
  title: string
  trackingParam?: string
}) {
  const locale = useStorefrontLocale()
  const productId = productIdFromAffiliateTarget(targetUrl)
  const href = productId ? publicProductHref(productId) : null
  const name = title.trim() || t("affUnknownProduct", locale)

  return (
    <div className="min-w-0">
      {href ? (
        <Link href={href} className="font-semibold text-wf-900 hover:underline">
          {name}
        </Link>
      ) : (
        <span className="font-semibold text-wf-900">{name}</span>
      )}
      {trackingParam ? (
        <div className="mt-0.5 font-mono text-[10px] text-wf-500">
          {trackingParam}
        </div>
      ) : null}
    </div>
  )
}
