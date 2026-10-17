/**
 * Admin corrections of central Product Cloud data.
 * A section is validated completely before any write. Offer rows are never touched.
 * Saving does not change publication status or verification approval.
 */

import { assessImportUrl } from "./brand-import"
import {
  GPSR_EU_RESPONSIBLE_ATTRIBUTE_CODES,
  GPSR_MANUFACTURER_ATTRIBUTE_CODES,
} from "./gpsr-manufacturer"
import { VARIANT_TYPES } from "./import-columns"
import { planGtinAssignment, type GtinOwner } from "./gtin-validation"
import { PRODUCT_CLOUD_ACTIVE_LANGUAGES } from "./languages"

export const COMPLIANCE_ATTRIBUTE_CODES = new Set<string>([
  ...GPSR_MANUFACTURER_ATTRIBUTE_CODES,
  ...GPSR_EU_RESPONSIBLE_ATTRIBUTE_CODES,
  "gpsr_safety_warnings",
  "production_country",
  "production_location",
  "ce_marking",
  "app_required",
  "collects_data",
  "product_languages",
  "manual_languages",
])

export const TRANSLATION_FIELDS = [
  "title",
  "short_description",
  "description",
  "usps",
  "specifications",
] as const

export const DOCUMENT_TYPES = [
  "CE-certificaat",
  "Overig compliance-document",
  "Autorisatiebewijs",
  "Handleiding",
  "Veiligheidsinformatieblad",
  "Garantiebewijs",
  "Conformiteitsverklaring",
] as const

export const MEDIA_TYPES = ["Hoofdafbeelding", "Overige afbeelding", "Video"] as const

export class CentralSectionError extends Error {
  field: string
  constructor(field: string, message: string) {
    super(message)
    this.name = "CentralSectionError"
    this.field = field
  }
}

type VersionRow = {
  id: string
  title?: string | null
  description?: string | null
  publication_status?: string | null
  source_language_code?: string | null
}

type VariantRow = { id: string; variant_type?: string; variant_value?: string }
type IdentifierRow = {
  id: string
  identifier_type: string
  identifier_value: string
  product_variant_id: string
}
type CategoryLink = { id: string; category_id: string }
type AttrDef = { id: string; code: string | null; category_id?: string }
type MediaRow = { id: string; media_type: string; storage_reference: string; sort_order?: number }
type DocumentRow = { id: string; document_type: string; storage_reference: string }

