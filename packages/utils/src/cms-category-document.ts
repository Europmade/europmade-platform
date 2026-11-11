/**
 * Category CMS document v2 — block library, profiles, provenance.
 * Stored inside cms_category.draft_document / published_document (Published/Draft).
 * Fase 1A: schema, allowlists, stable ids, v1 compat. No intelligence table.
 */

export type CategoryCmsLocale = "nl" | "en" | "de" | "fr"

export type CategoryCmsLocalized = Record<CategoryCmsLocale, string>

export type CategoryCmsProfile = "level_1" | "level_2" | "level_3"

export type CategoryCmsBlockType =
  | "hero"
  | "usp_bar"
  | "intro"
  | "subcategory_tiles"
  | "product_group_tiles"
  | "product_carousel"
  | "product_grid"
  | "filters"
  | "brand_overview"
  | "brand_story"
  | "choice_assistant_cta"
  | "advice_compare"
  | "product_comparison"
  | "spec_explain"
  | "buying_guide"
  | "faq"
  | "why_europmade"
  | "related_products"
  | "seo_content"
  | "ad_slot"
  | "phase_navigation"
  | "shortcuts"
  | "featured_product"
  | "inspiration"
  | "maintenance"

export type CategoryCmsContentSource =
  | "product_cloud"
  | "cms"
  | "ai"
  | "hybrid"
  | "advertising"

export type CategoryCmsLocaleOrigin = "source" | "machine" | "manual"

export type CategoryCmsBlockProvenance = {
  source: CategoryCmsContentSource
  dynamic: boolean
  ai_may_propose: boolean
  /** Block-level, or per USP slot index "0"|"1"|"2"|"3". */
  manual_override: boolean | Record<string, boolean>
  approval_required: boolean
  content_version: string
  generated_at?: string | null
  generated_by?: string | null
  prompt_version?: string | null
  locale_origins?: Partial<
    Record<string, Partial<Record<CategoryCmsLocale, CategoryCmsLocaleOrigin>>>
  >
}

export type CategoryCmsUspSlot = {
  id: string
  icon_key: string
  title: CategoryCmsLocalized
  body: CategoryCmsLocalized
}

/** Optional visual settings. Absent fields use the V11 defaults. No migration: this lives in the existing document JSON. */
export type CategoryCmsImageRatio = "original" | "16:9" | "4:3" | "1:1" | "3:2"
export type CategoryCmsImageFit = "contain" | "cover"

/** Optional crop and copy stored on a V2 block. Missing fields keep the older document valid. */
export type CategoryCmsImageFrame = {
  ratio?: CategoryCmsImageRatio
  fit?: CategoryCmsImageFit
  position_x?: "left" | "center" | "right"
  position_y?: "top" | "center" | "bottom"
}

export type CategoryCmsImage = {
  asset_id?: string | null
  url?: string | null
  alt?: CategoryCmsLocalized
  caption?: CategoryCmsLocalized
  frame?: CategoryCmsImageFrame
}

export type CategoryCmsPresentation = {
  background_color?: string
  text_color?: string
  align?: "left" | "center"
  columns?: number
  image_position?: "left" | "right"
  padding?: "sm" | "md" | "lg"
  radius?: "none" | "md" | "lg"
  button_style?: "solid" | "outline"
}

export type CategoryCmsBlockBase = {
  id: string
  type: CategoryCmsBlockType
  visible: boolean
  presentation?: CategoryCmsPresentation
}

export type CategoryCmsHeroBlock = CategoryCmsBlockBase & {
  type: "hero"
  title: CategoryCmsLocalized
  subtitle: CategoryCmsLocalized
  intro: CategoryCmsLocalized
  image_url: string | null
  hero_visible: boolean
  banner_id: string | null
  banner_visible: boolean
  banner: Record<string, unknown> | null
  primary_cta_label?: CategoryCmsLocalized
  primary_cta_href?: string
  secondary_cta_label?: CategoryCmsLocalized
  secondary_cta_href?: string
  image_asset_id?: string | null
  image_alt?: CategoryCmsLocalized
  image_frame?: CategoryCmsImageFrame
  mobile_image_url?: string | null
  mobile_image_asset_id?: string | null
  mobile_image_alt?: CategoryCmsLocalized
  mobile_image_frame?: CategoryCmsImageFrame
}

export type CategoryCmsUspBarBlock = CategoryCmsBlockBase & {
  type: "usp_bar"
  slots: [CategoryCmsUspSlot, CategoryCmsUspSlot, CategoryCmsUspSlot, CategoryCmsUspSlot]
}

export type CategoryCmsIntroBlock = CategoryCmsBlockBase & {
  type: "intro"
  body: CategoryCmsLocalized
}

export type CategoryCmsTilesBlock = CategoryCmsBlockBase & {
  type: "subcategory_tiles" | "product_group_tiles"
  title: CategoryCmsLocalized
  /** PC children; empty = all children of current category. */
  include_slugs: string[]
  max_items: number
  tile_images?: Array<{ slug: string; image: CategoryCmsImage }>
}

export type CategoryCmsProductCarouselBlock = CategoryCmsBlockBase & {
  type: "product_carousel"
  title: CategoryCmsLocalized
  sort: "relevance" | "newest" | "price_asc" | "price_desc"
  limit: number
}

export type CategoryCmsProductGridBlock = CategoryCmsBlockBase & {
  type: "product_grid"
  title: CategoryCmsLocalized
  sort: "relevance" | "newest" | "price_asc" | "price_desc"
  limit: number
}

export type CategoryCmsFiltersBlock = CategoryCmsBlockBase & {
  type: "filters"
  controls: Array<{
    attributeKey: string
    visible: boolean
    label: CategoryCmsLocalized
    sortOrder: number
  }>
}

export type CategoryCmsBrandOverviewBlock = CategoryCmsBlockBase & {
  type: "brand_overview"
  title: CategoryCmsLocalized
  max_items: number
  /** Reserved. Sponsored brand placement stays off. */
  allow_sponsored: boolean
}

export type CategoryCmsBrandStoryBlock = CategoryCmsBlockBase & {
  type: "brand_story"
  title: CategoryCmsLocalized
  body: CategoryCmsLocalized
  brand_slug: string | null
}

export type CategoryCmsChoiceCtaBlock = CategoryCmsBlockBase & {
  type: "choice_assistant_cta"
  title: CategoryCmsLocalized
  body: CategoryCmsLocalized
  cta_label: CategoryCmsLocalized
  href: string
  cards?: Array<{
    id: string
    label: CategoryCmsLocalized
    image?: CategoryCmsImage
  }>
  /**
   * Product Cloud attribute codes. Absent on older drafts.
   * Questions are built only when those codes have values on the live assortment.
   */
  question_codes?: string[]
}

export type CategoryCmsPhaseNavigationBlock = CategoryCmsBlockBase & {
  type: "phase_navigation"
  phases: Array<{
    id: string
    label: CategoryCmsLocalized
    anchor_block_type: string
  }>
}

export type CategoryCmsShortcutsBlock = CategoryCmsBlockBase & {
  type: "shortcuts"
  title: CategoryCmsLocalized
  items: Array<{
    id: string
    label: CategoryCmsLocalized
    category_slug: string
    spec_code: string
    spec_value: string
  }>
}

export type CategoryCmsFeaturedProductBlock = CategoryCmsBlockBase & {
  type: "featured_product"
  title: CategoryCmsLocalized
  product_id: string
  motivation: CategoryCmsLocalized
}

export type CategoryCmsInspirationBlock = CategoryCmsBlockBase & {
  type: "inspiration"
  title: CategoryCmsLocalized
  items: Array<{
    id: string
    title: CategoryCmsLocalized
    summary: CategoryCmsLocalized
    href: string
    image?: CategoryCmsImage
  }>
}

export type CategoryCmsMaintenanceBlock = CategoryCmsBlockBase & {
  type: "maintenance"
  title: CategoryCmsLocalized
  steps: Array<{
    id: string
    frequency: CategoryCmsLocalized
    body: CategoryCmsLocalized
  }>
}

