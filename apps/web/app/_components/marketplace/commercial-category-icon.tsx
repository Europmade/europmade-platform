"use client"

import { resolveMediaUrl } from "@europmade/utils"
import { medusaBackendUrl } from "../../_lib/medusa-backend-url"
import type { CommercialNavGroupDto } from "../../_lib/category-nav"

function NeutralPlaceholder({ size }: { size: number }) {
  const stroke = Math.max(1.25, size / 22)
  return (
    <svg
      width={size * 0.52}
      height={size * 0.52}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-wf-400"
    >
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <path
        d="M9 12.5h6M12 9.5v6"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CommercialCategoryIcon({
  group,
  size = 40,
}: {
  group: Pick<CommercialNavGroupDto, "image_url" | "icon_url">
  size?: number
}) {
  const src = resolveMediaUrl(
    group.icon_url || group.image_url,
    medusaBackendUrl()
  )
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-wf-100"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <NeutralPlaceholder size={size} />
      )}
    </span>
  )
}
