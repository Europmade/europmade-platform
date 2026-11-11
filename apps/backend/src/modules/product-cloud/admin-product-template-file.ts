import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

/**
 * Absolute path to the approved Admin Product Cloud Excel template.
 * Central product data only — no Seller commerce columns.
 */
export function resolveAdminProductTemplatePath(): string {
  const fileName = "admin-product-template.xlsx"
  const candidates = [
    path.join(__dirname, "assets", fileName),
    path.join(process.cwd(), "src/modules/product-cloud/assets", fileName),
    path.join(
      process.cwd(),
      "apps/backend/src/modules/product-cloud/assets",
      fileName
    ),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error(
    `Admin product template not found. Expected assets/${fileName} under product-cloud.`
  )
}

export function loadAdminProductTemplateXlsx(): Buffer {
  return readFileSync(resolveAdminProductTemplatePath())
}
