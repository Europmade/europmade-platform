"use client"

import { useState } from "react"
import { resolveMediaUrl } from "@europmade/utils"
import { medusaBackendUrl } from "../../_lib/medusa-backend-url"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"

/**
 * Same host resolution as storefront product cards
 * (`resolveMediaUrl` + current backend origin). Catalog `image_url` is a
 * `/static/...` storage reference, not a URL on the storefront origin.
 */
function displayImageUrl(src: string | null | undefined): string | null {
  return resolveMediaUrl(src, medusaBackendUrl())
}

function QuietPlaceholder({
  alt,
  className,
  label,
}: {
  alt: string
  className?: string
  label: string
}) {
  return (
    <div
      className={className}
      role="img"
      aria-label={alt}
    >
      <span className="px-2 text-center text-[11px] leading-tight text-wf-500">
        {label}
      </span>
    </div>
  )
}

export function AffiliateProductImage({
  src,
  alt,
  className,
  variant = "default",
}: {
  src?: string | null
  alt: string
  className?: string
  variant?: "default" | "thumb"
}) {
  const resolved = displayImageUrl(src)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const url = resolved && failedSrc !== resolved ? resolved : null
  const locale = useStorefrontLocale()
  const placeholder = t("affNoPhoto", locale)

  if (variant === "thumb") {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-wf-200 bg-wf-50">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={alt}
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setFailedSrc(url)}
          />
        ) : (
          <span className="px-1 text-center text-[9px] leading-tight text-wf-400">
            {placeholder}
          </span>
        )}
      </div>
    )
  }

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        className={className}
        onError={() => setFailedSrc(url)}
      />
    )
  }
  return (
    <QuietPlaceholder
      alt={alt}
      label={placeholder}
      className={`flex items-center justify-center ${className ?? ""}`}
    />
  )
}
