/**
 * AI Content Engine — shared contracts (provider-agnostic, offline-first).
 * ADR-0036. Never invoke during storefront page load.
 */

import type { LocalizedString } from "../i18n/locales"

/** Sprint 4–ready entity types — same engine for all landing surfaces. */
export type AiContentEntityType =
  | "category"
  | "brand"
  | "producer"
  | "collection"
  | "campaign"
  | "landing"
  | "search"
  | "seller"

export type AiContentProviderId =
  | "offline-analyzer"
  | "openai"
  | "anthropic"
  | "gemini"
  | "local"

export type AiGenerationStatus =
  | "pending"
  | "generating"
  | "ready"
  | "failed"
  | "stale"

export type AiRegenerationTrigger =
  | "manual"
  | "entity_changed"
  | "filters_changed"
  | "catalog_delta"
  | "periodic_refresh"
  | "translations_only"
  | "seed"

export type AiInternalLinkKind =
  | "see_also"
  | "goes_well_with"
  | "often_combined"
  | "you_may_like"

export type AiInternalLinkTarget =
  | "category"
  | "producer"
  | "brand"
  | "collection"
  | "campaign"
  | "product"

export type AiInternalLink = {
  id: string
  kind: AiInternalLinkKind
  label: LocalizedString
  href: string
  targetType: AiInternalLinkTarget
  targetId: string
  /** Optional card visual (CMS). */
  imageKind?: string | null
  logoKey?: string | null
}

export type AiFaqItem = {
  id: string
  question: LocalizedString
  answer: LocalizedString
  /** Featured-snippet oriented short answer (optional). */
  snippetAnswer?: LocalizedString | null
}

export type AiRelatedRef = {
  id: string
  slug: string
  label: LocalizedString
  href: string
  productCount?: number | null
  countryLabel?: LocalizedString | null
  imageKind?: string | null
  logoKey?: string | null
}

export type AiBuyGuideCalloutKind = "tip" | "warning" | "highlight" | "info"

export type AiBuyGuideCallout = {
  id: string
  kind: AiBuyGuideCalloutKind
  title: LocalizedString
  body: LocalizedString
}

export type AiBuyGuideComparisonRow = {
  label: LocalizedString
  optionA: LocalizedString
  optionB: LocalizedString
}

export type AiBuyGuideIcon =
  | "check"
  | "shield"
  | "leaf"
  | "compare"
  | "care"
  | "star"
  | "eu"
  | "list"

/** Discrete editorial layout kinds — Coolblue-style buy guide (not one text dump). */
export type AiEditorialBlockKind =
  | "intro"
  | "key_features"
  | "look_for"
  | "expert_tip"
  | "common_mistakes"
  | "comparison"
  | "checklist"
  | "advice"
  | "benefits"
  | "drawbacks"
  | "suitable_for"
  | "less_suitable_for"
  | "maintenance"
  | "sustainability"
  | "topic_visual"
  | "importance"
  | "internal_links"
  | "summary"

export type AiTopicVisual = {
  id: string
  topic: LocalizedString
  /** Product Cloud image later; mock kind for now. */
  imageKind: string
  imageSrc?: string | null
  caption?: LocalizedString | null
  importance: number
}

export type AiImportanceRow = {
  id: string
  label: LocalizedString
  /** 1–5 stars / bar weight — AI-filled from signals. */
  score: number
  /** Optional bar out of 100. */
  barPercent: number
}

export type AiInlineLink = {
  id: string
  label: LocalizedString
  href: string
}

/** One editorial block with its own layout (CMS/AI). */
export type AiEditorialBlock = {
  id: string
  kind: AiEditorialBlockKind
  icon?: AiBuyGuideIcon | null
  heading?: LocalizedString | null
  intro?: LocalizedString | null
  paragraphs?: LocalizedString[]
  bullets?: LocalizedString[]
  callouts?: AiBuyGuideCallout[]
  checklist?: LocalizedString[]
  comparisonRows?: AiBuyGuideComparisonRow[]
  topicVisuals?: AiTopicVisual[]
  importanceRows?: AiImportanceRow[]
  links?: AiInlineLink[]
  /** Paragraphs that may contain {{link:id}} markers resolved at render. */
  richParagraphs?: LocalizedString[]
}

/** Rich Coolblue-style accordion section (CMS/AI) — kept + mirrored into editorialBlocks. */
export type AiBuyGuideSection = {
  id: string
  icon: AiBuyGuideIcon
  heading: LocalizedString
  intro: LocalizedString
  paragraphs: LocalizedString[]
  bullets: LocalizedString[]
  tips: LocalizedString[]
  warnings: LocalizedString[]
  commonMistakes: LocalizedString[]
  advice: LocalizedString
  callouts: AiBuyGuideCallout[]
  checklist: LocalizedString[]
  comparisonRows: AiBuyGuideComparisonRow[]
  relatedLinks: AiInternalLink[]
  relatedProducers: AiRelatedRef[]
  relatedBrands: AiRelatedRef[]
  relatedCategories: AiRelatedRef[]
  relatedProducts: AiRelatedRef[]
  topicVisuals?: AiTopicVisual[]
  /** Flat summary for SEO / backwards compatibility. */
  body: LocalizedString
}

export type AiDiscoveryCardType =
  | "category"
  | "brand"
  | "producer"
  | "collection"
  | "combination"
  | "product"
  | "next_step"
  | "banner"