export type AdminCentralDeps = {
  retrieveProduct: (id: string) => Promise<{
    id: string
    brand_id: string
    manufacturer_id: string
    current_owner_seller_id?: string | null
    publication_status?: string
  }>
  retrieveBrand: (id: string) => Promise<{ id: string }>
  retrieveManufacturer: (id: string) => Promise<{ id: string }>
  listManufacturers: () => Promise<Array<{ id: string; name?: string | null }>>
  listProductVersions: (q: { product_id: string }) => Promise<VersionRow[]>
  updateProductVersions: (row: { id: string; title: string; description: string }) => Promise<unknown>
  updateProducts: (row: { id: string; brand_id: string; manufacturer_id: string }) => Promise<unknown>
  listProductVariants: (q: { product_id: string }) => Promise<VariantRow[]>
  updateProductVariants: (row: {
    id: string
    variant_type: (typeof VARIANT_TYPES)[number]
    variant_value: string
  }) => Promise<unknown>
  listIdentifiers: (q: Record<string, unknown>, opts?: { take?: number }) => Promise<IdentifierRow[]>
  updateIdentifiers: (row: { id: string; identifier_value: string }) => Promise<unknown>
  createIdentifiers: (row: {
    product_variant_id: string
    identifier_type: "GTIN" | "MPN"
    identifier_value: string
    country_scope: null
  }) => Promise<unknown>
  retrieveProductVariant: (id: string) => Promise<{ product_id: string }>
  listProductCategories: (q: { product_id: string }) => Promise<CategoryLink[]>
  listCategories: (q: { id: string[] }) => Promise<Array<{ id: string }>>
  createProductCategories: (row: { product_id: string; category_id: string }) => Promise<unknown>
  deleteProductCategories: (id: string) => Promise<unknown>
  listAttributeDefinitions: (q: { category_id: string }) => Promise<AttrDef[]>
  setVersionAttributeValues: (input: {
    product_version_id: string
    values: Array<{ attribute_definition_id: string; value: string }>
  }) => Promise<unknown>
  listProductMedias: (q: { product_version_id: string }) => Promise<MediaRow[]>
  createProductMedias: (row: {
    product_version_id: string
    media_type: (typeof MEDIA_TYPES)[number]
    storage_reference: string
    sort_order: number
  }) => Promise<unknown>
  updateProductMedias: (row: {
    id: string
    media_type: (typeof MEDIA_TYPES)[number]
    storage_reference: string
    sort_order: number
  }) => Promise<unknown>
  deleteProductMedias: (id: string) => Promise<unknown>
  listProductDocuments: (q: { product_version_id: string }) => Promise<DocumentRow[]>
  createProductDocuments: (row: {
    product_version_id: string
    document_type: (typeof DOCUMENT_TYPES)[number]
    storage_reference: string
  }) => Promise<unknown>
  updateProductDocuments: (row: {
    id: string
    document_type: (typeof DOCUMENT_TYPES)[number]
    storage_reference: string
  }) => Promise<unknown>
  deleteProductDocuments: (id: string) => Promise<unknown>
  listProductTranslations: (q: {
    entity_type: "product_version"
    entity_id: string
  }) => Promise<Array<{ id: string; field_name: string; language_code: string; value: string }>>
  upsertTranslation: (row: {
    entity_type: "product_version"
    entity_id: string
    field_name: string
    language_code: string
    value: string
    source_language_code: string | null
    source_value: string
    translation_status: "Concept"
    origin: "manual"
    force_overwrite_manual: true
  }) => Promise<unknown>
  listProductOrigins?: (q: { product_version_id: string }) => Promise<
    Array<{
      id: string
      production_country?: string | null
      production_location?: string | null
      status?: string | null
    }>
  >
  updateProductOrigins?: (row: {
    id: string
    production_country: string
    production_location: string
  }) => Promise<unknown>
  createProductOrigins?: (row: {
    product_version_id: string
    manufacturer_id: string
    brand_id: string
    seller_id: string
    production_country: string
    production_location: string
    status: "Niet aangevraagd"
  }) => Promise<unknown>
  createProductOriginEvidences: (row: {
    product_id: string
    product_origin_id: null
    product_version_id: string
    document_type: "pdf"
    evidence_kind: "made_in_europe"
    storage_reference: string
    file_name: null
    mime_type: "application/pdf"
    file_size_bytes: null
    verification_status: "pending"
    verification_method: "admin_review"
    verification_result: null
    verification_notes: string
    uploaded_by_customer_id: string
  }) => Promise<unknown>
  ingest: (url: string, role: "image" | "document") => Promise<string>
}

type AttrInput = { attribute_definition_id?: string; value?: string }
type MediaInput = { id?: string; media_type?: string; storage_reference?: string }
type DocumentInput = { id?: string; document_type?: string; storage_reference?: string }
type TranslationInput = { field_name?: string; language_code?: string; value?: string }

function text(value: unknown): string {
  return String(value ?? "").trim()
}

function workingVersion(versions: VersionRow[]): VersionRow {
  return (
    versions.find((row) =>
      ["In review", "Concept", "Goedgekeurd", "Gepubliceerd"].includes(
        String(row.publication_status || "")
      )
    ) || versions[0]
  )
}

async function ownedIdentifiers(
  deps: AdminCentralDeps,
  matches: IdentifierRow[],
  productId: string
): Promise<GtinOwner[]> {
  const owners: GtinOwner[] = []
  for (const row of matches) {
    try {
      const variant = await deps.retrieveProductVariant(row.product_variant_id)
      owners.push({
        identifier_id: row.id,
        product_id: variant.product_id,
        value: row.identifier_value,
      })
    } catch {
      /* dangling identifier */
    }
  }
  return owners
}

