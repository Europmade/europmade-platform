import type { CategoryMappingFile } from "./category-map"
import { resolveCategoryMapping } from "./category-map"
import { buildProductDescription, hasRichContent } from "./content-builder"
import type { Fase5bWorkbook } from "./excel-loader"
import { resolveFase5bIdentifier } from "./identifier-resolve"
import { buildMediaPlan } from "./media-plan"
import {
  FASE5B_SELECTIE_SELLER_ID,
} from "./constants"
import { decideFase5bImport } from "./verification-rules"
import { assertTargetSeller } from "./preflight"

export type DryRunProductPlan = {
  em_product_id: string
  action: "create" | "skip"
  skip_reason?: string
  seller_id: string
  identifier_type: string | null
  identifier_value: string | null
  identifier_country_scope: string | null
  verification_status: string
  publication_status: "Concept"
  lifecycle_status: string
  offer_policy: string
  category_id: string
  category_name: string
  category_reason: string
  brand: string
  manufacturer: string
  title: string
  production_country: string | null
  production_location: string | null
  description_preview: string
  has_rich_content: boolean
  selected_media_count: number
  valid_media_count: number
  media_dead_letters: number
  seller_sku: string
}

export type DryRunReport = {
  mode: "dry_run"
  seller_id: string
  products: DryRunProductPlan[]
  summary: {
    would_create: number
    would_skip: number
    gtin: number
    mpn: number
    import_ref: number
    rejected_skipped: number
  }
}

export function runDryRun(opts: {
  workbook: Fase5bWorkbook
  categoryMapping: CategoryMappingFile
  emFilter?: string[]
  sellerId?: string
}): DryRunReport {
  const sellerId = opts.sellerId ?? FASE5B_SELECTIE_SELLER_ID
  assertTargetSeller(sellerId)

  const filter = opts.emFilter ? new Set(opts.emFilter) : null
  const products: DryRunProductPlan[] = []

  let wouldCreate = 0
  let wouldSkip = 0
  let gtin = 0
  let mpn = 0
  let importRef = 0
  let rejectedSkipped = 0

  for (const row of opts.workbook.products) {
    if (filter && !filter.has(row.em_product_id)) continue

    const decision = decideFase5bImport(row.verification_status)
    const content = opts.workbook.contentByEmId.get(row.em_product_id)
    const images = opts.workbook.selectedImagesByEmId.get(row.em_product_id) || []
    const mediaPlan = buildMediaPlan(row.em_product_id, images)

    if (!decision.import) {
      wouldSkip += 1
      if (row.verification_status.trim().toUpperCase() === "REJECTED") {
        rejectedSkipped += 1
      }
      products.push({
        em_product_id: row.em_product_id,
        action: "skip",
        skip_reason: decision.skip_reason,
        seller_id: sellerId,
        identifier_type: null,
        identifier_value: null,
        identifier_country_scope: null,
        verification_status: row.verification_status,
        publication_status: "Concept",
        lifecycle_status: decision.lifecycle_status,
        offer_policy: decision.offer_policy,
        category_id: "",
        category_name: "",
        category_reason: "",
        brand: row.merk,
        manufacturer: row.fabrikant || row.merk,
        title: row.productnaam,
        production_country: row.productieland.trim() || null,
        production_location: row.productieplaats.trim() || null,
        description_preview: "",
        has_rich_content: hasRichContent(content),
        selected_media_count: images.length,
        valid_media_count: mediaPlan.valid_https_count,
        media_dead_letters: mediaPlan.dead_letter_count,
        seller_sku: row.em_product_id,
      })
      continue
    }

    const identifier = resolveFase5bIdentifier({
      em_product_id: row.em_product_id,
      ean_gtin: row.ean_gtin,
      mpn: row.mpn,
    })
    if (identifier.source === "gtin") gtin += 1
    else if (identifier.source === "mpn") mpn += 1
    else importRef += 1

    let category: ReturnType<typeof resolveCategoryMapping>
    try {
      category = resolveCategoryMapping(
        opts.categoryMapping,
        row.claude_hoofdcategorie,
        row.subcategorie
      )
    } catch (err) {
      wouldSkip += 1
      products.push({
        em_product_id: row.em_product_id,
        action: "skip",
        skip_reason:
          err instanceof Error ? err.message : "Categorie-mapping ontbreekt",
        seller_id: sellerId,
        identifier_type: identifier.identifier_type,
        identifier_value: identifier.identifier_value,
        identifier_country_scope: identifier.country_scope,
        verification_status: row.verification_status,
        publication_status: "Concept",
        lifecycle_status: decision.lifecycle_status,
        offer_policy: decision.offer_policy,
        category_id: "",
        category_name: "",
        category_reason: "",
        brand: row.merk,
        manufacturer: row.fabrikant || row.merk,
        title: row.productnaam,
        production_country: row.productieland.trim() || null,
        production_location: row.productieplaats.trim() || null,
        description_preview: "",
        has_rich_content: hasRichContent(content),
        selected_media_count: images.length,
        valid_media_count: mediaPlan.valid_https_count,
        media_dead_letters: mediaPlan.dead_letter_count,
        seller_sku: row.em_product_id,
      })
      continue
    }

    const description = buildProductDescription(content, row.productnaam)
    wouldCreate += 1

    products.push({
      em_product_id: row.em_product_id,
      action: "create",
      seller_id: sellerId,
      identifier_type: identifier.identifier_type,
      identifier_value: identifier.identifier_value,
      identifier_country_scope: identifier.country_scope,
      verification_status: row.verification_status,
      publication_status: "Concept",
      lifecycle_status: decision.lifecycle_status,
      offer_policy: decision.offer_policy,
      category_id: category.category_id,
      category_name: category.category_name,
      category_reason: category.reason,
      brand: row.merk,
      manufacturer: row.fabrikant || row.merk,
      title: row.productnaam,
      production_country: row.productieland.trim() || null,
      production_location: row.productieplaats.trim() || null,
      description_preview: description.slice(0, 200),
      has_rich_content: hasRichContent(content),
      selected_media_count: images.length,
      valid_media_count: mediaPlan.valid_https_count,
      media_dead_letters: mediaPlan.dead_letter_count,
      seller_sku: row.em_product_id,
    })
  }

  return {
    mode: "dry_run",
    seller_id: sellerId,
    products,
    summary: {
      would_create: wouldCreate,
      would_skip: wouldSkip,
      gtin,
      mpn,
      import_ref: importRef,
      rejected_skipped: rejectedSkipped,
    },
  }
}
