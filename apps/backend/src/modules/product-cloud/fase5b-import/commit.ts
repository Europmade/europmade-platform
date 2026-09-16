import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import type ProductCloudModuleService from "../service"
import type PartnerModuleService from "../../partner/service"
import { createProductCloudWorkflow } from "../../../workflows/product-cloud"
import { publishVersionWorkflow } from "../../../workflows/product-cloud"
import { upsertOfferWorkflow } from "../../../workflows/commerce-cloud"
import { persistImportProductionOrigin } from "../../../api/store/product-cloud/production-origin-import"
import { persistBrandRecord } from "../../../api/store/brands/brand-helpers"
import { slugifyCatalogEntityName } from "../../../api/store/catalog/catalog-helpers"
import type { CategoryMappingFile } from "./category-map"
import { resolveCategoryMapping } from "./category-map"
import { buildProductDescription } from "./content-builder"
import type { Fase5bWorkbook } from "./excel-loader"
import { resolveFase5bIdentifier } from "./identifier-resolve"
import {
  formatWorkflowError,
  workflowErrorMessage,
} from "./workflow-error"
import {
  FASE5B_SELECTIE_SELLER_ID,
  FASE5B_UAT_DEMO_PRICE_EUR,
  FASE5B_UAT_DEMO_REGION,
  FASE5B_UAT_DEMO_STOCK,
} from "./constants"
import { assertTargetSeller } from "./preflight"
import { buildMediaPlan, executeMediaUploadPlan } from "./media-plan"
import { runDryRun } from "./dry-run"
import {
  buildUatPreflightRows,
  type UatCommitProductResult,
  type UatCommitReport,
} from "./uat-preflight"

const PRODUCT_CLOUD_MODULE = "productCloud"
const PARTNER_MODULE = "partner"

function isPendingProductionCountry(value: string | null | undefined): boolean {
  const v = (value || "").trim().toUpperCase()
  return !v || v === "PENDING"
}

async function resolveBrandIds(
  container: MedusaContainer,
  seller: {
    id: string
    company_id?: string | null
  },
  brandName: string,
  manufacturerName: string
): Promise<{ brand_id: string; manufacturer_id: string }> {
  const partner = container.resolve(PARTNER_MODULE) as PartnerModuleService
  const normalizedBrand = brandName.trim()
  const normalizedManufacturer = manufacturerName.trim() || normalizedBrand

  const brands = (await partner.listBrands({}, { take: 500 })) as Array<{
    id: string
    name?: string | null
  }>

  let brand =
    brands.find(
      (b) => (b.name || "").trim().toLowerCase() === normalizedBrand.toLowerCase()
    ) ?? null

  if (!brand) {
    const slug = slugifyCatalogEntityName(normalizedBrand)
    const created = await persistBrandRecord(
      partner,
      { id: `brand_${slug}`, name: normalizedBrand, slug },
      {
        created_by_seller_id: seller.id,
        owner_company_id: seller.company_id,
        public_page_status: "unpublished",
      }
    )
    brand = {
      id: (created as { id: string }).id,
      name: normalizedBrand,
    }
  }

  const manufacturers = (await partner.listManufacturers(
    {},
    { take: 500 }
  )) as Array<{ id: string; name?: string | null }>
  let manufacturer =
    manufacturers.find(
      (m) =>
        (m.name || "").trim().toLowerCase() ===
        normalizedManufacturer.toLowerCase()
    ) ?? null

  if (!manufacturer) {
    const slug = slugifyCatalogEntityName(normalizedManufacturer)
    try {
      const created = await partner.createManufacturers([
        {
          id: `mfr_${slug}`,
          name: normalizedManufacturer,
          represented_by_company_id: seller.company_id ?? undefined,
        },
      ])
      manufacturer = Array.isArray(created) ? created[0] : created
    } catch {
      manufacturer = { id: brand.id, name: normalizedManufacturer }
    }
  }

  return {
    brand_id: brand.id,
    manufacturer_id: manufacturer.id,
  }
}

