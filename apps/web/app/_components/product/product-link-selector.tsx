"use client"

import Link from "next/link"
import type { PdpProductLinkGroup } from "../../_lib/product-link-pdp"
import {
  shouldShowProductLinkSelector,
  storefrontProductHref,
  usesImageSwatchForDimension,
} from "../../_lib/product-link-pdp"

/**
 * Related products stay separate articles. Links open the other product page.
 * This is not a variant picker for the current product.
 */
export function ProductLinkSelector({
  group,
  currentProductId,
}: {
  group: PdpProductLinkGroup
  currentProductId: string
}) {
  if (!shouldShowProductLinkSelector(group)) return null
  const useImages = usesImageSwatchForDimension(group.dimensions[0] || "", group.members)

  return (
    <div className="mt-3" data-product-link-selector={group.id} data-related-products="true">
      <p className="mb-1.5 text-[12px] font-semibold text-wf-800">Andere producten</p>
      <ul className="space-y-1.5">
        {group.members.map((member) => {
          const specs = group.dimensions
            .map((dimension) => (member.values[dimension] || "").trim())
            .filter(Boolean)
            .join(" · ")
          const title = member.product_title || specs || member.product_id
          const current = member.product_id === currentProductId
          const body = (
            <>
              {useImages ? (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-wf-200 bg-wf-50">
                  {member.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-wf-400">—</span>
                  )}
                </span>
              ) : null}
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-wf-900">{title}</span>
                {specs ? (
                  <span className="block text-[11px] text-wf-600">{specs}</span>
                ) : null}
              </span>
            </>
          )
          if (current) {
            return (
              <li key={member.product_id}>
                <span className="flex items-center gap-2 rounded border border-wf-900 bg-wf-50 px-2 py-1.5">
                  {body}
                </span>
              </li>
            )
          }
          return (
            <li key={member.product_id}>
              <Link
                href={storefrontProductHref(member.product_id)}
                className="flex items-center gap-2 rounded border border-wf-300 px-2 py-1.5 hover:border-wf-700"
              >
                {body}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
