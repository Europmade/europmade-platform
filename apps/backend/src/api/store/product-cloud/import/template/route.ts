import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  buildProductImportTemplate,
  buildXlsxWorkbook,
} from "../../../../../modules/product-cloud/import-xlsx"
import { uniqueImportCategoryCatalog } from "../../../../../modules/product-cloud/import-category"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { resolveApprovedSeller } from "../../resolve-seller"

/**
 * GET /store/product-cloud/import/template
 * XLSX (default) has sheets: Producten, Uitleg velden, Lijsten, Legenda.
 * General template: universal columns only — no category-specific fields.
 * EAN optional for Concept (same as seller wizard).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  await resolveApprovedSeller(req.scope, req.auth_context.actor_id)
  const format = String(req.query.format || "xlsx").toLowerCase()
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const categories = (await productCloud.listCategories(
    {},
    { take: 500, order: { name: "ASC" } }
  )) as Array<{ id: string; name: string; slug?: string | null }>
  const template = buildProductImportTemplate([], {
    categories: uniqueImportCategoryCatalog(categories),
  })
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="EuropMade product import.csv"'
    )
    res.status(200).send(template.csv)
    return
  }
  const buf = buildXlsxWorkbook(template.sheets)
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="EuropMade product template.xlsx"'
  )
  res.status(200).send(buf)
}
