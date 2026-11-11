import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { noteImportedCategoryLinks } from "../../../modules/cms/mark-imported-category-review"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import {
  applyMapping,
  materializeMappedRows,
  suggestMapping,
  validateImportRows,
  CANONICAL_COLUMNS,
  importRowWantsOffer,
  SELLER_IMPORT_REUSE_CONFIRMATION,
} from "../../../modules/product-cloud/import-mapping"
import { parseXlsxProductGrid } from "../../../modules/product-cloud/import-xlsx"
import {
  parseImportGrid,
  splitDelimitedText,
  unknownImportColumns,
  HEADER_MISSING_MESSAGE,
  type ParsedImportGrid,
} from "../../../modules/product-cloud/import-table"
import {
  categorySpecificFieldsForNames,
  uniqueCatalogFieldsForImport,
} from "../../../modules/product-cloud/category-attributes"
import { createProductCloudWorkflow } from "../../../workflows/product-cloud"
import { upsertOfferWorkflow } from "../../../workflows/commerce-cloud"
import type { ApprovedSeller } from "./resolve-seller"
import { persistImportProductionOrigin } from "./production-origin-import"
import { normalizeProductionCountry } from "../../../modules/product-cloud/brand-import"
import { coalesceUspsIntoValues } from "../../../modules/product-cloud/import-usps"
import { mergeProductSpecSlotsIntoValues } from "../../../modules/product-cloud/product-specifications"
import {
  parseAssemblyEuBandLabel,
  parseMaterialsEuLevelLabel,
  parsePartsEuLevelLabel,
} from "../../../modules/verification/made-in-europe"
import {
  EUROPEAN_OWNERSHIP_BAND_LABELS,
  isEuropeanOwnershipBand,
  statusAfterSellerSubmit,
  type EuropeanOwnershipBand,
} from "../../../modules/verification/european-ownership"
import { upsertProductMadeInEurope } from "./made-in-europe-helpers"
import {
  appendOwnershipStatusEvent,
  findClaimByBrand,
} from "./european-ownership-helpers"
import { VERIFICATION_MODULE } from "../../../modules/verification"
import type VerificationModuleService from "../../../modules/verification/service"

function parseEuropeanOwnershipBandLabel(
  raw: string | null | undefined
): EuropeanOwnershipBand | null {
  const v = String(raw || "").trim()
  if (!v) return null
  if (isEuropeanOwnershipBand(v)) return v
  const key = v.toLowerCase()
  if (key === "unknown" || key === "niet bekend") return "unknown"
  const hit = (
    Object.entries(EUROPEAN_OWNERSHIP_BAND_LABELS) as Array<
      [EuropeanOwnershipBand, string]
    >
  ).find(([, label]) => label.toLowerCase() === key)
  return hit?.[0] ?? null
}
import {
  applyCategoryHierarchyResolution,
  uniqueImportCategoryCatalog,
  type ImportCategoryCatalogEntry,
} from "../../../modules/product-cloud/import-category"
import {
  buildImportCommitResult,
  categoryPendingWarning,
  categoryStatusFromResolution,
  type ImportCommitProduct,
  type ImportCommitResult,
} from "../../../modules/product-cloud/import-commit-result"
import {
  classifyImportBrand,
  importDraftSeed,
  importIssueReason,
  sellerImportBrandRecord,
  stableConceptDraftIdentifier,
} from "../../../modules/product-cloud/import-row-policy"
import { matchBrandName } from "../../../modules/product-cloud/brand-import"
import { slugifyCatalogEntityName } from "../catalog/catalog-helpers"
import {
  isValidGtin,
  normalizeGtinDigits,
} from "../../../modules/product-cloud/gtin-validation"
import {
  IMPORT_ATTRIBUTE_COLUMNS,
  IMPORT_FIELDS,
} from "../../../modules/product-cloud/import-columns"
import {
  isActiveProductCloudLanguage,
  normalizeLanguageCode,
  targetLanguagesForSource,
} from "../../../modules/product-cloud/languages"

export async function loadImportCategoryCatalog(
  productCloud: ProductCloudModuleService
): Promise<ImportCategoryCatalogEntry[]> {
  const rows = (await productCloud.listCategories(
    {},
    { take: 2000, order: { name: "ASC" } }
  )) as Array<{
    id: string
    name: string
    slug?: string | null
    parent_category_id?: string | null
  }>
  return uniqueImportCategoryCatalog(rows)
}

export function extraImportCodes(): string[] {
  const canonical = new Set(CANONICAL_COLUMNS)
  return uniqueCatalogFieldsForImport()
    .map((f) => f.code)
    .filter((code) => !canonical.has(code))
}

export function parseImportPayload(input: {
  file?: { buffer: Buffer; originalname?: string; mimetype?: string } | null
  csv_text?: string
  headers?: string[]
  rows?: string[][]
}): ParsedImportGrid {
  if (input.headers && input.rows) {
    return parseImportGrid([input.headers, ...input.rows])
  }
  if (input.csv_text) {
    return parseImportGrid(splitDelimitedText(input.csv_text))
  }
  const file = input.file
  if (!file?.buffer) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Upload een CSV- of XLSX-bestand."
    )
  }
  const name = (file.originalname || "").toLowerCase()
  const mime = (file.mimetype || "").toLowerCase()
  if (name.endsWith(".xlsx") || mime.includes("spreadsheet")) {
    return parseXlsxProductGrid(file.buffer)
  }
  return parseImportGrid(splitDelimitedText(file.buffer.toString("utf8")))
}

async function lookupByType(
  productCloud: ProductCloudModuleService,
  values: string[],
  identifierType: "GTIN" | "MPN",
  sellerId: string
): Promise<{
  owned: Set<string>
  foreign: Set<string>
  identifierIds: Map<string, string>
}> {
  const owned = new Set<string>()
  const foreign = new Set<string>()
  const identifierIds = new Map<string, string>()
  for (const value of values) {
    if (!value) continue
    const hits = (await productCloud.listIdentifiers({
      identifier_value: value,
      identifier_type: identifierType,
    })) as Array<{ id: string; product_variant_id: string }>
    if (!hits[0]) continue
    identifierIds.set(value, hits[0].id)
    const variant = await productCloud.retrieveProductVariant(
      hits[0].product_variant_id
    )
    const product = await productCloud.retrieveProduct(variant.product_id)
    if (product.current_owner_seller_id === sellerId) owned.add(value)
    else foreign.add(value)
  }
  return { owned, foreign, identifierIds }
}

