import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import {
  isActiveProductCloudLanguage,
  isTranslatableField,
  normalizeLanguageCode,
  targetLanguagesForSource,
} from "../../../../../../modules/product-cloud/languages"
import { sellerOwnsProduct } from "../../../../../../modules/product-cloud/translation/ownership"
import { pickTranslationVersion } from "../../../../../../modules/product-cloud/translation/coverage"
import { resolveApprovedSeller } from "../../../resolve-seller"

type RouteParams = { id: string }

async function assertOwnedVersion(
  productCloud: ProductCloudModuleService,
  productId: string,
  sellerId: string
) {
  const product = await productCloud.retrieveProduct(productId)
  if (!sellerOwnsProduct(product.current_owner_seller_id, sellerId)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Alleen de Product Cloud-eigenaar mag vertalingen van dit product beheren."
    )
  }
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
    productCloud,
    id,
    seller.id
  )
  const summary = await productCloud.getProductVersionTranslationSummary({
    version_id: version.id,
  })

  res.status(200).json({
    product_id: id,
    ...summary,
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
  if (!isActiveProductCloudLanguage(code)) {
    res.status(400).json({
      message: "Ongeldige bron-taal. Kies nl, en, de of fr.",
    })
    return
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const { version } = await assertOwnedVersion(productCloud, id, seller.id)

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
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const { version } = await assertOwnedVersion(productCloud, id, seller.id)
  const source = normalizeLanguageCode(version.source_language_code ?? "")
  if (!isActiveProductCloudLanguage(source)) {
    res.status(400).json({
      message:
        "Stel eerst een bron-taal in (nl, en, de of fr) voordat je vertalingen voorbereidt.",
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
