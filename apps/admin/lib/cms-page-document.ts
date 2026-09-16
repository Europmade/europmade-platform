import { emptyLocalized, type LocalizedCms } from "./cms-admin-api"

export const PAGE_SECTION_KEYS = [
  "hero",
  "text",
  "image_text",
  "cards",
  "usps",
  "steps",
  "score_breakdown",
  "threshold",
  "funnel",
  "pricing_highlight",
  "roles",
  "faq",
  "cta",
  "cta_group",
  "offer_band",
  "banner",
] as const

export type PageSectionKey = (typeof PAGE_SECTION_KEYS)[number]

export const PAGE_SECTION_LABELS: Record<PageSectionKey, string> = {
  hero: "Hero",
  text: "Tekst",
  image_text: "Afbeelding + tekst",
  cards: "Kaarten / USP-grid",
  usps: "USP's (alias kaarten)",
  steps: "Stappen / flow",
  score_breakdown: "Score-breakdown",
  threshold: "Drempel / threshold",
  funnel: "Funnel / marktvisual",
  pricing_highlight: "Prijs / highlight",
  roles: "Rollen",
  faq: "FAQ",
  cta: "CTA (enkel)",
  cta_group: "CTA-groep",
  offer_band: "Offer-band",
  banner: "Banner",
}

/** Icon keys mapped in storefront + studio (commercial line icons). */
export const CMS_ICON_KEYS = [
  "none",
  "step_number",
  "factory",
  "parts",
  "materials",
  "search",
  "star",
  "cart",
  "globe",
  "euro",
  "package",
  "file",
  "store",
  "translate",
  "users",
  "tag",
  "check",
  "cross",
  "arrow_down",
] as const

export type CmsIconKey = (typeof CMS_ICON_KEYS)[number]

/** Admin dropdown labels for icon keys. */
export const CMS_ICON_LABELS: Partial<Record<CmsIconKey, string>> = {
  none: "Geen",
  step_number: "Volgnummer",
}

export type CmsCtaVariant = "primary" | "secondary" | "link"

export type CmsPageCtaItem = {
  id: string
  label: LocalizedCms
  href: string
  variant: CmsCtaVariant
  openInNewWindow?: boolean
}

export type CmsPageListItem = {
  id: string
  icon?: CmsIconKey | string
  title: LocalizedCms
  body: LocalizedCms
  href?: string
  /** Optional numeric/short value (score, €0, 10%, …). */
  value?: LocalizedCms
  /** Optional secondary label under value. */
  detail?: LocalizedCms
}

export type CmsFunnelStageKind = "pill" | "hub" | "markets" | "customers" | "tagline"

export type CmsFunnelStage = {
  id: string
  kind: CmsFunnelStageKind
  label: LocalizedCms
  icon?: CmsIconKey | string
  /** Used when kind === "markets". */
  markets?: LocalizedCms[]
}

export type CmsPageSection = {
  id: string
  key: PageSectionKey
  visible: boolean
  sortOrder: number
  title: LocalizedCms
  body: LocalizedCms
  image?: string | null
  href?: string
  ctaLabel?: LocalizedCms
  bannerId?: string | null
  /** Nested list items (cards, steps, score items, faq, roles, pricing tiles). */
  items?: CmsPageListItem[]
  /** Multiple CTAs (cta_group, offer_band, hero extras). */
  ctas?: CmsPageCtaItem[]
  /** score_breakdown */
  totalScore?: string
  maxScore?: string
  maxScoreLabel?: LocalizedCms
  /** threshold */
  leftRange?: LocalizedCms
  leftLabel?: LocalizedCms
  rightRange?: LocalizedCms
  rightLabel?: LocalizedCms
  boundaryPercent?: number
  /** steps / cards layout */
  layout?: "horizontal" | "vertical" | "grid"
  /** funnel stages */
  stages?: CmsFunnelStage[]
  /** offer_band / pricing note */
  offerValue?: LocalizedCms
  note?: LocalizedCms
  /** pricing_highlight eyebrow */
  eyebrow?: LocalizedCms
}

export type CmsPageDocument = {
  sections: CmsPageSection[]
}

