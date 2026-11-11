/**
 * Category CMS proposals (C3).
 * A proposal is not a draft and not a publication.
 * Nothing in this module writes cms_category, calls a provider, or publishes.
 * Persistence needs a separate table; see the C3 report. Do not store these
 * records in draft_document or published_document.
 */
import {
  categoryCmsAllowedBlockTypes,
  categoryCmsBlockId,
  isUspSlotManualOverride,
  type CategoryCmsBlock,
  type CategoryCmsBlockProvenance,
  type CategoryCmsBlockType,
  type CategoryCmsDocumentV2,
  type CategoryCmsLocale,
  type CategoryCmsLocalized,
  type CategoryCmsProfile,
} from "@europmade/utils"
import type { CategoryFactPackage } from "../product-cloud/category-fact-package"

export const CATEGORY_CMS_PROPOSAL_PROMPT_VERSION = "category-cms-offline-1"

export const CATEGORY_CMS_PROPOSAL_LOCALES = ["nl", "en", "de", "fr"] as const

export type CategoryCmsProposalLocale = (typeof CATEGORY_CMS_PROPOSAL_LOCALES)[number]

export type CategoryCmsProposalStatus =
  | "proposed"
  | "accepted"
  | "modified"
  | "rejected"
  | "outdated"

export type CategoryCmsProposalConfidence = "blocked" | "partial" | "factual"

export type CategoryCmsProposalFields = {
  intro?: string
  caption?: string
  body?: string
  seo_title?: string
  seo_description?: string
  usp_0?: string
  usp_1?: string
  usp_2?: string
  usp_3?: string
}

export type CategoryCmsProposalContent = Record<
  CategoryCmsProposalLocale,
  CategoryCmsProposalFields
>

export type CategoryCmsBlockProposal = {
  id: string
  category_id: string
  slug: string
  profile: CategoryCmsProfile
  block_id: string
  block_type: CategoryCmsBlockType
  fact_fingerprint: string
  status: CategoryCmsProposalStatus
  confidence: CategoryCmsProposalConfidence
  generation_reason: string
  used_facts: Array<{ path: string }>
  missing: Array<{ code: string; count?: number }>
  missing_locales: CategoryCmsProposalLocale[]
  content: CategoryCmsProposalContent | null
  provider_id: "offline-analyzer"
  model: null
  prompt_version: string
  locale_source: "nl"
  generated_at: string
  applied_draft_revision: number | null
}

export type CategoryCmsProposalCost = {
  proposal_id: string
  slug: string
  block_type: CategoryCmsBlockType
  locale: CategoryCmsProposalLocale
  provider_id: "offline-analyzer"
  model: null
  input_tokens: 0
  output_tokens: 0
  currency: "EUR"
  amount_minor: 0
  generated_at: string
}

const GLUE: Record<
  CategoryCmsProposalLocale,
  {
    published: (count: number) => string
    children: string
    brands: string
    production: string
    verified: (count: number) => string
    score: (count: number) => string
    spec: string
  }
> = {
  nl: {
    published: (count) => `${count} gepubliceerde producten`,
    children: "Subcategorieën",
    brands: "Merken",
    production: "Productieland",
    verified: (count) => `Geverifieerde Europese herkomst: ${count}`,
    score: (count) => `Made in Europe-score: ${count}`,
    spec: "Specificatie",
  },
  en: {
    published: (count) => (count === 1 ? "1 published product" : `${count} published products`),
    children: "Subcategories",
    brands: "Brands",
    production: "Production country",
    verified: (count) => `Verified European origin: ${count}`,
    score: (count) => `Made in Europe score: ${count}`,
    spec: "Specification",
  },
  de: {
    published: (count) => (count === 1 ? "1 veröffentlichtes Produkt" : `${count} veröffentlichte Produkte`),
    children: "Unterkategorien",
    brands: "Marken",
    production: "Produktionsland",
    verified: (count) => `Geprüfte europäische Herkunft: ${count}`,
    score: (count) => `Made-in-Europe-Score: ${count}`,
    spec: "Spezifikation",
  },
  fr: {
    published: (count) => (count === 1 ? "1 produit publié" : `${count} produits publiés`),
    children: "Sous-catégories",
    brands: "Marques",
    production: "Pays de production",
    verified: (count) => `Origine européenne vérifiée : ${count}`,
    score: (count) => `Score Made in Europe : ${count}`,
    spec: "Spécification",
  },
}

