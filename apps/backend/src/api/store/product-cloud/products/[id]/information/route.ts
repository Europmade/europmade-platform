import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"
import { resolveApprovedSeller } from "../../../resolve-seller"
import { buildSellerProductManagerDetail } from "../../../product-manager"
import { listManageableBrands } from "../../../../brands/brand-helpers"
import { syncProductOriginToBrand } from "../../../made-in-europe-helpers"
import { assertPermission } from "../../../../../../modules/partner/permissions"
import { findManufacturerForBrandName } from "../../../../../../modules/partner/brand-manufacturer"
import {
  sellerCanDirectEditCatalog,
  sellerHasOfferOnProduct,
} from "../../../catalog-edit-guard"
import { buildInformationGapFill } from "../../../../../../modules/product-cloud/catalog-gap-fill"

type RouteParams = { id: string }

const BodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  manufacturer_id: z.string().trim().min(1).optional(),
  brand_id: z.string().trim().min(1).optional(),
  brand_is_manufacturer: z.boolean().optional(),
  attributes: z
    .array(
      z.object({
        attribute_definition_id: z.string().min(1),
        value: z.string(),
      })
    )
    .optional(),
  reason: z.string().optional(),
})

type VersionRow = {
  id: string
  product_id: string
  version_number: number
  title: string
  description: string
  publication_status: string
  created_by_seller_id: string
  source_language_code?: string | null
}

/**
 * Update concept version information + attribute values with change history.
 * Never silently overwrites: records old/new per field.
 */