async function sellerOfferKeysForIdentifiers(
  container: MedusaContainer | undefined,
  sellerId: string,
  identifierIds: Map<string, string>
): Promise<Set<string>> {
  const keys = new Set<string>()
  if (!container || identifierIds.size === 0) return keys
  let commerce: CommerceCloudModuleService
  try {
    commerce = container.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
  } catch {
    return keys
  }
  for (const [value, identifierId] of identifierIds) {
    const offers = await commerce.listOffers(
      { seller_id: sellerId, identifier_id: identifierId },
      { take: 1 }
    )
    if (Array.isArray(offers) && offers.length > 0) keys.add(value)
  }
  return keys
}

async function sellerSkusWithOffers(
  container: MedusaContainer | undefined,
  sellerId: string,
  skus: string[]
): Promise<Set<string>> {
  const found = new Set<string>()
  if (!container || skus.length === 0) return found
  let commerce: CommerceCloudModuleService
  try {
    commerce = container.resolve(COMMERCE_CLOUD_MODULE) as CommerceCloudModuleService
  } catch {
    return found
  }
  for (const sku of [...new Set(skus)].slice(0, 500)) {
    const offers = await commerce.listOffers(
      { seller_id: sellerId, seller_sku: sku },
      { take: 1 }
    )
    if (Array.isArray(offers) && offers.length > 0) found.add(sku)
  }
  return found
}

async function listImportBrandNames(
  container: MedusaContainer | undefined
): Promise<Array<{ id: string; name: string }> | undefined> {
  if (!container) return undefined
  try {
    const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
    const rows = (await partner.listBrands({}, { take: 2000 })) as Array<{
      id?: string
      name?: string | null
    }>
    return rows
      .filter((row) => row.id && row.name?.trim())
      .map((row) => ({ id: row.id as string, name: String(row.name).trim() }))
  } catch {
    return undefined
  }
}

export function assertImportSourceLanguage(raw: string | null | undefined): string {
  const code = normalizeLanguageCode(raw || "")
  if (!code || !isActiveProductCloudLanguage(code)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Kies in welke taal de ingevulde productgegevens zijn geschreven."
    )
  }
  return code
}

export function importSourceTextFields(
  values: Record<string, string>
): Record<string, string> {
  const fields: Record<string, string> = {}
  const title = values.title?.trim()
  const description = composeDescription(values).trim()
  if (title) fields.title = title
  if (description) fields.description = description
  return fields
}