function locFields(
  build: (locale: CategoryCmsProposalLocale) => CategoryCmsProposalFields
): CategoryCmsProposalContent {
  return {
    nl: build("nl"),
    en: build("en"),
    de: build("de"),
    fr: build("fr"),
  }
}

function missingLocales(content: CategoryCmsProposalContent | null): CategoryCmsProposalLocale[] {
  if (!content) return []
  const filled = CATEGORY_CMS_PROPOSAL_LOCALES.filter((locale) =>
    Object.values(content[locale]).some((value) => value.trim())
  )
  if (filled.length === 0) return []
  return CATEGORY_CMS_PROPOSAL_LOCALES.filter((locale) => !filled.includes(locale))
}

function proposalId(pkg: CategoryFactPackage, type: CategoryCmsBlockType): string {
  return `cmp_${pkg.slug}_${pkg.profile}_${type}_${pkg.fingerprint.slice(0, 12)}`
}

function base(
  pkg: CategoryFactPackage,
  type: CategoryCmsBlockType,
  now: string,
  confidence: CategoryCmsProposalConfidence,
  reason: string,
  used: string[],
  missing: Array<{ code: string; count?: number }>,
  content: CategoryCmsProposalContent | null
): CategoryCmsBlockProposal {
  return {
    id: proposalId(pkg, type),
    category_id: pkg.category_id,
    slug: pkg.slug,
    profile: pkg.profile,
    block_id: categoryCmsBlockId(pkg.slug, pkg.profile, type),
    block_type: type,
    fact_fingerprint: pkg.fingerprint,
    status: "proposed",
    confidence,
    generation_reason: reason,
    used_facts: used.map((path) => ({ path })),
    missing,
    missing_locales: missingLocales(content),
    content,
    provider_id: "offline-analyzer",
    model: null,
    prompt_version: CATEGORY_CMS_PROPOSAL_PROMPT_VERSION,
    locale_source: "nl",
    generated_at: now,
    applied_draft_revision: null,
  }
}

function blocked(
  pkg: CategoryFactPackage,
  type: CategoryCmsBlockType,
  now: string,
  reason: string,
  missing: Array<{ code: string; count?: number }>
): CategoryCmsBlockProposal {
  return base(pkg, type, now, "blocked", reason, [], missing, null)
}

function isoCountries(pkg: CategoryFactPackage): string[] {
  return pkg.available_facts.production_countries
    .map((row) => row.iso_code)
    .filter((code): code is string => Boolean(code))
}

function childLine(pkg: CategoryFactPackage): string {
  return pkg.available_facts.children
    .map((child) => `${child.name} (${child.published_count})`)
    .join(", ")
}

function brandLine(pkg: CategoryFactPackage): string {
  return pkg.available_facts.brands
    .map((brand) => brand.name)
    .filter((name): name is string => Boolean(name?.trim()))
    .join(", ")
}

function productLine(pkg: CategoryFactPackage): string {
  return pkg.available_facts.published_products.map((product) => product.title).filter(Boolean).join(", ")
}

function specLine(pkg: CategoryFactPackage, locale: CategoryCmsProposalLocale): string {
  return pkg.available_facts.value_distribution
    .filter((row) => row.code && !row.code.startsWith("gpsr_"))
    .map((row) => `${row.name}: ${row.value} (${row.product_count})`)
    .map((row) => `${GLUE[locale].spec} ${row}`)
    .join(". ")
}

function heroContent(pkg: CategoryFactPackage): CategoryCmsProposalContent {
  const children = childLine(pkg)
  const published = pkg.available_facts.counts.published
  return locFields((locale) => ({
    intro: [
      pkg.name,
      published > 0 ? GLUE[locale].published(published) : "",
      children ? `${GLUE[locale].children}: ${children}` : "",
    ]
      .filter(Boolean)
      .join(". "),
  }))
}

function whyContent(pkg: CategoryFactPackage): CategoryCmsProposalContent | null {
  const codes = isoCountries(pkg)
  const evidence = pkg.derived_insights.made_in_europe_with_approved_evidence_count
  const score = pkg.derived_insights.made_in_europe_score_count
  if (codes.length === 0 && evidence === 0 && score === 0) return null
  return locFields((locale) => ({
    body: [
      codes.length ? `${GLUE[locale].production} ${codes.join(", ")}` : "",
      evidence > 0 ? GLUE[locale].verified(evidence) : "",
      score > 0 ? GLUE[locale].score(score) : "",
    ]
      .filter(Boolean)
      .join(". "),
  }))
}

