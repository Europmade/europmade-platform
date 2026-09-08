import Link from "next/link"

type BrandLogoProps = {
  href?: string
  className?: string
  /** Compacte header vs. iets grotere shell. */
  size?: "sm" | "md"
  /** Optional CMS image URL; falls back to text wordmark. */
  imageSrc?: string | null
}

/**
 * Merkwoordmerk — vervangt grijze logo-placeholders in publieke chrome.
 * Met `imageSrc` wordt het logo met object-contain geschaald (geen vervorming).
 */
export function BrandLogo({
  href = "/",
  className = "",
  size = "sm",
  imageSrc = null,
}: BrandLogoProps) {
  const textClass =
    size === "md"
      ? "text-[17px] tracking-tight tablet:text-[20px]"
      : "text-[15px] tracking-tight tablet:text-[17px]"

  const imgClass =
    size === "md"
      ? "h-8 w-auto max-w-[180px] object-contain tablet:h-9"
      : "h-7 w-auto max-w-[150px] object-contain tablet:h-8"

  const mark = imageSrc ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt="EuropMade"
      className={`${imgClass} ${className}`}
      decoding="async"
    />
  ) : (
    <span
      className={`inline-flex items-baseline font-bold text-wf-900 ${textClass} ${className}`}
      aria-label="EuropMade"
    >
      Europ
      <span className="text-wf-700">Made</span>
    </span>
  )

  if (!href) return mark
  return (
    <Link href={href} className="shrink-0" aria-label="EuropMade home">
      {mark}
    </Link>
  )
}
