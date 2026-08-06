import Link from "next/link"

type BrandLogoProps = {
  href?: string
  className?: string
  /** Compacte header vs. iets grotere shell. */
  size?: "sm" | "md"
}

/**
 * Merkwoordmerk — vervangt grijze logo-placeholders in publieke chrome.
 */
export function BrandLogo({
  href = "/",
  className = "",
  size = "sm",
}: BrandLogoProps) {
  const textClass =
    size === "md"
      ? "text-[17px] tracking-tight tablet:text-[20px]"
      : "text-[15px] tracking-tight tablet:text-[17px]"

  const mark = (
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