export async function previewImport(opts: {
  productCloud: ProductCloudModuleService
  sellerId: string
  headers: string[]
  rows: string[][]
  mapping?: Record<string, string | null> | null
  source_language_code?: string | null
  excel_row_numbers?: number[]
  structure_error?: string | null
  skipped_empty?: number
  skipped_header_rows?: number
  transposed?: boolean
  container?: MedusaContainer
}) {
  if (opts.structure_error) {
    return {
      headers: opts.headers,
      mapping: {} as Record<string, string | null>,
      suggested_mapping: {} as Record<string, string | null>,
      canonical_columns: [...CANONICAL_COLUMNS],
      category_columns: [] as string[],
      category_fields: [] as Array<{
        code: string
        name: string
        requirement_tier?: string
        unit?: string | null
      }>,
      field_labels: IMPORT_FIELDS.map((f) => ({
        column: f.column,
        nl_name: f.nl_name,
        required: f.required,
      })),
      detected_categories: [] as string[],
      import_categories: [] as ImportCategoryCatalogEntry[],
      source_language_code: opts.source_language_code
        ? normalizeLanguageCode(opts.source_language_code)
        : null,
      preview: [] as ReturnType<typeof validateImportRows>["preview"],
      summary: {
        rows: 0,
        new_products: 0,
        existing_products: 0,
        error_rows: 1,
        technical_error_rows: 1,
        attention_rows: 0,
        recoverable_rows: 0,
        new_brands: 0,
        missing_ean: 0,
        missing_required: 0,
        concept_without_ean: 0,
        offers_to_create: 0,
        offers_to_update: 0,
        skipped_empty: opts.skipped_empty ?? 0,
        skipped_header_rows: opts.skipped_header_rows ?? 0,
      },
      unknown_columns: [] as string[],
      structure_error: opts.structure_error,
      transposed: Boolean(opts.transposed),
    }
  }
  const universal = extraImportCodes()
  const suggestedSeed = suggestMapping(opts.headers, universal)
  const seedMapping = { ...suggestedSeed }
  if (opts.mapping && Object.keys(opts.mapping).length) {
    for (const [key, source] of Object.entries(opts.mapping)) {
      if (source) seedMapping[key] = source
    }
  }
  const catalog = await loadImportCategoryCatalog(opts.productCloud)
  const mappedOnce = applyMapping(opts.headers, opts.rows, seedMapping)
  const detectedCategories = [
    ...new Set(
      mappedOnce.flatMap((r) => {
        const resolved = applyCategoryHierarchyResolution(r, catalog)
        return [
          resolved.resolution.matched?.name,
          resolved.subcategory_resolution.matched?.name,
        ].filter((name): name is string => Boolean(name))
      })
    ),
  ]
  const categoryFields = categorySpecificFieldsForNames(detectedCategories)
  const extras = [
    ...universal,
    ...categoryFields.map((f) => f.code).filter((c) => !universal.includes(c)),
  ]
  const suggested = suggestMapping(opts.headers, extras)
  const mapping = { ...suggested }
  if (opts.mapping && Object.keys(opts.mapping).length) {
    for (const [key, source] of Object.entries(opts.mapping)) {
      if (source) mapping[key] = source
    }
  }
  const materialized = materializeMappedRows(opts.headers, opts.rows, mapping)
  const resolvedRows = materialized.records.map((r) =>
    applyCategoryHierarchyResolution(r.values, catalog)
  )
  const mapped = resolvedRows.map((r) => r.values)
  const linkedCategories = [
    ...new Set(
      resolvedRows.flatMap((r) =>
        [
          r.resolution.matched?.name,
          r.subcategory_resolution.matched?.name,
        ].filter((name): name is string => Boolean(name))
      )
    ),
  ]
  if (process.env.IMPORT_DIAG === "1") {
    console.info(
      JSON.stringify({
        import_diag: true,
        mapping_title: mapping.title,
        mapping_indexes: materialized.indexes,
        preview_row_2: mapped[0] || null,
        title: mapped[0]?.title ?? null,
      })
    )
  }
  const eans = [
    ...new Set(
      mapped
        .map((r) => normalizeGtinDigits(r.ean || ""))
        .filter((ean) => isValidGtin(ean))
    ),
  ]
  const mpns = [
    ...new Set(
      mapped
        .filter((r) => !isValidGtin(normalizeGtinDigits(r.ean || "")))
        .map((r) => (r.mpn || "").trim())
        .filter(Boolean)
    ),
  ]
  const gtinLookup = await lookupByType(
    opts.productCloud,
    eans,
    "GTIN",
    opts.sellerId
  )
  const mpnLookup = await lookupByType(
    opts.productCloud,
    mpns,
    "MPN",
    opts.sellerId
  )
  const identifierIds = new Map<string, string>([
    ...gtinLookup.identifierIds,
    ...mpnLookup.identifierIds,
  ])
  const sellerOfferKeys = await sellerOfferKeysForIdentifiers(
    opts.container,
    opts.sellerId,
    identifierIds
  )
  const sellerSkus = await sellerSkusWithOffers(
    opts.container,
    opts.sellerId,
    mapped.map((row) => (row.sku || "").trim()).filter(Boolean)
  )
  const knownBrands = await listImportBrandNames(opts.container)
  const validated = validateImportRows(
    mapped,
    gtinLookup.owned,
    gtinLookup.foreign,
    mpnLookup.owned,
    mpnLookup.foreign,
    opts.excel_row_numbers,
    materialized.records.map((r) => r.read_errors),
    sellerOfferKeys,
    { knownBrands, sellerSkus }
  )
  const preview = validated.preview.map((row, index) => ({
    ...row,
    category_resolution: resolvedRows[index]?.resolution,
  }))
  return {
    headers: opts.headers,
    mapping,
    mapping_indexes: materialized.indexes,
    canonical_columns: [...new Set([...CANONICAL_COLUMNS, ...universal])],
    category_columns: categoryFields.map((f) => f.code),
    category_fields: categoryFields.map((f) => ({
      code: f.code,
      name: f.name,
      requirement_tier: f.requirement_tier,
      unit: f.unit ?? null,
      option_values: f.option_values ?? null,
      data_type: f.data_type ?? null,
    })),
    field_labels: IMPORT_FIELDS.map((f) => ({
      column: f.column,
      nl_name: f.nl_name,
      required: f.required,
    })),
    detected_categories: linkedCategories,
    import_categories: catalog,
    source_language_code: opts.source_language_code
      ? normalizeLanguageCode(opts.source_language_code)
      : null,
    unknown_columns: unknownImportColumns(opts.headers, mapping),
    structure_error: null as string | null,
    transposed: false,
    preview,
    summary: {
      ...validated.summary,
      skipped_empty: opts.skipped_empty ?? 0,
      skipped_header_rows: opts.skipped_header_rows ?? 0,
    },
  }
}

function num(value: string | undefined): number | null {
  if (!value) return null
  const n = Number(String(value).replace(",", "."))
  return Number.isFinite(n) ? n : null
}

export async function applyAttributeCodes(
  productCloud: ProductCloudModuleService,
  productId: string,
  versionId: string | undefined,
  values: Record<string, string>,
  opts: { gapFillOnly?: boolean; container?: import("@medusajs/framework/types").MedusaContainer } = {}
) {
  if (!versionId) return
  const links = await productCloud.listProductCategories({ product_id: productId })
  const defs: Array<{ id: string; code: string | null }> = []
  for (const link of links as Array<{ category_id: string }>) {
    const cats = (await productCloud.listCategories({
      id: link.category_id,
    })) as Array<{ slug?: string | null }>
    const slug = cats[0]?.slug
    if (slug) {
      await productCloud.ensureCategoryAttributeCatalog(link.category_id, slug)
    }
    const rows = (await productCloud.listAttributeDefinitions({
      category_id: link.category_id,
    })) as Array<{ id: string; code: string | null; is_active?: boolean }>
    defs.push(...rows.filter((d) => d.is_active !== false))
  }
  const existingByDef = new Map<string, string>()
  if (opts.gapFillOnly) {
    const existing = (await productCloud.listAttributeValues({
      product_version_id: versionId,
    })) as Array<{ attribute_definition_id: string; value?: string | null }>
    for (const row of existing) {
      existingByDef.set(row.attribute_definition_id, String(row.value || "").trim())
    }
  }
  const skip = new Set(
    CANONICAL_COLUMNS.filter((code) => !IMPORT_ATTRIBUTE_COLUMNS.has(code))
  )
  const valuesToSet: Array<{ attribute_definition_id: string; value: string }> =
    []
  const writtenCodes = new Set<string>()
  for (const def of defs) {
    const code = def.code
    if (!code || skip.has(code) || writtenCodes.has(code)) continue
    const raw = values[code]
    if (raw == null || raw === "") continue
    if (opts.gapFillOnly && existingByDef.get(def.id)) continue
    valuesToSet.push({ attribute_definition_id: def.id, value: raw })
    writtenCodes.add(code)
  }
  if (valuesToSet.length) {
    await productCloud.setVersionAttributeValues({
      product_version_id: versionId,
      values: valuesToSet,
    })
    if (opts.container) {
      const { emitCategoryFactsChanged } = await import("../../../modules/cms/category-cms-proposal-events")
      await emitCategoryFactsChanged(opts.container, { product_id: productId })
    }
  }
}