export type AiDiscoveryRailLayout =
  | "logo_row"
  | "image_cards"
  | "product_cards"
  | "category_banners"
  | "mixed"

export type AiDiscoveryRailKind =
  | "maybe_interesting"
  | "popular_brands"
  | "new_producers"
  | "compare_category"
  | "new_collections"
  | "bought_together"
  | "most_viewed"
  | "alternatives"
  | "accessories"
  | "season"
  | "materials"
  | "applications"

/** Premium “Bekijk ook” cards — AI-selected, CMS-stored. */
export type AiDiscoveryCard = {
  id: string
  type: AiDiscoveryCardType
  title: LocalizedString
  subtitle?: LocalizedString | null
  href: string
  imageKind?: string | null
  logoKey?: string | null
  productCount?: number | null
  countryLabel?: LocalizedString | null
  badge?: LocalizedString | null
}

/** Typed discovery rail — different layout per rail (AI picks which rails). */
export type AiDiscoveryRail = {
  id: string
  kind: AiDiscoveryRailKind
  layout: AiDiscoveryRailLayout
  title: LocalizedString
  subtitle?: LocalizedString | null
  cards: AiDiscoveryCard[]
}

/** Product Cloud insight placeholders — filled from signals now, PC later. */
export type AiProductCloudInsight = {
  id: string
  key: string
  label: LocalizedString
  value: LocalizedString
  unit?: LocalizedString | null
  source: "product-cloud" | "signal-estimate"
}

/** Full AI content payload stored in CMS per entity (all locales stored). */
export type AiGeneratedContentPayload = {
  seoTitle: LocalizedString
  metaDescription: LocalizedString
  h1: LocalizedString
  intro: LocalizedString
  buyGuide: LocalizedString
  buyGuideSections: AiBuyGuideSection[]
  /** Ordered Coolblue-style editorial blocks (preferred render path). */
  editorialBlocks: AiEditorialBlock[]
  keyFeatures: LocalizedString[]
  whatToLookFor: LocalizedString
  buyingAdvice: LocalizedString
  benefits: LocalizedString[]
  drawbacks: LocalizedString[]
  comparison: LocalizedString
  maintenance: LocalizedString
  sustainability: LocalizedString
  suitableFor: LocalizedString[]
  lessSuitableFor: LocalizedString[]
  expertAdvice: LocalizedString
  faq: AiFaqItem[]
  internalLinks: AiInternalLink[]
  discoveryCards: AiDiscoveryCard[]
  /** Typed rails — AI selects which rails apply per category. */
  discoveryRails: AiDiscoveryRail[]
  /** Product Cloud insights (signal estimates until PC wired). */
  productCloudInsights: AiProductCloudInsight[]
  topicVisuals: AiTopicVisual[]
  importanceRows: AiImportanceRow[]
  relatedCategories: AiRelatedRef[]
  relatedProducers: AiRelatedRef[]
  relatedBrands: AiRelatedRef[]
  frequentlyCombined: AiRelatedRef[]
  structuredData: Record<string, unknown>
  openGraph: {
    title: LocalizedString
    description: LocalizedString
    type: "website"
  }
  twitterCard: {
    card: "summary_large_image"
    title: LocalizedString
    description: LocalizedString
  }
  canonicalPath: string
  altTexts: LocalizedString[]
  breadcrumbSeo: { name: LocalizedString; path: string }[]
  keywords: LocalizedString[]
  longTailKeywords: LocalizedString[]
  featuredSnippetAnswers: LocalizedString[]
  seoSummary: LocalizedString
}

export type AiContentDocument = {
  id: string
  entityType: AiContentEntityType
  entityId: string
  payload: AiGeneratedContentPayload
  generationStatus: AiGenerationStatus
  published: boolean
  lastGenerated: string | null
  generatedBy: AiContentProviderId
  promptVersion: string
  localeCoverage: ("nl" | "en" | "de" | "fr")[]
  lastTrigger?: AiRegenerationTrigger | null
  errorMessage?: string | null
  /** ISO — next periodic refresh hint (e.g. +6 months). */
  refreshAfter?: string | null
}

export type AiContentSignalProduct = {
  title: string
  brand: string
  seller: string
  countryCode: string
  countryLabel: string
  verified: boolean
  features: string[]
  keywords: string[]
  priceCents: number
  rating: number
}

export type AiContentFilterSignal = {
  attributeKey: string
  label: string
  values: string[]
}

/** Analysis input — never a blank template; always catalog-aware. */
export type AiContentAnalysisContext = {
  entityType: AiContentEntityType
  entityId: string
  label: string
  parentLabel?: string | null
  products: AiContentSignalProduct[]
  filters: AiContentFilterSignal[]
  relatedCategorySlugs: string[]
  relatedCategoryLabels: string[]
  focusTopics: string[]
  productionCountries: string[]
  brands: string[]
  producers: string[]
  verifiedRatio: number
  productCount: number
}

export type AiGenerateRequest = {
  context: AiContentAnalysisContext
  promptVersion: string
  locales: ("nl" | "en" | "de" | "fr")[]
  trigger: AiRegenerationTrigger
  translationsOnly?: boolean
  previous?: AiGeneratedContentPayload | null
}

export type AiGenerateResult = {
  payload: AiGeneratedContentPayload
  providerId: AiContentProviderId
  promptVersion: string
}
