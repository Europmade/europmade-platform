import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import { VERIFICATION_MODULE } from "../../../../modules/verification"
import type VerificationModuleService from "../../../../modules/verification/service"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import {
  assertBrandPlanHasNoOffers,
  headerSignature,
  matchBrandName,
  normalizeBrandKey,
  planBrandCommit,
  undoCreatedCategoryIds,
  previewBrandImport,
  type BrandCategoryChoice,
  type BrandCommitAction,
  type BrandMediaSlot,
  type ExistingProductHit,
  type SavedBrandProfile,
} from "../../../../modules/product-cloud/brand-import"
import { ingestRemoteAsset } from "../../../../modules/product-cloud/brand-import-media"
import { applyAttributeCodes } from "../../../store/product-cloud/import-helpers"
import { persistImportProductionOrigin } from "../../../store/product-cloud/production-origin-import"
import { slugifyCategoryName } from "../../../../modules/product-cloud/category-attributes"
import { slugifyCatalogEntityName } from "../../../store/catalog/catalog-helpers"
import { isValidGtin, normalizeGtinDigits } from "../../../../modules/product-cloud/gtin-validation"
import {
  normalizeLanguageCode,
  targetLanguagesForSource,
} from "../../../../modules/product-cloud/languages"

const ACTOR = "brand-import"

const DOCUMENT_TYPES = [
  "CE-certificaat",
  "Overig compliance-document",
  "Autorisatiebewijs",
  "Handleiding",
  "Veiligheidsinformatieblad",
  "Garantiebewijs",
  "Conformiteitsverklaring",
] as const

function asDocumentType(
  value: string | null
): (typeof DOCUMENT_TYPES)[number] | null {
  if (!value) return null
  return DOCUMENT_TYPES.find((item) => item === value) || null
}

export type BrandImportRequest = {
  headers: string[]
  rows: string[][]
  source_key: string
  file_name?: string | null
  manual?: Record<string, string | null>
  column_languages?: Record<string, string | null>
  manual_links?: import("../../../../modules/product-cloud/brand-import").BrandColumnLink[]
  source_language_code?: string | null
  language_confirmed?: boolean
  mapping_confirmed?: boolean
  brand_choices?: Record<string, { action: "use"; id: string } | { action: "create"; name: string }>
  category_decisions?: BrandCategoryChoice[]
  enqueue_translations?: boolean
  save_profile?: boolean
  actor_id: string
}

async function existingHits(
  productCloud: ProductCloudModuleService,
  rows: string[][],
  eanIndex: number,
  mpnIndex: number
): Promise<ExistingProductHit[]> {
  const wantGtin = new Set<string>()
  const wantMpn = new Set<string>()
  for (const row of rows) {
    const ean = eanIndex >= 0 ? normalizeGtinDigits(String(row[eanIndex] || "")) : ""
    const mpn = mpnIndex >= 0 ? String(row[mpnIndex] || "").trim() : ""
    if (ean && isValidGtin(ean)) wantGtin.add(ean)
    if (mpn) wantMpn.add(mpn)
  }
  const hits: ExistingProductHit[] = []
  async function fromIdentifier(value: string, type: "GTIN" | "MPN") {
    const found = (await productCloud.listIdentifiers({
      identifier_value: value,
      identifier_type: type,
    })) as Array<{ product_variant_id: string }>
    if (!found[0]) return
    const variant = await productCloud.retrieveProductVariant(found[0].product_variant_id)
    const productId = (variant as { product_id: string }).product_id
    const versions = (await productCloud.listProductVersions({
      product_id: productId,
    })) as Array<{
      id: string
      title: string
      description: string
      publication_status: string
      version_number: number
    }>
    const version =
      versions.find((v) => v.publication_status === "Gepubliceerd") ||
      [...versions].sort((a, b) => b.version_number - a.version_number)[0]
    const translations = version
      ? ((await productCloud.listProductTranslations({
          entity_type: "product_version",
          entity_id: version.id,
        })) as Array<{ field_name: string; language_code: string; value: string }>)
      : []
    const identifiers = (await productCloud.listIdentifiers({
      product_variant_id: found[0].product_variant_id,
    })) as Array<{ identifier_type: string; identifier_value: string }>
    hits.push({
      product_id: productId,
      publication_status: version?.publication_status ?? null,
      title: version?.title ?? null,
      description: version?.description ?? null,
      gtin: identifiers.find((i) => i.identifier_type === "GTIN")?.identifier_value ?? null,
      mpn: identifiers.find((i) => i.identifier_type === "MPN")?.identifier_value ?? null,
      translations,
    })
  }
  for (const value of wantGtin) await fromIdentifier(value, "GTIN")
  for (const value of wantMpn) await fromIdentifier(value, "MPN")
  return hits
}