function uspContent(pkg: CategoryFactPackage): CategoryCmsProposalContent | null {
  const published = pkg.available_facts.counts.published
  const children = pkg.available_facts.children.length
  const brands = pkg.available_facts.brands.length
  const codes = isoCountries(pkg)
  if (published === 0 && children === 0 && brands === 0 && codes.length === 0) return null
  return locFields((locale) => ({
    usp_0: published > 0 ? GLUE[locale].published(published) : "",
    usp_1: children > 0 ? `${GLUE[locale].children}: ${children}` : "",
    usp_2: brands > 0 ? `${GLUE[locale].brands}: ${brands}` : "",
    usp_3: codes.length ? `${GLUE[locale].production} ${codes.join(", ")}` : "",
  }))
}

function buildOne(
  pkg: CategoryFactPackage,
  type: CategoryCmsBlockType,
  now: string
): CategoryCmsBlockProposal {
  const published = pkg.available_facts.counts.published
  const children = pkg.available_facts.children
  const brands = brandLine(pkg)
  const products = productLine(pkg)
  const specs = specLine(pkg, "nl")
  const comparableValues = pkg.available_facts.value_distribution.filter(
    (row) => row.product_count > 0 && row.code && !row.code.startsWith("gpsr_")
  )
  const filterNames = pkg.available_facts.definitions
    .filter((row) => row.is_filterable && row.requirement_tier !== "compliance_required" && row.code)
    .map((row) => row.name)

  if (type === "hero" || type === "intro") {
    const content = heroContent(pkg)
    const used = ["category.name"]
    if (published > 0) used.push("available_facts.counts.published")
    if (children.length) used.push("available_facts.children")
    return base(
      pkg,
      type,
      now,
      published > 0 || children.length ? "factual" : "partial",
      "Naam en beschikbare taxonomie of tellingen.",
      used,
      published === 0 ? [{ code: "empty_product_tree" }] : [],
      content
    )
  }

  if (type === "usp_bar") {
    const content = uspContent(pkg)
    if (!content) {
      return blocked(pkg, type, now, "Geen telling of ISO-productieland voor een USP.", [
        { code: "usp_without_fact" },
      ])
    }
    return base(
      pkg,
      type,
      now,
      "partial",
      "Alleen slots met een telling of een ISO-productieland.",
      ["available_facts.counts.published", "available_facts.children", "available_facts.brands", "available_facts.production_countries"],
      [{ code: "popularity_unavailable" }],
      content
    )
  }

  if (type === "subcategory_tiles" || type === "product_group_tiles") {
    if (children.length === 0) {
      return blocked(pkg, type, now, "Geen kindcategorieën.", [{ code: "no_child_categories" }])
    }
    return base(
      pkg,
      type,
      now,
      "factual",
      "Bijschrift met kindnamen en gepubliceerde aantallen.",
      ["available_facts.children"],
      [],
      locFields((locale) => ({ caption: `${GLUE[locale].children}: ${childLine(pkg)}` }))
    )
  }

  if (type === "product_carousel" || type === "product_grid") {
    if (!products) {
      return blocked(pkg, type, now, "Geen gepubliceerde producten.", [
        { code: "empty_product_tree" },
        { code: "popularity_unavailable" },
      ])
    }
    return base(
      pkg,
      type,
      now,
      "factual",
      "Titels van gepubliceerde producten, zonder populariteit of prijs.",
      ["available_facts.published_products"],
      [{ code: "popularity_unavailable" }],
      locFields(() => ({ caption: products }))
    )
  }

  if (type === "brand_overview" || type === "brand_story") {
    if (!brands) {
      return blocked(pkg, type, now, "Geen merknamen.", [{ code: "no_brands" }])
    }
    return base(
      pkg,
      type,
      now,
      "partial",
      "Alleen merknamen. Het land van de eigenaar is geen herkomst.",
      ["available_facts.brands"],
      [{ code: "brand_country_not_in_model", count: pkg.available_facts.brands.length }],
      locFields((locale) => ({
        caption: `${GLUE[locale].brands}: ${brands}`,
        body: brands,
      }))
    )
  }

  if (type === "why_europmade") {
    const content = whyContent(pkg)
    if (!content) {
      return blocked(pkg, type, now, "Geen ISO-productieland, score of goedgekeurd herkomstbewijs.", [
        { code: "origin_unknown" },
      ])
    }
    return base(
      pkg,
      type,
      now,
      "factual",
      "Alleen ISO-productieland, score of goedgekeurd bewijs.",
      [
        "available_facts.production_countries",
        "derived_insights.made_in_europe_score_count",
        "derived_insights.made_in_europe_with_approved_evidence_count",
      ],
      [],
      content
    )
  }

  if (type === "choice_assistant_cta" || type === "advice_compare" || type === "spec_explain" || type === "buying_guide" || type === "product_comparison") {
    if (comparableValues.length === 0 || (type === "product_comparison" && pkg.derived_insights.products_with_specification_values < 2)) {
      return blocked(pkg, type, now, "Te weinig vergelijkbare specificatiewaarden.", [
        { code: "comparable_values_insufficient" },
      ])
    }
    return base(
      pkg,
      type,
      now,
      "partial",
      "Alleen opgeslagen specificatiewaarden en hun aantal.",
      ["available_facts.value_distribution"],
      [],
      locFields((locale) => ({ body: specLine(pkg, locale) }))
    )
  }

  if (type === "filters") {
    if (filterNames.length === 0) {
      return blocked(pkg, type, now, "Geen filterbare specificaties buiten compliance.", [
        { code: "no_shopping_filters" },
      ])
    }
    return base(
      pkg,
      type,
      now,
      "factual",
      "Namen van filterbare definities. Geen verzonnen opties.",
      ["available_facts.definitions"],
      [],
      locFields(() => ({ caption: filterNames.join(", ") }))
    )
  }

  if (type === "related_products") {
    if (pkg.available_facts.relations.length === 0) {
      return blocked(pkg, type, now, "Geen productrelaties.", [{ code: "no_product_relations" }])
    }
    return base(
      pkg,
      type,
      now,
      "factual",
      "Relatie-id's uit Product Cloud.",
      ["available_facts.relations"],
      [],
      locFields(() => ({
        caption: pkg.available_facts.relations.map((row) => row.id).join(", "),
      }))
    )
  }

  if (type === "seo_content") {
    const extra = published > 0 || children.length > 0 || isoCountries(pkg).length > 0
    if (!extra) {
      return blocked(pkg, type, now, "SEO blijft leeg zonder feit naast de categorienaam.", [
        { code: "seo_name_only" },
      ])
    }
    const content = locFields((locale) => {
      const intro = heroContent(pkg)[locale].intro ?? pkg.name
      return {
        seo_title: intro,
        seo_description: intro,
        body: intro,
      }
    })
    return base(
      pkg,
      type,
      now,
      "partial",
      "Titel en omschrijving noemen alleen feiten uit het pakket.",
      ["category.name", "available_facts.counts.published"],
      [{ code: "popularity_unavailable" }],
      content
    )
  }

  if (type === "faq" || type === "inspiration" || type === "maintenance" || type === "phase_navigation" || type === "shortcuts" || type === "featured_product" || type === "ad_slot") {
    return blocked(pkg, type, now, "Geen bron voor dit redactionele blok.", [{ code: "no_editorial_source" }])
  }

  return blocked(pkg, type, now, "Geen voorstelregel voor dit blok.", [{ code: "no_proposal_rule" }])
}

