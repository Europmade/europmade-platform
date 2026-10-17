import type { CSSProperties, ReactNode } from "react"
import { SECTION_TITLE_COLOR } from "@europmade/utils"

/**
 * Homepage section title. Missing color is #10396B.
 * Missing size keeps the current responsive title (16px, 18px from tablet).
 */
export function HomepageSectionTitle({
  children,
  color,
  fontSize,
  className = "",
  preset = "responsive",
}: {
  children: ReactNode
  color?: string | null
  fontSize?: number | null
  className?: string
  /** Product rails stay at text-lg when no custom size is stored. */
  preset?: "responsive" | "lg"
}) {
  const style: CSSProperties = {
    color: color || SECTION_TITLE_COLOR,
  }
  if (fontSize) style.fontSize = fontSize
  const sizeClass = fontSize
    ? ""
    : preset === "lg"
      ? "text-lg"
      : "text-base tablet:text-lg"
  return (
    <h2 className={`font-bold ${sizeClass} ${className}`.trim()} style={style}>
      {children}
    </h2>
  )
}