function indexOfField(
  previewLinks: Array<{ field: string | null; source: string; imported: boolean }>,
  headers: string[],
  field: string
): number {
  const link = previewLinks.find((l) => l.imported && l.field === field)
  if (!link) return -1
  return headers.indexOf(link.source)
}

async function storeAsset(
  container: MedusaContainer,
  slot: BrandMediaSlot
): Promise<string> {
  const ingested = await ingestRemoteAsset({
    url: slot.url,
    role: slot.role === "primary" || slot.role === "extra" ? "image" : "document",
    upload: async (file) => {
      const { result } = await uploadFilesWorkflow(container).run({
        input: { files: [{ ...file, access: "public" }] },
      })
      const uploaded = result?.[0] as { id?: string; url?: string } | undefined
      return uploaded?.url || uploaded?.id || ""
    },
  })
  return ingested.storage_reference
}

export async function inspectBrandImport(
  container: MedusaContainer,
  input: BrandImportRequest
) {
  const context = await loadBrandContext(container, input)
  const plan = planBrandCommit(context.preview, {
    headers: input.headers,
    rows: input.rows,
    existing: context.hits,
    mapping_confirmed: input.mapping_confirmed,
  })
  assertBrandPlanHasNoOffers(plan.actions)
  return { ...context, plan }
}

async function loadBrandContext(container: MedusaContainer, input: BrandImportRequest) {
  const productCloud = container.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const sourceKey = input.source_key.trim() || "Onbekende bron"
  const brands = (await partner.listBrands({}, { take: 500 })) as Array<{
    id: string
    name?: string
  }>
  const known = brands
    .filter((b) => b.name)
    .map((b) => ({ id: b.id, name: b.name as string }))
  const categories = await loadBrandCategories(productCloud)
  const profiles = (await productCloud.listImportMappingProfiles(
    { source_key: sourceKey },
    { take: 5, order: { updated_at: "DESC" } }
  )) as unknown as Array<{
    header_signature: { columns?: string[] } | string[]
    mapping: Record<string, string | null>
    column_languages?: Record<string, string | null> | null
    source_key: string
  }>
  const profile: SavedBrandProfile | null = profiles[0]
    ? {
        source_key: profiles[0].source_key,
        header_signature: Array.isArray(profiles[0].header_signature)
          ? profiles[0].header_signature
          : profiles[0].header_signature?.columns || [],
        mapping: profiles[0].mapping || {},
        column_languages: profiles[0].column_languages || {},
      }
    : null
  const draft = previewBrandImport({
    headers: input.headers,
    rows: input.rows,
    manual: input.manual,
    column_languages: input.column_languages,
    manual_links: input.manual_links,
    source_language_code: input.source_language_code,
    language_confirmed: input.language_confirmed,
    mapping_confirmed: input.mapping_confirmed,
    brand_choices: input.brand_choices,
    category_choices: input.category_decisions,
    profile,
    categories,
    known_brands: known,
  })
  const hits = await existingHits(
    productCloud,
    input.rows,
    indexOfField(draft.links, input.headers, "ean"),
    indexOfField(draft.links, input.headers, "mpn")
  )
  const preview = previewBrandImport({
    headers: input.headers,
    rows: input.rows,
    manual: input.manual,
    column_languages: input.column_languages,
    manual_links: input.manual_links,
    source_language_code: input.source_language_code,
    language_confirmed: input.language_confirmed,
    mapping_confirmed: input.mapping_confirmed,
    brand_choices: input.brand_choices,
    category_choices: input.category_decisions,
    profile,
    categories,
    known_brands: known,
    existing: hits,
  })
  return { productCloud, sourceKey, known, preview, hits, profile }
}