/** One advice card. Extra fields are optional so older cards stay valid. */
export type CategoryCmsAdviceItem = {
  id: string
  /** Card title. */
  label: CategoryCmsLocalized
  href: string
  image?: CategoryCmsImage | null
  summary?: CategoryCmsLocalized
  body?: CategoryCmsLocalized
  cta_label?: CategoryCmsLocalized
}

export type CategoryCmsAdviceCompareBlock = CategoryCmsBlockBase & {
  type: "advice_compare"
  title: CategoryCmsLocalized
  items: CategoryCmsAdviceItem[]
}

export type CategoryCmsProductComparisonBlock = CategoryCmsBlockBase & {
  type: "product_comparison"
  title: CategoryCmsLocalized
  /** Product Cloud product ids in display order. Empty shows no table. */
  product_ids: string[]
  spec_codes: string[]
}

export type CategoryCmsSpecExplainBlock = CategoryCmsBlockBase & {
  type: "spec_explain"
  title: CategoryCmsLocalized
  items: Array<{
    id: string
    spec_code: string
    title: CategoryCmsLocalized
    body: CategoryCmsLocalized
  }>
}

export type CategoryCmsGuideSubheading = {
  id: string
  heading: CategoryCmsLocalized
  body?: CategoryCmsLocalized
}

/** One buying-guide section. Older sections only have heading, body, bullets and image. */
export type CategoryCmsGuideSection = {
  id: string
  heading: CategoryCmsLocalized
  body: CategoryCmsLocalized
  bullets: CategoryCmsLocalized[]
  image?: CategoryCmsImage | null
  intro?: CategoryCmsLocalized
  subheadings?: CategoryCmsGuideSubheading[]
  tip?: CategoryCmsLocalized
  link_label?: CategoryCmsLocalized
  link_href?: string
  cta_label?: CategoryCmsLocalized
  cta_href?: string
}

export type CategoryCmsGuideFaqItem = {
  id: string
  question: CategoryCmsLocalized
  answer: CategoryCmsLocalized
}

export type CategoryCmsBuyingGuideBlock = CategoryCmsBlockBase & {
  type: "buying_guide"
  title: CategoryCmsLocalized
  /** Optional text above the sections. Absent on older documents. */
  intro?: CategoryCmsLocalized
  sections: CategoryCmsGuideSection[]
  /** FAQ kept on the buying guide. Not a second FAQ model. */
  faq: CategoryCmsGuideFaqItem[]
  closing_cta_label?: CategoryCmsLocalized
  closing_cta_href?: string
}

export type CategoryCmsFaqBlock = CategoryCmsBlockBase & {
  type: "faq"
  title: CategoryCmsLocalized
  items: Array<{
    id: string
    question: CategoryCmsLocalized
    answer: CategoryCmsLocalized
  }>
}

export type CategoryCmsWhyBlock = CategoryCmsBlockBase & {
  type: "why_europmade"
  title: CategoryCmsLocalized
  body: CategoryCmsLocalized
}

export type CategoryCmsRelatedProductsBlock = CategoryCmsBlockBase & {
  type: "related_products"
  title: CategoryCmsLocalized
  limit: number
}

export type CategoryCmsSeoContentBlock = CategoryCmsBlockBase & {
  type: "seo_content"
  title: CategoryCmsLocalized
  body: CategoryCmsLocalized
}

/** Positions that exist on the V11 category page. One ad_slot holds several of these. */
export const CATEGORY_AD_POSITIONS = [
  "below_hero",
  "between_content",
  "above_product_grid",
  "below_product_grid",
] as const

export type CategoryAdPositionKey = (typeof CATEGORY_AD_POSITIONS)[number]

export type CategoryAdSource = "campaign" | "banner" | "campaign_or_banner"

export type CategoryCmsAdPosition = {
  id: string
  position: CategoryAdPositionKey
  label: string
  source: CategoryAdSource
  banner_id?: string | null
  sort: number
}

export type CategoryCmsAdSlotBlock = CategoryCmsBlockBase & {
  type: "ad_slot"
  /** Legacy single marker. Read only when `positions` is absent. */
  slot_id: string
  placement: "category"
  /** Optional. Absent on older drafts; those drafts are not rewritten. */
  positions?: CategoryCmsAdPosition[]
}

export type CategoryCmsBlock =
  | CategoryCmsHeroBlock
  | CategoryCmsUspBarBlock
  | CategoryCmsIntroBlock
  | CategoryCmsTilesBlock
  | CategoryCmsProductCarouselBlock
  | CategoryCmsProductGridBlock
  | CategoryCmsFiltersBlock
  | CategoryCmsBrandOverviewBlock
  | CategoryCmsBrandStoryBlock
  | CategoryCmsChoiceCtaBlock
  | CategoryCmsAdviceCompareBlock
  | CategoryCmsProductComparisonBlock
  | CategoryCmsSpecExplainBlock
  | CategoryCmsBuyingGuideBlock
  | CategoryCmsFaqBlock
  | CategoryCmsWhyBlock
  | CategoryCmsRelatedProductsBlock
  | CategoryCmsSeoContentBlock
  | CategoryCmsAdSlotBlock
  | CategoryCmsPhaseNavigationBlock
  | CategoryCmsShortcutsBlock
  | CategoryCmsFeaturedProductBlock
  | CategoryCmsInspirationBlock
  | CategoryCmsMaintenanceBlock

export type CategoryCmsDocumentV2 = {
  schema_version: 2
  profile: CategoryCmsProfile
  path_key: string | null
  locale_policy: {
    source_locale: "nl"
    locales: CategoryCmsLocale[]
  }
  blocks: CategoryCmsBlock[]
  seo: {
    title: CategoryCmsLocalized
    meta_description: CategoryCmsLocalized
    h1: CategoryCmsLocalized
    structured_data_type: "CollectionPage"
  }
  block_meta: Record<string, CategoryCmsBlockProvenance>
  /**
   * Set when a later import changes the assortment.
   * The draft text stays; an editor reviews it before anything is published.
   */
  editorial_review?: {
    needed: boolean
    reason: "assortment_changed" | null
    noted_at: string | null
  }
  /**
   * Mirrored v1 fields for dual-read during transition.
   * Prefer reading via blocks; mirrors stay in sync on write.
   */
  legacy?: Record<string, unknown>
}

export const CATEGORY_CMS_LOCALES: CategoryCmsLocale[] = ["nl", "en", "de", "fr"]

export function categoryCmsLocalizedHasText(
  value: CategoryCmsLocalized | null | undefined
): boolean {
  if (!value) return false
  return CATEGORY_CMS_LOCALES.some((locale) => Boolean(value[locale]?.trim()))
}

/**
 * A card link needs a URL.
 * A stored CTA label uses that label. An older card with only `href` keeps the existing link.
 */
export function adviceItemCta(item: {
  href?: string | null
  cta_label?: CategoryCmsLocalized | null
}): { href: string; mode: "label" | "legacy" } | null {
  const href = item.href?.trim() ?? ""
  if (!href) return null
  return {
    href,
    mode: categoryCmsLocalizedHasText(item.cta_label) ? "label" : "legacy",
  }
}

/** Guide links and CTAs appear only when both a label and a URL are stored. */
export function categoryCmsOptionalLink(
  label: CategoryCmsLocalized | null | undefined,
  href: string | null | undefined
): string | null {
  const url = href?.trim() ?? ""
  if (!url || !categoryCmsLocalizedHasText(label)) return null
  return url
}

export const CATEGORY_CMS_BLOCK_TYPES: CategoryCmsBlockType[] = [
  "hero",
  "usp_bar",
  "intro",
  "subcategory_tiles",
  "product_group_tiles",
  "product_carousel",
  "product_grid",
  "filters",
  "brand_overview",
  "brand_story",
  "choice_assistant_cta",
  "advice_compare",
  "product_comparison",
  "spec_explain",
  "buying_guide",
  "faq",
  "why_europmade",
  "related_products",
  "seo_content",
  "ad_slot",
  "phase_navigation",
  "shortcuts",
  "featured_product",
  "inspiration",
  "maintenance",
]

/** Canonical ordered allowlist per profile (required structural blocks). */
export const CATEGORY_CMS_PROFILE_ALLOWLIST: Record<
  CategoryCmsProfile,
  CategoryCmsBlockType[]
