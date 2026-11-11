import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { buildProductImportTemplate } from "../../../../../modules/product-cloud/import-xlsx"
import { uniqueImportCategoryCatalog } from "../../../../../modules/product-cloud/import-category"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { loadSellerProductTemplateXlsx } from "../../../../../modules/product-cloud/seller-product-template-file"
import { resolveSellerTemplateLocale } from "../../../../../modules/product-cloud/import-template-i18n"
import { resolveApprovedSeller } from "../../resolve-seller"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import { filterCategoriesForSellerImportTemplate } from "../../../../../modules/product-cloud/import-category-excel"

/**
 * GET /store/product-cloud/import/template
 *
 * - format=xlsx (default): one central fully English Seller Excel template
 *   (cascading categories + automatic specs). Locale does not change XLSX
 *   content — backoffice language stays independent of the template language.
 * - format=csv: flat CSV; headers follow account/UI locale for convenience.
 * Import mapping stays locale-independent (English or NL labels → internal IDs).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  let sellerLocale: string | null = null
  try {
    const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
    const row = (await partner.retrieveSeller(seller.id)) as {
      locale?: string | null
    }
    sellerLocale = row.locale ?? null
  } catch {
    sellerLocale = null
  }
  const locale = resolveSellerTemplateLocale({
    queryLocale:
      typeof req.query.locale === "string" ? req.query.locale : null,
    sellerLocale,
  })
  const format = String(req.query.format || "xlsx").toLowerCase()

  if (format === "csv") {
    const productCloud = req.scope.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const categories = filterCategoriesForSellerImportTemplate(
      (await productCloud.listCategories(
        {},
        { take: 2000, order: { name: "ASC" } }
      )) as Array<{
        id: string
        name: string
        slug?: string | null
        parent_category_id?: string | null
      }>
    )
    const template = buildProductImportTemplate([], {
      categories: uniqueImportCategoryCatalog(categories),
      headerLocale: locale,
    })
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="EuropMade product import-${locale}.csv"`
    )
    res.setHeader("X-EuropMade-Template-Locale", locale)
    res.status(200).send(template.csv)
    return
  }

  const buf = loadSellerProductTemplateXlsx()
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="EuropMade product template.xlsx"`
  )
  res.setHeader("X-EuropMade-Template-Locale", "en")
  res.status(200).send(buf)
}
