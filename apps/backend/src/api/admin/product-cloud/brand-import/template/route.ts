import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { loadAdminProductTemplateXlsx } from "../../../../../modules/product-cloud/admin-product-template-file"

/**
 * GET /admin/product-cloud/brand-import/template
 *
 * Serves the central Admin Product Cloud Excel template (English).
 * Central product data only — no Seller offers, prices, stock or SKUs.
 * Seller template asset is not used or modified.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const body = loadAdminProductTemplateXlsx()
  const name = "EuropMade Admin product template.xlsx"
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`)
  res.setHeader("X-EuropMade-Template-Locale", "en")
  res.setHeader("X-EuropMade-Template-Surface", "admin-product-cloud")
  res.status(200).send(body)
}