> = {
  level_1: [
    "hero",
    "usp_bar",
    "subcategory_tiles",
    "product_carousel",
    "brand_overview",
    "why_europmade",
  ],
  level_2: [
    "hero",
    "usp_bar",
    "product_group_tiles",
    "choice_assistant_cta",
    "advice_compare",
  ],
  level_3: [
    "hero",
    "usp_bar",
    "filters",
    "product_grid",
    "product_comparison",
    "buying_guide",
  ],
}

/** Optional extras allowed alongside the allowlist. */
export const CATEGORY_CMS_PROFILE_OPTIONAL: Record<
  CategoryCmsProfile,
  CategoryCmsBlockType[]
> = {
  level_1: ["intro", "seo_content", "ad_slot", "faq", "inspiration"],
  level_2: [
    "intro",
    "seo_content",
    "ad_slot",
    "brand_overview",
    "faq",
    "phase_navigation",
    "shortcuts",
    "brand_story",
    "why_europmade",
  ],
  level_3: [
    "intro",
    "faq",
    "spec_explain",
    "related_products",
    "seo_content",
    "ad_slot",
    "brand_overview",
    "choice_assistant_cta",
    "shortcuts",
    "featured_product",
    "maintenance",
    "why_europmade",
  ],
}

export const CATEGORY_CMS_PROFILE_FORBIDDEN: Record<
  CategoryCmsProfile,
  CategoryCmsBlockType[]
> = {
  level_1: [
    "product_grid",
    "filters",
    "buying_guide",
    "product_comparison",
    "product_group_tiles",
    "choice_assistant_cta",
    "advice_compare",
    "phase_navigation",
    "shortcuts",
    "featured_product",
    "maintenance",
    "brand_story",
  ],
  level_2: [
    "product_grid",
    "filters",
    "buying_guide",
    "product_comparison",
    "featured_product",
    "inspiration",
    "maintenance",
  ],
  level_3: [
    "subcategory_tiles",
    "product_group_tiles",
    "phase_navigation",
    "inspiration",
    "brand_story",
  ],
}

export type CategoryTaxonomyNode = {
  id: string
  slug: string | null
  parent_id: string | null
}

export type CategoryProfileResolution =
  | { ok: true; profile: CategoryCmsProfile; depth: number }
  | {
      ok: false
      code: "category_unknown" | "taxonomy_depth" | "taxonomy_cycle" | "taxonomy_broken"
    }

/** Level 1/2/3 only. Any other depth is unknown — never coerced to level_3. */
export function categoryProfileFromDepth(depth: number): CategoryCmsProfile | null {
  if (depth === 1) return "level_1"
  if (depth === 2) return "level_2"
  if (depth === 3) return "level_3"
  return null
}

export function inferCategoryCmsProfile(depth: number): CategoryCmsProfile {
  const profile = categoryProfileFromDepth(depth)
  if (!profile) {
    throw new Error(`Category depth ${depth} is outside level 1-3`)
  }
  return profile
}

export function resolveCategoryCmsProfile(
  nodes: CategoryTaxonomyNode[],
  slug: string
): CategoryProfileResolution {
  const wanted = slug.trim().toLowerCase()
  if (!wanted) return { ok: false, code: "category_unknown" }
  const matches = nodes.filter(
    (node) => (node.slug ?? "").trim().toLowerCase() === wanted
  )
  if (matches.length === 0) return { ok: false, code: "category_unknown" }
  if (matches.length > 1) return { ok: false, code: "taxonomy_broken" }
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const start = matches[0]!
  let depth = 1
  let parentId = start.parent_id
  const seen = new Set<string>([start.id])
  while (parentId) {
    if (seen.has(parentId)) return { ok: false, code: "taxonomy_cycle" }
    const parent = byId.get(parentId)
    if (!parent) return { ok: false, code: "taxonomy_broken" }
    seen.add(parentId)
    depth += 1
    if (depth > 3) return { ok: false, code: "taxonomy_depth" }
    parentId = parent.parent_id
  }
  const profile = categoryProfileFromDepth(depth)
  if (!profile) return { ok: false, code: "taxonomy_depth" }
  return { ok: true, profile, depth }
}

export function categoryCmsBlockId(
  slug: string,
  profile: CategoryCmsProfile,
  type: CategoryCmsBlockType
): string {
  return `blk_${slug.trim().toLowerCase()}_${profile}_${type}`
}

export function categoryCmsUspSlotId(
  slug: string,
  profile: CategoryCmsProfile,
  index: number
): string {
  return `usp_${slug.trim().toLowerCase()}_${profile}_${index}`
}

export function categoryCmsAllowedBlockTypes(
  profile: CategoryCmsProfile
): Set<CategoryCmsBlockType> {
  return new Set([
    ...CATEGORY_CMS_PROFILE_ALLOWLIST[profile],
    ...CATEGORY_CMS_PROFILE_OPTIONAL[profile],
  ])
}

export function emptyCategoryLocalized(): CategoryCmsLocalized {
  return { nl: "", en: "", de: "", fr: "" }
}

export function locCategory(
  value: unknown,
  fallback: CategoryCmsLocalized = emptyCategoryLocalized()
): CategoryCmsLocalized {
  if (!value || typeof value !== "object") return { ...fallback }
  const v = value as Record<string, unknown>
  return {
    nl: typeof v.nl === "string" ? v.nl : fallback.nl,
    en: typeof v.en === "string" ? v.en : fallback.en,
    de: typeof v.de === "string" ? v.de : fallback.de,
    fr: typeof v.fr === "string" ? v.fr : fallback.fr,
  }
}

function defaultProvenance(
  source: CategoryCmsContentSource,
  overrides?: Partial<CategoryCmsBlockProvenance>
): CategoryCmsBlockProvenance {
  return {
    source,
    dynamic: source === "product_cloud" || source === "advertising",
    ai_may_propose: source !== "advertising" && source !== "product_cloud",
    manual_override: false,
    approval_required: false,
    content_version: "category-cms-v2",
    generated_at: null,
    generated_by: null,
    prompt_version: null,
    ...overrides,
  }
}

function emptyUspSlots(
  slug: string,
  profile: CategoryCmsProfile
): CategoryCmsUspBarBlock["slots"] {
  return [0, 1, 2, 3].map((index) => ({
    id: categoryCmsUspSlotId(slug, profile, index),
    icon_key: "",
    title: emptyCategoryLocalized(),
    body: emptyCategoryLocalized(),
  })) as CategoryCmsUspBarBlock["slots"]
}

function defaultUspBar(
  slug: string,
  profile: CategoryCmsProfile
): CategoryCmsUspBarBlock {
  return {
    id: categoryCmsBlockId(slug, profile, "usp_bar"),
    type: "usp_bar",
    visible: true,
    slots: emptyUspSlots(slug, profile),
  }
}

function defaultHero(slug: string, profile: CategoryCmsProfile): CategoryCmsHeroBlock {
  return {
    id: categoryCmsBlockId(slug, profile, "hero"),
    type: "hero",
    visible: true,
    title: emptyCategoryLocalized(),
    subtitle: emptyCategoryLocalized(),
    intro: emptyCategoryLocalized(),
    image_url: null,
    hero_visible: true,
    banner_id: null,
    banner_visible: true,
    banner: null,
  }
}

