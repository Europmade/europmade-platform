import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CMS_MODULE } from "../modules/cms"
import type CmsModuleService from "../modules/cms/service"
import { cmsProposalRepository } from "../modules/cms/category-cms-proposal-db"
import {
  CATEGORY_FACTS_CHANGED,
  categorySlugsForBrand,
  categorySlugsForProduct,
  handleCategoryFactsChanged,
  type CategoryFactsChangedData,
} from "../modules/cms/category-cms-proposal-events"
import { PRODUCT_CLOUD_MODULE } from "../modules/product-cloud"
import type ProductCloudModuleService from "../modules/product-cloud/service"
import {
  buildCategoryFactPackages,
  loadCategoryFactSource,
  type CategoryFactPackage,
  type CategoryFactSource,
} from "../modules/product-cloud/category-fact-package"

/**
 * Product Cloud changes can mark stored proposals outdated.
 * This subscriber does not generate, does not call a provider,
 * and does not write draft or published documents.
 */
export default async function categoryCmsProposalsOutdated({
  event,
  container,
}: SubscriberArgs<CategoryFactsChangedData>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productIds = [
    ...(event.data?.product_id ? [event.data.product_id] : []),
    ...(event.data?.product_ids ?? []),
  ]
    .map((id) => id.trim())
    .filter(Boolean)
  const brandId = event.data?.brand_id?.trim() || ""
  if (!productIds.length && !brandId) return
  const productId = productIds[0] || brandId
  try {
    const productCloud = container.resolve(PRODUCT_CLOUD_MODULE) as ProductCloudModuleService
    const cms = container.resolve(CMS_MODULE) as CmsModuleService
    let loaded: { source: CategoryFactSource; packages: CategoryFactPackage[] } | null = null
    const facts = async () => {
      if (loaded) return loaded
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
      loaded = { source, packages: buildCategoryFactPackages(source) }
      return loaded
    }
    const result = await handleCategoryFactsChanged({
      productIds,
      brandId: brandId || undefined,
      repo: cmsProposalRepository(cms),
      slugsForProduct: async (id) => {
        const { source } = await facts()
        return categorySlugsForProduct({
          productId: id,
          links: source.links,
          categories: source.categories,
        })
      },
      slugsForBrand: async (id) => {
        const { source } = await facts()
        return categorySlugsForBrand({
          brandId: id,
          products: source.products,
          links: source.links,
          categories: source.categories,
        })
      },
      fingerprintFor: async (slug) => {
        const { packages } = await facts()
        return packages.find((row) => row.slug === slug)?.fingerprint ?? null
      },
    })
    if (result.updated > 0) {
      logger.info(
        `[category-cms] outdated proposals=${result.updated} product=${productId}`
      )
    }
  } catch (err) {
    logger.warn(
      `[category-cms] outdated signal failed product=${productId}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: [CATEGORY_FACTS_CHANGED],
}
