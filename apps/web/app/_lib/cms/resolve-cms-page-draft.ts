/**
 * Pure CMS page draft resolve — safe for Client Components.
 * Must NOT import store fetch helpers or server-only Next APIs.
 */

import { defaultCanonicalForSlug, sanitizeCmsHtml } from "@europmade/utils"
import {
  pickLocalized,
  type LocalizedString,
  type StorefrontLocale,
} from "../i18n/locales"

export type ResolvedCmsCta = {
  id: string
  label: string
  href: string
  variant: "primary" | "secondary" | "link"
  openInNewWindow: boolean
}

export type ResolvedCmsItem = {
  id: string
  icon: string
  title: string
  bodyHtml: string
  href: string
  value: string
  detail: string
}

export type ResolvedCmsFunnelStage = {
  id: string
  kind: "pill" | "hub" | "markets" | "customers" | "tagline"
  label: string
  icon: string
  markets: string[]
}

export type ResolvedCmsPageSection = {
  id: string
  key: string
  visible: boolean
  sortOrder: number
  title: string
  /** Sanitized HTML safe for dangerouslySetInnerHTML */
  bodyHtml: string
  image: string | null
  href: string
  ctaLabel: string
  bannerId: string | null
  items: ResolvedCmsItem[]
  ctas: ResolvedCmsCta[]
  stages: ResolvedCmsFunnelStage[]
  totalScore: string
  maxScore: string
  maxScoreLabel: string
  leftRange: string
  leftLabel: string
  rightRange: string
  rightLabel: string
  boundaryPercent: number
  layout: "horizontal" | "vertical" | "grid"
  offerValue: string
  noteHtml: string
  eyebrow: string
}

export type ResolvedCmsPage = {
  source: "cms" | "none"
  slug: string
  publicPath: string
  title: string
  sections: ResolvedCmsPageSection[]
  seo: {
    title: string
    description: string
    canonical: string
  }
  published: boolean
  visible: boolean
  publishAt: string | null
  expiresAt: string | null
}

export type CmsPageDraftInput = {
  slug?: string
  title?: unknown
  body?: unknown
  cover_url?: string | null
  document?: unknown
  seo_title?: unknown
  seo_description?: unknown
  seo_canonical?: string | null
  published?: boolean
  visible?: boolean
  publish_at?: string | null
  expires_at?: string | null
}

function locOf(value: unknown): LocalizedString {
  if (!value || typeof value !== "object") {
    return { nl: "", en: "", de: "", fr: "" }
  }
  const v = value as Record<string, unknown>
  return {
    nl: typeof v.nl === "string" ? v.nl : "",
    en: typeof v.en === "string" ? v.en : "",
    de: typeof v.de === "string" ? v.de : "",
    fr: typeof v.fr === "string" ? v.fr : "",
  }
}

function plainToHtml(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ""
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return sanitizeCmsHtml(trimmed)
  }
  return sanitizeCmsHtml(
    trimmed
      .split(/\n{2,}/)
      .map((p) => `<p>${escapeMinimal(p).replace(/\n/g, "<br />")}</p>`)
      .join("")
  )
}

function escapeMinimal(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function emptySection(
  partial: Partial<ResolvedCmsPageSection> &
    Pick<ResolvedCmsPageSection, "id" | "key" | "sortOrder">
): ResolvedCmsPageSection {
  return {
    visible: true,
    title: "",
    bodyHtml: "",
    image: null,
    href: "",
    ctaLabel: "",
    bannerId: null,
    items: [],
    ctas: [],
    stages: [],
    totalScore: "",
    maxScore: "",
    maxScoreLabel: "",
    leftRange: "",
    leftLabel: "",
    rightRange: "",
    rightLabel: "",
    boundaryPercent: 50,
    layout: "grid",
    offerValue: "",
    noteHtml: "",
    eyebrow: "",
    ...partial,
  }
}

function resolveItems(
  raw: unknown,
  locale: StorefrontLocale
): ResolvedCmsItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, i) => {
    const s = (item ?? {}) as Record<string, unknown>
    return {
      id: typeof s.id === "string" ? s.id : `item-${i}`,
      icon: typeof s.icon === "string" ? s.icon : "none",
      title: pickLocalized(locOf(s.title), locale),
      bodyHtml: plainToHtml(pickLocalized(locOf(s.body), locale)),
      href: typeof s.href === "string" ? s.href : "",
      value: pickLocalized(locOf(s.value), locale),
      detail: pickLocalized(locOf(s.detail), locale),
    }
  })
}