function loc(value: unknown): LocalizedCms {
  if (!value || typeof value !== "object") return emptyLocalized()
  const v = value as Record<string, unknown>
  return {
    nl: typeof v.nl === "string" ? v.nl : "",
    en: typeof v.en === "string" ? v.en : "",
    de: typeof v.de === "string" ? v.de : "",
    fr: typeof v.fr === "string" ? v.fr : "",
  }
}

function parseItems(raw: unknown): CmsPageListItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, i) => {
    const s = (item ?? {}) as Record<string, unknown>
    return {
      id: typeof s.id === "string" ? s.id : `item_${i}`,
      icon: typeof s.icon === "string" ? s.icon : "none",
      title: loc(s.title),
      body: loc(s.body),
      href: typeof s.href === "string" ? s.href : "",
      value: s.value ? loc(s.value) : emptyLocalized(),
      detail: s.detail ? loc(s.detail) : emptyLocalized(),
    }
  })
}

function parseCtas(raw: unknown): CmsPageCtaItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, i) => {
    const s = (item ?? {}) as Record<string, unknown>
    const variant =
      s.variant === "secondary" || s.variant === "link" ? s.variant : "primary"
    return {
      id: typeof s.id === "string" ? s.id : `cta_${i}`,
      label: loc(s.label),
      href: typeof s.href === "string" ? s.href : "",
      variant,
      openInNewWindow: Boolean(s.openInNewWindow),
    }
  })
}

function parseStages(raw: unknown): CmsFunnelStage[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, i) => {
    const s = (item ?? {}) as Record<string, unknown>
    const kind = (
      ["pill", "hub", "markets", "customers", "tagline"] as const
    ).includes(s.kind as CmsFunnelStageKind)
      ? (s.kind as CmsFunnelStageKind)
      : "pill"
    const markets = Array.isArray(s.markets)
      ? s.markets.map((m) => loc(m))
      : []
    return {
      id: typeof s.id === "string" ? s.id : `stage_${i}`,
      kind,
      label: loc(s.label),
      icon: typeof s.icon === "string" ? s.icon : "none",
      markets,
    }
  })
}

export function createPageSection(key: PageSectionKey): CmsPageSection {
  const base: CmsPageSection = {
    id: `pg_${key}_${Date.now()}`,
    key,
    visible: true,
    sortOrder: 50,
    title: emptyLocalized(),
    body: emptyLocalized(),
    image: null,
    href: "",
    ctaLabel: emptyLocalized(),
    bannerId: null,
    items: [],
    ctas: [],
    stages: [],
    totalScore: "",
    maxScore: "",
    maxScoreLabel: emptyLocalized(),
    leftRange: emptyLocalized(),
    leftLabel: emptyLocalized(),
    rightRange: emptyLocalized(),
    rightLabel: emptyLocalized(),
    boundaryPercent: 50,
    layout: key === "steps" ? "horizontal" : "grid",
    offerValue: emptyLocalized(),
    note: emptyLocalized(),
    eyebrow: emptyLocalized(),
  }
  if (key === "cta_group") {
    base.ctas = [
      {
        id: `cta_${Date.now()}`,
        label: emptyLocalized(),
        href: "",
        variant: "primary",
      },
    ]
  }
  if (key === "faq" || key === "cards" || key === "usps" || key === "roles" || key === "steps") {
    base.items = [
      {
        id: `item_${Date.now()}`,
        icon: "none",
        title: emptyLocalized(),
        body: emptyLocalized(),
        href: "",
        value: emptyLocalized(),
        detail: emptyLocalized(),
      },
    ]
  }
  if (key === "score_breakdown") {
    base.totalScore = "100"
    base.maxScore = "100"
  }
  if (key === "funnel") {
    base.stages = [
      {
        id: `stage_${Date.now()}`,
        kind: "pill",
        label: emptyLocalized(),
        icon: "none",
        markets: [],
      },
    ]
  }
  return base
}

