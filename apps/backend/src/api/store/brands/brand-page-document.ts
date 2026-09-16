import { persistMediaReference } from "@europmade/utils"

export type BrandPageExtraSection = {
  id: string
  type: "text" | "image" | "image_text"
  title?: string | null
  text?: string | null
  image_url?: string | null
}

export type BrandPageDocument = {
  category_slugs: string[]
  product_ids: string[]
  extra_sections: BrandPageExtraSection[]
}

const EXTRA_TYPES = new Set(["text", "image", "image_text"])

function asString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function asMediaRef(value: unknown, max: number): string | null {
  return persistMediaReference(asString(value, max))
}

export function emptyBrandPageDocument(): BrandPageDocument {
  return { category_slugs: [], product_ids: [], extra_sections: [] }
}

export function sanitizeBrandPageDocument(input: unknown): BrandPageDocument {
  const src =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {}
  const category_slugs = Array.isArray(src.category_slugs)
    ? src.category_slugs
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 24)
    : []
  const product_ids = Array.isArray(src.product_ids)
    ? src.product_ids
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 48)
    : []
  const extra_sections: BrandPageExtraSection[] = []
  if (Array.isArray(src.extra_sections)) {
    for (const row of src.extra_sections) {
      if (!row || typeof row !== "object") continue
      const rec = row as Record<string, unknown>
      const type = typeof rec.type === "string" ? rec.type : ""
      if (!EXTRA_TYPES.has(type)) continue
      extra_sections.push({
        id:
          asString(rec.id, 80) ||
          `sec_${extra_sections.length + 1}_${Date.now()}`,
        type: type as BrandPageExtraSection["type"],
        title: asString(rec.title, 200),
        text: asString(rec.text, 8000),
        image_url: asMediaRef(rec.image_url, 800),
      })
      if (extra_sections.length >= 8) break
    }
  }
  return { category_slugs, product_ids, extra_sections }
}

export type BrandPageDraft = {
  intro: string | null
  story: string | null
  story_title: string | null
  story_image_url: string | null
  logo_url: string | null
  hero_image_url: string | null
  page_document: BrandPageDocument
}

export function liveBrandPageDraft(brand: {
  intro?: string | null
  story?: string | null
  story_title?: string | null
  story_image_url?: string | null
  logo_url?: string | null
  hero_image_url?: string | null
  page_document?: unknown
}): BrandPageDraft {
  return {
    intro: brand.intro ?? null,
    story: brand.story ?? null,
    story_title: brand.story_title ?? null,
    story_image_url: brand.story_image_url ?? null,
    logo_url: brand.logo_url ?? null,
    hero_image_url: brand.hero_image_url ?? null,
    page_document: sanitizeBrandPageDocument(brand.page_document),
  }
}

export function sanitizeBrandPageDraft(
  input: unknown,
  fallback: BrandPageDraft
): BrandPageDraft {
  const src =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {}
  const hasKeys = Object.keys(src).length > 0
  if (!hasKeys) return fallback
  return {
    intro: src.intro !== undefined ? asString(src.intro, 2000) : fallback.intro,
    story: src.story !== undefined ? asString(src.story, 20000) : fallback.story,
    story_title:
      src.story_title !== undefined
        ? asString(src.story_title, 200)
        : fallback.story_title,
    story_image_url:
      src.story_image_url !== undefined
        ? asMediaRef(src.story_image_url, 800)
        : fallback.story_image_url,
    logo_url:
      src.logo_url !== undefined ? asMediaRef(src.logo_url, 800) : fallback.logo_url,
    hero_image_url:
      src.hero_image_url !== undefined
        ? asMediaRef(src.hero_image_url, 800)
        : fallback.hero_image_url,
    page_document:
      src.page_document !== undefined
        ? sanitizeBrandPageDocument(src.page_document)
        : fallback.page_document,
  }
}

export function mergeDraftPatch(
  current: BrandPageDraft,
  patch: {
    intro?: string | null
    story?: string | null
    story_title?: string | null
    story_image_url?: string | null
    logo_url?: string | null
    hero_image_url?: string | null
    page_document?: unknown
  }
): BrandPageDraft {
  return {
    intro: patch.intro !== undefined ? patch.intro : current.intro,
    story: patch.story !== undefined ? patch.story : current.story,
    story_title:
      patch.story_title !== undefined ? patch.story_title : current.story_title,
    story_image_url:
      patch.story_image_url !== undefined
        ? persistMediaReference(patch.story_image_url)
        : current.story_image_url,
    logo_url:
      patch.logo_url !== undefined
        ? persistMediaReference(patch.logo_url)
        : current.logo_url,
    hero_image_url:
      patch.hero_image_url !== undefined
        ? persistMediaReference(patch.hero_image_url)
        : current.hero_image_url,
    page_document:
      patch.page_document !== undefined
        ? sanitizeBrandPageDocument(patch.page_document)
        : current.page_document,
  }
}

export function applyDraftToLiveFields(draft: BrandPageDraft) {
  return {
    intro: draft.intro,
    story: draft.story,
    story_title: draft.story_title,
    story_image_url: draft.story_image_url,
    logo_url: draft.logo_url,
    hero_image_url: draft.hero_image_url,
    page_document: draft.page_document,
    public_page_status: "published" as const,
    page_review_status: "published",
  }
}