function buildCanonicalBlocks(
  profile: CategoryCmsProfile,
  slug: string
): CategoryCmsBlock[] {
  const blocks: CategoryCmsBlock[] = [
    defaultHero(slug, profile),
    defaultUspBar(slug, profile),
  ]
  const id = (type: CategoryCmsBlockType) => categoryCmsBlockId(slug, profile, type)
  if (profile === "level_1") {
    blocks.push(
      {
        id: id("subcategory_tiles"),
        type: "subcategory_tiles",
        visible: true,
        title: emptyCategoryLocalized(),
        include_slugs: [],
        max_items: 12,
      },
      {
        id: id("product_carousel"),
        type: "product_carousel",
        visible: true,
        title: emptyCategoryLocalized(),
        sort: "relevance",
        limit: 12,
      },
      {
        id: id("brand_overview"),
        type: "brand_overview",
        visible: true,
        title: emptyCategoryLocalized(),
        max_items: 16,
        allow_sponsored: false,
      },
      {
        id: id("why_europmade"),
        type: "why_europmade",
        visible: true,
        title: emptyCategoryLocalized(),
        body: emptyCategoryLocalized(),
      }
    )
  } else if (profile === "level_2") {
    blocks.push(
      {
        id: id("product_group_tiles"),
        type: "product_group_tiles",
        visible: true,
        title: emptyCategoryLocalized(),
        include_slugs: [],
        max_items: 16,
      },
      {
        id: id("choice_assistant_cta"),
        type: "choice_assistant_cta",
        visible: true,
        title: emptyCategoryLocalized(),
        body: emptyCategoryLocalized(),
        cta_label: emptyCategoryLocalized(),
        href: "",
      },
      {
        id: id("advice_compare"),
        type: "advice_compare",
        visible: true,
        title: emptyCategoryLocalized(),
        items: [],
      },
      {
        id: id("brand_overview"),
        type: "brand_overview",
        visible: true,
        title: emptyCategoryLocalized(),
        max_items: 16,
        allow_sponsored: false,
      }
    )
  } else {
    blocks.push(
      {
        id: id("filters"),
        type: "filters",
        visible: true,
        controls: [],
      },
      {
        id: id("product_grid"),
        type: "product_grid",
        visible: true,
        title: emptyCategoryLocalized(),
        sort: "relevance",
        limit: 24,
      },
      {
        id: id("product_comparison"),
        type: "product_comparison",
        visible: true,
        title: emptyCategoryLocalized(),
        product_ids: [],
        spec_codes: [],
      },
      {
        id: id("buying_guide"),
        type: "buying_guide",
        visible: true,
        title: emptyCategoryLocalized(),
        sections: [],
        faq: [],
      }
    )
  }
  return blocks
}

function provenanceForBlock(
  block: CategoryCmsBlock
): CategoryCmsBlockProvenance {
  switch (block.type) {
    case "subcategory_tiles":
    case "product_group_tiles":
    case "product_carousel":
    case "product_grid":
    case "filters":
    case "brand_overview":
    case "related_products":
    case "product_comparison":
      return defaultProvenance("product_cloud", {
        ai_may_propose: block.type === "product_comparison",
        dynamic: true,
      })
    case "ad_slot":
      return defaultProvenance("advertising", {
        ai_may_propose: false,
        dynamic: true,
      })
    case "usp_bar":
      return defaultProvenance("cms", {
        ai_may_propose: true,
        manual_override: {
          "0": false,
          "1": false,
          "2": false,
          "3": false,
        },
      })
    default:
      return defaultProvenance("cms", { ai_may_propose: true })
  }
}

export function createDefaultCategoryCmsDocument(
  profile: CategoryCmsProfile,
  opts: { slug: string; path_key?: string | null }
): CategoryCmsDocumentV2 {
  const slug = opts.slug.trim().toLowerCase()
  if (!slug) throw new Error("slug is required for a category cms document")
  const blocks = buildCanonicalBlocks(profile, slug)
  const block_meta: Record<string, CategoryCmsBlockProvenance> = {}
  for (const block of blocks) {
    block_meta[block.id] = provenanceForBlock(block)
  }
  const doc: CategoryCmsDocumentV2 = {
    schema_version: 2,
    profile,
    path_key: opts?.path_key ?? null,
    locale_policy: {
      source_locale: "nl",
      locales: [...CATEGORY_CMS_LOCALES],
    },
    blocks,
    seo: {
      title: emptyCategoryLocalized(),
      meta_description: emptyCategoryLocalized(),
      h1: emptyCategoryLocalized(),
      structured_data_type: "CollectionPage",
    },
    block_meta,
  }
  return syncLegacyMirrors(doc)
}

function isStoredCategoryCmsDocument(raw: unknown): raw is CategoryCmsDocumentV2 {
  if (!raw || typeof raw !== "object") return false
  const row = raw as { schema_version?: unknown; blocks?: unknown; profile?: unknown }
  return row.schema_version === 2 && Array.isArray(row.blocks) && isProfile(row.profile)
}

function rewriteBlockForProfile(
  source: CategoryCmsBlock,
  slug: string,
  profile: CategoryCmsProfile
): CategoryCmsBlock {
  const id = categoryCmsBlockId(slug, profile, source.type)
  if (source.type !== "usp_bar") return { ...source, id }
  return {
    ...source,
    id,
    slots: source.slots.map((slot, index) => ({
      ...slot,
      id: categoryCmsUspSlotId(slug, profile, index),
      title: locCategory(slot.title),
      body: locCategory(slot.body),
    })),
  }
}

/**
 * Geeft een document het profiel van de taxonomie.
 * Een document met het juiste profiel blijft gelijk. Toegestane blokken houden hun tekst.
 * Blokken die op het nieuwe niveau niet mogen, worden niet meegenomen en niet gepubliceerd.
 */
export function realignCategoryCmsDocument(
  raw: unknown,
  opts: { slug: string; profile: CategoryCmsProfile }
): CategoryCmsDocumentV2 {
  const slug = opts.slug.trim().toLowerCase()
  if (isStoredCategoryCmsDocument(raw) && raw.profile === opts.profile) return raw
  if (!isStoredCategoryCmsDocument(raw)) {
    return normalizeCategoryCmsDocument(raw ?? {}, { slug, profile: opts.profile })
  }
  const next = createDefaultCategoryCmsDocument(opts.profile, {
    slug,
    path_key: raw.path_key ?? null,
  })
  const allowed = categoryCmsAllowedBlockTypes(opts.profile)
  const sourceBlocks = raw.blocks.filter((block) => allowed.has(block.type))
  const byType = new Map(sourceBlocks.map((block) => [block.type, block]))
  const required = new Set<CategoryCmsBlockType>(CATEGORY_CMS_PROFILE_ALLOWLIST[opts.profile])
  next.blocks = next.blocks.map((block) => {
    const source = byType.get(block.type)
    return source ? rewriteBlockForProfile(source, slug, opts.profile) : block
  })
  for (const source of sourceBlocks) {
    if (required.has(source.type) || next.blocks.some((block) => block.type === source.type)) continue
    next.blocks.push(rewriteBlockForProfile(source, slug, opts.profile))
  }
  if (raw.seo?.structured_data_type === "CollectionPage") {
    next.seo = {
      title: locCategory(raw.seo.title),
      meta_description: locCategory(raw.seo.meta_description),
      h1: locCategory(raw.seo.h1),
      structured_data_type: "CollectionPage",
    }
  }
  for (const block of next.blocks) {
    const source = byType.get(block.type)
    const sourceMeta = source ? raw.block_meta?.[source.id] : undefined
    if (sourceMeta) next.block_meta[block.id] = sourceMeta
  }
  return syncLegacyMirrors(next)
}

export function planCategoryStructureDraft(input: {
  slug: string
  profile: CategoryCmsProfile
  draft: unknown
  published: unknown
  excluded: boolean
}): { action: "skip" | "write"; document: CategoryCmsDocumentV2 | null; reason: string } {
  if (input.excluded) return { action: "skip", document: null, reason: "excluded" }
  if (isStoredCategoryCmsDocument(input.draft) && input.draft.profile === input.profile) {
    return { action: "skip", document: input.draft, reason: "profile_matches" }
  }
  const source = isStoredCategoryCmsDocument(input.draft)
    ? input.draft
    : input.published && typeof input.published === "object"
      ? input.published
      : {}
  const document = realignCategoryCmsDocument(source, {
    slug: input.slug,
    profile: input.profile,
  })
  const issues = validateCategoryCmsDocument(document, {
    slug: input.slug,
    expectedProfile: input.profile,
  })
  if (issues.length > 0) {
    return { action: "skip", document: null, reason: issues.map((issue) => issue.code).join(",") }
  }
  return {
    action: "write",
    document,
    reason: isStoredCategoryCmsDocument(input.draft) ? "realign" : "create",
  }
}

