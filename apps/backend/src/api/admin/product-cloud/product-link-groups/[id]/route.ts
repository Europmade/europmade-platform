import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"

type RouteParams = { id: string }

async function primaryImageForProduct(
  productCloud: ProductCloudModuleService,
  productId: string
): Promise<string | null> {
  try {
    const versions = (await productCloud.listProductVersions(
      { product_id: productId },
      { order: { version_number: "DESC" }, take: 8 }
    )) as Array<{ id: string; publication_status: string }>
    const preferred =
      versions.find((v) => v.publication_status === "Gepubliceerd") ||
      versions[0]
    if (!preferred) return null
    const media = (await productCloud.listProductMedias(
      { product_version_id: preferred.id },
      { order: { sort_order: "ASC" }, take: 5 }
    )) as Array<{ media_type?: string; storage_reference?: string }>
    const primary =
      media.find((m) => m.media_type === "Hoofdafbeelding") || media[0]
    return primary?.storage_reference ?? null
  } catch {
    return null
  }
}

/**
 * GET /admin/product-cloud/product-link-groups/:id
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params as RouteParams
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const product_link_group =
    await productCloud.retrieveSerializedProductLinkGroup(id)

  const members = await Promise.all(
    (product_link_group.members || []).map(async (member) => ({
      ...member,
      primary_image_url: await primaryImageForProduct(
        productCloud,
        member.product_id
      ),
    }))
  )

  res.json({
    product_link_group: {
      ...product_link_group,
      members,
    },
  })
}