async function assertStoredReference(deps: AdminCentralDeps, raw: string, role: "image" | "document", field: string, current: string | null) {
  const value = raw.trim()
  if (!value) return ""
  if (current && value === current) return current
  const checked = assessImportUrl(value)
  if (!checked.ok) throw new CentralSectionError(field, checked.message)
  if (value.startsWith("/static/")) return value
  return deps.ingest(value, role)
}

export async function applyAdminCentralSection(
  deps: AdminCentralDeps,
  productId: string,
  body: Record<string, unknown>,
  actorId: string
): Promise<{ section: string }> {
  const section = text(body.section)
  if (!["information", "description", "media", "compliance", "translations"].includes(section)) {
    throw new CentralSectionError("section", "Onbekende sectie.")
  }
  const product = await deps.retrieveProduct(productId)
  const versions = await deps.listProductVersions({ product_id: productId })
  const version = workingVersion(versions)
  if (!version?.id) throw new CentralSectionError("product", "Dit product heeft geen versie om op te slaan.")
  const publicationBefore = version.publication_status || null

  if (section === "information") await saveInformation(deps, product, version, body)
  if (section === "description") await saveDescription(deps, version, body)
  if (section === "media") await saveMedia(deps, version, body)
  if (section === "compliance") await saveCompliance(deps, productId, version, body, actorId)
  if (section === "translations") await saveTranslations(deps, version, body)

  const after = (await deps.listProductVersions({ product_id: productId })).find((row) => row.id === version.id)
  if ((after?.publication_status || null) !== publicationBefore) {
    throw new CentralSectionError("publication_status", "Opslaan mag de publicatiestatus niet wijzigen.")
  }
  return { section }
}

