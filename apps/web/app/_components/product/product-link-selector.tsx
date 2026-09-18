"use client"

import Link from "next/link"
import type { PdpProductLinkGroup } from "../../_lib/product-link-pdp"
import {
  currentLinkMember,
  optionsForDimension,
  shouldShowProductLinkSelector,
  usesImageSwatchForDimension,
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
    <div className="mt-3 space-y-3" data-product-link-selector={group.id}>
      {group.dimensions.map((dimension) => {
        const options = optionsForDimension(group, currentProductId, dimension)
        const useImages = usesImageSwatchForDimension(dimension, options)
        return (
          <div key={dimension} className="min-w-0">
            <p className="mb-1.5 text-[12px] font-semibold text-wf-800">
              {dimension}
            </p>
            <div
              className={`flex flex-wrap ${useImages ? "gap-2.5" : "gap-1.5"}`}
              role="listbox"
              aria-label={dimension}
            >
              {options.map((option) => {
                const label = option.value
                const selected = option.selected
                const available = option.available && Boolean(option.href)

                if (useImages) {
                  const swatchClass = `flex w-[72px] flex-col items-center gap-1 rounded-md p-1 text-center transition-colors ${
                    selected
                      ? "ring-2 ring-wf-900 ring-offset-1"
                      : available
                        ? "hover:bg-wf-50"
                        : "opacity-40"
                  }`
                  const thumb = (
                    <>
                      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded border border-wf-200 bg-wf-50">
                        {option.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={option.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-wf-400">—</span>
                        )}
                      </span>
                      <span
                        className={`text-[11px] leading-tight ${
                          selected
                            ? "font-bold text-wf-900"
                            : available
                              ? "text-wf-700"
                              : "text-wf-400 line-through"
                        }`}
                      >
                        {label}
                      </span>
                    </>
                  )
                  if (!available || !option.href) {
                    return (
                      <span
                        key={`${dimension}-${option.value}`}
                        className={swatchClass}
                        role="option"
                        aria-disabled="true"
                        aria-selected={selected}
                        title="Deze combinatie bestaat niet"
                      >
                        {thumb}
                      </span>
                    )
                  }
                  if (selected) {
                    return (
                      <span
                        key={`${dimension}-${option.value}`}
                        className={swatchClass}
                        role="option"
                        aria-selected="true"
                        aria-current="true"
                      >
                        {thumb}
                      </span>
                    )
                  }
                  return (
                    <Link
                      key={`${dimension}-${option.value}`}
                      href={option.href}
                      className={swatchClass}
                      role="option"
                      aria-selected="false"
                      title={option.product_title || option.product_id || label}
                    >
                      {thumb}
                    </Link>
                  )
                }

                const className = `inline-flex h-9 min-w-[40px] items-center justify-center rounded-md px-3 text-xs ${
                  selected
                    ? "border-2 border-wf-900 font-bold text-wf-900"
                    : available
                      ? "border border-wf-400 text-wf-700 hover:border-wf-700"
                      : "border border-wf-200 text-wf-400 line-through opacity-50"
                }`
                if (!available || !option.href) {
                  return (
                    <span
                      key={`${dimension}-${option.value}`}
                      className={className}
                      role="option"
                      aria-disabled="true"
                      aria-selected={selected}
                      title="Deze combinatie bestaat niet"
                    >
                      {label}
                    </span>
                  )
                }
                if (selected) {
                  return (
                    <span
                      key={`${dimension}-${option.value}`}
                      className={className}
                      role="option"
                      aria-selected="true"
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
                    role="option"
                    aria-selected="false"
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
