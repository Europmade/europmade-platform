import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../modules/product-cloud/service"
import { PARTNER_MODULE } from "../../../modules/partner"
import type PartnerModuleService from "../../../modules/partner/service"
import {
  applyMapping,
  materializeMappedRows,
  suggestMapping,
  validateImportRows,
  CANONICAL_COLUMNS,
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
import { listManageableBrands } from "../brands/brand-helpers"
import type { ApprovedSeller } from "./resolve-seller"
import { persistImportProductionOrigin } from "./production-origin-import"
import {
  applyCategoryResolution,
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
import { generateConceptDraftIdentifier } from "../../../modules/product-cloud/concept-identifier"
import {
  isValidGtin,
  normalizeGtinDigits,
} from "../../../modules/product-cloud/gtin-validation"
import {
  IMPORT_ATTRIBUTE_COLUMNS,
  IMPORT_FIELDS,
  VARIANT_TYPES,
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
    { take: 500, order: { name: "ASC" } }
  )) as Array<{ id: string; name: string; slug?: string | null }>
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
): Promise<{ owned: Set<string>; foreign: Set<string> }> {
  const owned = new Set<string>()
  const foreign = new Set<string>()
  for (const value of values) {
    if (!value) continue
    const hits = (await productCloud.listIdentifiers({
      identifier_value: value,
      identifier_type: identifierType,
    })) as Array<{ id: string; product_variant_id: string }>
    if (!hits[0]) continue
    const variant = await productCloud.retrieveProductVariant(
      hits[0].product_variant_id
    )
    const product = await productCloud.retrieveProduct(variant.product_id)
    if (product.current_owner_seller_id === sellerId) owned.add(value)
    else foreign.add(value)
  }
  return { owned, foreign }
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
        missing_ean: 0,
        missing_required: 0,
        concept_without_ean: 0,
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
      mappedOnce
        .map((r) => applyCategoryResolution(r, catalog).resolution.matched?.name)
        .filter((name): name is string => Boolean(name))
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
    applyCategoryResolution(r.values, catalog)
  )
  const mapped = resolvedRows.map((r) => r.values)
  const linkedCategories = [
    ...new Set(
      resolvedRows
        .map((r) => r.resolution.matched?.name)
        .filter((name): name is string => Boolean(name))
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
  const validated = validateImportRows(
    mapped,
    gtinLookup.owned,
    gtinLookup.foreign,
    mpnLookup.owned,
    mpnLookup.foreign,
    opts.excel_row_numbers,
    materialized.records.map((r) => r.read_errors)
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

async function applyAttributeCodes(
  productCloud: ProductCloudModuleService,
  productId: string,
  versionId: string | undefined,
  values: Record<string, string>
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
  const skip = new Set(
    CANONICAL_COLUMNS.filter((code) => !IMPORT_ATTRIBUTE_COLUMNS.has(code))
  )
  const valuesToSet: Array<{ attribute_definition_id: string; value: string }> =
    []
  for (const def of defs) {
    const code = def.code
    if (!code || skip.has(code)) continue
    const raw = values[code]
    if (raw == null || raw === "") continue
    valuesToSet.push({ attribute_definition_id: def.id, value: raw })
  }
  if (valuesToSet.length) {
    await productCloud.setVersionAttributeValues({
      product_version_id: versionId,
      values: valuesToSet,
    })
  }
}

function composeDescription(values: Record<string, string>): string {
  const parts: string[] = []
  const short = values.short_description?.trim()
  const desc = values.description?.trim()
  const usps = values.usps?.trim()
  const specs = values.specifications?.trim()
  if (short) parts.push(short)
  if (desc) parts.push(desc)
  if (usps) parts.push(`USP's:\n${usps}`)
  if (specs) parts.push(`Specificaties:\n${specs}`)
  if (parts.length) return parts.join("\n\n")
  return values.title?.trim() || ""
}

function splitMediaUrls(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[|;,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function parseVariantType(
  raw: string | undefined
): (typeof VARIANT_TYPES)[number] {
  const value = (raw || "").trim()
  return (VARIANT_TYPES as readonly string[]).includes(value)
    ? (value as (typeof VARIANT_TYPES)[number])
    : "Uitvoering"
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
) {
  const existing = (await productCloud.listProductCategories({
    product_id: productId,
  })) as Array<{ category_id: string }>
  if (existing.some((row) => row.category_id === categoryId)) return
  await productCloud.createProductCategories({
    product_id: productId,
    category_id: categoryId,
  })
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
  })
  if (opts.structure_error || preview.structure_error) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      opts.structure_error || preview.structure_error || HEADER_MISSING_MESSAGE
    )
  }
  if (preview.summary.error_rows > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Import geweigerd: ${preview.summary.error_rows} regel(s) met fouten. Corrigeer eerst de preview.`
    )
  }
  const catalog = await loadImportCategoryCatalog(productCloud)

  const brands = await listManageableBrands(opts.container, opts.seller)
  const brandByName = new Map(
    brands.map((b) => [b.name.trim().toLowerCase(), b])
  )
  const partner = opts.container.resolve(PARTNER_MODULE) as PartnerModuleService

  async function resolveBrand(raw: string) {
    const brandRaw = raw.trim()
    if (!brandRaw) return null
    const hit =
      brandByName.get(brandRaw.toLowerCase()) ||
      brands.find((b) => b.id === brandRaw)
    if (hit) return hit
    try {
      const row = (await partner.retrieveBrand(brandRaw)) as {
        id: string
        name?: string
      }
      if (row?.id) return { id: row.id, name: row.name || brandRaw }
    } catch {
      /* not an id */
    }
    const owned = (await productCloud.listProducts(
      { current_owner_seller_id: opts.seller.id },
      { take: 100 }
    )) as Array<{ brand_id?: string }>
    for (const p of owned) {
      if (!p.brand_id) continue
      if (p.brand_id === brandRaw) {
        return { id: p.brand_id, name: brandRaw }
      }
      try {
        const row = (await partner.retrieveBrand(p.brand_id)) as {
          id: string
          name?: string
        }
        if (
          row.id === brandRaw ||
          (row.name || "").trim().toLowerCase() === brandRaw.toLowerCase()
        ) {
          return { id: row.id, name: row.name || brandRaw }
        }
      } catch {
        continue
      }
    }
    if (brandRaw.startsWith("brand_")) {
      return { id: brandRaw, name: brandRaw }
    }
    return null
  }

  const logger = opts.container.resolve(ContainerRegistrationKeys.LOGGER)
  const products: ImportCommitProduct[] = []
  const rowErrors: string[] = []
  let translationQueued = 0
  let translationSkippedManual = 0
  let translationProvider = false

  try {
  for (const row of preview.preview) {
    const overlay = opts.row_overrides?.[String(row.row)] || {}
    const { values, resolution } = applyCategoryResolution(
      {
        ...row.values,
        ...overlay,
        category_override: overlay.category || overlay.category_id || "",
        category_raw: row.values.category_raw || row.values.category || "",
      },
      catalog
    )
    const ean = isValidGtin(normalizeGtinDigits(values.ean || ""))
      ? normalizeGtinDigits(values.ean || "")
      : ""
    const mpn = (values.mpn || "").trim()
    const brandRaw = (values.brand || "").trim()
    const brand = await resolveBrand(brandRaw)
    let productId: string | null = null
    let identifierId: string | null = null
    let versionId: string | undefined
    let catalogLocked = false
    let action: "created" | "updated" = "created"
    let lifecycleStatus: string | null = null

    try {
      if (row.status === "existing") {
        const hit = await resolveIdentifierHit(productCloud, ean, mpn)
        identifierId = hit?.identifierId ?? null
        productId = hit?.productId ?? null
        action = "updated"
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
          const existingProduct = await productCloud.retrieveProduct(productId)
          lifecycleStatus = existingProduct.lifecycle_status ?? null
        }
      } else {
        if (!brand) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Onbekend merk '${brandRaw}'${ean ? ` (EAN ${ean})` : ""}.`
          )
        }
        const draft = ean ? null : generateConceptDraftIdentifier()
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
            variant_type: parseVariantType(values.variant_type),
            variant_value: values.variant_value?.trim() || "Standaard",
            media: mediaFromValues(values),
            source_language_code: sourceLanguage,
          },
        })
        productId = result.product_id
        identifierId = result.identifier_id ?? null
        versionId = result.version_id
        if (result.exact_match_existing || result.created === false) {
          action = "updated"
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

    const extraWarnings: string[] = []
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
    try {
      if (action === "updated" && resolution.matched && !catalogLocked) {
        await linkProductCategoryIfMissing(
          productCloud,
          productId,
          resolution.matched.id
        )
      }

      const regular = num(values.regular_price)
      const profileId = values.shipping_profile_id?.trim()
      if (!catalogLocked) {
        const productPatch: Record<string, unknown> = { id: productId }
        if (regular != null) productPatch.regular_customer_price = regular
        if (profileId) productPatch.shipping_profile_id = profileId
        if (Object.keys(productPatch).length > 1) {
          await productCloud.updateProducts(productPatch)
        }
        await applyAttributeCodes(productCloud, productId, versionId, values)
        if (mpn) await persistImportMpn(productCloud, productId, mpn)
        const productionCountry = values.production_country?.trim()
        if (productionCountry && versionId) {
          await persistImportProductionOrigin({
            scope: opts.container,
            product_version_id: versionId,
            brand_id: brand?.id ?? brandRaw,
            manufacturer_id: values.manufacturer?.trim() || brand?.id || brandRaw,
            seller_id: opts.seller.id,
            production_country: productionCountry,
            production_location: values.production_location?.trim() || null,
          })
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
          if (action === "updated") {
            await persistImportMedia(productCloud, versionId, values)
          }
        }
      } else if (regular != null) {
        await productCloud.updateProducts({
          id: productId,
          regular_customer_price: regular,
        })
      } else if (profileId) {
        await productCloud.updateProducts({
          id: productId,
          shipping_profile_id: profileId,
        })
      }

      const wantsOffer =
        regular != null ||
        Boolean(values.stock) ||
        Boolean(values.shipping_cost) ||
        Boolean(values.sku) ||
        Boolean(values.delivery_days) ||
        Boolean(values.promo_price) ||
        Boolean(values.sales_status)
      if (identifierId && wantsOffer) {
        await upsertOfferWorkflow(opts.container).run({
          input: {
            seller_id: opts.seller.id,
            identifier_id: identifierId,
            region_code: (values.region || "NL").toUpperCase().slice(0, 2),
            quantity_available: Math.max(0, Math.floor(num(values.stock) ?? 0)),
            base_price: regular ?? 0,
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
          },
        })
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
      publication_status: "Concept",
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

  return buildImportCommitResult({
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