export function getBlock<T extends CategoryCmsBlockType>(
  doc: CategoryCmsDocumentV2,
  type: T
): Extract<CategoryCmsBlock, { type: T }> | null {
  const found = doc.blocks.find((b) => b.type === type)
  return (found as Extract<CategoryCmsBlock, { type: T }> | undefined) ?? null
}

export function getUspBar(doc: CategoryCmsDocumentV2): CategoryCmsUspBarBlock | null {
  return getBlock(doc, "usp_bar")
}

export type CategoryCmsValidationIssue = {
  code: string
  message: string
  block_id?: string
}

function hasLocalized(value: unknown): value is CategoryCmsLocalized {
  if (!value || typeof value !== "object") return false
  const row = value as Record<string, unknown>
  return CATEGORY_CMS_LOCALES.every((locale) => typeof row[locale] === "string")
}

const CATEGORY_AD_SOURCES: readonly CategoryAdSource[] = [
  "campaign",
  "banner",
  "campaign_or_banner",
]

export function categoryAdPositionsForProfile(
  profile: CategoryCmsProfile
): CategoryAdPositionKey[] {
  if (profile === "level_2") return ["below_hero", "between_content"]
  if (profile === "level_3") {
    return ["below_hero", "above_product_grid", "below_product_grid"]
  }
  return [...CATEGORY_AD_POSITIONS]
}

function isCategoryAdPosition(value: string): value is CategoryAdPositionKey {
  return (CATEGORY_AD_POSITIONS as readonly string[]).includes(value)
}

function parseCategoryAdPosition(raw: unknown): CategoryCmsAdPosition | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === "string" ? row.id.trim() : ""
  const position = typeof row.position === "string" ? row.position.trim() : ""
  const source = typeof row.source === "string" ? row.source.trim() : ""
  if (!id || !isCategoryAdPosition(position)) return null
  if (!(CATEGORY_AD_SOURCES as readonly string[]).includes(source)) return null
  const bannerId =
    typeof row.banner_id === "string" && row.banner_id.trim()
      ? row.banner_id.trim()
      : null
  return {
    id,
    position,
    label: typeof row.label === "string" ? row.label : "",
    source: source as CategoryAdSource,
    banner_id: bannerId,
    sort: typeof row.sort === "number" && Number.isFinite(row.sort) ? row.sort : 0,
  }
}

/**
 * Positions configured on the single ad_slot.
 * A stored `positions` array wins, including an explicit empty array.
 * Older documents with only `slot_id` are read as one paid position and are not rewritten.
 */
export function readCategoryAdPositions(
  block: Pick<CategoryCmsAdSlotBlock, "slot_id" | "positions"> | null | undefined
): CategoryCmsAdPosition[] {
  if (!block) return []
  if (Array.isArray(block.positions)) {
    const seen = new Set<string>()
    const out: CategoryCmsAdPosition[] = []
    for (const raw of block.positions) {
      const parsed = parseCategoryAdPosition(raw)
      if (!parsed || seen.has(parsed.position)) continue
      seen.add(parsed.position)
      out.push(parsed)
    }
    return out.sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))
  }
  const marker = String(block.slot_id ?? "").trim()
  if (!marker) return []
  const position: CategoryAdPositionKey = isCategoryAdPosition(marker)
    ? marker
    : "below_hero"
  return [
    {
      id: `legacy-${position}`,
      position,
      label: isCategoryAdPosition(marker) ? "" : marker,
      source: "campaign",
      banner_id: null,
      sort: 0,
    },
  ]
}

/** Campaign replaces the editorial banner. No campaign and no live banner hides the position. */
export function selectCategoryAdSource(
  position: Pick<CategoryCmsAdPosition, "source">,
  hasCampaign: boolean,
  hasBanner: boolean
): "campaign" | "banner" | null {
  if (position.source === "campaign") return hasCampaign ? "campaign" : null
  if (position.source === "banner") return hasBanner ? "banner" : null
  if (hasCampaign) return "campaign"
  if (hasBanner) return "banner"
  return null
}

function validateAdSlotPositions(
  block: CategoryCmsAdSlotBlock,
  issues: CategoryCmsValidationIssue[]
): void {
  if (block.positions === undefined) return
  if (!Array.isArray(block.positions)) {
    issues.push({
      code: "ad_position",
      message: "ad_slot positions must be an array",
      block_id: block.id,
    })
    return
  }
  const ids = new Set<string>()
  const keys = new Set<string>()
  for (const raw of block.positions) {
    const parsed = parseCategoryAdPosition(raw)
    if (!parsed) {
      issues.push({
        code: "ad_position",
        message: "Each ad position needs a stable id, a V11 position and a source",
        block_id: block.id,
      })
      continue
    }
    if (ids.has(parsed.id)) {
      issues.push({
        code: "ad_position_id",
        message: `Ad position id ${parsed.id} is duplicated`,
        block_id: block.id,
      })
    }
    ids.add(parsed.id)
    if (keys.has(parsed.position)) {
      issues.push({
        code: "ad_position_key",
        message: `Ad position ${parsed.position} is duplicated`,
        block_id: block.id,
      })
    }
    keys.add(parsed.position)
    if (parsed.source === "banner" && !parsed.banner_id) {
      issues.push({
        code: "ad_position_banner",
        message: "A banner position needs banner_id",
        block_id: block.id,
      })
    }
  }
}

export function validateCategoryCmsDocument(
  doc: CategoryCmsDocumentV2,
  opts?: { expectedProfile?: CategoryCmsProfile; slug?: string }
): CategoryCmsValidationIssue[] {
  const issues: CategoryCmsValidationIssue[] = []
  if (doc.schema_version !== 2) {
    issues.push({ code: "schema_version", message: "schema_version must be 2" })
  }
  if (
    !doc.profile ||
    !CATEGORY_CMS_PROFILE_ALLOWLIST[doc.profile]
  ) {
    issues.push({ code: "profile", message: "profile must be level_1, level_2 or level_3" })
    return issues
  }
  if (opts?.expectedProfile && doc.profile !== opts.expectedProfile) {
    issues.push({
      code: "profile_mismatch",
      message: `Document profile ${doc.profile} does not match taxonomy profile ${opts.expectedProfile}`,
    })
  }
  if (doc.locale_policy?.source_locale !== "nl") {
    issues.push({
      code: "source_locale",
      message: "locale_policy.source_locale must be nl",
    })
  }
  const locales = doc.locale_policy?.locales ?? []
  if (CATEGORY_CMS_LOCALES.some((locale) => !locales.includes(locale))) {
    issues.push({
      code: "locales",
      message: "locale_policy.locales must include nl, en, de and fr",
    })
  }
  if (doc.path_key !== null && typeof doc.path_key !== "string") {
    issues.push({ code: "path_key", message: "path_key must be a string or null" })
  }
  if (!doc.seo || doc.seo.structured_data_type !== "CollectionPage") {
    issues.push({ code: "seo", message: "seo.structured_data_type must be CollectionPage" })
  } else if (
    !hasLocalized(doc.seo.title) ||
    !hasLocalized(doc.seo.meta_description) ||
    !hasLocalized(doc.seo.h1)
  ) {
    issues.push({ code: "seo", message: "seo fields must be localized nl/en/de/fr" })
  }

  const allow = CATEGORY_CMS_PROFILE_ALLOWLIST[doc.profile]
  const allowed = categoryCmsAllowedBlockTypes(doc.profile)
  const seen = new Map<string, number>()
  for (const block of doc.blocks ?? []) {
    seen.set(block.type, (seen.get(block.type) ?? 0) + 1)
    if (!block.id) {
      issues.push({ code: "block_id", message: "Block id is required", block_id: block.id })
    } else if (
      opts?.slug &&
      CATEGORY_CMS_BLOCK_TYPES.includes(block.type) &&
      block.id !== categoryCmsBlockId(opts.slug, doc.profile, block.type)
    ) {
      issues.push({
        code: "block_id",
        message: `Block ${block.type} id must be stable for this category and profile`,
        block_id: block.id,
      })
    }
    if (!allowed.has(block.type)) {
      issues.push({
        code: "block_not_allowed",
        message: `Block ${block.type} is outside the ${doc.profile} allowlist`,
        block_id: block.id,
      })
    }
    if (!doc.block_meta?.[block.id]) {
      issues.push({
        code: "missing_meta",
        message: `Missing block_meta for ${block.id}`,
        block_id: block.id,
      })
    }
    if (block.type === "ad_slot") validateAdSlotPositions(block, issues)
    if (block.type === "usp_bar") {
      if (!Array.isArray(block.slots) || block.slots.length !== 4) {
        issues.push({
          code: "usp_slots",
          message: "usp_bar must have exactly 4 slots",
          block_id: block.id,
        })
      } else {
        block.slots.forEach((slot, index) => {
          if (
            opts?.slug &&
            slot.id !== categoryCmsUspSlotId(opts.slug, doc.profile, index)
          ) {
            issues.push({
              code: "usp_slot_id",
              message: `USP slot ${index} id must be stable`,
              block_id: block.id,
            })
          }
          if (!hasLocalized(slot.title) || !hasLocalized(slot.body)) {
            issues.push({
              code: "usp_slot_fields",
              message: `USP slot ${index} needs localized title and body`,
              block_id: block.id,
            })
          }
        })
      }
    }
  }
  for (const [type, count] of seen) {
    if (count > 1) {
      issues.push({
        code: "duplicate_block",
        message: `Block ${type} appears more than once`,
      })
    }
  }
  for (const required of allow) {
    if ((seen.get(required) ?? 0) !== 1) {
      issues.push({
        code: "missing_required_block",
        message: `Profile ${doc.profile} requires exactly one ${required}`,
      })
    }
  }
  const requiredSeen = (doc.blocks ?? [])
    .map((block) => block.type)
    .filter((type) => allow.includes(type))
  if (requiredSeen.join(",") !== allow.join(",")) {
    issues.push({
      code: "block_order",
      message: `Required blocks must follow the ${doc.profile} order`,
    })
  }
  return issues
}

