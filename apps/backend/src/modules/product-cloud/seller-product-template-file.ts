import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

/**
 * Absolute path to the approved Seller Excel product template (definitief).
 * Prefer the versioned asset under this module; fall back to monorepo layouts.
 */
export function resolveSellerProductTemplatePath(): string {
  const fileName = "seller-product-template.xlsx"
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
    `Seller product template not found. Expected assets/${fileName} under product-cloud.`
  )
}

export function loadSellerProductTemplateXlsx(): Buffer {
  return readFileSync(resolveSellerProductTemplatePath())
}
