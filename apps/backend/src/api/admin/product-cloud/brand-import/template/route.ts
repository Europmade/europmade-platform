import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { buildBrandImportWorkbook } from "../../../../../modules/product-cloud/brand-import-template"

/** GET /admin/product-cloud/brand-import/template — Importtemplate + Uitleg. */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const body = buildBrandImportWorkbook()
  const name = "europmade-importbestand.xlsx"
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`)
  res.status(200).send(body)
}