export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const parsed = BodySchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues[0]?.message || "Ongeldige productinformatie."
    )
  }
  let body = parsed.data

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const product = await productCloud.retrieveProduct(id)
  const versions = (await productCloud.listProductVersions({
    product_id: id,
  })) as VersionRow[]
  const conceptOrPublished =
    versions
      .filter((v) => v.publication_status === "Concept")
      .sort((a, b) => b.version_number - a.version_number)[0] ||
    versions
      .filter((v) => v.publication_status === "Gepubliceerd")
      .sort((a, b) => b.version_number - a.version_number)[0] ||
    [...versions].sort((a, b) => b.version_number - a.version_number)[0] ||
    null

  const direct = await sellerCanDirectEditCatalog(req.scope, product, seller)

  if (!direct.allowed) {
    const hasOffer = await sellerHasOfferOnProduct(req.scope, id, seller.id)
    if (!hasOffer) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Je mag centrale productgegevens niet wijzigen. Dien een wijzigingsvoorstel in of beheer je eigen aanbod."
      )
    }
    const { fill, rejected_occupied } = buildInformationGapFill({
      current: {
        title: conceptOrPublished?.title,
        description: conceptOrPublished?.description,
        brand_id: product.brand_id,
        manufacturer_id: product.manufacturer_id,
      },
      proposed: {
        title: body.title,
        description: body.description,
        brand_id: body.brand_id,
        manufacturer_id: body.manufacturer_id,
      },
    })
    if (
      Object.keys(fill).length === 0 &&
      (body.title != null ||
        body.description != null ||
        body.brand_id != null ||
        body.manufacturer_id != null)
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        rejected_occupied.length
          ? "Deze velden zijn al ingevuld. Gebruik 'Wijziging voorstellen' om bestaande centrale gegevens te wijzigen."
          : "Geen ontbrekende centrale velden om aan te vullen."
      )
    }
    if (Object.keys(fill).length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Geen ontbrekende centrale velden om aan te vullen."
      )
    }
    body = {
      title: fill.title,
      description: fill.description,
      brand_id: fill.brand_id,
      manufacturer_id: fill.manufacturer_id,
      reason:
        body.reason ||
        "Aanvulling ontbrekende Product Cloud-gegevens door aanbiedende seller",
    }
  }

  let working =
    versions
      .filter((v) => v.publication_status === "Concept")
      .sort((a, b) => b.version_number - a.version_number)[0] || null

  if (!working) {
    const published = versions
      .filter((v) => v.publication_status === "Gepubliceerd")
      .sort((a, b) => b.version_number - a.version_number)[0]
    const source = published || versions.sort((a, b) => b.version_number - a.version_number)[0]
    if (!source) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Geen productversie gevonden."
      )
    }
    const nextNumber = Math.max(...versions.map((v) => v.version_number)) + 1
    const created = await productCloud.createProductVersions({
      product_id: id,
      version_number: nextNumber,
      title: source.title,
      description: source.description,
      publication_status: "Concept",
      created_by_seller_id: seller.id,
      source_language_code: source.source_language_code ?? null,
    })
    working = (Array.isArray(created) ? created[0] : created) as VersionRow

    // Copy attribute values from source into new concept
    const sourceVals = await productCloud.listAttributeValues({
      product_version_id: source.id,
    })
    if (sourceVals.length) {
      await productCloud.setVersionAttributeValues({
        product_version_id: working.id,
        values: sourceVals.map(
          (v: { attribute_definition_id: string; value: string }) => ({
            attribute_definition_id: v.attribute_definition_id,
            value: v.value,
          })
        ),
      })
    }
  }

  const actorId = req.auth_context.actor_id ?? null

  if (body.title != null && body.title !== working.title) {
    await productCloud.createProductFieldChanges({
      product_id: id,
      product_version_id: working.id,
      seller_id: seller.id,
      actor_customer_id: actorId,
      field_code: "title",
      field_label: "Productnaam",
      old_value: working.title,
      new_value: body.title,
      status: "current",
      reason: body.reason ?? null,
    })
    await productCloud.updateProductVersions({
      id: working.id,
      title: body.title,
    })
    working.title = body.title
  }

  if (body.description != null && body.description !== working.description) {
    await productCloud.createProductFieldChanges({
      product_id: id,
      product_version_id: working.id,
      seller_id: seller.id,
      actor_customer_id: actorId,
      field_code: "description",
      field_label: "Beschrijving",
      old_value: working.description,
      new_value: body.description,
      status: "current",
      reason: body.reason ?? null,
    })
    await productCloud.updateProductVersions({
      id: working.id,
      description: body.description,
    })
  }

  if (body.manufacturer_id && body.manufacturer_id !== product.manufacturer_id) {
    const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
    const manufacturer = await partner.retrieveManufacturer(body.manufacturer_id)
    const representedBy = (
      manufacturer as { represented_by_company_id?: string | null }
    ).represented_by_company_id
    if (!seller.company_id || representedBy !== seller.company_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Deze fabrikant hoort niet bij jouw partneraccount."
      )
    }
    await productCloud.createProductFieldChanges({
      product_id: id,
      product_version_id: working.id,
      seller_id: seller.id,
      actor_customer_id: actorId,
      field_code: "manufacturer_id",
      field_label: "Fabrikant / verantwoordelijke fabrikant",
      old_value: product.manufacturer_id ?? null,
      new_value: body.manufacturer_id,
      status: "current",
      reason: body.reason ?? null,
    })
    await productCloud.updateProducts({
      id,
      manufacturer_id: body.manufacturer_id,
    })
  }

  let categoryFactsChanged = false

  if (body.brand_id && body.brand_id !== product.brand_id) {
    assertPermission(seller, "products.manage")
    const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
    try {
      await partner.retrieveBrand(body.brand_id)
    } catch {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Merk niet gevonden.")
    }
    const manageable = await listManageableBrands(req.scope, seller)
    if (!manageable.some((row) => row.id === body.brand_id)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Dit merk is niet toegankelijk voor jouw partneraccount."
      )
    }
    await productCloud.createProductFieldChanges({
      product_id: id,
      product_version_id: working.id,
      seller_id: seller.id,
      actor_customer_id: actorId,
      field_code: "brand_id",
      field_label: "Merk",
      old_value: product.brand_id ?? null,
      new_value: body.brand_id,
      status: "current",
      reason: body.reason ?? null,
    })
    await productCloud.updateProducts({
      id,
      brand_id: body.brand_id,
    })
    await syncProductOriginToBrand(req.scope, {
      product_id: id,
      brand_id: body.brand_id,
    })
    categoryFactsChanged = true
  }

  if (body.brand_is_manufacturer === true) {
    const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
    if (!seller.company_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Geen partnerbedrijf gekoppeld."
      )
    }
    const brandId = body.brand_id || product.brand_id
    let brandName: string | null = null
    try {
      const brand = await partner.retrieveBrand(brandId)
      brandName = (brand as { name?: string }).name ?? null
    } catch {
      brandName = null
    }
    if (!brandName) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Merk niet gevonden."
      )
    }
    const existing = (await partner.listManufacturers(
      { represented_by_company_id: seller.company_id },
      { take: 200 }
    )) as Array<{ id: string; name?: string | null }>
    let brandManufacturer = findManufacturerForBrandName(existing, brandName)
    if (!brandManufacturer) {
      const created = await partner.createManufacturers({
        name: brandName,
        represented_by_company_id: seller.company_id,
        street: null,
        house_number: null,
        postal_code: null,
        city: null,
        country_code: null,
        contact_email: null,
      })
      brandManufacturer = (
        Array.isArray(created) ? created[0] : created
      ) as { id: string; name?: string | null }
    }
    const latest = await productCloud.retrieveProduct(id)
    if (brandManufacturer.id !== latest.manufacturer_id) {
      await productCloud.createProductFieldChanges({
        product_id: id,
        product_version_id: working.id,
        seller_id: seller.id,
        actor_customer_id: actorId,
        field_code: "manufacturer_id",
        field_label: "Fabrikant / verantwoordelijke fabrikant",
        old_value: latest.manufacturer_id ?? null,
        new_value: brandManufacturer.id,
        status: "current",
        reason: body.reason ?? "merk_is_fabrikant",
      })
      await productCloud.updateProducts({
        id,
        manufacturer_id: brandManufacturer.id,
      })
    }
  }

  if (body.attributes?.length) {
    const existing = await productCloud.listAttributeValues({
      product_version_id: working.id,
    })
    const byDef = new Map(
      existing.map((v: { attribute_definition_id: string; value: string }) => [
        v.attribute_definition_id,
        v.value,
      ])
    )
    const defs = await productCloud.listAttributeDefinitions({})
    const defById = new Map(
      (defs as Array<{ id: string; name: string; code: string | null }>).map(
        (d) => [d.id, d]
      )
    )

    for (const row of body.attributes) {
      const oldVal = byDef.get(row.attribute_definition_id) ?? null
      if ((oldVal || "") === (row.value || "")) continue
      const def = defById.get(row.attribute_definition_id)
      await productCloud.createProductFieldChanges({
        product_id: id,
        product_version_id: working.id,
        seller_id: seller.id,
        actor_customer_id: actorId,
        field_code: def?.code || row.attribute_definition_id,
        field_label: def?.name || row.attribute_definition_id,
        old_value: oldVal,
        new_value: row.value,
        status: "current",
        reason: body.reason ?? null,
      })
    }

    await productCloud.setVersionAttributeValues({
      product_version_id: working.id,
      values: body.attributes,
    })
    categoryFactsChanged = true
  }

  if (categoryFactsChanged) {
    const { emitCategoryFactsChanged } = await import(
      "../../../../../../modules/cms/category-cms-proposal-events"
    )
    await emitCategoryFactsChanged(req.scope, { product_id: id })
  }

  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }

  const detail = await buildSellerProductManagerDetail(
    productCloud,
    commerce,
    id,
    seller.id,
    req.scope.resolve(PARTNER_MODULE) as PartnerModuleService,
    req.scope
  )
  res.json({ product: detail })
}
