/**
 * Topic visuals for the buy guide — attribute icons, not product photos.
 * Prefer CMS/Product Cloud `imageSrc` when present; otherwise map topic → icon.
 */

export type TopicIconKey =
  | "cpu"
  | "memory"
  | "display"
  | "battery"
  | "wireless"
  | "scale"
  | "usbc"
  | "material"
  | "color"
  | "fit"
  | "energy"
  | "garden"
  | "suction"
  | "light"
  | "organic"
  | "generic"

const ALIASES: Record<string, TopicIconKey> = {
  processor: "cpu",
  cpu: "cpu",
  chip: "cpu",
  geheugen: "memory",
  memory: "memory",
  ram: "memory",
  scherm: "display",
  display: "display",
  screen: "display",
  batterij: "battery",
  battery: "battery",
  accu: "battery",
  bluetooth: "wireless",
  draadloos: "wireless",
  wireless: "wireless",
  gewicht: "scale",
  weight: "scale",
  scale: "scale",
  "usb-c": "usbc",
  usbc: "usbc",
  usb: "usbc",
  materiaal: "material",
  material: "material",
  stof: "material",
  kleur: "color",
  color: "color",
  colour: "color",
  maat: "fit",
  pasvorm: "fit",
  fit: "fit",
  size: "fit",
  energieklasse: "energy",
  energy: "energy",
  maaibreedte: "garden",
  oppervlakte: "garden",
  elektrisch: "garden",
  garden: "garden",
  zuigkracht: "suction",
  suction: "suction",
  lichtsterkte: "light",
  light: "light",
  biologisch: "organic",
  organic: "organic",
}

/** Resolve icon key from topic label / id / legacy imageKind. */
export function resolveTopicIconKey(
  topic: string,
  imageKind?: string | null
): TopicIconKey {
  const raw = `${topic} ${imageKind ?? ""}`.toLowerCase()
  for (const [alias, key] of Object.entries(ALIASES)) {
    if (raw.includes(alias)) return key
  }
  return "generic"
}

const TINT: Record<TopicIconKey, string> = {
  cpu: "#eef2ff",
  memory: "#f0f9ff",
  display: "#f5f3ff",
  battery: "#ecfdf5",
  wireless: "#eff6ff",
  scale: "#fff7ed",
  usbc: "#f8fafc",
  material: "#faf5f0",
  color: "#fdf2f8",
  fit: "#f0fdfa",
  energy: "#fefce8",
  garden: "#f0fdf4",
  suction: "#f1f5f9",
  light: "#fffbeb",
  organic: "#f7fee7",
  generic: "#f5f6f8",
}

