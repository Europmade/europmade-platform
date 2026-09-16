import { existsSync } from "node:fs"
import type { Fase5bWorkbook } from "./excel-loader"
import { listRequiredCategoryIds } from "./category-map"
import type { CategoryMappingFile } from "./category-map"
import {
  FASE5B_LEGACY_SELLER_ID,
  FASE5B_SELECTIE_SELLER_ID,
} from "./constants"

export type DbPreflightSnapshot = {
  selectie_seller_exists: boolean
  legacy_seller_exists: boolean
  legacy_product_count: number
  category_ids_present: string[]
  conflicting_gtins: string[]
  conflicting_mpns: string[]
  conflicting_import_refs: string[]
}

export type PreflightIssue = {
  level: "error" | "warning"
  code: string
  message: string
}

export type PreflightReport = {
  ok: boolean
  issues: PreflightIssue[]
  counts: {
    products: number
    unique_em_ids: number
    duplicate_em_ids: number
    verified: number
    partially_verified: number
    pending: number
    rejected: number
    with_ean: number
    with_mpn_only: number
    import_ref_only: number
    selected_images: number
    missing_title: number
    missing_brand: number
    missing_category: number
  }
}

export function runPreflight(opts: {
  workbook: Fase5bWorkbook
  excelPath: string
  categoryMapping: CategoryMappingFile
  targetSellerId?: string
  db?: DbPreflightSnapshot | null
  sampleUnreachableUrls?: string[]
}): PreflightReport {
  const issues: PreflightIssue[] = []
  const targetSellerId = opts.targetSellerId ?? FASE5B_SELECTIE_SELLER_ID

  if (targetSellerId !== FASE5B_SELECTIE_SELLER_ID) {
    issues.push({
      level: "error",
      code: "WRONG_TARGET_SELLER",
      message: `Target seller moet ${FASE5B_SELECTIE_SELLER_ID} zijn, got ${targetSellerId}`,
    })
  }

  if (!existsSync(opts.excelPath)) {
    issues.push({
      level: "error",
      code: "EXCEL_MISSING",
      message: `Excelbestand niet gevonden: ${opts.excelPath}`,
    })
  }

  const products = opts.workbook.products
  const emIds = products.map((p) => p.em_product_id)
  const unique = new Set(emIds)
  const dupes = emIds.filter((id, i) => emIds.indexOf(id) !== i)

  if (products.length !== 599) {
    issues.push({
      level: "warning",
      code: "PRODUCT_COUNT",
      message: `Verwacht 599 producten, gevonden ${products.length}`,
    })
  }
  if (unique.size !== emIds.length) {
    issues.push({
      level: "error",
      code: "DUPLICATE_EM_IDS",
      message: `Dubbele EM-ID's: ${[...new Set(dupes)].join(", ")}`,
    })
  }

  let verified = 0
  let partially = 0
  let pending = 0
  let rejected = 0
  let withEan = 0
  let mpnOnly = 0
  let importRefOnly = 0
  let missingTitle = 0
  let missingBrand = 0
  let missingCategory = 0
  let selectedImages = 0

  for (const p of products) {
    const vs = p.verification_status.trim().toUpperCase()
    if (vs === "VERIFIED") verified += 1
    else if (vs === "PARTIALLY VERIFIED") partially += 1
    else if (vs === "PENDING") pending += 1
    else if (vs === "REJECTED") rejected += 1

    const ean = p.ean_gtin.replace(/\s/g, "")
    const mpn = p.mpn.trim()
    if (ean && (/^\d{8}$/.test(ean) || /^\d{12,14}$/.test(ean))) withEan += 1
    else if (mpn) mpnOnly += 1
    else importRefOnly += 1

    if (!p.productnaam.trim()) missingTitle += 1
    if (!p.merk.trim()) missingBrand += 1
    if (!p.claude_hoofdcategorie.trim()) missingCategory += 1

    selectedImages += opts.workbook.selectedImagesByEmId.get(p.em_product_id)?.length ?? 0
  }

  if (missingTitle) {
    issues.push({
      level: "error",
      code: "MISSING_TITLE",
      message: `${missingTitle} producten zonder titel`,
    })
  }
  if (missingBrand) {
    issues.push({
      level: "error",
      code: "MISSING_BRAND",
      message: `${missingBrand} producten zonder merk`,
    })
  }

  const requiredCats = listRequiredCategoryIds(opts.categoryMapping)
  if (opts.db) {
    if (!opts.db.selectie_seller_exists) {
      issues.push({
        level: "error",
        code: "SELECTIE_SELLER_MISSING",
        message: "Demo Selectie seller niet gevonden in database",
      })
    }
    if (!opts.db.legacy_seller_exists) {
      issues.push({
        level: "warning",
        code: "LEGACY_SELLER_MISSING",
        message: "Demo Legacy seller niet gevonden in database",
      })
    }
    const missingCatIds = requiredCats.filter(
      (id) => !opts.db!.category_ids_present.includes(id)
    )
    if (missingCatIds.length) {
      issues.push({
        level: "error",
        code: "CATEGORY_MISSING",
        message: `Categorie-ID's ontbreken in DB: ${missingCatIds.join(", ")}`,
      })
    }
    if (opts.db.conflicting_gtins.length) {
      issues.push({
        level: "error",
        code: "GTIN_CONFLICT",
        message: `${opts.db.conflicting_gtins.length} EAN-conflicten met bestaande producten`,
      })
    }
    if (opts.db.conflicting_import_refs.length) {
      issues.push({
        level: "warning",
        code: "IMPORT_REF_CONFLICT",
        message: `${opts.db.conflicting_import_refs.length} IMPORT_REF-conflicten`,
      })
    }
  }

  for (const url of opts.sampleUnreachableUrls ?? []) {
    issues.push({
      level: "warning",
      code: "UNREACHABLE_IMAGE_URL",
      message: `Onbereikbare afbeelding-URL (steekproef): ${url}`,
    })
  }

  const hasErrors = issues.some((i) => i.level === "error")
  return {
    ok: !hasErrors,
    issues,
    counts: {
      products: products.length,
      unique_em_ids: unique.size,
      duplicate_em_ids: dupes.length,
      verified,
      partially_verified: partially,
      pending,
      rejected,
      with_ean: withEan,
      with_mpn_only: mpnOnly,
      import_ref_only: importRefOnly,
      selected_images: selectedImages,
      missing_title: missingTitle,
      missing_brand: missingBrand,
      missing_category: missingCategory,
    },
  }
}

export function assertLegacyUntouched(db: DbPreflightSnapshot): void {
  if (db.legacy_product_count !== 232) {
    throw new Error(
      `Legacy product count verwacht 232, gevonden ${db.legacy_product_count}`
    )
  }
}

export function assertTargetSeller(sellerId: string): void {
  if (sellerId !== FASE5B_SELECTIE_SELLER_ID) {
    throw new Error(
      `STOP: target seller moet ${FASE5B_SELECTIE_SELLER_ID} zijn`
    )
  }
  if (sellerId === FASE5B_LEGACY_SELLER_ID) {
    throw new Error("STOP: Legacy seller mag niet als target worden gebruikt")
  }
}