function resolveCtas(raw: unknown, locale: StorefrontLocale): ResolvedCmsCta[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, i) => {
    const s = (item ?? {}) as Record<string, unknown>
    const variant =
      s.variant === "secondary" || s.variant === "link" ? s.variant : "primary"
    return {
      id: typeof s.id === "string" ? s.id : `cta-${i}`,
      label: pickLocalized(locOf(s.label), locale),
      href: typeof s.href === "string" ? s.href : "",
      variant,
      openInNewWindow: Boolean(s.openInNewWindow),
    }
  })
}

function resolveStages(
  raw: unknown,
  locale: StorefrontLocale
): ResolvedCmsFunnelStage[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, i) => {
    const s = (item ?? {}) as Record<string, unknown>
    const kind = (
      ["pill", "hub", "markets", "customers", "tagline"] as const
    ).includes(s.kind as ResolvedCmsFunnelStage["kind"])
      ? (s.kind as ResolvedCmsFunnelStage["kind"])
      : "pill"
    const markets = Array.isArray(s.markets)
      ? s.markets
          .map((m) => pickLocalized(locOf(m), locale))
          .filter(Boolean)
      : []
    return {
      id: typeof s.id === "string" ? s.id : `stage-${i}`,
      kind,
      label: pickLocalized(locOf(s.label), locale),
      icon: typeof s.icon === "string" ? s.icon : "none",
      markets,
    }
  })
}

