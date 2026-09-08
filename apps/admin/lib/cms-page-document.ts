import { emptyLocalized, type LocalizedCms } from "./cms-admin-api"

export const PAGE_SECTION_KEYS = [
  "hero",
  "text",
  "image_text",
  "usps",
  "faq",
  "cta",
  "banner",
] as const

export type PageSectionKey = (typeof PAGE_SECTION_KEYS)[number]

export const PAGE_SECTION_LABELS: Record<PageSectionKey, string> = {
  hero: "Hero",
  text: "Tekst",
  image_text: "Afbeelding + tekst",
  usps: "USP's",
  faq: "FAQ",
  cta: "CTA",
  banner: "Banner",
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

export function createPageSection(key: PageSectionKey): CmsPageSection {
  return {
    id: `pg_${key}_${Date.now()}`,
    key,
    visible: true,
    sortOrder: 50,
    title: emptyLocalized(),
    body: emptyLocalized(),
    image: null,
    href: "",
    ctaLabel: emptyLocalized(),
  }
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
      }
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