function uspSlotsFromLegacy(
  usps: unknown,
  slug: string,
  profile: CategoryCmsProfile
): CategoryCmsUspBarBlock["slots"] {
  const list = Array.isArray(usps) ? usps : []
  return [0, 1, 2, 3].map((index) => {
    const raw = list[index]
    const id = categoryCmsUspSlotId(slug, profile, index)
    if (!raw || typeof raw !== "object") {
      return {
        id,
        icon_key: "",
        title: emptyCategoryLocalized(),
        body: emptyCategoryLocalized(),
      }
    }
    const row = raw as Record<string, unknown>
    return {
      id,
      icon_key: typeof row.icon_key === "string" ? row.icon_key : "",
      title: locCategory(row.title),
      body: locCategory(row.body),
    }
  }) as CategoryCmsUspBarBlock["slots"]
}

function isProfile(value: unknown): value is CategoryCmsProfile {
  return value === "level_1" || value === "level_2" || value === "level_3"
}

/**
 * Upgrade any stored document (v1 lean editorial or partial v2) to V2.
 * Preserves content; does not invent Product Cloud facts.
 */
export function normalizeCategoryCmsDocument(
  raw: unknown,
  opts: { slug: string; profile: CategoryCmsProfile; path_key?: string | null }
): CategoryCmsDocumentV2 {
  const slug = opts.slug.trim().toLowerCase()
  if (!slug) throw new Error("slug is required to normalize a category cms document")
  const profile = opts.profile
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const sourceIsV2 = source.schema_version === 2 && Array.isArray(source.blocks)
  if (sourceIsV2 && isProfile(source.profile) && source.profile !== profile) {
    return source as unknown as CategoryCmsDocumentV2
  }

  const sourceBlocks = sourceIsV2 ? (source.blocks as CategoryCmsBlock[]) : []
  const sourceMeta = sourceIsV2
    ? ((source.block_meta ?? {}) as Record<string, CategoryCmsBlockProvenance>)
    : {}
  const legacy =
    source.legacy && typeof source.legacy === "object"
      ? (source.legacy as Record<string, unknown>)
      : source
  const sourceHero = sourceBlocks.find((block) => block.type === "hero") as
    | CategoryCmsHeroBlock
    | undefined
  const sourceUsp = sourceBlocks.find((block) => block.type === "usp_bar") as
    | CategoryCmsUspBarBlock
    | undefined
  const sourceGrid = sourceBlocks.find((block) => block.type === "product_grid") as
    | CategoryCmsProductGridBlock
    | undefined
  const sourceCarousel = sourceBlocks.find(
    (block) => block.type === "product_carousel"
  ) as CategoryCmsProductCarouselBlock | undefined
  const sourceListing = sourceGrid ?? sourceCarousel
  const sourceFilters = sourceBlocks.find((block) => block.type === "filters") as
    | CategoryCmsFiltersBlock
    | undefined
  const sourceGuide = sourceBlocks.find((block) => block.type === "buying_guide") as
    | CategoryCmsBuyingGuideBlock
    | undefined
  const sourceFaq = sourceBlocks.find((block) => block.type === "faq") as
    | CategoryCmsFaqBlock
    | undefined
  const sourceWhy = sourceBlocks.find((block) => block.type === "why_europmade") as
    | CategoryCmsWhyBlock
    | undefined
  const sourceSeo =
    source.seo && typeof source.seo === "object"
      ? (source.seo as Record<string, unknown>)
      : {}
  const flat: Record<string, unknown> = sourceIsV2
    ? {
        title: sourceHero?.title ?? legacy.title,
        subtitle: sourceHero?.subtitle ?? legacy.subtitle,
        intro: sourceHero?.intro ?? legacy.intro,
        description: sourceSeo.meta_description ?? legacy.description,
        heroImage: sourceHero?.image_url ?? legacy.heroImage,
        heroVisible: sourceHero?.hero_visible ?? legacy.heroVisible,
        bannerId: sourceHero?.banner_id ?? legacy.bannerId,
        banner: sourceHero?.banner ?? legacy.banner,
        bannerVisible: sourceHero?.banner_visible ?? legacy.bannerVisible,
        productsTitle: sourceListing?.title ?? legacy.productsTitle,
        productsSort: sourceListing?.sort ?? legacy.productsSort,
        productsLimit: sourceListing?.limit ?? legacy.productsLimit,
        seoTitle: sourceSeo.title ?? legacy.seoTitle,
        seoDescription: sourceSeo.meta_description ?? legacy.seoDescription,
        h1: sourceSeo.h1 ?? legacy.title,
        madeInEurope: sourceWhy?.body ?? legacy.madeInEurope,
        usps: sourceUsp?.slots ?? legacy.usps,
        faq:
          sourceGuide?.faq?.length
            ? sourceGuide.faq
            : sourceFaq?.items?.length
              ? sourceFaq.items
              : legacy.faq,
        filterControls: sourceFilters?.controls ?? legacy.filterControls,
        path_key: source.path_key,
      }
    : source

  const pathKey =
    typeof flat.path_key === "string" || flat.path_key === null
      ? (flat.path_key as string | null)
      : opts.path_key ?? null
  const doc = createDefaultCategoryCmsDocument(profile, { slug, path_key: pathKey })
  const d = flat
  const hero = getBlock(doc, "hero")!
  hero.title = locCategory(d.title)
  hero.subtitle = locCategory(d.subtitle)
  hero.intro = locCategory(d.intro)
  hero.image_url = typeof d.heroImage === "string" ? d.heroImage : null
  hero.hero_visible = d.heroVisible !== false
  hero.banner_id = typeof d.bannerId === "string" ? d.bannerId : null
  hero.banner_visible = d.bannerVisible !== false
  hero.banner =
    d.banner && typeof d.banner === "object"
      ? (d.banner as Record<string, unknown>)
      : null

  const usp = getBlock(doc, "usp_bar")!
  usp.slots = uspSlotsFromLegacy(d.usps, slug, profile)

  const grid = getBlock(doc, "product_grid")
  if (grid) {
    grid.title = locCategory(d.productsTitle)
    grid.sort =
      d.productsSort === "newest" ||
      d.productsSort === "price_asc" ||
      d.productsSort === "price_desc"
        ? d.productsSort
        : "relevance"
    grid.limit = Number.isFinite(Number(d.productsLimit))
      ? Math.min(96, Math.max(4, Number(d.productsLimit)))
      : 24
  }
  const carousel = getBlock(doc, "product_carousel")
  if (carousel) {
    carousel.title = locCategory(d.productsTitle)
    carousel.sort = grid?.sort ?? "relevance"
    carousel.limit = Math.min(grid?.limit ?? 12, 24)
  }

  const filters = getBlock(doc, "filters")
  if (filters && Array.isArray(d.filterControls)) {
    filters.controls = d.filterControls.flatMap((item, i) => {
      const row = (item ?? {}) as Record<string, unknown>
      const attributeKey =
        typeof row.attributeKey === "string" ? row.attributeKey.trim() : ""
      if (!attributeKey) return []
      return [
        {
          attributeKey,
          visible: row.visible !== false,
          label: locCategory(row.label),
          sortOrder: Number.isFinite(Number(row.sortOrder))
            ? Number(row.sortOrder)
            : i,
        },
      ]
    })
  }

  const guide = getBlock(doc, "buying_guide")
  if (guide && Array.isArray(d.faq)) {
    guide.faq = d.faq.map((item, i) => {
      const f = (item ?? {}) as Record<string, unknown>
      return {
        id: typeof f.id === "string" && f.id ? f.id : `faq_${slug}_${profile}_${i}`,
        question: locCategory(f.question),
        answer: locCategory(f.answer),
      }
    })
  }

  const why = getBlock(doc, "why_europmade")
  if (why) {
    why.body = locCategory(d.madeInEurope)
  }

  const intro = getBlock(doc, "intro")
  // intro may be optional — only if present
  void intro

  doc.seo = {
    title: locCategory(d.seoTitle, hero.title),
    meta_description: locCategory(d.seoDescription, locCategory(d.description)),
    h1: locCategory(d.title),
    structured_data_type: "CollectionPage",
  }

  const present = new Set(doc.blocks.map((block) => block.type))
  for (const block of sourceBlocks) {
    if (present.has(block.type)) continue
    if (!CATEGORY_CMS_BLOCK_TYPES.includes(block.type)) {
      doc.blocks.push(block)
      present.add(block.type)
      continue
    }
    doc.blocks.push({ ...block, id: categoryCmsBlockId(slug, profile, block.type) })
    present.add(block.type)
  }
  const blockMeta: Record<string, CategoryCmsBlockProvenance> = {}
  for (const block of doc.blocks) {
    blockMeta[block.id] = provenanceForBlock(block)
  }
  const sourceUspMeta = sourceUsp ? sourceMeta[sourceUsp.id] : undefined
  if (sourceUspMeta && usp && blockMeta[usp.id]) {
    blockMeta[usp.id] = {
      ...blockMeta[usp.id]!,
      manual_override: sourceUspMeta.manual_override,
    }
  }
  doc.block_meta = blockMeta

  return syncLegacyMirrors(doc, d)
}