async function saveInformation(
  deps: AdminCentralDeps,
  product: { id: string; brand_id: string; manufacturer_id: string },
  version: VersionRow,
  body: Record<string, unknown>
) {
  const title = text(body.title)
  const description = version.description || ""
  const brandId = text(body.brand_id)
  const manufacturerId = text(body.manufacturer_id)
  const variantType = text(body.variant_type)
  const variantValue = text(body.variant_value)
  const ean = text(body.ean)
  const mpn = text(body.mpn)
  const categoryIds = Array.isArray(body.category_ids)
    ? [...new Set(body.category_ids.map((id) => text(id)).filter(Boolean))]
    : []
  const attributes = Array.isArray(body.attributes) ? (body.attributes as AttrInput[]) : []
  if (!title) throw new CentralSectionError("title", "Vul een productnaam in.")
  if (!brandId) throw new CentralSectionError("brand_id", "Kies een merk.")
  if (variantType && !(VARIANT_TYPES as readonly string[]).includes(variantType)) {
    throw new CentralSectionError(
      "variant_type",
      `Varianttype '${variantType}' staat niet in de bestaande lijst.`
    )
  }
  if (!variantValue) throw new CentralSectionError("variant_value", "Vul een variantwaarde in.")
  try {
    await deps.retrieveBrand(brandId)
  } catch {
    throw new CentralSectionError("brand_id", "Dit merk bestaat niet.")
  }
  const resolvedManufacturerId = await resolveManufacturerForSave(
    deps,
    product.manufacturer_id,
    manufacturerId
  )
  const previousManufacturerId = product.manufacturer_id
  const previousBrandId = product.brand_id
  if (categoryIds.length) {
    const found = await deps.listCategories({ id: categoryIds })
    if (found.length !== categoryIds.length) {
      throw new CentralSectionError("category_ids", "Een gekozen categorie bestaat niet.")
    }
  }
  const variants = await deps.listProductVariants({ product_id: product.id })
  const variant = variants.find((row) => row.id === text(body.variant_id)) || variants[0]
  if (!variant) throw new CentralSectionError("variant_type", "Dit product heeft nog geen variant.")
  const identifiers = await deps.listIdentifiers({ product_variant_id: variant.id }, { take: 20 })
  const gtin = identifiers.find((row) => row.identifier_type === "GTIN") || null
  const mpnRow = identifiers.find((row) => row.identifier_type === "MPN") || null
  let nextGtin: string | null = null
  if (ean) {
    const matches = await deps.listIdentifiers(
      { identifier_value: ean.replace(/\s/g, ""), identifier_type: "GTIN" },
      { take: 10 }
    )
    const owners = await ownedIdentifiers(deps, matches, product.id)
    const plan = planGtinAssignment({
      raw: ean,
      productId: product.id,
      currentValue: gtin?.identifier_value || null,
      owners,
    })
    if (!plan.ok) throw new CentralSectionError("ean", plan.message)
    nextGtin = plan.unchanged ? null : plan.digits
  }
  let nextMpn: string | null = null
  if (mpn && mpn !== (mpnRow?.identifier_value || "")) {
    const matches = await deps.listIdentifiers(
      { identifier_value: mpn, identifier_type: "MPN" },
      { take: 10 }
    )
    for (const row of matches) {
      if (mpnRow && row.id === mpnRow.id) continue
      const owner = await deps.retrieveProductVariant(row.product_variant_id).catch(() => null)
      if (owner && owner.product_id !== product.id) {
        throw new CentralSectionError("mpn", "Dit fabrikantnummer hoort al bij een ander product.")
      }
    }
    nextMpn = mpn
  }
  await assertAttributes(deps, categoryIds, attributes, "information")
  const removedLinks: CategoryLink[] = []
  const addedCategoryIds: string[] = []
  try {
  if (nextGtin) {
    if (gtin) await deps.updateIdentifiers({ id: gtin.id, identifier_value: nextGtin })
    else {
      await deps.createIdentifiers({
        product_variant_id: variant.id,
        identifier_type: "GTIN",
        identifier_value: nextGtin,
        country_scope: null,
      })
    }
  }
  if (nextMpn) {
    if (mpnRow) await deps.updateIdentifiers({ id: mpnRow.id, identifier_value: nextMpn })
    else {
      await deps.createIdentifiers({
        product_variant_id: variant.id,
        identifier_type: "MPN",
        identifier_value: nextMpn,
        country_scope: null,
      })
    }
  }
  await deps.updateProducts({
    id: product.id,
    brand_id: brandId,
    manufacturer_id: resolvedManufacturerId,
  })
  await deps.updateProductVersions({ id: version.id, title, description })
  await deps.updateProductVariants({
    id: variant.id,
    variant_type: (variantType || "Uitvoering") as (typeof VARIANT_TYPES)[number],
    variant_value: variantValue,
  })
  const links = await deps.listProductCategories({ product_id: product.id })
  for (const link of links) {
    if (!categoryIds.includes(link.category_id)) {
      await deps.deleteProductCategories(link.id)
      removedLinks.push(link)
    }
  }
  const linked = new Set(links.map((link) => link.category_id))
  for (const categoryId of categoryIds) {
    if (!linked.has(categoryId)) {
      await deps.createProductCategories({ product_id: product.id, category_id: categoryId })
      addedCategoryIds.push(categoryId)
    }
  }
  if (attributes.length) {
    await deps.setVersionAttributeValues({
      product_version_id: version.id,
      values: attributes.map((row) => ({
        attribute_definition_id: text(row.attribute_definition_id),
        value: String(row.value ?? ""),
      })),
    })
  }
  } catch (err) {
    if (gtin) {
      await deps.updateIdentifiers({ id: gtin.id, identifier_value: gtin.identifier_value }).catch(() => undefined)
    }
    await deps.updateProducts({
      id: product.id,
      brand_id: previousBrandId,
      manufacturer_id: previousManufacturerId,
    }).catch(() => undefined)
    await deps.updateProductVersions({
      id: version.id,
      title: version.title || "",
      description: version.description || "",
    }).catch(() => undefined)
    await deps.updateProductVariants({
      id: variant.id,
      variant_type: ((VARIANT_TYPES as readonly string[]).includes(variant.variant_type || "")
        ? variant.variant_type
        : "Uitvoering") as (typeof VARIANT_TYPES)[number],
      variant_value: variant.variant_value || "Standaard",
    }).catch(() => undefined)
    await restoreProductCategoryLinks(deps, product.id, removedLinks, addedCategoryIds)
    throw err
  }
}