/** Offline proposals for every block the profile allows. No provider call and no write. */
export function buildCategoryCmsProposals(
  pkg: CategoryFactPackage,
  opts?: { now?: string }
): { proposals: CategoryCmsBlockProposal[]; costs: CategoryCmsProposalCost[]; provider_calls: 1 } {
  const now = opts?.now ?? new Date(0).toISOString()
  const types = [...categoryCmsAllowedBlockTypes(pkg.profile)].sort()
  const proposals = types.map((type) => buildOne(pkg, type, now))
  const costs = proposals.flatMap((proposal) =>
    CATEGORY_CMS_PROPOSAL_LOCALES.map((locale) => ({
      proposal_id: proposal.id,
      slug: proposal.slug,
      block_type: proposal.block_type,
      locale,
      provider_id: "offline-analyzer" as const,
      model: null,
      input_tokens: 0 as const,
      output_tokens: 0 as const,
      currency: "EUR" as const,
      amount_minor: 0 as const,
      generated_at: now,
    }))
  )
  return { proposals, costs, provider_calls: 1 }
}

export function categoryCmsExternalProviderRefused(providerId: string): boolean {
  return providerId !== "offline-analyzer"
}

function sameContent(a: CategoryCmsProposalContent | null, b: CategoryCmsProposalContent | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Equal fingerprint reuses the stored proposals and does not generate.
 * A different fingerprint only marks records outdated unless regeneration was requested.
 * Rejected text with the same content is not added again.
 */
export function reconcileCategoryCmsProposals(input: {
  existing: CategoryCmsBlockProposal[]
  fingerprint: string
  rebuilt?: CategoryCmsBlockProposal[]
  explicit?: boolean
}): { proposals: CategoryCmsBlockProposal[]; provider_calls: number } {
  const explicit = input.explicit === true
  const changed = input.existing.some((row) => row.fact_fingerprint !== input.fingerprint)
  const first = input.existing.length === 0
  if (!explicit || (!changed && !first)) {
    if (!changed) return { proposals: input.existing, provider_calls: 0 }
    return {
      proposals: input.existing.map((row) =>
        row.fact_fingerprint === input.fingerprint ? row : { ...row, status: "outdated" }
      ),
      provider_calls: 0,
    }
  }
  const outdated = input.existing.map((row) => ({ ...row, status: "outdated" as const }))
  const rejected = input.existing.filter((row) => row.status === "rejected")
  const added = (input.rebuilt ?? []).filter(
    (row) =>
      !rejected.some(
        (previous) => previous.block_type === row.block_type && sameContent(previous.content, row.content)
      )
  )
  return { proposals: [...outdated, ...added], provider_calls: added.length > 0 ? 1 : 0 }
}

function textOf(value: CategoryCmsLocalized | undefined, locale: CategoryCmsLocale): string {
  return value?.[locale]?.trim() ?? ""
}

function originOf(
  meta: CategoryCmsBlockProvenance | undefined,
  field: string,
  locale: CategoryCmsLocale
): string | undefined {
  return meta?.locale_origins?.[field]?.[locale]
}

function fillField(
  current: CategoryCmsLocalized,
  next: string | undefined,
  meta: CategoryCmsBlockProvenance | undefined,
  field: string,
  locale: CategoryCmsLocale
): { value: string; wrote: boolean; origin: "manual" | "machine" | "source" } {
  if (textOf(current, locale) || originOf(meta, field, locale) === "manual") {
    return {
      value: current[locale] ?? "",
      wrote: false,
      origin: originOf(meta, field, locale) === "manual" ? "manual" : "source",
    }
  }
  const incoming = next?.trim() ?? ""
  if (!incoming) return { value: current[locale] ?? "", wrote: false, origin: "source" }
  return { value: incoming, wrote: true, origin: "machine" }
}

function applyLocalized(
  block: CategoryCmsBlock,
  meta: CategoryCmsBlockProvenance | undefined,
  field: string,
  current: CategoryCmsLocalized,
  content: CategoryCmsProposalContent,
  key: keyof CategoryCmsProposalFields
): { value: CategoryCmsLocalized; meta: CategoryCmsBlockProvenance; wrote: boolean } {
  const next = { ...current }
  const origins = { ...(meta?.locale_origins ?? {}) }
  const fieldOrigins = { ...(origins[field] ?? {}) }
  let wrote = false
  for (const locale of CATEGORY_CMS_PROPOSAL_LOCALES) {
    const filled = fillField(current, content[locale][key], meta, field, locale)
    next[locale] = filled.value
    if (filled.wrote) {
      wrote = true
      fieldOrigins[locale] = "machine"
    } else if (fieldOrigins[locale] === "manual") {
      fieldOrigins[locale] = "manual"
    }
  }
  origins[field] = fieldOrigins
  return {
    value: next,
    wrote,
    meta: {
      ...(meta ?? {
        source: "cms",
        dynamic: false,
        ai_may_propose: true,
        manual_override: false,
        approval_required: true,
        content_version: "v2",
      }),
      source: wrote ? "ai" : meta?.source ?? "cms",
      locale_origins: origins,
      manual_override: meta?.manual_override ?? false,
    },
  }
}

export type CategoryCmsProposalDecision = {
  document: CategoryCmsDocumentV2
  proposal: CategoryCmsBlockProposal
  applied: boolean
  skipped_manual: boolean
  published: false
}

function untouched(document: CategoryCmsDocumentV2, proposal: CategoryCmsBlockProposal, status: CategoryCmsProposalStatus): CategoryCmsProposalDecision {
  return {
    document,
    proposal: { ...proposal, status },
    applied: false,
    skipped_manual: false,
    published: false,
  }
}

/** Copy proposal fields into empty, non-manual draft fields. Published is not an argument. */
export function acceptCategoryCmsProposal(
  document: CategoryCmsDocumentV2,
  proposal: CategoryCmsBlockProposal,
  opts?: { draftRevision?: number }
): CategoryCmsProposalDecision {
  if (proposal.confidence === "blocked" || !proposal.content) {
    return untouched(document, proposal, proposal.status)
  }
  const index = document.blocks.findIndex((block) => block.type === proposal.block_type)
  if (index < 0) {
    return untouched(document, proposal, proposal.status)
  }
  const block = document.blocks[index]!
  const meta = document.block_meta[block.id]
  const content = proposal.content
  let wrote = false
  let skippedManual = false
  const blocks = document.blocks.slice()
  let nextMeta = meta

  function take(
    field: string,
    current: CategoryCmsLocalized,
    key: keyof CategoryCmsProposalFields
  ): CategoryCmsLocalized {
    const applied = applyLocalized(block, nextMeta, field, current, content, key)
    nextMeta = applied.meta
    if (applied.wrote) wrote = true
    else if (CATEGORY_CMS_PROPOSAL_LOCALES.some((locale) => textOf(current, locale) || originOf(meta, field, locale) === "manual")) {
      skippedManual = true
    }
    return applied.value
  }

  if (block.type === "hero") {
    blocks[index] = { ...block, intro: take("intro", block.intro, "intro") }
  } else if (block.type === "intro" || block.type === "why_europmade" || block.type === "seo_content" || block.type === "brand_story") {
    blocks[index] = { ...block, body: take("body", block.body, block.type === "intro" ? "intro" : "body") }
  } else if (
    block.type === "subcategory_tiles" ||
    block.type === "product_group_tiles" ||
    block.type === "product_carousel" ||
    block.type === "product_grid" ||
    block.type === "brand_overview"
  ) {
    blocks[index] = { ...block, title: take("title", block.title, "caption") }
  } else if (block.type === "usp_bar") {
    const slots = block.slots.map((slot, slotIndex) => {
      if (isUspSlotManualOverride(meta, slotIndex)) {
        skippedManual = true
        return slot
      }
      const key = `usp_${slotIndex}` as keyof CategoryCmsProposalFields
      return { ...slot, title: take(`usp_${slotIndex}`, slot.title, key) }
    }) as typeof block.slots
    blocks[index] = { ...block, slots }
  } else if (block.type === "faq" || block.type === "buying_guide" || block.type === "advice_compare") {
    return untouched(document, proposal, proposal.status)
  } else {
    return untouched(document, proposal, proposal.status)
  }

  const seo =
    proposal.block_type === "seo_content"
      ? {
          ...document.seo,
          title: take("seo_title", document.seo.title, "seo_title"),
          meta_description: take("seo_description", document.seo.meta_description, "seo_description"),
          h1: document.seo.h1,
        }
      : document.seo
  if (!wrote) return untouched(document, proposal, proposal.status)
  const nextDocument: CategoryCmsDocumentV2 = {
    ...document,
    blocks,
    seo,
    block_meta: {
      ...document.block_meta,
      [block.id]: nextMeta ?? document.block_meta[block.id]!,
    },
  }
  return {
    document: nextDocument,
    proposal: {
      ...proposal,
      status: "accepted",
      applied_draft_revision: opts?.draftRevision ?? null,
    },
    applied: true,
    skipped_manual: skippedManual,
    published: false,
  }
}

export function rejectCategoryCmsProposal(
  document: CategoryCmsDocumentV2,
  proposal: CategoryCmsBlockProposal
): CategoryCmsProposalDecision {
  return {
    document,
    proposal: { ...proposal, status: "rejected", applied_draft_revision: null },
    applied: false,
    skipped_manual: false,
    published: false,
  }
}

export function modifyCategoryCmsProposal(
  proposal: CategoryCmsBlockProposal,
  content: CategoryCmsProposalContent
): CategoryCmsBlockProposal {
  return {
    ...proposal,
    content,
    status: "modified",
    missing_locales: missingLocales(content),
    applied_draft_revision: null,
  }
}