export async function executeBrandImport(
  container: MedusaContainer,
  input: BrandImportRequest
) {
  const { productCloud, sourceKey, known, preview, hits } = await loadBrandContext(
    container,
    input
  )
  const plan = planBrandCommit(preview, {
    headers: input.headers,
    rows: input.rows,
    existing: hits,
    mapping_confirmed: input.mapping_confirmed,
  })
  assertBrandPlanHasNoOffers(plan.actions)

  if (plan.blocked) {
    await productCloud.createImportBatches({
      source_key: sourceKey,
      file_name: input.file_name || null,
      status: "blocked",
      source_language_code: preview.language.suggested,
      summary: preview.summary,
      issues: {
        conflicts: preview.conflicts,
        rows: preview.preview.filter((row) => row.issues.length),
        reason: plan.reason,
      },
      created_by: input.actor_id || ACTOR,
    })
    return { preview, plan, created: [], proposals: [], translations_added: [] }
  }

  const stored = new Map<string, string>()
  for (const action of plan.actions) {
    if (action.type !== "create") continue
    for (const slot of action.media) {
      if (stored.has(slot.url)) continue
      try {
        stored.set(slot.url, await storeAsset(container, slot))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Media ophalen mislukt."
        await productCloud.createImportBatches({
          source_key: sourceKey,
          file_name: input.file_name || null,
          status: "blocked",
          source_language_code: preview.language.suggested,
          summary: preview.summary,
          issues: { reason: `Rij ${action.row}: ${message}` },
          created_by: input.actor_id || ACTOR,
        })
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Import gestopt bij rij ${action.row}: ${message} Er is geen product opgeslagen.`
        )
      }
    }
  }

  const created: string[] = []
  const proposals: string[] = []
  const translationsAdded: string[] = []
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const brandByName = new Map(known.map((b) => [normalizeBrandKey(b.name), b]))
  for (const action of plan.actions) {
    if (action.type !== "create" || !action.brand_name.trim()) continue
    const choice = input.brand_choices?.[normalizeBrandKey(action.brand_name)]
    const brand = await ensureImportBrand(partner, action.brand_name, known, choice)
    brandByName.set(normalizeBrandKey(action.brand_name), brand)
    brandByName.set(normalizeBrandKey(brand.name), brand)
  }
  const categoryCatalog = await loadBrandCategories(productCloud)

  for (const action of plan.actions) {
    if (action.type === "create") {
      const categoryId = await categoryForAction(
        productCloud,
        action,
        categoryCatalog,
        input.category_decisions || []
      )
      const id = await createCentralProduct(
        container,
        productCloud,
        action,
        brandByName,
        stored,
        input.actor_id,
        categoryId
      )
      created.push(id)
      if (input.enqueue_translations) {
        const version = (
          (await productCloud.listProductVersions({ product_id: id })) as Array<{ id: string }>
        )[0]
        if (version) {
          const sourceFields: Record<string, string> = {}
          for (const text of action.texts) {
            if (text.language_code === action.source_language_code) {
              sourceFields[text.field] = text.value
            }
          }
          if (Object.keys(sourceFields).length) {
            await productCloud.enqueueMachineTranslations({
              entity_type: "product_version",
              entity_id: version.id,
              source_language_code: action.source_language_code,
              source_fields: sourceFields,
              target_language_codes: targetLanguagesForSource(action.source_language_code),
              only_missing: true,
              force_overwrite_manual: false,
              updated_by: input.actor_id || ACTOR,
            })
          }
        }
      }
    } else if (action.type === "proposal") {
      const proposal = await productCloud.createChangeProposals({
        product_id: action.product_id,
        submitter_seller_id: ACTOR,
        proposed_title:
          action.changes.find((c) => c.field === "title")?.proposed_value || null,
        proposed_description:
          action.changes.find((c) => c.field === "description")?.proposed_value || null,
        proposed_fields: { changes: action.changes },
        toelichting: `Merkimport ${sourceKey}, rij ${action.row}. Geen stille overschrijving.`,
        status: "In behandeling",
      })
      proposals.push((proposal as { id: string }).id)
    } else if (action.type === "add_translations") {
      const versions = (await productCloud.listProductVersions({
        product_id: action.product_id,
      })) as Array<{ id: string; publication_status: string }>
      const version =
        versions.find((v) => v.publication_status === "Gepubliceerd") || versions[0]
      if (!version) continue
      for (const text of action.texts) {
        const existing = (
          await productCloud.listProductTranslations({
            entity_type: "product_version",
            entity_id: version.id,
            field_name: text.field,
            language_code: text.language_code,
          })
        )[0] as { id?: string } | undefined
        if (existing?.id) continue
        await productCloud.upsertTranslation({
          entity_type: "product_version",
          entity_id: version.id,
          field_name: text.field,
          language_code: text.language_code,
          value: text.value,
          source_language_code: normalizeLanguageCode(preview.language.suggested || text.language_code),
          source_value: text.value,
          translation_status: "Concept",
          origin: "manual",
          force_overwrite_manual: false,
          updated_by: input.actor_id || ACTOR,
        })
        translationsAdded.push(`${action.product_id}:${text.field}:${text.language_code}`)
      }
    }
  }

  if (input.save_profile !== false) {
    const mapping: Record<string, string | null> = {}
    const columnLanguages: Record<string, string | null> = {}
    for (const link of preview.links) {
      if (!link.field) continue
      mapping[link.field] = link.imported ? link.source : null
      if (link.language_code) columnLanguages[link.field] = link.language_code
    }
    await productCloud.createImportMappingProfiles({
      source_key: sourceKey,
      header_signature: { columns: headerSignature(input.headers) },
      mapping,
      column_languages: columnLanguages,
      source_language_code: preview.language.suggested,
      created_by: input.actor_id || ACTOR,
    })
  }

  const batch = await productCloud.createImportBatches({
    source_key: sourceKey,
    file_name: input.file_name || null,
    status: "imported",
    source_language_code: preview.language.suggested,
    summary: {
      ...preview.summary,
      created: created.length,
      proposals: proposals.length,
      translations_added: translationsAdded.length,
      offers_created: 0,
    },
    issues: { rows: preview.preview.filter((row) => row.issues.length) },
    created_by: input.actor_id || ACTOR,
  })

  return {
    preview,
    plan,
    batch_id: (batch as { id: string }).id,
    created,
    proposals,
    translations_added: translationsAdded,
    offers_created: 0,
  }
}

async function createCentralProduct(
  container: MedusaContainer,
  productCloud: ProductCloudModuleService,
  action: Extract<BrandCommitAction, { type: "create" }>,
  brandByName: Map<string, { id: string; name: string }>,
  stored: Map<string, string>,
  actorId: string,
  categoryId: string | null
): Promise<string> {
  const brand = brandByName.get(normalizeBrandKey(action.brand_name))
  if (!brand) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Merk '${action.brand_name}' bestaat niet.`
    )
  }
  const product = await productCloud.createProducts({
    brand_id: brand.id,
    manufacturer_id: action.manufacturer || brand.id,
    current_owner_seller_id: ACTOR,
    product_manager_kind: "none",
    product_manager_seller_id: null,
    lifecycle_status: "Retailer Created",
  })
  const version = await productCloud.createProductVersions({
    product_id: product.id,
    version_number: 1,
    title: action.title,
    description: action.description || action.title,
    publication_status: "Concept",
    created_by_seller_id: actorId || ACTOR,
    source_language_code: action.source_language_code,
  })
  const variant = await productCloud.createProductVariants({
    product_id: product.id,
    variant_type: "Uitvoering",
    variant_value: "Standaard",
  })
  if (action.ean) {
    await productCloud.createIdentifiers({
      product_variant_id: variant.id,
      identifier_type: "GTIN",
      identifier_value: action.ean,
      country_scope: null,
    })
  }
  if (action.mpn && action.mpn !== action.ean) {
    await productCloud.createIdentifiers({
      product_variant_id: variant.id,
      identifier_type: "MPN",
      identifier_value: action.mpn,
      country_scope: null,
    })
  }
  if (categoryId) {
    await productCloud.createProductCategories({
      product_id: product.id,
      category_id: categoryId,
    })
  }
  await applyAttributeCodes(productCloud, product.id, version.id, action.attributes)
  if (action.attributes.production_country) {
    await persistImportProductionOrigin({
      scope: container,
      product_version_id: version.id,
      brand_id: brand.id,
      manufacturer_id: action.manufacturer || brand.id,
      seller_id: ACTOR,
      production_country: action.attributes.production_country,
      production_location: action.attributes.production_location || null,
    })
  }
  let order = 0
  for (const slot of action.media) {
    const reference = stored.get(slot.url)
    if (!reference) continue
    const documentType = asDocumentType(slot.document_type)
    if (slot.role === "document" && documentType) {
      await productCloud.createProductDocuments({
        product_version_id: version.id,
        document_type: documentType,
        storage_reference: reference,
      })
    } else if (slot.role === "evidence") {
      const verification = container.resolve(VERIFICATION_MODULE) as VerificationModuleService
      await verification.createProductOriginEvidences({
        product_id: product.id,
        product_origin_id: null,
        product_version_id: version.id,
        document_type: "pdf",
        evidence_kind: "made_in_europe",
        storage_reference: reference,
        file_name: null,
        mime_type: "application/pdf",
        file_size_bytes: null,
        verification_status: "pending",
        verification_method: "brand_import",
        verification_result: null,
        verification_notes: "Aangeleverd via merkimport. Nog niet beoordeeld.",
        uploaded_by_customer_id: actorId || ACTOR,
      })
    } else if (slot.media_type) {
      await productCloud.createProductMedias({
        product_version_id: version.id,
        media_type: slot.media_type,
        storage_reference: reference,
        sort_order: order,
      })
      order += 1
    }
  }
  for (const text of action.texts) {
    await productCloud.upsertTranslation({
      entity_type: "product_version",
      entity_id: version.id,
      field_name: text.field,
      language_code: text.language_code,
      value: text.value,
      source_language_code: action.source_language_code,
      source_value: text.value,
      translation_status: "Concept",
      origin: "manual",
      force_overwrite_manual: false,
      updated_by: actorId || ACTOR,
    })
  }
  return product.id as string
}

type BrandCategoryRow = {
  id: string
  name: string
  slug: string
  parent_id: string | null
}

async function loadBrandCategories(
  productCloud: ProductCloudModuleService
): Promise<BrandCategoryRow[]> {
  const rows = (await productCloud.listCategories({}, { take: 500, order: { name: "ASC" } })) as Array<{
    id: string
    name: string
    slug?: string | null
    parent_category_id?: string | null
  }>
  return rows
    .filter((row) => row.name?.trim())
    .map((row) => ({
      id: row.id,
      name: row.name.trim(),
      slug: row.slug || slugifyCategoryName(row.name),
      parent_id: row.parent_category_id || null,
    }))
}

async function ensureImportBrand(
  partner: PartnerModuleService,
  rawName: string,
  known: Array<{ id: string; name: string }>,
  choice?: { action: "use"; id: string } | { action: "create"; name: string }
): Promise<{ id: string; name: string }> {
  if (choice?.action === "use") {
    const chosen = known.find((brand) => brand.id === choice.id)
    if (chosen) return chosen
  }
  const requested = (choice?.action === "create" ? choice.name : rawName).replace(/\s+/g, " ").trim()
  const match = matchBrandName(requested, known)
  if (match.status === "exact" && choice?.action !== "create") return match.brand
  if (match.status === "ambiguous" && choice?.action !== "create") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Merk '${requested}' komt overeen met meerdere merken. Bevestig welk merk.`
    )
  }
  const again = matchBrandName(requested, known)
  if (again.status === "exact") return again.brand
  const slug = slugifyCatalogEntityName(requested)
  let created: { id?: string } | { id?: string }[] | null = null
  try {
    created = (await partner.createBrands([
      {
        name: requested,
        slug,
        public_page_status: "unpublished",
        page_review_status: "draft",
        created_by_seller_id: ACTOR,
      },
    ])) as { id?: string } | { id?: string }[]
  } catch {
    created = (await partner.createBrands([
      {
        name: requested,
        slug: `${slug}-${Date.now().toString(36)}`,
        public_page_status: "unpublished",
        page_review_status: "draft",
        created_by_seller_id: ACTOR,
      },
    ])) as { id?: string } | { id?: string }[]
  }
  const row = Array.isArray(created) ? created[0] : created
  if (!row?.id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Merk '${requested}' kon niet worden aangemaakt.`)
  }
  const saved = { id: row.id, name: requested }
  known.push(saved)
  return saved
}