/** Writes only the central version description. Other product fields stay as they are. */
async function saveDescription(
  deps: AdminCentralDeps,
  version: VersionRow,
  body: Record<string, unknown>
) {
  await deps.updateProductVersions({
    id: version.id,
    title: version.title || "",
    description: String(body.description ?? ""),
  })
}

async function restoreProductCategoryLinks(
  deps: AdminCentralDeps,
  productId: string,
  removed: CategoryLink[],
  addedCategoryIds: string[]
) {
  if (!removed.length && !addedCategoryIds.length) return
  const current = await deps.listProductCategories({ product_id: productId }).catch(() => [])
  for (const link of current) {
    if (addedCategoryIds.includes(link.category_id)) {
      await deps.deleteProductCategories(link.id).catch(() => undefined)
    }
  }
  const after = await deps.listProductCategories({ product_id: productId }).catch(() => [])
  const present = new Set(after.map((link) => link.category_id))
  for (const link of removed) {
    if (!present.has(link.category_id)) {
      await deps.createProductCategories({
        product_id: productId,
        category_id: link.category_id,
      }).catch(() => undefined)
    }
  }
}

function manufacturerNameKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

/**
 * A changed value must resolve to one existing manufacturer.
 * An unchanged stored name stays as it is, so other central fields can still be saved.
 */
async function resolveManufacturerForSave(
  deps: AdminCentralDeps,
  current: string,
  submitted: string
): Promise<string> {
  if (!submitted || submitted === current) {
    if (!current) return current
    try {
      return await resolveExistingManufacturerId(deps, current)
    } catch (err) {
      if (err instanceof CentralSectionError) return current
      throw err
    }
  }
  return resolveExistingManufacturerId(deps, submitted)
}

/** Links a real manufacturer id. A bare name is matched, never used to create a manufacturer. */
async function resolveExistingManufacturerId(deps: AdminCentralDeps, raw: string): Promise<string> {
  const value = raw.trim()
  try {
    const row = await deps.retrieveManufacturer(value)
    if (row?.id) return row.id
  } catch {
    /* The stored value can be a name from import, not a manufacturer id. */
  }
  const key = manufacturerNameKey(value)
  const matches = (await deps.listManufacturers()).filter(
    (row) => manufacturerNameKey(row.name || "") === key && row.id
  )
  if (matches.length === 1) return matches[0].id
  if (matches.length > 1) {
    throw new CentralSectionError(
      "manufacturer_id",
      "Deze fabrikantnaam hoort bij meerdere fabrikanten. Kies de juiste fabrikant."
    )
  }
  throw new CentralSectionError(
    "manufacturer_id",
    "Deze fabrikant bestaat niet. Kies een bestaande fabrikant. Er wordt geen nieuwe fabrikant aangemaakt."
  )
}

async function assertAttributes(
  deps: AdminCentralDeps,
  categoryIds: string[],
  attributes: AttrInput[],
  section: "information" | "compliance"
) {
  const defs: AttrDef[] = []
  for (const categoryId of categoryIds) {
    defs.push(...(await deps.listAttributeDefinitions({ category_id: categoryId })))
  }
  const byId = new Map(defs.map((row) => [row.id, row]))
  for (const row of attributes) {
    const id = text(row.attribute_definition_id)
    const def = byId.get(id)
    if (!def) {
      throw new CentralSectionError(id || "attributes", "Dit kenmerk hoort niet bij de gekozen categorie.")
    }
    const compliance = Boolean(def.code && COMPLIANCE_ATTRIBUTE_CODES.has(def.code))
    if (section === "information" && compliance) {
      throw new CentralSectionError(def.code || id, "Dit complianceveld hoort niet bij productinformatie.")
    }
    if (section === "compliance" && !compliance) {
      throw new CentralSectionError(def.code || id, "Dit veld hoort niet bij compliance.")
    }
  }
}