export async function runUatImportCommit(opts: {
  container: MedusaContainer
  workbook: Fase5bWorkbook
  categoryMapping: CategoryMappingFile
  emFilter: string[]
  sellerId?: string
}): Promise<UatCommitReport> {
  const sellerId = opts.sellerId ?? FASE5B_SELECTIE_SELLER_ID
  assertTargetSeller(sellerId)

  const partner = opts.container.resolve(PARTNER_MODULE) as PartnerModuleService
  const productCloud = opts.container.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  const seller = await partner.retrieveSeller(sellerId, {
    relations: ["company"],
  })
  if (seller.id !== FASE5B_SELECTIE_SELLER_ID) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Verkeerde target seller: ${seller.id}`
    )
  }

  const legacyCountBefore = (
    await productCloud.listProducts({
      current_owner_seller_id: "sell_01M1BJCEPC81BKC9FQJCX1Q9P1",
    })
  ).length

  const preflightRows = buildUatPreflightRows({
    workbook: opts.workbook,
    categoryMapping: opts.categoryMapping,
    emFilter: opts.emFilter,
  })

  const dry = runDryRun({
    workbook: opts.workbook,
    categoryMapping: opts.categoryMapping,
    emFilter: opts.emFilter,
    sellerId,
  })
  const planByEm = new Map(dry.products.map((p) => [p.em_product_id, p]))

  const results: UatCommitProductResult[] = []
  const now = () => new Date().toISOString()

  for (const emId of opts.emFilter) {
    const plan = planByEm.get(emId)
    const row = opts.workbook.products.find((p) => p.em_product_id === emId)

    if (!plan || !row || plan.action !== "create") {
      results.push({
        em_product_id: emId,
        product_cloud_id: null,
        identifier_type: plan?.identifier_type ?? null,
        identifier_value: plan?.identifier_value ?? null,
        category_id: plan?.category_id ?? "",
        category_name: plan?.category_name ?? "",
        verification_status:
          plan?.verification_status ?? row?.verification_status ?? "",
        import_status: "skipped",
        publication_status: "Concept",
        media_status: "pending",
        offer_status: "none",
        images_selected: plan?.selected_media_count ?? 0,
        images_uploaded: 0,
        media_errors: [],
        error: plan?.skip_reason ?? "Niet importeerbaar volgens preflight",
        timestamp: now(),
      })
      continue
    }

    try {
      const identifier = resolveFase5bIdentifier({
        em_product_id: row.em_product_id,
        ean_gtin: row.ean_gtin,
        mpn: row.mpn,
      })

      const conflicts = await productCloud.listIdentifiers({
        identifier_type: identifier.identifier_type,
        identifier_value: identifier.identifier_value,
      })
      if (conflicts.length > 0) {
        throw new Error(
          `Identifier-conflict: ${identifier.identifier_type}=${identifier.identifier_value}`
        )
      }

      const { brand_id, manufacturer_id } = await resolveBrandIds(
        opts.container,
        { id: seller.id, company_id: seller.company_id },
        row.merk,
        row.fabrikant || row.merk
      )

      const content = opts.workbook.contentByEmId.get(emId)
      const description = buildProductDescription(content, row.productnaam)
      const category = resolveCategoryMapping(
        opts.categoryMapping,
        row.claude_hoofdcategorie,
        row.subcategorie
      )

      const workflowOutcome = await createProductCloudWorkflow(
        opts.container
      ).run({
        input: {
          seller_id: seller.id,
          is_retailer: seller.is_retailer,
          is_producer_or_brand_owner: seller.is_producer_or_brand_owner,
          brand_id,
          manufacturer_id,
          title: row.productnaam,
          description,
          category_name: category.category_name,
          identifier_type: identifier.identifier_type,
          identifier_value: identifier.identifier_value,
          country_scope: identifier.country_scope,
        },
      })

      if (workflowOutcome.errors?.length) {
        const workflowErr =
          workflowOutcome.errors.length === 1
            ? workflowOutcome.errors[0]
            : workflowOutcome.errors
        console.error(
          `[fase5b-import] createProductCloudWorkflow failed em=${emId}:`,
          formatWorkflowError(workflowErr)
        )
        throw workflowErr
      }

      const created = workflowOutcome.result

      if (!created.created || !created.product_id || !created.version_id) {
        throw new Error(
          created.exact_match_existing
            ? "Exacte identifier-match — product bestaat al"
            : "Productcreatie mislukt"
        )
      }

      const productId = created.product_id
      const versionId = created.version_id

      const links = await productCloud.listProductCategories({
        product_id: productId,
      })
      if (!links.some((l) => l.category_id === category.category_id)) {
        await productCloud.createProductCategories({
          product_id: productId,
          category_id: category.category_id,
        })
      }

      if (!isPendingProductionCountry(row.productieland) && versionId) {
        await persistImportProductionOrigin({
          scope: opts.container,
          product_version_id: versionId,
          brand_id,
          manufacturer_id,
          seller_id: seller.id,
          production_country: row.productieland.trim(),
          production_location: row.productieplaats.trim() || undefined,
        })
      }

      const images = opts.workbook.selectedImagesByEmId.get(emId) || []
      const mediaPlan = buildMediaPlan(emId, images)
      const mediaResults = await executeMediaUploadPlan({
        product_id: productId,
        version_id: versionId,
        seller_id: seller.id,
        items: mediaPlan.items,
        container: opts.container,
      })

      const uploaded = mediaResults.filter((m) => m.status === "uploaded")
      const mediaErrors = mediaResults
        .filter((m) => m.status === "failed")
        .map((m) => `${m.source_url}: ${m.error}`)

      let publicationStatus = "Concept"
      if (uploaded.some((m) => m.media_type === "Hoofdafbeelding")) {
        await publishVersionWorkflow(opts.container).run({
          input: {
            product_id: productId,
            version_id: versionId,
            seller_id: seller.id,
          },
        })
        publicationStatus = "Gepubliceerd"
      }

      let offerStatus = "none"
      if (created.identifier_id && publicationStatus === "Gepubliceerd") {
        await upsertOfferWorkflow(opts.container).run({
          input: {
            seller_id: seller.id,
            identifier_id: created.identifier_id,
            region_code: FASE5B_UAT_DEMO_REGION,
            quantity_available: FASE5B_UAT_DEMO_STOCK,
            base_price: FASE5B_UAT_DEMO_PRICE_EUR,
            shipping_cost: 5.95,
            vat_rate: 0.21,
            seller_sku: emId,
            sales_status: "active",
            delivery_days_max: 3,
          },
        })
        offerStatus = "active_uat_demo"
      }

      results.push({
        em_product_id: emId,
        product_cloud_id: productId,
        identifier_type: identifier.identifier_type,
        identifier_value: identifier.identifier_value,
        category_id: category.category_id,
        category_name: category.category_name,
        verification_status: row.verification_status,
        import_status: "created",
        publication_status: publicationStatus,
        media_status:
          uploaded.length > 0
            ? mediaErrors.length > 0
              ? "partial"
              : "uploaded"
            : mediaErrors.length > 0
              ? "failed"
              : "none",
        offer_status: offerStatus,
        images_selected: mediaPlan.selected_count,
        images_uploaded: uploaded.length,
        media_errors: mediaErrors,
        error: mediaErrors.length ? mediaErrors.join("; ") : null,
        timestamp: now(),
      })
    } catch (err) {
      const errorDetail = formatWorkflowError(err)
      console.error(`[fase5b-import] commit failed em=${emId}:`, errorDetail)
      results.push({
        em_product_id: emId,
        product_cloud_id: null,
        identifier_type: plan.identifier_type,
        identifier_value: plan.identifier_value,
        category_id: plan.category_id,
        category_name: plan.category_name,
        verification_status: row.verification_status,
        import_status: "failed",
        publication_status: "Concept",
        media_status: "failed",
        offer_status: "none",
        images_selected: plan.selected_media_count,
        images_uploaded: 0,
        media_errors: [],
        error: workflowErrorMessage(err),
        error_detail: errorDetail,
        timestamp: now(),
      })
    }
  }

  const legacyCountAfter = (
    await productCloud.listProducts({
      current_owner_seller_id: "sell_01M1BJCEPC81BKC9FQJCX1Q9P1",
    })
  ).length

  return {
    preflight_rows: preflightRows,
    preflight_passed: preflightRows.filter((r) => r.importable).length,
    products: results,
    legacy_product_count_before: legacyCountBefore,
    legacy_product_count_after: legacyCountAfter,
  }
}

export { buildUatPreflightRows } from "./uat-preflight"
export type {
  UatPreflightRow,
  UatCommitProductResult,
  UatCommitReport,
} from "./uat-preflight"