async function ensureCategory(
  productCloud: ProductCloudModuleService,
  name: string,
  parentId: string | null,
  catalog: BrandCategoryRow[]
): Promise<string> {
  const clean = name.replace(/\s+/g, " ").trim()
  const existing = catalog.find(
    (row) =>
      normalizeBrandKey(row.name) === normalizeBrandKey(clean) &&
      (row.parent_id || null) === parentId
  )
  if (existing) return existing.id
  const slug = slugifyCategoryName(clean)
  let created: { id?: string } | { id?: string }[] | null = null
  const payload = {
    name: clean,
    slug,
    parent_category_id: parentId,
  }
  try {
    created = (await productCloud.createCategories(payload)) as { id?: string } | { id?: string }[]
  } catch {
    created = (await productCloud.createCategories({
      ...payload,
      slug: `${slug}-${Date.now().toString(36)}`.slice(0, 80),
    })) as { id?: string } | { id?: string }[]
  }
  const row = Array.isArray(created) ? created[0] : created
  if (!row?.id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Categorie '${clean}' kon niet worden aangemaakt.`)
  }
  catalog.push({ id: row.id, name: clean, slug, parent_id: parentId })
  return row.id
}

async function categoryForAction(
  productCloud: ProductCloudModuleService,
  action: Extract<BrandCommitAction, { type: "create" }>,
  catalog: BrandCategoryRow[],
  decisions: BrandCategoryChoice[]
): Promise<string | null> {
  const decision = (kind: "category" | "subcategory", raw: string) =>
    decisions.find(
      (item) => item.kind === kind && raw && normalizeBrandKey(item.raw) === normalizeBrandKey(raw)
    )
  const createdIds: string[] = []
  const createTracked = async (name: string, parentId: string | null) => {
    const before = catalog.length
    const id = await ensureCategory(productCloud, name, parentId, catalog)
    if (catalog.length > before) createdIds.push(id)
    return id
  }
  try {
    let parentId: string | null = null
    if (action.category.trim()) {
      const roots = catalog.filter(
        (row) => !row.parent_id && normalizeBrandKey(row.name) === normalizeBrandKey(action.category)
      )
      const choice = decision("category", action.category)
      if (choice?.action === "link" && choice.id) parentId = choice.id
      else if (choice?.action === "create") {
        parentId = await createTracked(choice.name || action.category, null)
      } else if (choice?.action !== "skip" && roots.length === 1) parentId = roots[0].id
    }
    if (!action.subcategory.trim()) return parentId
    const choice = decision("subcategory", action.subcategory)
    if (choice?.action === "link" && choice.id) return choice.id
    if (choice?.action === "create") {
      if (!parentId) return parentId
      return createTracked(choice.name || action.subcategory, parentId)
    }
    if (!parentId || choice?.action === "skip") return parentId
    const child = catalog.find(
      (row) =>
        row.parent_id === parentId &&
        normalizeBrandKey(row.name) === normalizeBrandKey(action.subcategory)
    )
    return child?.id || parentId
  } catch (err) {
    await undoCreatedCategoryIds(createdIds, async (id) => {
      await productCloud.deleteCategories(id)
    })
    for (const id of createdIds) {
      const index = catalog.findIndex((row) => row.id === id)
      if (index >= 0) catalog.splice(index, 1)
    }
    throw err
  }
}