async function saveMedia(deps: AdminCentralDeps, version: VersionRow, body: Record<string, unknown>) {
  const items = Array.isArray(body.media) ? (body.media as MediaInput[]) : []
  const documents = Array.isArray(body.documents) ? (body.documents as DocumentInput[]) : []
  const currentMedia = await deps.listProductMedias({ product_version_id: version.id })
  const currentDocs = await deps.listProductDocuments({ product_version_id: version.id })
  const primaries = items.filter((row) => text(row.media_type) === "Hoofdafbeelding" && text(row.storage_reference))
  if (primaries.length > 1) {
    throw new CentralSectionError("media", "Er kan maar één hoofdafbeelding zijn.")
  }
  const resolvedMedia: Array<{ id: string; media_type: (typeof MEDIA_TYPES)[number]; storage_reference: string }> = []
  for (const row of items) {
    const mediaType = text(row.media_type)
    if (!(MEDIA_TYPES as readonly string[]).includes(mediaType)) {
      throw new CentralSectionError("media_type", "Onbekend mediatype.")
    }
    const current = currentMedia.find((item) => item.id === text(row.id))
    const raw = text(row.storage_reference)
    let storage = raw
    if (mediaType === "Video") {
      if (raw && raw !== (current?.storage_reference || "")) {
        const checked = assessImportUrl(raw)
        if (!checked.ok) throw new CentralSectionError("storage_reference", checked.message)
      }
    } else {
      storage = await assertStoredReference(
        deps,
        raw,
        "image",
        "storage_reference",
        current?.storage_reference || null
      )
    }
    if (!storage && !text(row.id)) continue
    resolvedMedia.push({
      id: text(row.id),
      media_type: mediaType as (typeof MEDIA_TYPES)[number],
      storage_reference: storage,
    })
  }
  const resolvedDocs: Array<{ id: string; document_type: (typeof DOCUMENT_TYPES)[number]; storage_reference: string }> = []
  for (const row of documents) {
    const documentType = text(row.document_type)
    if (!(DOCUMENT_TYPES as readonly string[]).includes(documentType)) {
      throw new CentralSectionError("document_type", "Onbekend documenttype.")
    }
    const current = currentDocs.find((item) => item.id === text(row.id))
    const storage = await assertStoredReference(
      deps,
      text(row.storage_reference),
      "document",
      "storage_reference",
      current?.storage_reference || null
    )
    if (!storage && !text(row.id)) continue
    resolvedDocs.push({
      id: text(row.id),
      document_type: documentType as (typeof DOCUMENT_TYPES)[number],
      storage_reference: storage,
    })
  }
  const keptMedia = new Set(resolvedMedia.map((row) => row.id).filter(Boolean))
  for (const row of currentMedia) {
    if (!keptMedia.has(row.id)) await deps.deleteProductMedias(row.id)
  }
  for (const [index, row] of resolvedMedia.entries()) {
    if (!row.storage_reference) {
      if (row.id) await deps.deleteProductMedias(row.id)
      continue
    }
    if (row.id) {
      await deps.updateProductMedias({
        id: row.id,
        media_type: row.media_type,
        storage_reference: row.storage_reference,
        sort_order: index,
      })
    } else {
      await deps.createProductMedias({
        product_version_id: version.id,
        media_type: row.media_type,
        storage_reference: row.storage_reference,
        sort_order: index,
      })
    }
  }
  const keptDocs = new Set(resolvedDocs.map((row) => row.id).filter(Boolean))
  for (const row of currentDocs) {
    if (!keptDocs.has(row.id)) await deps.deleteProductDocuments(row.id)
  }
  for (const row of resolvedDocs) {
    if (!row.storage_reference) {
      if (row.id) await deps.deleteProductDocuments(row.id)
      continue
    }
    if (row.id) {
      await deps.updateProductDocuments({
        id: row.id,
        document_type: row.document_type,
        storage_reference: row.storage_reference,
      })
    } else {
      await deps.createProductDocuments({
        product_version_id: version.id,
        document_type: row.document_type,
        storage_reference: row.storage_reference,
      })
    }
  }
}

