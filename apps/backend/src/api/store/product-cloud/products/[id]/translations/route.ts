import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import {
  getActiveProductCloudLanguages,
  isActiveProductCloudLanguage,
  isTranslatableField,
  normalizeLanguageCode,
  requiredTargetLanguagesForSource,
  targetLanguagesForSource,
} from "../../../../../../modules/product-cloud/languages"
import { pickTranslationVersion } from "../../../../../../modules/product-cloud/translation/coverage"
import { resolveApprovedSeller } from "../../../resolve-seller"
import { assertSellerCanDirectEditCatalog } from "../../../catalog-edit-guard"

type RouteParams = { id: string }

async function assertOwnedVersion(
  scope: import("@medusajs/framework/types").MedusaContainer,
  productCloud: ProductCloudModuleService,
  productId: string,
  seller: { id: string; company_id?: string | null }
) {
  const product = await productCloud.retrieveProduct(productId)
  await assertSellerCanDirectEditCatalog(scope, product, seller)
  const versions = await productCloud.listProductVersions({
    product_id: productId,
  })
  const version = pickTranslationVersion(versions)
  if (!version) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Geen productversie gevonden voor vertalingen."
    )
  }
  return { product, version }
}

/** Seller: translation status for own product. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const { version } = await assertOwnedVersion(
    req.scope,
    productCloud,
    id,
    seller
  )
  const summary = await productCloud.getProductVersionTranslationSummary({
    version_id: version.id,
  })

  res.status(200).json({
    product_id: id,
    ...summary,
    ...buildSellerTranslationMeta(summary),
    active_targets: summary.source_language_code
      ? targetLanguagesForSource(summary.source_language_code)
      : [],
    provider_message: summary.provider_configured
      ? null
      : "Automatische vertaling nog niet geactiveerd",
  })
}

type PatchBody = {
  source_language_code: string
}

/** Seller: set source language on working version. */
export async function PATCH(
  req: AuthenticatedMedusaRequest<PatchBody>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const body = (req.validatedBody ?? req.body) as PatchBody
  const code = normalizeLanguageCode(body?.source_language_code ?? "")
  const activeList = getActiveProductCloudLanguages().join(", ")
  if (!isActiveProductCloudLanguage(code)) {
    res.status(400).json({
      message: `Ongeldige bron-taal. Kies een actieve taal (${activeList}).`,
    })
    return
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const { version } = await assertOwnedVersion(req.scope, productCloud, id, seller)

  await productCloud.setProductVersionSourceLanguage({
    version_id: version.id,
    source_language_code: code,
  })

  const summary = await productCloud.getProductVersionTranslationSummary({
    version_id: version.id,
  })
  res.status(200).json({ product_id: id, ...summary })
}

type EnqueueBody = {
  /** Optional; defaults to title + description from version. */
  source_fields?: Record<string, string>
  only_missing?: boolean
  only_stale?: boolean
  only_failed?: boolean
}

type ManualBody = {
  language_code: string
  title?: string
  description?: string
  fields?: Record<string, string>
  /** When true (default), status becomes Gepubliceerd (storefront-ready). */
  publish?: boolean
}

const SELLER_TRANSLATABLE_FIELDS = [
  { field_name: "title", label: "Titel", source_key: "title" as const },
  {
    field_name: "description",
    label: "Omschrijving",
    source_key: "description" as const,
  },
] as const

function buildSellerTranslationMeta(summary: {
  source_language_code: string | null
  version: { title?: string | null; description?: string | null }
}) {
  return {
    active_languages: getActiveProductCloudLanguages(),
    required_target_languages: summary.source_language_code
      ? requiredTargetLanguagesForSource(summary.source_language_code)
      : [],
    editable_fields: SELLER_TRANSLATABLE_FIELDS.map((field) => ({
      field_name: field.field_name,
      label: field.label,
      source_value: summary.version[field.source_key] ?? "",
      required: true,
    })),
  }
}

function normalizeManualFields(
  body: ManualBody,
  version: { title?: string | null; description?: string | null }
): Array<{ field_name: string; value: string; source_value: string | null }> {
  const fields: Array<{
    field_name: string
    value: string
    source_value: string | null
  }> = []
  if (body.fields && typeof body.fields === "object") {
    for (const [field_name, raw] of Object.entries(body.fields)) {
      if (!isTranslatableField(field_name)) continue
      if (typeof raw !== "string") continue
      const value = raw.trim()
      if (!value) continue
      const source_value =
        field_name === "title"
          ? version.title ?? null
          : field_name === "description"
            ? version.description ?? null
            : null
      fields.push({ field_name, value, source_value })
    }
    return fields
  }
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const description =
    typeof body.description === "string" ? body.description.trim() : ""
  if (title) {
    fields.push({
      field_name: "title",
      value: title,
      source_value: version.title ?? null,
    })
  }
  if (description) {
    fields.push({
      field_name: "description",
      value: description,
      source_value: version.description ?? null,
    })
  }
  return fields
}

/**
 * Seller: save manual title + description for one target language.
 * Uses existing saveManualTranslation (origin=manual).
 */
export async function PUT(
  req: AuthenticatedMedusaRequest<ManualBody>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const body = (req.validatedBody ?? req.body) as ManualBody
  const activeList = getActiveProductCloudLanguages().join(", ")
  const language_code = normalizeLanguageCode(body?.language_code ?? "")
  if (!isActiveProductCloudLanguage(language_code)) {
    res.status(400).json({
      message: `Ongeldige doeltaal. Kies een actieve taal (${activeList}).`,
    })
    return
  }
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const { version } = await assertOwnedVersion(req.scope, productCloud, id, seller)
  const manualFields = normalizeManualFields(body, version)
  if (manualFields.length === 0) {
    res.status(400).json({
      message: "Geef minimaal één geldig vertaalveld met niet-lege waarde.",
    })
    return
  }
  const missingRequired = SELLER_TRANSLATABLE_FIELDS.filter(
    (field) => !manualFields.some((entry) => entry.field_name === field.field_name)
  )
  if (missingRequired.length > 0) {
    res.status(400).json({
      message: `Verplicht: ${missingRequired.map((f) => f.label).join(", ")}.`,
    })
    return
  }
  const source = normalizeLanguageCode(version.source_language_code ?? "nl")
  if (language_code === source) {
    res.status(400).json({
      message:
        "Dit is de bron-taal. Pas titel/omschrijving aan in Productinformatie, niet hier.",
    })
    return
  }

  const publish = body.publish !== false
  const source_version =
    typeof version.version_number === "number" ? version.version_number : 1

  for (const field of manualFields) {
    await productCloud.saveManualTranslation({
      entity_type: "product_version",
      entity_id: version.id,
      field_name: field.field_name,
      language_code,
      value: field.value,
      source_language_code: source,
      source_value: field.source_value,
      source_version,
      updated_by: seller.id,
      publish,
    })
  }

  const summary = await productCloud.getProductVersionTranslationSummary({
    version_id: version.id,
  })

  res.status(200).json({
    product_id: id,
    language_code,
    ...summary,
    ...buildSellerTranslationMeta(summary),
    message: publish
      ? `Vertaling ${language_code.toUpperCase()} opgeslagen en beschikbaar.`
      : `Vertaling ${language_code.toUpperCase()} opgeslagen.`,
  })
}

/**
 * Seller: "Vertalingen voorbereiden" → existing enqueueMachineTranslations.
 * With provider=none this creates Ontbreekt placeholders — never fake text.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<EnqueueBody>,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const body = (req.validatedBody ?? req.body) as EnqueueBody
  const activeList = getActiveProductCloudLanguages().join(", ")
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const { version } = await assertOwnedVersion(req.scope, productCloud, id, seller)
  const source = normalizeLanguageCode(version.source_language_code ?? "")
  if (!isActiveProductCloudLanguage(source)) {
    res.status(400).json({
      message: `Stel eerst een bron-taal in (${activeList}) voordat je vertalingen voorbereidt.`,
    })
    return
  }

  const source_fields: Record<string, string> = {}
  if (body?.source_fields && typeof body.source_fields === "object") {
    for (const [key, value] of Object.entries(body.source_fields)) {
      if (!isTranslatableField(key)) continue
      if (typeof value !== "string" || !value.trim()) continue
      source_fields[key] = value
    }
  } else {
    if (version.title?.trim()) source_fields.title = version.title
    if (version.description?.trim())
      source_fields.description = version.description
  }

  if (Object.keys(source_fields).length === 0) {
    res.status(400).json({
      message: "Geen vertaalbare productvelden (titel/omschrijving) gevonden.",
    })
    return
  }

  const result = await productCloud.enqueueMachineTranslations({
    entity_type: "product_version",
    entity_id: version.id,
    source_language_code: source,
    source_fields,
    target_language_codes: targetLanguagesForSource(source),
    only_missing: body?.only_missing === true,
    only_stale: body?.only_stale === true,
    only_failed: body?.only_failed === true,
    updated_by: seller.id,
  })

  const summary = await productCloud.getProductVersionTranslationSummary({
    version_id: version.id,
  })

  res.status(200).json({
    product_id: id,
    enqueue: result,
    summary,
    provider_message: result.provider_configured
      ? null
      : "Automatische vertaling nog niet geactiveerd",
  })
}
