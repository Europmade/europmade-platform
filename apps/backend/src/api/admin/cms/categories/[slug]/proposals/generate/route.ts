import type { MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../../../modules/cms"
import type CmsModuleService from "../../../../../../../modules/cms/service"
import { cmsProposalRepository } from "../../../../../../../modules/cms/category-cms-proposal-db"
import { storeCategoryCmsProposals } from "../../../../../../../modules/cms/category-cms-proposal-store"
import { PRODUCT_CLOUD_MODULE } from "../../../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../../../modules/product-cloud/service"
import {
  buildCategoryFactPackages,
  loadCategoryFactSource,
} from "../../../../../../../modules/product-cloud/category-fact-package"
import { slugOf, type CatSlugReq } from "../../../category-pd-http"

/** POST /admin/cms/categories/:slug/proposals/generate  Body: { explicit: true } */
export async function POST(req: CatSlugReq, res: MedusaResponse) {
  const body = (req.body ?? {}) as { explicit?: unknown }
  if (body.explicit !== true) {
    res.status(400).json({
      type: "explicit_required",
      message: "Genereren gebeurt alleen met explicit: true. Een fingerprintwijziging genereert niets.",
    })
    return
  }
  const slug = slugOf(req)
  const productCloud = req.scope.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
  const source = await loadCategoryFactSource({
    listCategories: (filters, config) => productCloud.listCategories(filters, config),
    listProducts: (filters, config) => productCloud.listProducts(filters, config),
    listProductVersions: (filters, config) => productCloud.listProductVersions(filters, config),
    listProductCategories: (filters, config) => productCloud.listProductCategories(filters, config),
    listAttributeDefinitions: (filters, config) => productCloud.listAttributeDefinitions(filters, config),
    listAttributeValues: (filters, config) => productCloud.listAttributeValues(filters, config),
    listProductRelations: (filters, config) => productCloud.listProductRelations(filters, config),
    listBrands: (filters, config) => productCloud.listBrands(filters, config),
    listProductionFacilities: (filters, config) => productCloud.listProductionFacilities(filters, config),
    listProductOrigins: (filters, config) => productCloud.listProductOrigins(filters, config),
    listProductOriginEvidences: (filters, config) =>
      productCloud.listProductOriginEvidences(filters, config),
  })
  const pkg = buildCategoryFactPackages(source).find((row) => row.slug === slug)
  if (!pkg) {
    res.status(404).json({ type: "category_not_found", message: "Geen feitenpakket voor deze categorie." })
    return
  }
  const cms = req.scope.resolve(CMS_MODULE) as CmsModuleService
  const stored = await storeCategoryCmsProposals(cmsProposalRepository(cms), pkg, { explicit: true })
  res.status(200).json(stored)
}
