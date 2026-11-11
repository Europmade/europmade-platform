"use client"

import Link from "next/link"
import { Badge } from "@europmade/ui"
import type { CartLineView } from "../../_lib/order-service-api"
import {
  fallbackCartLineMeta,
  type CartLineMeta,
} from "../../_lib/cart-line-meta"
import { partnerHref } from "../../_lib/partner-profiles"
import { formatEuro } from "../storefront-shell"
import { ProductThumbBlock } from "./product-rails"

export function resolveLineMeta(
  line: CartLineView,
  metaMap: Record<string, CartLineMeta>
): CartLineMeta {
  return metaMap[line.offer_id] ?? fallbackCartLineMeta(line.offer_id, line.seller_id)
}

export function CartLineCard({
  line,
  meta,
  actions,
  compact = false,
}: {
  line: CartLineView
  meta: CartLineMeta
  actions?: React.ReactNode
  compact?: boolean
}) {
  const sellerHref = partnerHref(meta.seller_name)
  const productHref = meta.slug ? `/product/${meta.slug}` : undefined

  return (
    <article
      className={`flex gap-3.5 ${compact ? "py-2" : "border-b border-wf-100 py-5 last:border-0"}`}
    >
      {productHref ? (
        <Link href={productHref}>
          <ProductThumbBlock
            seed={meta.offer_id}
            title={meta.title}
            className={compact ? "h-16 w-16" : "h-32 w-32 tablet:h-36 tablet:w-36"}
          />
        </Link>
      ) : (
        <ProductThumbBlock
          seed={meta.offer_id}
          title={meta.title}
          className={compact ? "h-16 w-16" : "h-32 w-32 tablet:h-36 tablet:w-36"}
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {meta.verified ? (
              <Badge variant="solid" className="mb-1.5 px-1.5 py-0.5 text-[9.5px]">
                EU Verified™
              </Badge>
            ) : null}
            {productHref ? (
              <Link href={productHref} className="hover:underline">
                <h3
                  className={`font-semibold text-wf-900 ${compact ? "text-sm" : "text-[16px] leading-snug"}`}
                >
                  {meta.title}
                </h3>
              </Link>
            ) : (
              <h3 className={`font-semibold text-wf-900 ${compact ? "text-sm" : "text-[16px]"}`}>
                {meta.title}
              </h3>
            )}
            <p className="mt-1 text-xs text-wf-600">
              Verkoper:{" "}
              <Link href={sellerHref} className="font-semibold text-wf-800 underline-offset-2 hover:underline">
                {meta.seller_name}
              </Link>
            </p>
          </div>
          <p className={`shrink-0 font-bold text-wf-900 ${compact ? "text-sm" : "text-lg"}`}>
            {formatEuro(line.total_unit_price * line.quantity)}
          </p>
        </div>

        <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-wf-600 ${compact ? "" : "text-[12.5px]"}`}>
          <span>Levertijd: {meta.delivery}</span>
          <span>{meta.stock}</span>
          {!compact ? <span>{meta.returns}</span> : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-xs text-wf-500">
            {formatEuro(line.total_unit_price)} / stuk · {line.quantity}×
          </p>
          {actions}
        </div>
      </div>
    </article>
  )
}

export const FREE_SHIPPING_THRESHOLD_EUR = 50

export function freeShippingMessage(subtotalEur: number): string | null {
  if (subtotalEur >= FREE_SHIPPING_THRESHOLD_EUR) {
    return "Gefeliciteerd, je bestelling wordt gratis verzonden."
  }
  const remaining = FREE_SHIPPING_THRESHOLD_EUR - subtotalEur
  return `Nog ${formatEuro(remaining)} tot gratis verzending.`
}