export function documentFromLegacy(input: {
  title: LocalizedCms
  body: LocalizedCms
  cover_url?: string | null
  document?: unknown
}): CmsPageDocument {
  const raw = input.document
  if (raw && typeof raw === "object" && Array.isArray((raw as { sections?: unknown }).sections)) {
    const sections = ((raw as { sections: unknown[] }).sections).map((item, i) => {
      const s = (item ?? {}) as Record<string, unknown>
      const key = PAGE_SECTION_KEYS.includes(s.key as PageSectionKey)
        ? (s.key as PageSectionKey)
        : "text"
      return {
        id: typeof s.id === "string" ? s.id : `pg_${i}`,
        key,
        visible: s.visible !== false,
        sortOrder: Number(s.sortOrder ?? i * 10) || 0,
        title: loc(s.title),
        body: loc(s.body),
        image: typeof s.image === "string" ? s.image : null,
        href: typeof s.href === "string" ? s.href : "",
        ctaLabel: loc(s.ctaLabel),
        bannerId: typeof s.bannerId === "string" ? s.bannerId : null,
        items: parseItems(s.items),
        ctas: parseCtas(s.ctas),
        stages: parseStages(s.stages),
        totalScore: typeof s.totalScore === "string" ? s.totalScore : "",
        maxScore: typeof s.maxScore === "string" ? s.maxScore : "",
        maxScoreLabel: loc(s.maxScoreLabel),
        leftRange: loc(s.leftRange),
        leftLabel: loc(s.leftLabel),
        rightRange: loc(s.rightRange),
        rightLabel: loc(s.rightLabel),
        boundaryPercent:
          typeof s.boundaryPercent === "number" && !Number.isNaN(s.boundaryPercent)
            ? s.boundaryPercent
            : 50,
        layout:
          s.layout === "horizontal" || s.layout === "vertical" || s.layout === "grid"
            ? s.layout
            : key === "steps"
              ? "horizontal"
              : "grid",
        offerValue: loc(s.offerValue),
        note: loc(s.note),
        eyebrow: loc(s.eyebrow),
      } satisfies CmsPageSection
    })
    if (sections.length > 0) return { sections }
  }
  return {
    sections: [
      {
        id: "pg_hero",
        key: "hero",
        visible: true,
        sortOrder: 0,
        title: input.title,
        body: emptyLocalized(),
        image: input.cover_url ?? null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        ctas: [],
        stages: [],
      },
      {
        id: "pg_text",
        key: "text",
        visible: true,
        sortOrder: 10,
        title: emptyLocalized(),
        body: input.body,
        image: null,
        href: "",
        ctaLabel: emptyLocalized(),
        bannerId: null,
        items: [],
        ctas: [],
        stages: [],
      },
    ],
  }
}

export function syncLegacyFromDocument(doc: CmsPageDocument): {
  title: LocalizedCms
  body: LocalizedCms
  cover_url: string | null
} {
  const hero = doc.sections.find((s) => s.key === "hero")
  const texts = doc.sections.filter((s) => s.key === "text" || s.key === "image_text")
  const body: LocalizedCms = emptyLocalized()
  for (const lang of ["nl", "en", "de", "fr"] as const) {
    body[lang] = texts.map((t) => t.body[lang]).filter(Boolean).join("\n\n")
  }
  return {
    title: hero?.title ?? emptyLocalized(),
    body,
    cover_url: hero?.image ?? null,
  }
}

/** True when section has editable structured or body content. */
export function cmsSectionHasMeaningfulContent(section: CmsPageSection): boolean {
  const langs = ["nl", "en", "de", "fr"] as const
  const hasLoc = (v?: LocalizedCms | null) =>
    !!v && langs.some((l) => (v[l] || "").replace(/<[^>]+>/g, "").trim().length > 0)
  if (hasLoc(section.title) || hasLoc(section.body)) return true
  if (section.totalScore?.trim() || section.maxScore?.trim()) return true
  if (hasLoc(section.leftLabel) || hasLoc(section.rightLabel)) return true
  if (hasLoc(section.offerValue) || hasLoc(section.note) || hasLoc(section.eyebrow))
    return true
  if ((section.items ?? []).some((it) => hasLoc(it.title) || hasLoc(it.body) || hasLoc(it.value)))
    return true
  if ((section.ctas ?? []).some((c) => hasLoc(c.label) && c.href.trim())) return true
  if ((section.stages ?? []).some((st) => hasLoc(st.label) || (st.markets ?? []).some(hasLoc)))
    return true
  if (section.image) return true
  if (section.href && hasLoc(section.ctaLabel)) return true
  return false
}
