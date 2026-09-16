import type { CategoryMappingFile } from "./category-map"
import type { Fase5bWorkbook } from "./excel-loader"
import { runDryRun } from "./dry-run"

export type UatPreflightRow = {
  em_product_id: string
  productnaam: string
  merk: string
  ean_gtin: string
  mpn: string
  verification_status: string
  productstatus: string
  hoofdcategorie: string
  subcategorie: string
  category_id: string
  category_name: string
  category_reason: string
  selected_images: number
  valid_images: number
  has_content: boolean
  has_specs: boolean
  identifier_type: string | null
  identifier_value: string | null
  importable: boolean
  skip_reason?: string
}

export type UatCommitProductResult = {
  em_product_id: string
  product_cloud_id: string | null
  identifier_type: string | null
  identifier_value: string | null
  category_id: string
  category_name: string
  verification_status: string
  import_status: "created" | "skipped" | "failed"
  publication_status: string
  media_status: string
  offer_status: string
  images_selected: number
  images_uploaded: number
  media_errors: string[]
  error: string | null
  error_detail?: string
  timestamp: string
}

export type UatCommitReport = {
  preflight_rows: UatPreflightRow[]
  preflight_passed: number
  products: UatCommitProductResult[]
  legacy_product_count_before: number
  legacy_product_count_after: number
}

export function buildUatPreflightRows(opts: {
  workbook: Fase5bWorkbook
  categoryMapping: CategoryMappingFile
  emFilter: string[]
}): UatPreflightRow[] {
  const dry = runDryRun({
    workbook: opts.workbook,
    categoryMapping: opts.categoryMapping,
    emFilter: opts.emFilter,
  })
  const byEm = new Map(dry.products.map((p) => [p.em_product_id, p]))
  const rows: UatPreflightRow[] = []

  for (const emId of opts.emFilter) {
    const row = opts.workbook.products.find((p) => p.em_product_id === emId)
    const plan = byEm.get(emId)
    if (!row || !plan) {
      rows.push({
        em_product_id: emId,
        productnaam: "",
        merk: "",
        ean_gtin: "",
        mpn: "",
        verification_status: "",
        productstatus: "",
        hoofdcategorie: "",
        subcategorie: "",
        category_id: "",
        category_name: "",
        category_reason: "",
        selected_images: 0,
        valid_images: 0,
        has_content: false,
        has_specs: false,
        identifier_type: null,
        identifier_value: null,
        importable: false,
        skip_reason: "EM-ID niet gevonden in workbook",
      })
      continue
    }

    const content = opts.workbook.contentByEmId.get(emId)
    rows.push({
      em_product_id: emId,
      productnaam: row.productnaam,
      merk: row.merk,
      ean_gtin: row.ean_gtin,
      mpn: row.mpn,
      verification_status: row.verification_status,
      productstatus: row.productstatus,
      hoofdcategorie: row.claude_hoofdcategorie,
      subcategorie: row.subcategorie,
      category_id: plan.category_id,
      category_name: plan.category_name,
      category_reason: plan.category_reason,
      selected_images: plan.selected_media_count,
      valid_images: plan.valid_media_count,
      has_content: plan.has_rich_content,
      has_specs: Boolean(content?.specificaties.trim()),
      identifier_type: plan.identifier_type,
      identifier_value: plan.identifier_value,
      importable: plan.action === "create",
      skip_reason: plan.skip_reason,
    })
  }

  return rows
}