function IconSvg({ icon }: { icon: TopicIconKey }) {
  const common = {
    width: 40,
    height: 40,
    viewBox: "0 0 40 40",
    fill: "none",
    "aria-hidden": true as const,
  }
  const stroke = "#0f172a"
  switch (icon) {
    case "cpu":
      return (
        <svg {...common}>
          <rect x="11" y="11" width="18" height="18" rx="2" stroke={stroke} strokeWidth="1.6" />
          <rect x="16" y="16" width="8" height="8" rx="1" stroke={stroke} strokeWidth="1.4" />
          <path d="M15 7v4M20 7v4M25 7v4M15 29v4M20 29v4M25 29v4M7 15h4M7 20h4M7 25h4M29 15h4M29 20h4M29 25h4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "memory":
      return (
        <svg {...common}>
          <rect x="8" y="12" width="24" height="16" rx="2" stroke={stroke} strokeWidth="1.6" />
          <path d="M12 16v8M16 16v8M20 16v8M24 16v8M28 16v8" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M11 28v3M29 28v3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "display":
      return (
        <svg {...common}>
          <rect x="6" y="9" width="28" height="18" rx="2" stroke={stroke} strokeWidth="1.6" />
          <path d="M16 31h8M20 27v4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "battery":
      return (
        <svg {...common}>
          <rect x="7" y="13" width="22" height="14" rx="2" stroke={stroke} strokeWidth="1.6" />
          <path d="M29 17h3v6h-3" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="10" y="16" width="12" height="8" rx="1" fill={stroke} opacity="0.85" />
        </svg>
      )
    case "wireless":
      return (
        <svg {...common}>
          <path d="M12 18c4.5-4.5 11.5-4.5 16 0" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M15.5 21.5c2.6-2.6 6.4-2.6 9 0" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="20" cy="26" r="1.8" fill={stroke} />
        </svg>
      )
    case "scale":
      return (
        <svg {...common}>
          <path d="M20 8v4M12 14h16" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M14 14l-4 12h8l-4-12zM26 14l-4 12h8l-4-12z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="20" cy="12" r="1.5" fill={stroke} />
        </svg>
      )
    case "usbc":
      return (
        <svg {...common}>
          <rect x="10" y="16" width="20" height="8" rx="4" stroke={stroke} strokeWidth="1.6" />
          <path d="M14 20h12" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "material":
      return (
        <svg {...common}>
          <path d="M20 7l12 7v12l-12 7-12-7V14l12-7z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M20 20l12-6M20 20v13M20 20L8 14" stroke={stroke} strokeWidth="1.4" />
        </svg>
      )
    case "color":
      return (
        <svg {...common}>
          <circle cx="15" cy="17" r="6" stroke={stroke} strokeWidth="1.5" />
          <circle cx="25" cy="17" r="6" stroke={stroke} strokeWidth="1.5" />
          <circle cx="20" cy="25" r="6" stroke={stroke} strokeWidth="1.5" />
        </svg>
      )
    case "fit":
      return (
        <svg {...common}>
          <path d="M14 10h12v6l-3 2v10h-6V18l-3-2V10z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M17 10V8a3 3 0 016 0v2" stroke={stroke} strokeWidth="1.5" />
        </svg>
      )
    case "energy":
      return (
        <svg {...common}>
          <path d="M22 7l-10 14h7l-1 12 10-14h-7l1-12z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )
    case "garden":
      return (
        <svg {...common}>
          <path d="M20 32V18" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M20 20c-6-2-9-8-8-12 5 1 8 6 8 12zM20 20c6-2 9-8 8-12-5 1-8 6-8 12z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case "suction":
      return (
        <svg {...common}>
          <path d="M10 26h14a6 6 0 000-12H18" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 14c0-3 2.5-5 5-5s5 2 5 5" stroke={stroke} strokeWidth="1.5" />
          <path d="M8 28l4-4M6 24l5 0" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    case "light":
      return (
        <svg {...common}>
          <circle cx="20" cy="16" r="7" stroke={stroke} strokeWidth="1.6" />
          <path d="M17 24h6v3a2 2 0 01-2 2h-2a2 2 0 01-2-2v-3zM20 7V5M28 16h2M10 16H8M25.5 10.5l1.5-1.5M14.5 10.5L13 9" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "organic":
      return (
        <svg {...common}>
          <path d="M20 30c0-10 8-14 12-16-1 10-7 16-12 16zM20 30c0-10-8-14-12-16 1 10 7 16 12 16z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M20 30V14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="20" cy="20" r="10" stroke={stroke} strokeWidth="1.6" />
          <path d="M20 14v8M20 26h.01" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
  }
}

type TopicVisualFaceProps = {
  topic: string
  imageKind?: string | null
  /** Future Product Cloud / CMS image — preferred when set. */
  imageSrc?: string | null
  caption?: string | null
  className?: string
  /** Compact icon tile for attribute rows. */
  compact?: boolean
}

/**
 * Renders Product Cloud image when available, else premium attribute icon.
 */
export function TopicVisualFace({
  topic,
  imageKind,
  imageSrc,
  caption,
  className = "",
  compact = false,
}: TopicVisualFaceProps) {
  const icon = resolveTopicIconKey(topic, imageKind)
  const bg = TINT[icon]

  if (imageSrc) {
    return (
      <div
        className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-xl ${className}`}
        style={{ background: bg }}
        data-topic-visual="photo"
        data-topic-icon={icon}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={caption ?? topic}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${
        compact ? "h-10 w-10 rounded-md" : "aspect-square rounded-xl"
      } ${className}`}
      style={{ background: bg }}
      data-topic-visual="icon"
      data-topic-icon={icon}
      role="img"
      aria-label={caption ?? topic}
    >
      <div
        className={`transition duration-300 group-hover:scale-110 ${
          compact ? "scale-[0.72]" : ""
        }`}
      >
        <IconSvg icon={icon} />
      </div>
    </div>
  )
}