/** Mirror flat v1 keys so existing overlay/admin readers keep working. */
export function syncLegacyMirrors(
  doc: CategoryCmsDocumentV2,
  preserved?: Record<string, unknown>
): CategoryCmsDocumentV2 {
  const hero = getBlock(doc, "hero")
  const usp = getBlock(doc, "usp_bar")
  const grid = getBlock(doc, "product_grid")
  const carousel = getBlock(doc, "product_carousel")
  const filters = getBlock(doc, "filters")
  const guide = getBlock(doc, "buying_guide")
  const why = getBlock(doc, "why_europmade")
  const listing = grid ?? carousel

  const keep = preserved ?? {}
  const legacy = {
    title: hero?.title ?? emptyCategoryLocalized(),
    subtitle: hero?.subtitle ?? emptyCategoryLocalized(),
    intro: hero?.intro ?? emptyCategoryLocalized(),
    description: doc.seo.meta_description,
    heroImage: hero?.image_url ?? null,
    heroVisible: hero?.hero_visible !== false,
    bannerId: hero?.banner_id ?? null,
    banner: hero?.banner ?? null,
    bannerVisible: hero?.banner_visible !== false,
    productsTitle: listing?.title ?? locCategory(keep.productsTitle),
    productsSort:
      listing?.sort ??
      (keep.productsSort === "newest" ||
      keep.productsSort === "price_asc" ||
      keep.productsSort === "price_desc"
        ? keep.productsSort
        : "relevance"),
    productsLimit: listing?.limit ?? (
      Number.isFinite(Number(keep.productsLimit))
        ? Math.min(96, Math.max(4, Number(keep.productsLimit)))
        : 24
    ),
    seoTitle: doc.seo.title,
    seoDescription: doc.seo.meta_description,
    madeInEurope: why?.body ?? locCategory(keep.madeInEurope),
    usps: (usp?.slots ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      body: s.body,
      icon_key: s.icon_key,
    })),
    faq: guide
      ? guide.faq.map((f) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
        }))
      : Array.isArray(keep.faq)
        ? keep.faq
        : [],
    filterControls: filters ? filters.controls : Array.isArray(keep.filterControls) ? keep.filterControls : [],
  }

  return {
    ...doc,
    legacy,
    // Also flatten onto root for readers that ignore `legacy`
    ...legacy,
  } as CategoryCmsDocumentV2
}

/**
 * Build V2 from current Admin lean editorial form state.
 */
export function categoryCmsDocumentFromLegacyEditorial(
  editorial: Record<string, unknown>,
  opts: { slug: string; profile: CategoryCmsProfile; path_key?: string | null }
): CategoryCmsDocumentV2 {
  return normalizeCategoryCmsDocument(editorial, opts)
}

function uspSlotSignature(slot: CategoryCmsUspSlot): string {
  return JSON.stringify({
    icon_key: slot.icon_key,
    title: slot.title,
    body: slot.body,
  })
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

/** Copy `patch` onto `base`. Absent keys stay. Arrays in `patch` replace the previous array. */
function deepMergeUnknown(base: unknown, patch: unknown): unknown {
  if (patch === undefined) return base
  if (!isPlainRecord(base) || !isPlainRecord(patch)) return patch
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    out[key] = deepMergeUnknown(out[key], value)
  }
  return out
}

function mergeUspSlots(
  base: CategoryCmsUspBarBlock["slots"] | undefined,
  patch: CategoryCmsUspBarBlock["slots"] | undefined,
  slug: string,
  profile: CategoryCmsProfile
): CategoryCmsUspBarBlock["slots"] {
  return [0, 1, 2, 3].map((index) => {
    const previous = base?.[index]
    const next = patch?.[index]
    const slot = (
      previous && next
        ? deepMergeUnknown(previous, next)
        : next ?? previous ?? {
            id: categoryCmsUspSlotId(slug, profile, index),
            icon_key: "",
            title: emptyCategoryLocalized(),
            body: emptyCategoryLocalized(),
          }
    ) as CategoryCmsUspSlot
    return { ...slot, id: categoryCmsUspSlotId(slug, profile, index) }
  }) as CategoryCmsUspBarBlock["slots"]
}

function mergeEditorBlock(
  base: CategoryCmsBlock | undefined,
  patch: CategoryCmsBlock,
  slug: string,
  profile: CategoryCmsProfile
): CategoryCmsBlock {
  const id = categoryCmsBlockId(slug, profile, patch.type)
  if (base?.type === "usp_bar" && patch.type === "usp_bar") {
    const { slots: _patchSlots, ...patchRest } = patch
    const merged = deepMergeUnknown(base, patchRest) as CategoryCmsUspBarBlock
    return {
      ...merged,
      id,
      type: "usp_bar",
      slots: mergeUspSlots(base.slots, patch.slots, slug, profile),
    }
  }
  if (!base && patch.type === "usp_bar") {
    return {
      ...(patch as CategoryCmsUspBarBlock),
      id,
      slots: mergeUspSlots(undefined, patch.slots, slug, profile),
    }
  }
  const merged = (
    base ? deepMergeUnknown(base, patch) : patch
  ) as CategoryCmsBlock
  return { ...merged, id, type: patch.type } as CategoryCmsBlock
}