function composeDescription(values: Record<string, string>): string {
  const normalized = coalesceUspsIntoValues(values)
  const parts: string[] = []
  const short = normalized.short_description?.trim()
  const desc = normalized.description?.trim()
  const usps = normalized.usps?.trim()
  const specs = normalized.specifications?.trim()
  if (short) parts.push(short)
  if (desc) parts.push(desc)
  if (usps) parts.push(`USP's:\n${usps}`)
  if (specs) parts.push(`Specificaties:\n${specs}`)
  if (parts.length) return parts.join("\n\n")
  return normalized.title?.trim() || ""
}

function splitMediaUrls(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[|;,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function mediaFromValues(values: Record<string, string>): Array<{
  media_type: "Hoofdafbeelding" | "Overige afbeelding" | "Video"
  storage_reference: string
}> {
  const media: Array<{
    media_type: "Hoofdafbeelding" | "Overige afbeelding" | "Video"
    storage_reference: string
  }> = []
  const primary = values.primary_image_url?.trim()
  if (primary) {
    media.push({ media_type: "Hoofdafbeelding", storage_reference: primary })
  }
  for (const url of splitMediaUrls(values.extra_image_urls)) {
    media.push({ media_type: "Overige afbeelding", storage_reference: url })
  }
  const video = values.video_url?.trim()
  if (video) {
    media.push({ media_type: "Video", storage_reference: video })
  }
  return media
}

async function productIsPublished(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<boolean> {
  const versions = (await productCloud.listProductVersions({
    product_id: productId,
  })) as Array<{ publication_status: string }>
  return versions.some((v) => v.publication_status === "Gepubliceerd")
}

async function persistImportMpn(
  productCloud: ProductCloudModuleService,
  productId: string,
  mpn: string
) {
  if (!mpn) return
  const variants = (await productCloud.listProductVariants({
    product_id: productId,
  })) as Array<{ id: string }>
  for (const variant of variants) {
    const ids = (await productCloud.listIdentifiers({
      product_variant_id: variant.id,
    })) as Array<{ identifier_type: string; identifier_value: string }>
    if (ids.some((row) => row.identifier_type === "MPN" && row.identifier_value === mpn)) {
      return
    }
    await productCloud.createIdentifiers({
      product_variant_id: variant.id,
      identifier_type: "MPN",
      identifier_value: mpn,
      country_scope: null,
    })
    return
  }
}

async function enqueueImportTranslations(opts: {
  productCloud: ProductCloudModuleService
  versionId: string
  values: Record<string, string>
  sourceLanguage: string
  sellerId: string
}): Promise<{
  provider_configured: boolean
  results: Array<{
    field_name: string
    language_code: string
    translation_status: string
    skipped?: boolean
    error?: string
  }>
}> {
  const source_fields = importSourceTextFields(opts.values)
  if (!Object.keys(source_fields).length) {
    return { provider_configured: false, results: [] }
  }
  await opts.productCloud.setProductVersionSourceLanguage({
    version_id: opts.versionId,
    source_language_code: opts.sourceLanguage,
  })
  for (const [field_name, value] of Object.entries(source_fields)) {
    await opts.productCloud.upsertTranslation({
      entity_type: "product_version",
      entity_id: opts.versionId,
      field_name,
      language_code: opts.sourceLanguage,
      value,
      source_language_code: opts.sourceLanguage,
      source_value: value,
      translation_status: "Gepubliceerd",
      origin: "manual",
      force_overwrite_manual: false,
      updated_by: opts.sellerId,
    })
  }
  const queued = await opts.productCloud.enqueueMachineTranslations({
    entity_type: "product_version",
    entity_id: opts.versionId,
    source_language_code: opts.sourceLanguage,
    source_fields,
    target_language_codes: targetLanguagesForSource(opts.sourceLanguage),
    only_missing: true,
    force_overwrite_manual: false,
    updated_by: opts.sellerId,
  })
  return {
    provider_configured: queued.provider_configured,
    results: queued.results,
  }
}

async function persistImportMedia(
  productCloud: ProductCloudModuleService,
  versionId: string,
  values: Record<string, string>
) {
  const existing = (await productCloud.listProductMedias({
    product_version_id: versionId,
  })) as Array<{ storage_reference: string }>
  const have = new Set(existing.map((row) => row.storage_reference))
  let order = existing.length
  for (const item of mediaFromValues(values)) {
    if (have.has(item.storage_reference)) continue
    await productCloud.createProductMedias({
      product_version_id: versionId,
      media_type: item.media_type,
      storage_reference: item.storage_reference,
      sort_order: order,
    })
    order += 1
    have.add(item.storage_reference)
  }
}

async function resolveIdentifierHit(
  productCloud: ProductCloudModuleService,
  ean: string,
  mpn: string
): Promise<{ identifierId: string; productId: string } | null> {
  if (ean) {
    const hits = (await productCloud.listIdentifiers({
      identifier_value: ean,
      identifier_type: "GTIN",
    })) as Array<{ id: string; product_variant_id: string }>
    if (hits[0]) {
      const variant = await productCloud.retrieveProductVariant(
        hits[0].product_variant_id
      )
      return { identifierId: hits[0].id, productId: variant.product_id }
    }
  }
  if (mpn) {
    const hits = (await productCloud.listIdentifiers({
      identifier_value: mpn,
      identifier_type: "MPN",
    })) as Array<{ id: string; product_variant_id: string }>
    if (hits[0]) {
      const variant = await productCloud.retrieveProductVariant(
        hits[0].product_variant_id
      )
      return { identifierId: hits[0].id, productId: variant.product_id }
    }
  }
  return null
}

async function resolveImportRowTarget(
  container: MedusaContainer,
  productCloud: ProductCloudModuleService,
  input: {
    ean: string
    mpn: string
    sku: string
    sellerId: string
    draftValue: string
  }
): Promise<{ identifierId: string; productId: string } | null> {
  const byCode = await resolveIdentifierHit(productCloud, input.ean, input.mpn)
  if (byCode) return byCode
  if (input.sku) {
    try {
      const commerce = container.resolve(
        COMMERCE_CLOUD_MODULE
      ) as CommerceCloudModuleService
      const offers = (await commerce.listOffers(
        { seller_id: input.sellerId, seller_sku: input.sku },
        { take: 1 }
      )) as Array<{ identifier_id?: string }>
      const identifierId = offers[0]?.identifier_id
      if (identifierId) {
        const identifiers = (await productCloud.listIdentifiers({
          id: identifierId,
        })) as Array<{ id: string; product_variant_id: string }>
        if (identifiers[0]) {
          const variant = await productCloud.retrieveProductVariant(
            identifiers[0].product_variant_id
          )
          return {
            identifierId: identifiers[0].id,
            productId: variant.product_id,
          }
        }
      }
    } catch {
      /* commerce unavailable: draft key below still dedupes */
    }
  }
  if (input.draftValue) {
    const hits = (await productCloud.listIdentifiers({
      identifier_value: input.draftValue,
      identifier_type: "IMPORT_REF",
    })) as Array<{ id: string; product_variant_id: string }>
    if (hits[0]) {
      const variant = await productCloud.retrieveProductVariant(
        hits[0].product_variant_id
      )
      return { identifierId: hits[0].id, productId: variant.product_id }
    }
  }
  return null
}

async function persistImportFieldIssues(
  productCloud: ProductCloudModuleService,
  input: {
    productId: string
    versionId?: string
    sellerId: string
    issues: Array<{
      field: string
      message: string
      severity?: string
      supplied_value?: string | null
      resolution?: string
      blocks?: string[]
    }>
  }
) {
  const open = input.issues.filter(
    (issue) => issue.severity && issue.severity !== "valid"
  )
  if (!open.length) return
  const existing = (await productCloud.listProductFieldChanges(
    { product_id: input.productId },
    { take: 300 }
  )) as Array<{
    field_code?: string
    new_value?: string | null
    reason?: string | null
  }>
  for (const issue of open) {
    const reason = importIssueReason(issue)
    const code = `import.issue.${issue.field}`.slice(0, 120)
    const supplied = issue.supplied_value ?? ""
    const duplicate = existing.some(
      (row) =>
        row.field_code === code &&
        (row.new_value || "") === supplied &&
        row.reason === reason
    )
    if (duplicate) continue
    await productCloud.createProductFieldChanges({
      product_id: input.productId,
      product_version_id: input.versionId ?? null,
      seller_id: input.sellerId,
      actor_customer_id: null,
      field_code: code,
      field_label: issue.field,
      old_value: null,
      new_value: supplied,
      status: "current",
      reason,
    })
    existing.push({ field_code: code, new_value: supplied, reason })
  }
}

function safeLogError(
  logger: { error?: (message: string) => void },
  message: string
) {
  try {
    logger.error?.(message)
  } catch {
    console.error(message)
  }
}

async function persistImportCategoryMeta(
  productCloud: ProductCloudModuleService,
  opts: {
    productId: string
    versionId?: string
    sellerId: string
    resolution: {
      status: string
      raw: string
      matched: { id: string; name: string; slug: string } | null
      suggestions: Array<{ id: string; name: string }>
    }
  }
) {
  const suggestionText = opts.resolution.suggestions.map((s) => s.name).join("|")
  const payload: Record<string, unknown> = {
    product_id: opts.productId,
    seller_id: opts.sellerId,
    field_code: "import_category_raw",
    field_label: "Oorspronkelijke importcategorie",
    new_value: opts.resolution.raw || null,
    status: "current",
  }
  if (opts.versionId) payload.product_version_id = opts.versionId
  await productCloud.createProductFieldChanges(payload)
  await productCloud.createProductFieldChanges({
    ...payload,
    field_code: "import_category_status",
    field_label: "Importcategorie-status",
    new_value: opts.resolution.matched ? "linked" : "category_pending",
  })
  if (suggestionText) {
    await productCloud.createProductFieldChanges({
      ...payload,
      field_code: "import_category_suggestions",
      field_label: "Categorievoorstellen",
      new_value: suggestionText,
    })
  }
}

async function linkProductCategoryIfMissing(
  productCloud: ProductCloudModuleService,
  productId: string,
  categoryId: string
): Promise<boolean> {
  const existing = (await productCloud.listProductCategories({
    product_id: productId,
  })) as Array<{ category_id: string }>
  if (existing.some((row) => row.category_id === categoryId)) return false
  await productCloud.createProductCategories({
    product_id: productId,
    category_id: categoryId,
  })
  return true
}

export async function commitImport(opts: {
  container: MedusaContainer
  seller: ApprovedSeller & { company_id?: string | null }
  headers: string[]
  rows: string[][]
  mapping: Record<string, string | null>
  source_language_code: string
  row_overrides?: Record<string, Record<string, string>>
  excel_row_numbers?: number[]
  structure_error?: string | null
  skipped_empty?: number
  skipped_header_rows?: number
  transposed?: boolean
  reuse_existing_confirmed?: boolean
}): Promise<ImportCommitResult> {
  const sourceLanguage = assertImportSourceLanguage(opts.source_language_code)
  const productCloud = opts.container.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const preview = await previewImport({
    productCloud,
    sellerId: opts.seller.id,
    headers: opts.headers,
    rows: opts.rows,
    mapping: opts.mapping,
    source_language_code: sourceLanguage,
    excel_row_numbers: opts.excel_row_numbers,
    structure_error: opts.structure_error,
    skipped_empty: opts.skipped_empty,
    skipped_header_rows: opts.skipped_header_rows,
    transposed: opts.transposed,
    container: opts.container,
  })
  if (preview.summary.existing_products > 0 && !opts.reuse_existing_confirmed) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${SELLER_IMPORT_REUSE_CONFIRMATION} Bevestig dit voordat de import wordt uitgevoerd.`
    )
  }
  if (opts.structure_error || preview.structure_error) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      opts.structure_error || preview.structure_error || HEADER_MISSING_MESSAGE
    )
  }
  const catalog = await loadImportCategoryCatalog(productCloud)
  const partner = opts.container.resolve(PARTNER_MODULE) as PartnerModuleService
  const loadedBrands = await listImportBrandNames(opts.container)
  const knownBrands = loadedBrands ?? []
  let newBrandsCreated = 0

  async function ensureImportBrand(raw: string): Promise<{
    id: string
    name: string
    created: boolean
  }> {
    if (!loadedBrands) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "De merkenlijst is niet beschikbaar. Deze regel is niet aangemaakt, zodat er geen dubbel merk ontstaat."
      )
    }
    const decision = classifyImportBrand(raw, knownBrands)
    if (decision.status === "existing") {
      return { id: decision.id, name: decision.name, created: false }
    }
    if (decision.status === "ambiguous") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Merk '${raw.trim()}' komt overeen met ${decision.candidates.map((c) => c.name).join(", ")}. Bevestig welk merk.`
      )
    }
    if (decision.status !== "create") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Merknaam ontbreekt. Er wordt geen merk verzonnen."
      )
    }
    const again = matchBrandName(decision.name, knownBrands)
    if (again.status === "exact") {
      return { id: again.brand.id, name: again.brand.name, created: false }
    }
    if (again.status === "ambiguous") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Merk '${decision.name}' komt overeen met ${again.candidates.map((c) => c.name).join(", ")}.`
      )
    }
    const base = sellerImportBrandRecord({
      name: decision.name,
      slug: slugifyCatalogEntityName(decision.name),
      sellerId: opts.seller.id,
      companyId: opts.seller.company_id,
    })
    let created: { id?: string } | { id?: string }[] | null = null
    try {
      created = (await partner.createBrands([base])) as { id?: string } | { id?: string }[]
    } catch {
      created = (await partner.createBrands([
        {
          ...base,
          slug: `${base.slug}-${Date.now().toString(36)}`,
        },
      ])) as { id?: string } | { id?: string }[]
    }
    const row = Array.isArray(created) ? created[0] : created
    if (!row?.id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Merk '${decision.name}' kon niet worden aangemaakt.`
      )
    }
    knownBrands.push({ id: row.id, name: decision.name })
    newBrandsCreated += 1
    return { id: row.id, name: decision.name, created: true }
  }

  const logger = opts.container.resolve(ContainerRegistrationKeys.LOGGER)
  const products: ImportCommitProduct[] = []
  const newlyLinkedCategoryIds = new Set<string>()
  const rowErrors: string[] = []
  let translationQueued = 0
  let translationSkippedManual = 0
  let translationProvider = false

  try {
  for (const row of preview.preview) {
    if (row.status === "error") {
      const reason = row.issues
        .filter((issue) => issue.blocking)
        .map((issue) => issue.message)
        .join(" ")
      rowErrors.push(
        `Rij ${row.row}: ${reason || "technisch niet verwerkbaar."}`
      )
      continue
    }
    const overlay = opts.row_overrides?.[String(row.row)] || {}
    const { values: resolvedValues, resolution, link_ids } =
      applyCategoryHierarchyResolution(
        {
          ...row.values,
          ...overlay,
          category_override: overlay.category || overlay.category_id || "",
          category_raw: row.values.category_raw || row.values.category || "",
          subcategory_override: overlay.subcategory || "",
        },
        catalog
      )
    const uspValues = coalesceUspsIntoValues(resolvedValues)
    const specMerged = mergeProductSpecSlotsIntoValues(uspValues)
    const values = specMerged.values
    const specNotes = specMerged.errors.map((msg) => `Rij ${row.row}: ${msg}`)
    const ean = isValidGtin(normalizeGtinDigits(values.ean || ""))
      ? normalizeGtinDigits(values.ean || "")
      : ""
    const mpn = (values.mpn || "").trim()
    const sku = (values.sku || "").trim()
    const eanRaw = (values.ean || "").trim()
    const brandRaw = (values.brand || "").trim()
    const draftIdentity = !ean
      ? stableConceptDraftIdentifier(
          importDraftSeed({
            sellerId: opts.seller.id,
            eanRaw,
            mpn,
            sku,
          })
        )
      : null
    let productId: string | null = null
    let identifierId: string | null = null
    let versionId: string | undefined
    let catalogLocked = false
    let action: "created" | "updated" | "reused" = "created"
    let lifecycleStatus: string | null = null
    let publicationStatus = "Concept"
    let reuseCentral = row.status === "existing"
    let brand: { id: string; name: string } | null = null

    try {
      const prior = await resolveImportRowTarget(opts.container, productCloud, {
        ean,
        mpn,
        sku,
        sellerId: opts.seller.id,
        draftValue: draftIdentity?.identifier_value || "",
      })
      if (prior || row.status === "existing") {
        const hit = prior || (await resolveIdentifierHit(productCloud, ean, mpn))
        identifierId = hit?.identifierId ?? null
        productId = hit?.productId ?? null
        action = "reused"
        if (productId) {
          catalogLocked = await productIsPublished(productCloud, productId)
          const versions = (await productCloud.listProductVersions({
            product_id: productId,
          })) as Array<{ id: string; publication_status: string }>
          const working =
            versions.find((v) => v.publication_status === "Concept") ||
            versions.find((v) => v.publication_status === "In review") ||
            versions[0]
          versionId = working?.id
          if (working?.publication_status) {
            publicationStatus = working.publication_status
          }
          const existingProduct = await productCloud.retrieveProduct(productId)
          lifecycleStatus = existingProduct.lifecycle_status ?? null
        }
      } else {
        brand = await ensureImportBrand(brandRaw)
        const draft = draftIdentity
        const { result } = await createProductCloudWorkflow(opts.container).run({
          input: {
            seller_id: opts.seller.id,
            is_retailer: opts.seller.is_retailer,
            is_producer_or_brand_owner: opts.seller.is_producer_or_brand_owner,
            brand_id: brand.id,
            manufacturer_id: values.manufacturer?.trim() || brand.id,
            title: values.title,
            description: composeDescription(values),
            category_name: resolution.matched?.name || "",
            identifier_type: ean ? "GTIN" : "IMPORT_REF",
            identifier_value: ean || draft!.identifier_value,
            country_scope: ean ? null : draft!.country_scope,
            mpn: mpn || null,
            variant_type: "Uitvoering",
            variant_value: "Standaard",
            media: mediaFromValues(values),
            source_language_code: sourceLanguage,
          },
        })
        productId = result.product_id
        identifierId = result.identifier_id ?? null
        versionId = result.version_id
        if (result.exact_match_existing || result.created === false) {
          action = "reused"
          reuseCentral = true
          if (productId) {
            const existingProduct = await productCloud.retrieveProduct(productId)
            lifecycleStatus = existingProduct.lifecycle_status ?? null
            const versions = (await productCloud.listProductVersions({
              product_id: productId,
            })) as Array<{ id: string; publication_status: string }>
            const working =
              versions.find((v) => v.publication_status === "Concept") ||
              versions.find((v) => v.publication_status === "In review") ||
              versions[0]
            versionId = working?.id ?? versionId
            if (working?.publication_status) {
              publicationStatus = working.publication_status
            }
            catalogLocked = await productIsPublished(productCloud, productId)
          }
        } else {
          lifecycleStatus = result.lifecycle_status ?? "Concept"
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Rij ${row.row} kon niet worden geïmporteerd.`
      safeLogError(
        logger,
        `product-cloud import create failed row=${row.row}: ${message}`
      )
      rowErrors.push(`Rij ${row.row}: ${message}`)
      continue
    }

    if (!productId) {
      rowErrors.push(`Rij ${row.row}: product kon niet worden opgeslagen.`)
      continue
    }

    const extraWarnings: string[] = [...specNotes]
    try {
      await persistImportFieldIssues(productCloud, {
        productId,
        versionId,
        sellerId: opts.seller.id,
        issues: row.issues,
      })
      if (!reuseCentral) {
        try {
          await persistImportCategoryMeta(productCloud, {
            productId,
            versionId,
            sellerId: opts.seller.id,
            resolution,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : "categorie-metadata"
          safeLogError(
            logger,
            `product-cloud import category meta failed product=${productId}: ${message}`
          )
          extraWarnings.push(
            `Categorie-tekst kon niet worden bewaard (${message}).`
          )
        }
        if (!catalogLocked) {
          const ids =
            link_ids.length > 0
              ? link_ids
              : resolution.matched
                ? [resolution.matched.id]
                : []
          for (const categoryId of ids) {
            const created = await linkProductCategoryIfMissing(
              productCloud,
              productId,
              categoryId
            )
            if (created) newlyLinkedCategoryIds.add(categoryId)
          }
        }

        const profileId = values.shipping_profile_id?.trim() || null
        if (!catalogLocked) {
          // Shipping profile on pc_product remains the PM sync source for new
          // catalog products owned by this seller. Price stays on the offer only.
          if (profileId) {
            await productCloud.updateProducts({
              id: productId,
              shipping_profile_id: profileId,
            })
          }
          const productionCountry = normalizeProductionCountry(
            values.production_country || ""
          )
          if (productionCountry && versionId) {
            try {
              await persistImportProductionOrigin({
                scope: opts.container,
                product_version_id: versionId,
                brand_id: brand?.id ?? brandRaw,
                manufacturer_id: brand?.id || brandRaw,
                seller_id: opts.seller.id,
                production_country: productionCountry,
                production_location: values.production_location?.trim() || null,
                only_if_empty: action === "reused",
              })
            } catch (originErr) {
              const originMessage =
                originErr instanceof Error
                  ? originErr.message
                  : "onbekende fout"
              extraWarnings.push(
                `Productieland kon niet worden opgeslagen: ${originMessage}`
              )
            }
          }
          await applyAttributeCodes(productCloud, productId, versionId, values, {
            container: opts.container,
          })
          if (mpn) await persistImportMpn(productCloud, productId, mpn)
          const assembly = parseAssemblyEuBandLabel(values.assembly_eu_band)
          const parts = parsePartsEuLevelLabel(values.parts_eu_level)
          const materials = parseMaterialsEuLevelLabel(values.materials_eu_level)
          if (
            productId &&
            brand?.id &&
            assembly &&
            parts &&
            materials
          ) {
            await upsertProductMadeInEurope(opts.container, {
              product_id: productId,
              seller_id: opts.seller.id,
              brand_id: brand.id,
              manufacturer_id:
                values.manufacturer?.trim() || brand.id,
              input: {
                assembly_eu_band: assembly,
                parts_eu_level: parts,
                materials_eu_level: materials,
                primary_assembly_country:
                  values.production_country?.trim()?.toUpperCase() || null,
              },
            })
          }
          const eoBand = parseEuropeanOwnershipBandLabel(
            values.european_ownership_band
          )
          if (eoBand && brand?.id) {
            const verification = opts.container.resolve(
              VERIFICATION_MODULE
            ) as VerificationModuleService
            const existingClaim = await findClaimByBrand(verification, brand.id)
            // Gap-fill / no overwrite: only write when absent or seller updates with a value.
            if (!existingClaim || action === "created" || !reuseCentral) {
              const nextStatus = statusAfterSellerSubmit(false)
              if (existingClaim) {
                if (
                  !reuseCentral ||
                  !existingClaim.ownership_band ||
                  existingClaim.ownership_band === "unknown"
                ) {
                  const updated = await verification.updateEuropeanOwnershipClaims({
                    id: existingClaim.id,
                    ownership_band: eoBand,
                    status: nextStatus,
                    seller_id: opts.seller.id,
                  })
                  await appendOwnershipStatusEvent(verification, {
                    claim_id: existingClaim.id,
                    brand_id: brand.id,
                    from_status: existingClaim.status,
                    to_status: nextStatus,
                    note: "Seller-import Europees eigendom",
                    actor_id: opts.seller.id,
                    actor_type: "seller",
                    decision: "import_upsert",
                  })
                  void updated
                }
              } else {
                const created = (await verification.createEuropeanOwnershipClaims({
                  brand_id: brand.id,
                  manufacturer_id: null,
                  seller_id: opts.seller.id,
                  company_id: opts.seller.company_id ?? null,
                  ownership_band: eoBand,
                  source: "brand_producer",
                  status: nextStatus,
                })) as { id: string }
                await appendOwnershipStatusEvent(verification, {
                  claim_id: created.id,
                  brand_id: brand.id,
                  to_status: nextStatus,
                  note: "Seller-import Europees eigendom (nieuw)",
                  actor_id: opts.seller.id,
                  actor_type: "seller",
                  decision: "import_create",
                })
              }
            }
          }
          if (versionId) {
            const queued = await enqueueImportTranslations({
              productCloud,
              versionId,
              values,
              sourceLanguage,
              sellerId: opts.seller.id,
            })
            translationProvider = translationProvider || queued.provider_configured
            translationQueued += queued.results.filter((r) => !r.skipped).length
            translationSkippedManual += queued.results.filter(
              (r) => r.error === "manual_override_protected"
            ).length
          }
        }
      } else if (versionId) {
        // Reuse existing EAN: gap-fill empty central attributes only (no overwrite).
        await applyAttributeCodes(productCloud, productId, versionId, values, {
          gapFillOnly: true,
          container: opts.container,
        })
        const productionCountry = normalizeProductionCountry(
          values.production_country || ""
        )
        if (productionCountry && !catalogLocked) {
          try {
            await persistImportProductionOrigin({
              scope: opts.container,
              product_version_id: versionId,
              brand_id: brand?.id ?? brandRaw,
              manufacturer_id: brand?.id || brandRaw,
              seller_id: opts.seller.id,
              production_country: productionCountry,
              production_location: values.production_location?.trim() || null,
              only_if_empty: true,
            })
          } catch (originErr) {
            const originMessage =
              originErr instanceof Error ? originErr.message : "onbekende fout"
            extraWarnings.push(
              `Productieland kon niet worden opgeslagen: ${originMessage}`
            )
          }
        }
      }

      const regular = num(values.regular_price)
      const priceMissingOrInvalid =
        Boolean(values.regular_price?.trim()) && regular == null
      if (identifierId && importRowWantsOffer(values) && regular != null) {
        const profileId = values.shipping_profile_id?.trim() || null
        await upsertOfferWorkflow(opts.container).run({
          input: {
            seller_id: opts.seller.id,
            identifier_id: identifierId,
            region_code: (values.region || "NL").toUpperCase().slice(0, 2),
            quantity_available: Math.max(0, Math.floor(num(values.stock) ?? 0)),
            base_price: regular,
            shipping_cost: num(values.shipping_cost) ?? 0,
            extra_delivery_cost: num(values.extra_delivery_cost),
            regular_customer_price: regular,
            vat_rate: 0.21,
            seller_sku: values.sku || null,
            delivery_days_max:
              num(values.delivery_days) != null
                ? Math.floor(num(values.delivery_days)!)
                : null,
            promo_price: num(values.promo_price),
            sales_status:
              (values.sales_status || "active").toLowerCase() === "paused"
                ? "paused"
                : "active",
            shipping_profile_id: profileId,
          },
        })
      } else if (priceMissingOrInvalid || (importRowWantsOffer(values) && regular == null)) {
        extraWarnings.push(
          "Geen verkoopaanbod opgeslagen: prijs ontbreekt of is ongeldig. Er wordt geen prijs 0 ingevuld."
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "nabewerking mislukt"
      safeLogError(
        logger,
        `product-cloud import post-create failed product=${productId}: ${message}`
      )
      extraWarnings.push(
        /production-origin-import|persistImportProductionOrigin|Cannot find module/i.test(
          message
        )
          ? "Productieland kon niet worden opgeslagen."
          : message
      )
    }

    const categoryStatus = categoryStatusFromResolution(resolution)
    const categoryWarning =
      categoryStatus === "category_pending"
        ? categoryPendingWarning(resolution.raw)
        : null
    products.push({
      row: row.row,
      product_id: productId,
      title: values.title || "",
      action,
      lifecycle_status: lifecycleStatus,
      publication_status: publicationStatus,
      category_status: categoryStatus,
      category_raw: resolution.raw,
      category_name: resolution.matched?.name ?? null,
      category_suggestions: resolution.suggestions.map((s) => s.name),
      warning: [categoryWarning, ...extraWarnings].filter(Boolean).join(" ") || null,
    })
  }
  } catch (err) {
    if (!products.length) throw err
    const message = err instanceof Error ? err.message : "onverwachte importfout"
    safeLogError(logger, `product-cloud import aborted after writes: ${message}`)
    rowErrors.push(message)
  }

  if (!products.length && rowErrors.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, rowErrors[0])
  }

  if (newlyLinkedCategoryIds.size > 0) {
    try {
      const slugs = catalog
        .filter((row) => newlyLinkedCategoryIds.has(row.id))
        .map((row) => row.slug)
      await noteImportedCategoryLinks(opts.container, slugs)
    } catch (err) {
      const message = err instanceof Error ? err.message : "categorieconcept"
      safeLogError(logger, `product-cloud import category review failed: ${message}`)
    }
  }

  const result = buildImportCommitResult({
    products,
    skipped_count:
      (opts.skipped_empty ?? 0) + (opts.skipped_header_rows ?? 0),
    errors: rowErrors,
    source_language_code: sourceLanguage,
    translations: {
      provider_configured: translationProvider,
      queued: translationQueued,
      skipped_manual: translationSkippedManual,
    },
  })
  return {
    ...result,
    received_rows: preview.summary.rows,
    attention_count: preview.summary.attention_rows,
    new_brands: newBrandsCreated,
    technical_error_rows: rowErrors.length,
  }
}

export async function sellerWithCompany(
  container: MedusaContainer,
  seller: ApprovedSeller
) {
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const full = (await partner.retrieveSeller(seller.id, {
    relations: ["company"],
  })) as { company_id?: string | null; company?: { id?: string } | null }
  return {
    ...seller,
    company_id: full.company_id ?? full.company?.id ?? null,
  }
}
