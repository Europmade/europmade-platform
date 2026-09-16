"use client"

import Link from "next/link"
import type { PdpProductLinkGroup } from "../../_lib/product-link-pdp"
import {
  currentLinkMember,
  optionsForDimension,
  shouldShowProductLinkSelector,
} from "../../_lib/product-link-pdp"

export function ProductLinkSelector({
  group,
  currentProductId,
}: {
  group: PdpProductLinkGroup
  currentProductId: string
}) {
  if (!shouldShowProductLinkSelector(group)) return null
  const current = currentLinkMember(group, currentProductId)
  if (!current) return null

  return (
    <div className="mt-2 space-y-2">
      {group.dimensions.map((dimension) => {
        const options = optionsForDimension(group, currentProductId, dimension)
        return (
          <div
            key={dimension}
            className="min-w-0 rounded-lg border border-wf-200 px-2.5 py-2"
          >
            <p className="mb-1.5 text-[11px] font-semibold text-wf-800">
              {dimension}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {options.map((option) => {
                const label = option.value
                const className = `flex h-8 min-w-[34px] items-center justify-center rounded-md px-2.5 text-xs ${
                  option.selected
                    ? "border-2 border-wf-900 font-bold text-wf-900"
                    : option.available
                      ? "border border-wf-400 text-wf-700"
                      : "border border-wf-200 text-wf-400 line-through opacity-50"
                }`
                if (!option.available || !option.href) {
                  return (
                    <span
                      key={`${dimension}-${option.value}`}
                      className={className}
                      aria-disabled="true"
                      title="Deze combinatie bestaat niet"
                    >
                      {label}
                    </span>
                  )
                }
                if (option.selected) {
                  return (
                    <span
                      key={`${dimension}-${option.value}`}
                      className={className}
                      aria-current="true"
                    >
                      {label}
                    </span>
                  )
                }
                return (
                  <Link
                    key={`${dimension}-${option.value}`}
                    href={option.href}
                    className={className}
                    title={option.product_title || option.product_id || label}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