async function syncProductionOrigin(
  deps: AdminCentralDeps,
  productId: string,
  versionId: string,
  attributes: AttrInput[],
  actorId: string
) {
  if (!deps.listProductOrigins || !deps.updateProductOrigins) return
  const links = await deps.listProductCategories({ product_id: productId })
  const defs: AttrDef[] = []
  for (const link of links) defs.push(...(await deps.listAttributeDefinitions({ category_id: link.category_id })))
  const valueFor = (code: string) => {
    const def = defs.find((row) => row.code === code)
    if (!def) return ""
    return text(attributes.find((row) => text(row.attribute_definition_id) === def.id)?.value)
  }
  const country = valueFor("production_country")
  const location = valueFor("production_location")
  if (!country && !location) return
  const existing = await deps.listProductOrigins({ product_version_id: versionId })
  const current = existing[0]
  if (current) {
    await deps.updateProductOrigins({
      id: current.id,
      production_country: country || current.production_country || "",
      production_location: location || current.production_location || country || current.production_country || "",
    })
    return
  }
  if (!country || !deps.createProductOrigins) return
  const product = await deps.retrieveProduct(productId)
  await deps.createProductOrigins({
    product_version_id: versionId,
    manufacturer_id: product.manufacturer_id,
    brand_id: product.brand_id,
    seller_id: product.current_owner_seller_id || actorId || "admin",
    production_country: country,
    production_location: location || country,
    status: "Niet aangevraagd",
  })
}

async function saveCompliance(
  deps: AdminCentralDeps,
  productId: string,
  version: VersionRow,
  body: Record<string, unknown>,
  actorId: string
) {
  const attributes = Array.isArray(body.attributes) ? (body.attributes as AttrInput[]) : []
  const links = await deps.listProductCategories({ product_id: productId })
  await assertAttributes(
    deps,
    links.map((link) => link.category_id),
    attributes,
    "compliance"
  )
  if (attributes.length) {
    await deps.setVersionAttributeValues({
      product_version_id: version.id,
      values: attributes.map((row) => ({
        attribute_definition_id: text(row.attribute_definition_id),
        value: String(row.value ?? ""),
      })),
    })
  }
  await syncProductionOrigin(deps, productId, version.id, attributes, actorId)
  const evidenceUrl = text(body.evidence_url)
  if (evidenceUrl) {
    const stored = await assertStoredReference(deps, evidenceUrl, "document", "evidence_url", null)
    await deps.createProductOriginEvidences({
      product_id: productId,
      product_origin_id: null,
      product_version_id: version.id,
      document_type: "pdf",
      evidence_kind: "made_in_europe",
      storage_reference: stored,
      file_name: null,
      mime_type: "application/pdf",
      file_size_bytes: null,
      verification_status: "pending",
      verification_method: "admin_review",
      verification_result: null,
      verification_notes: "Aangeleverd in de admin-review. Nog niet beoordeeld.",
      uploaded_by_customer_id: actorId || "admin",
    })
  }
}

async function saveTranslations(deps: AdminCentralDeps, version: VersionRow, body: Record<string, unknown>) {
  const items = Array.isArray(body.translations) ? (body.translations as TranslationInput[]) : []
  for (const row of items) {
    const field = text(row.field_name)
    const language = text(row.language_code)
    if (!(TRANSLATION_FIELDS as readonly string[]).includes(field)) {
      throw new CentralSectionError("field_name", `Onbekend vertaalveld '${field}'.`)
    }
    if (!(PRODUCT_CLOUD_ACTIVE_LANGUAGES as readonly string[]).includes(language)) {
      throw new CentralSectionError("language_code", `Onbekende taal '${language}'.`)
    }
  }
  for (const row of items) {
    const value = String(row.value ?? "")
    if (!value.trim()) continue
    await deps.upsertTranslation({
      entity_type: "product_version",
      entity_id: version.id,
      field_name: text(row.field_name),
      language_code: text(row.language_code),
      value,
      source_language_code: version.source_language_code || null,
      source_value: value,
      translation_status: "Concept",
      origin: "manual",
      force_overwrite_manual: true,
    })
  }
}
