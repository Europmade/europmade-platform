import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

/** Simple line icons — design system has no icon library yet (icons.md placeholder). */
export function IconFactory({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M9 20v-6h6v6" />
      <path d="M9 11h.01M15 11h.01" />
    </svg>
  )
}

export function IconParts({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="8" r="2.5" />
      <circle cx="12" cy="16" r="2.5" />
      <path d="M10 9.5 11 13.5M14 9.5 13 13.5" />
    </svg>
  )
}

export function IconMaterials({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="M4 8h16v12H4z" />
      <path d="M4 12h16M4 16h16M8 8v12M12 8v12M16 8v12" />
    </svg>
  )
}

export function IconSearch({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function IconStar({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="m12 3 2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 15.8 6.9 18.2l1.2-5.6L3.9 8.8l5.6-.6z" />
    </svg>
  )
}

export function IconCart({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="M3 5h2l2.2 10h9.6L19 8H7" />
      <circle cx="10" cy="19" r="1.4" />
      <circle cx="16" cy="19" r="1.4" />
    </svg>
  )
}

export function IconGlobe({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </svg>
  )
}

export function IconTranslate({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="M4 5h7M7.5 5v2a7 7 0 0 0 7 7" />
      <path d="M5 19h14M12 9l6 10M18 9l-6 10" />
    </svg>
  )
}

export function IconTag({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="M3 12V4h8l9 9-8 8z" />
      <circle cx="8" cy="8" r="1.2" />
    </svg>
  )
}

export function IconStore({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="M4 10h16v10H4z" />
      <path d="M4 10 6 5h12l2 5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  )
}

export function IconUsers({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M19.5 19c0-2-1.5-3.5-3.5-4" />
    </svg>
  )
}

export function IconArrowDown({ className = "h-4 w-4", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="M12 4v14M6 14l6 6 6-6" />
    </svg>
  )
}

export function IconCheck({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="M5 12.5 9.5 17 19 7" />
    </svg>
  )
}

export function IconCross({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function IconEuro({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="M18 7a7 7 0 1 0 0 10" />
      <path d="M5 10h9M5 14h9" />
    </svg>
  )
}

export function IconFile({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  )
}

export function IconPackage({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...stroke}
      {...props}
    >
      <path d="M12 3 4 7v10l8 4 8-4V7z" />
      <path d="M12 13V3M4 7l8 6 8-6" />
    </svg>
  )
}