/**
 * Apply an editor document onto the stored V2 document.
 * Keys the editor does not send stay on the stored blocks. Optional blocks
 * missing from the editor are removed. Required blocks stay in the editor order
 * after `assertV2BlockOrder` has accepted that order.
 */
export function mergeCategoryCmsEditorWrite(
  base: CategoryCmsDocumentV2,
  patch: unknown,
  opts: { slug: string; profile: CategoryCmsProfile }
): CategoryCmsDocumentV2 {
  const slug = opts.slug.trim().toLowerCase()
  const profile = opts.profile
  const incoming = isPlainRecord(patch) ? patch : {}
  const patchBlocks = Array.isArray(incoming.blocks)
    ? (incoming.blocks as CategoryCmsBlock[])
    : []
  const baseByType = new Map(base.blocks.map((block) => [block.type, block]))
  const resultBlocks: CategoryCmsBlock[] = []
  const emitted = new Set<string>()
  for (const block of patchBlocks) {
    if (!block || typeof block !== "object" || !block.type || emitted.has(block.type)) {
      continue
    }
    emitted.add(block.type)
    resultBlocks.push(
      mergeEditorBlock(baseByType.get(block.type), block, slug, profile)
    )
  }
  const allow = CATEGORY_CMS_PROFILE_ALLOWLIST[profile]
  for (const type of allow) {
    if (emitted.has(type)) continue
    const existing = baseByType.get(type)
    if (existing) {
      resultBlocks.push({ ...existing, id: categoryCmsBlockId(slug, profile, type) })
    }
  }
  const blockMeta: Record<string, CategoryCmsBlockProvenance> = {}
  for (const block of resultBlocks) {
    const previous = baseByType.get(block.type)
    blockMeta[block.id] =
      (previous ? base.block_meta[previous.id] : undefined) ??
      base.block_meta[block.id] ??
      provenanceForBlock(block)
  }
  const {
    blocks: _blocks,
    block_meta: _meta,
    locale_policy: _locale,
    schema_version: _schema,
    profile: _profile,
    seo: patchSeo,
    ...patchRest
  } = incoming
  const merged = deepMergeUnknown(base, patchRest) as CategoryCmsDocumentV2
  merged.schema_version = 2
  merged.profile = profile
  merged.locale_policy = {
    source_locale: "nl",
    locales: [...CATEGORY_CMS_LOCALES],
  }
  merged.blocks = resultBlocks
  merged.seo = deepMergeUnknown(
    base.seo,
    isPlainRecord(patchSeo) ? patchSeo : {}
  ) as CategoryCmsDocumentV2["seo"]
  merged.block_meta = blockMeta
  const preserved = isPlainRecord(base.legacy)
    ? base.legacy
    : (base as unknown as Record<string, unknown>)
  return syncLegacyMirrors(merged, preserved)
}

export function createCategoryCmsOptionalBlock(
  profile: CategoryCmsProfile,
  type: CategoryCmsBlockType,
  opts: { slug: string }
): CategoryCmsBlock | null {
  if (!CATEGORY_CMS_PROFILE_OPTIONAL[profile].includes(type)) return null
  const slug = opts.slug.trim().toLowerCase()
  const id = categoryCmsBlockId(slug, profile, type)
  const title = emptyCategoryLocalized()
  const body = emptyCategoryLocalized()
  switch (type) {
    case "intro":
      return { id, type, visible: true, body }
    case "seo_content":
      return { id, type, visible: true, title, body }
    case "ad_slot":
      return { id, type, visible: true, slot_id: "", placement: "category" }
    case "brand_overview":
      return { id, type, visible: true, title, max_items: 16, allow_sponsored: false }
    case "faq":
      return { id, type, visible: true, title, items: [] }
    case "spec_explain":
      return { id, type, visible: true, title, items: [] }
    case "related_products":
      return { id, type, visible: true, title, limit: 8 }
    case "brand_story":
      return { id, type, visible: true, title, body, brand_slug: null }
    case "phase_navigation":
      return {
        id,
        type,
        visible: true,
        phases: ["discover", "choose", "buy", "install"].map((phase) => ({
          id: phase,
          label: emptyCategoryLocalized(),
          anchor_block_type: "",
        })),
      }
    case "shortcuts":
      return { id, type, visible: true, title, items: [] }
    case "featured_product":
      return { id, type, visible: true, title, product_id: "", motivation: emptyCategoryLocalized() }
    case "inspiration":
      return { id, type, visible: true, title, items: [] }
    case "maintenance":
      return { id, type, visible: true, title, steps: [] }
    case "why_europmade":
      return { id, type, visible: true, title, body }
    case "choice_assistant_cta":
      return {
        id,
        type,
        visible: true,
        title,
        body,
        cta_label: emptyCategoryLocalized(),
        href: "",
        question_codes: [],
      }
    default:
      return null
  }
}

/**
 * Mark only USP slots whose text or icon changed since the previous document.
 * Existing manual flags stay set. Client-sent flags are not trusted.
 */
export function mergeUspManualOverrides(
  previous: CategoryCmsDocumentV2 | null,
  next: CategoryCmsDocumentV2
): CategoryCmsDocumentV2 {
  const usp = getUspBar(next)
  if (!usp) return next
  const prevUsp = previous ? getUspBar(previous) : null
  const prevMeta = prevUsp ? previous?.block_meta[prevUsp.id] : undefined
  const flags: Record<string, boolean> = {
    "0": false,
    "1": false,
    "2": false,
    "3": false,
  }
  for (let index = 0; index < 4; index += 1) {
    const wasManual = isUspSlotManualOverride(prevMeta, index)
    const changed =
      previous != null &&
      prevUsp != null &&
      uspSlotSignature(prevUsp.slots[index]!) !== uspSlotSignature(usp.slots[index]!)
    flags[String(index)] = wasManual || changed
  }
  return {
    ...next,
    block_meta: {
      ...next.block_meta,
      [usp.id]: {
        ...(next.block_meta[usp.id] ?? provenanceForBlock(usp)),
        manual_override: flags,
      },
    },
  }
}

export function isUspSlotManualOverride(
  meta: CategoryCmsBlockProvenance | undefined,
  slotIndex: number
): boolean {
  if (!meta) return false
  if (meta.manual_override === true) return true
  if (meta.manual_override && typeof meta.manual_override === "object") {
    return meta.manual_override[String(slotIndex)] === true
  }
  return false
}

/**
 * Apply AI/manual USP slot update respecting per-slot manual_override.
 * Returns null if blocked by override (caller should keep previous).
 */
export function proposeUspSlotUpdate(
  doc: CategoryCmsDocumentV2,
  slotIndex: number,
  next: Partial<Pick<CategoryCmsUspSlot, "title" | "body" | "icon_key">>,
  opts: { force?: boolean; markManual?: boolean }
): CategoryCmsDocumentV2 | null {
  if (slotIndex < 0 || slotIndex > 3) return null
  const usp = getUspBar(doc)
  if (!usp) return null
  const meta = doc.block_meta[usp.id]
  if (!opts.force && isUspSlotManualOverride(meta, slotIndex)) return null
  const slots = [...usp.slots] as CategoryCmsUspBarBlock["slots"]
  const cur = slots[slotIndex]!
  slots[slotIndex] = {
    ...cur,
    icon_key: next.icon_key ?? cur.icon_key,
    title: next.title ? locCategory(next.title, cur.title) : cur.title,
    body: next.body ? locCategory(next.body, cur.body) : cur.body,
  }
  const nextMeta = { ...(meta ?? provenanceForBlock(usp)) }
  if (opts.markManual) {
    const map: Record<string, boolean> =
      nextMeta.manual_override && typeof nextMeta.manual_override === "object"
        ? { ...nextMeta.manual_override }
        : { "0": false, "1": false, "2": false, "3": false }
    map[String(slotIndex)] = true
    nextMeta.manual_override = map
  }
  const blocks = doc.blocks.map((b) =>
    b.id === usp.id ? { ...usp, slots } : b
  )
  return syncLegacyMirrors({
    ...doc,
    blocks,
    block_meta: { ...doc.block_meta, [usp.id]: nextMeta },
  })
}