function normalizeSections(
  document: unknown,
  legacy: {
    title: LocalizedString
    body: LocalizedString
    cover_url: string | null
  },
  locale: StorefrontLocale
): ResolvedCmsPageSection[] {
  const doc =
    document && typeof document === "object"
      ? (document as { sections?: unknown })
      : null
  const raw = Array.isArray(doc?.sections) ? doc.sections : []

  if (raw.length === 0) {
    const title = pickLocalized(legacy.title, locale)
    const body = pickLocalized(legacy.body, locale)
    if (!title && !body && !legacy.cover_url) return []
    return [
      emptySection({
        id: "legacy_hero",
        key: "hero",
        sortOrder: 0,
        title,
        image: legacy.cover_url,
      }),
      emptySection({
        id: "legacy_text",
        key: "text",
        sortOrder: 10,
        bodyHtml: plainToHtml(body),
      }),
    ].filter((s) => s.title || s.bodyHtml || s.image)
  }

  return raw
    .map((item, i) => {
      const s = (item ?? {}) as Record<string, unknown>
      const key = typeof s.key === "string" ? s.key : "text"
      const layout =
        s.layout === "horizontal" ||
        s.layout === "vertical" ||
        s.layout === "grid"
          ? s.layout
          : key === "steps"
            ? "horizontal"
            : "grid"
      return emptySection({
        id: typeof s.id === "string" ? s.id : `s-${i}`,
        key,
        visible: s.visible !== false,
        sortOrder: Number(s.sortOrder ?? i * 10) || 0,
        title: pickLocalized(locOf(s.title), locale),
        bodyHtml: plainToHtml(pickLocalized(locOf(s.body), locale)),
        image: typeof s.image === "string" ? s.image : null,
        href: typeof s.href === "string" ? s.href : "",
        ctaLabel: pickLocalized(locOf(s.ctaLabel), locale),
        bannerId: typeof s.bannerId === "string" ? s.bannerId : null,
        items: resolveItems(s.items, locale),
        ctas: resolveCtas(s.ctas, locale),
        stages: resolveStages(s.stages, locale),
        totalScore: typeof s.totalScore === "string" ? s.totalScore : "",
        maxScore: typeof s.maxScore === "string" ? s.maxScore : "",
        maxScoreLabel: pickLocalized(locOf(s.maxScoreLabel), locale),
        leftRange: pickLocalized(locOf(s.leftRange), locale),
        leftLabel: pickLocalized(locOf(s.leftLabel), locale),
        rightRange: pickLocalized(locOf(s.rightRange), locale),
        rightLabel: pickLocalized(locOf(s.rightLabel), locale),
        boundaryPercent:
          typeof s.boundaryPercent === "number" && !Number.isNaN(s.boundaryPercent)
            ? s.boundaryPercent
            : 50,
        layout,
        offerValue: pickLocalized(locOf(s.offerValue), locale),
        noteHtml: plainToHtml(pickLocalized(locOf(s.note), locale)),
        eyebrow: pickLocalized(locOf(s.eyebrow), locale),
      })
    })
    .filter((s) => s.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

/** Whether resolved CMS content is rich enough to replace a fixed-page fallback. */
export function resolvedCmsPageHasContent(page: ResolvedCmsPage): boolean {
  return page.sections.some((s) => {
    if (s.bodyHtml.replace(/<[^>]+>/g, "").trim()) return true
    if (s.items.some((it) => it.title || it.bodyHtml || it.value)) return true
    if (s.ctas.some((c) => c.label && c.href)) return true
    if (s.stages.some((st) => st.label || st.markets.length)) return true
    if (s.totalScore || s.leftLabel || s.rightLabel || s.offerValue) return true
    if (s.noteHtml.replace(/<[^>]+>/g, "").trim()) return true
    return false
  })
}

export function resolveCmsPageFromDraft(
  draft: CmsPageDraftInput,
  locale: StorefrontLocale,
  publicPath?: string
): ResolvedCmsPage {
  const slug = (draft.slug ?? "").trim().toLowerCase()
  const path = publicPath || defaultCanonicalForSlug(slug)
  const titleLoc = locOf(draft.title)
  const bodyLoc = locOf(draft.body)
  const seoTitleLoc = draft.seo_title ? locOf(draft.seo_title) : null
  const seoDescLoc = draft.seo_description ? locOf(draft.seo_description) : null
  const title =
    pickLocalized(titleLoc, locale) ||
    pickLocalized(seoTitleLoc ?? { nl: "", en: "", de: "", fr: "" }, locale) ||
    slug
  const sections = normalizeSections(
    draft.document,
    {
      title: titleLoc,
      body: bodyLoc,
      cover_url: draft.cover_url ?? null,
    },
    locale
  )
  const seoTitle =
    (seoTitleLoc ? pickLocalized(seoTitleLoc, locale) : "") || title
  const seoDescription = seoDescLoc ? pickLocalized(seoDescLoc, locale) : ""
  const canonical =
    (typeof draft.seo_canonical === "string" && draft.seo_canonical.trim()) ||
    path ||
    defaultCanonicalForSlug(slug)

  return {
    source: "cms",
    slug,
    publicPath: path,
    title,
    sections,
    seo: {
      title: seoTitle,
      description: seoDescription,
      canonical,
    },
    published: Boolean(draft.published),
    visible: draft.visible !== false,
    publishAt: draft.publish_at ?? null,
    expiresAt: draft.expires_at ?? null,
  }
}

export function emptyResolvedCmsPage(
  slug: string,
  publicPath: string
): ResolvedCmsPage {
  return {
    source: "none",
    slug,
    publicPath,
    title: "",
    sections: [],
    seo: { title: "", description: "", canonical: publicPath },
    published: false,
    visible: true,
    publishAt: null,
    expiresAt: null,
  }
}
