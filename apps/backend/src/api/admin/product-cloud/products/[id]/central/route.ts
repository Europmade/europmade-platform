import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { MedusaContainer } from "@medusajs/framework/types"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../modules/product-cloud/service"
import { PARTNER_MODULE } from "../../../../../../modules/partner"
import type PartnerModuleService from "../../../../../../modules/partner/service"
import { VERIFICATION_MODULE } from "../../../../../../modules/verification"
import type VerificationModuleService from "../../../../../../modules/verification/service"
import { ingestRemoteAsset } from "../../../../../../modules/product-cloud/brand-import-media"
import {
  applyAdminCentralSection,
  CentralSectionError,
  type AdminCentralDeps,
} from "../../../../../../modules/product-cloud/admin-central-section"

type RouteParams = { id: string }

function ingest(container: MedusaContainer) {
  return async (url: string, role: "image" | "document") => {
    const stored = await ingestRemoteAsset({
      url,
      role,
      upload: async (file) => {
        const { result } = await uploadFilesWorkflow(container).run({
          input: { files: [{ ...file, access: "public" }] },
        })
        const uploaded = result?.[0] as { id?: string; url?: string } | undefined
        return uploaded?.url || uploaded?.id || ""
      },
    })
    return stored.storage_reference
  }
}

/**
 * POST /admin/product-cloud/products/:id/central
 * Saves one central section. Does not approve, publish, or change offers.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const verification = req.scope.resolve(VERIFICATION_MODULE) as VerificationModuleService
  const deps: AdminCentralDeps = {
    retrieveProduct: (productId: string) => productCloud.retrieveProduct(productId),
    retrieveBrand: (brandId: string) => partner.retrieveBrand(brandId),
    retrieveManufacturer: (manufacturerId: string) => partner.retrieveManufacturer(manufacturerId),
    listManufacturers: async () => {
      const rows = (await partner.listManufacturers({}, { take: 500 })) as Array<{
        id: string
        name?: string | null
      }>
      return rows.map((row) => ({ id: row.id, name: row.name || "" }))
    },
    listProductVersions: (q: { product_id: string }) => productCloud.listProductVersions(q),
    updateProductVersions: (row: { id: string; title: string; description: string }) =>
      productCloud.updateProductVersions(row),
    updateProducts: (row: { id: string; brand_id: string; manufacturer_id: string }) =>
      productCloud.updateProducts(row),
    listProductVariants: (q: { product_id: string }) => productCloud.listProductVariants(q),
    updateProductVariants: (row: Parameters<AdminCentralDeps["updateProductVariants"]>[0]) =>
      productCloud.updateProductVariants(row),
    listIdentifiers: (q: Record<string, unknown>, opts?: { take?: number }) =>
      productCloud.listIdentifiers(q, opts),
    updateIdentifiers: (row: { id: string; identifier_value: string }) =>
      productCloud.updateIdentifiers(row),
    createIdentifiers: (row: {
      product_variant_id: string
      identifier_type: "GTIN" | "MPN"
      identifier_value: string
      country_scope: null
    }) => productCloud.createIdentifiers(row),
    retrieveProductVariant: (variantId: string) => productCloud.retrieveProductVariant(variantId),
    listProductCategories: (q: { product_id: string }) => productCloud.listProductCategories(q),
    listCategories: (q: { id: string[] }) => productCloud.listCategories(q),
    createProductCategories: (row: { product_id: string; category_id: string }) =>
      productCloud.createProductCategories(row),
    deleteProductCategories: (linkId: string) => productCloud.deleteProductCategories(linkId),
    listAttributeDefinitions: (q: { category_id: string }) =>
      productCloud.listAttributeDefinitions(q),
    setVersionAttributeValues: (input: {
      product_version_id: string
      values: Array<{ attribute_definition_id: string; value: string }>
    }) => productCloud.setVersionAttributeValues(input),
    listProductMedias: (q: { product_version_id: string }) => productCloud.listProductMedias(q),
    createProductMedias: (row: {
      product_version_id: string
      media_type: "Hoofdafbeelding" | "Overige afbeelding" | "Video"
      storage_reference: string
      sort_order: number
    }) => productCloud.createProductMedias(row),
    updateProductMedias: (row: Parameters<AdminCentralDeps["updateProductMedias"]>[0]) =>
      productCloud.updateProductMedias(row),
    deleteProductMedias: (mediaId: string) => productCloud.deleteProductMedias(mediaId),
    listProductDocuments: (q: { product_version_id: string }) =>
      productCloud.listProductDocuments(q),
    createProductDocuments: (row: {
      product_version_id: string
      document_type:
        | "CE-certificaat"
        | "Overig compliance-document"
        | "Autorisatiebewijs"
        | "Handleiding"
        | "Veiligheidsinformatieblad"
        | "Garantiebewijs"
        | "Conformiteitsverklaring"
      storage_reference: string
    }) => productCloud.createProductDocuments(row),
    updateProductDocuments: (row: Parameters<AdminCentralDeps["updateProductDocuments"]>[0]) =>
      productCloud.updateProductDocuments(row),
    deleteProductDocuments: (documentId: string) => productCloud.deleteProductDocuments(documentId),
    listProductTranslations: (q: { entity_type: "product_version"; entity_id: string }) =>
      productCloud.listProductTranslations(q),
    upsertTranslation: (row: Parameters<AdminCentralDeps["upsertTranslation"]>[0]) =>
      productCloud.upsertTranslation(row),
    listProductOrigins: (q: { product_version_id: string }) =>
      verification.listProductOrigins(q) as Promise<
        Array<{
          id: string
          production_country?: string | null
          production_location?: string | null
          status?: string | null
        }>
      >,
    updateProductOrigins: (row: {
      id: string
      production_country: string
      production_location: string
    }) => verification.updateProductOrigins(row),
    createProductOrigins: (row: {
      product_version_id: string
      manufacturer_id: string
      brand_id: string
      seller_id: string
      production_country: string
      production_location: string
      status: "Niet aangevraagd"
    }) => verification.createProductOrigins(row),
    createProductOriginEvidences: (
      row: Parameters<AdminCentralDeps["createProductOriginEvidences"]>[0]
    ) => verification.createProductOriginEvidences(row),
    ingest: ingest(req.scope),
  }
  try {
    const result = await applyAdminCentralSection(
      deps,
      id,
      (req.body || {}) as Record<string, unknown>,
      req.auth_context?.actor_id || "admin"
    )
    res.json({ saved: true, ...result })
  } catch (err) {
    if (err instanceof CentralSectionError) {
      res.status(400).json({ message: err.message, field: err.field })
      return
    }
    throw err
  }
}
