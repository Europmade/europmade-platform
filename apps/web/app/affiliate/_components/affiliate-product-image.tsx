"use client"

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
}: {
  src?: string | null
  alt: string
  className?: string
}) {
  const url = isDisplayableImageUrl(src) ? src!.trim() : null
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={alt} className={className} />
    )
  }
  return (
    <div
      className={className}
      role="img"
      aria-label={alt}
    />
  )
}
