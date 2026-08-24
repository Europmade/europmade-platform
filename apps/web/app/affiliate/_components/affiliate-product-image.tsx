"use client"

import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"

function isDisplayableImageUrl(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.trim()
  return (
    v.startsWith("https://") ||
    v.startsWith("http://") ||
    v.startsWith("/")
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
  const url = isDisplayableImageUrl(src) ? src!.trim() : null
  const locale = useStorefrontLocale()

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
          />
        ) : (
          <span className="px-1 text-center text-[9px] leading-tight text-wf-400">
            {t("affNoPhoto", locale)}
          </span>
        )}
      </div>
    )
  }

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={alt} className={className} />
    )
  }
  return <div className={className} role="img" aria-label={alt} />
}
