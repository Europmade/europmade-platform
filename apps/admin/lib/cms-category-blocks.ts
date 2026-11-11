import {
  CATEGORY_CMS_PROFILE_ALLOWLIST,
  CATEGORY_CMS_PROFILE_OPTIONAL,
  createCategoryCmsOptionalBlock,
  normalizeCategoryCmsDocument,
  type CategoryCmsBlock,
  type CategoryCmsBlockType,
  type CategoryCmsDocumentV2,
  type CategoryCmsProfile,
} from "@europmade/utils"

export const CATEGORY_CMS_BLOCK_LABEL: Record<CategoryCmsBlockType, string> = {
  hero: "Hero",
  usp_bar: "USP-balk",
  intro: "Introductie",
  subcategory_tiles: "Subcategorietegels",
  product_group_tiles: "Productgroeptegels",
  product_carousel: "Populaire producten",
  product_grid: "Productgrid",
  filters: "Filters",
  brand_overview: "Merken",
  brand_story: "Merkverhaal",
  choice_assistant_cta: "Keuzehulp",
  advice_compare: "Advies en vergelijking",
  product_comparison: "Productvergelijking",
  spec_explain: "Specificatie-uitleg",
  buying_guide: "Koopgids",
  faq: "FAQ",
  why_europmade: "Waarom EuropMade",
  related_products: "Gerelateerde producten",
  seo_content: "SEO-tekst",
  ad_slot: "Advertentiepositie",
  phase_navigation: "Fasebalk",
  shortcuts: "Snelkoppelingen",
  featured_product: "Uitgelicht product",
  inspiration: "Inspiratie",
  maintenance: "Onderhoud",
}

export const CATEGORY_CMS_PROFILE_LABEL: Record<CategoryCmsProfile, string> = {
  level_1: "Level 1 · Hub",
  level_2: "Level 2 · Domein",
  level_3: "Level 3 · Assortiment",
}

const PREVIEW_SECTION: Partial<Record<CategoryCmsBlockType, string>> = {
  hero: "hero",
  usp_bar: "usps",
  intro: "intro",
  filters: "filters",
}

export function editorDocumentFromStored(
  raw: unknown,
  opts: { slug: string; profile: CategoryCmsProfile | null }
): CategoryCmsDocumentV2 | null {
  if (!opts.profile) return null
  if (raw && typeof raw === "object") {
    const row = raw as {
      schema_version?: unknown
      profile?: unknown
      blocks?: unknown
    }
    if (row.schema_version === 2 && Array.isArray(row.blocks)) {
      if (row.profile !== opts.profile) return null
      return raw as CategoryCmsDocumentV2
    }
  }
  return normalizeCategoryCmsDocument(raw ?? {}, {
    slug: opts.slug,
    profile: opts.profile,
  })
}

export function isRequiredCategoryBlock(
  profile: CategoryCmsProfile,
  type: CategoryCmsBlockType
): boolean {
  return CATEGORY_CMS_PROFILE_ALLOWLIST[profile].includes(type)
}

export function optionalBlocksToAdd(
  doc: CategoryCmsDocumentV2,
  profile: CategoryCmsProfile
): CategoryCmsBlockType[] {
  const present = new Set(doc.blocks.map((block) => block.type))
  return CATEGORY_CMS_PROFILE_OPTIONAL[profile].filter((type) => !present.has(type))
}

export function updateCategoryBlock(
  doc: CategoryCmsDocumentV2,
  id: string,
  patch: Partial<CategoryCmsBlock>
): CategoryCmsDocumentV2 {
  return {
    ...doc,
    blocks: doc.blocks.map((block) =>
      block.id === id ? ({ ...block, ...patch } as CategoryCmsBlock) : block
    ),
  }
}

export function moveOptionalCategoryBlock(
  doc: CategoryCmsDocumentV2,
  id: string,
  direction: -1 | 1,
  profile: CategoryCmsProfile
): CategoryCmsDocumentV2 {
  const index = doc.blocks.findIndex((block) => block.id === id)
  const block = doc.blocks[index]
  if (!block || isRequiredCategoryBlock(profile, block.type)) return doc
  const target = index + direction
  if (target < 0 || target >= doc.blocks.length) return doc
  const blocks = doc.blocks.slice()
  const [item] = blocks.splice(index, 1)
  blocks.splice(target, 0, item!)
  return { ...doc, blocks }
}

export function removeOptionalCategoryBlock(
  doc: CategoryCmsDocumentV2,
  id: string,
  profile: CategoryCmsProfile
): CategoryCmsDocumentV2 {
  const block = doc.blocks.find((item) => item.id === id)
  if (!block || isRequiredCategoryBlock(profile, block.type)) return doc
  return { ...doc, blocks: doc.blocks.filter((item) => item.id !== id) }
}

export function addOptionalCategoryBlock(
  doc: CategoryCmsDocumentV2,
  type: CategoryCmsBlockType,
  profile: CategoryCmsProfile,
  slug: string
): CategoryCmsDocumentV2 {
  if (doc.blocks.some((block) => block.type === type)) return doc
  const block = createCategoryCmsOptionalBlock(profile, type, { slug })
  if (!block) return doc
  return { ...doc, blocks: [...doc.blocks, block] }
}

export function previewSectionForBlock(
  doc: CategoryCmsDocumentV2,
  selectedId: string
): string {
  const block = doc.blocks.find((item) => item.id === selectedId)
  if (!block) return selectedId
  return PREVIEW_SECTION[block.type] ?? block.id
}

export function blockIdForPreviewSection(
  doc: CategoryCmsDocumentV2,
  sectionId: string
): string {
  const typeBySection: Record<string, CategoryCmsBlockType> = {
    hero: "hero",
    banner: "hero",
    usps: "usp_bar",
    intro: "intro",
    filters: "filters",
  }
  const type = typeBySection[sectionId]
  if (!type) return sectionId
  return doc.blocks.find((block) => block.type === type)?.id ?? sectionId
}
