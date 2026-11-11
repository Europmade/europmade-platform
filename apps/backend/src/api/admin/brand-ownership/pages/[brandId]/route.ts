import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import { AUDIT_MODULE } from "../../../../../modules/audit"
import type AuditModuleService from "../../../../../modules/audit/service"
import {
  applyDraftToLiveFields,
  liveBrandPageDraft,
  sanitizeBrandPageDraft,
} from "../../../../store/brands/brand-page-document"
import { persistBrandRecord } from "../../../../store/brands/brand-helpers"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { assertReviewNote } from "../../../../store/brands/ownership"

type RouteParams = { brandId: string }

async function loadBrand(partner: PartnerModuleService, id: string) {
  try {
    return await partner.retrieveBrand(id)
  } catch {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Merk niet gevonden.")
  }
}

/**
 * GET /admin/brand-ownership/pages/:brandId
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { brandId } = req.params as RouteParams
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const brand = await loadBrand(partner, brandId)
  const live = liveBrandPageDraft(brand)
  const draft = sanitizeBrandPageDraft(
    (brand as { page_draft?: unknown }).page_draft,
    live
  )
  res.status(200).json({
    brand,
    draft,
    live,
    page_review_status:
      (brand as { page_review_status?: string }).page_review_status ?? "draft",
    page_review_note:
      (brand as { page_review_note?: string | null }).page_review_note ?? null,
    submitted_by:
      (brand as { page_submitted_by_seller_id?: string | null })
        .page_submitted_by_seller_id ?? null,
  })
}

/**
 * POST /admin/brand-ownership/pages/:brandId
 * body: { action: approve|reject|request_info, note?: string }
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { brandId } = req.params as RouteParams
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const brand = await loadBrand(partner, brandId)
  const body = (req.body ?? {}) as {
    action?: string
    note?: string
    target_brand_id?: string
  }
  const actor = req.auth_context.actor_id ?? "admin"
  const live = liveBrandPageDraft(brand)
  const draft = sanitizeBrandPageDraft(
    (brand as { page_draft?: unknown }).page_draft,
    live
  )

  if (body.action === "merge") {
    const targetId = body.target_brand_id?.trim()
    if (!targetId || targetId === brandId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Kies een ander bestaand merk om naartoe te koppelen."
      )
    }
    const target = await loadBrand(partner, targetId)
    const targetName =
      (target as { name?: string }).name?.trim() || targetId
    const productCloud = req.scope.resolve(
      PRODUCT_CLOUD_MODULE
    ) as ProductCloudModuleService
    const products = (await productCloud.listProducts(
      { brand_id: brandId },
      { take: 200 }
    )) as Array<{ id: string }>
    for (const product of products) {
      await productCloud.updateProducts({
        id: product.id,
        brand_id: targetId,
      })
      await productCloud.createProductFieldChanges({
        product_id: product.id,
        product_version_id: null,
        seller_id: actor,
        actor_customer_id: actor,
        field_code: "brand_id",
        field_label: "Merk",
        old_value: brandId,
        new_value: targetId,
        status: "approved",
        reason: `Merk samenvoegen naar ${targetName}. Het importmerk blijft bestaan en is niet geverifieerd.`,
      })
    }
    const note =
      body.note?.trim() ||
      `Producten gekoppeld aan bestaand merk ${targetName}. Dit merkrecord is niet verwijderd en niet geverifieerd.`
    const updated = await persistBrandRecord(partner, brand, {
      page_review_status: "draft",
      page_review_note: note,
      public_page_status: "unpublished",
    })
    if (products.length) {
      const { emitCategoryFactsChanged } = await import(
        "../../../../../modules/cms/category-cms-proposal-events"
      )
      await emitCategoryFactsChanged(req.scope, {
        product_ids: products.map((product) => product.id),
      })
    }
    res.status(200).json({ brand: updated, moved_products: products.length })
    return
  }

  if (body.action === "approve") {
    const applied = applyDraftToLiveFields(draft)
    const updated = await persistBrandRecord(partner, brand, {
      ...applied,
      page_draft: draft,
      page_review_note: body.note?.trim() || "Merkpagina goedgekeurd",
      page_submitted_by_seller_id:
        (brand as { page_submitted_by_seller_id?: string | null })
          .page_submitted_by_seller_id ?? null,
    })
    try {
      const audit = req.scope.resolve(AUDIT_MODULE) as AuditModuleService
      await audit.append({
        actor_customer_id: actor,
        entity_type: "brand_page_review",
        entity_id: brandId,
        action_type: "brand_page_approved",
        reason: body.note?.trim() || "Merkpagina goedgekeurd",
      })
    } catch {
      /* optional */
    }
    const { emitCategoryFactsChanged } = await import(
      "../../../../../modules/cms/category-cms-proposal-events"
    )
    await emitCategoryFactsChanged(req.scope, { brand_id: brandId })
    res.status(200).json({ brand: updated })
    return
  }

  if (body.action === "reject") {
    const note = assertReviewNote(body.note, "Afwijzingsreden")
    const updated = await persistBrandRecord(partner, brand, {
      page_review_status: "draft",
      page_review_note: note,
      public_page_status:
        (brand as { public_page_status?: string }).public_page_status ===
        "published"
          ? "published"
          : "unpublished",
    })
    try {
      const audit = req.scope.resolve(AUDIT_MODULE) as AuditModuleService
      await audit.append({
        actor_customer_id: actor,
        entity_type: "brand_page_review",
        entity_id: brandId,
        action_type: "brand_page_rejected",
        reason: note,
      })
    } catch {
      /* optional */
    }
    res.status(200).json({ brand: updated })
    return
  }

  if (body.action === "request_info") {
    const note = assertReviewNote(body.note, "Verzoek om aanvullende informatie")
    const updated = await persistBrandRecord(partner, brand, {
      page_review_status: "info_requested",
      page_review_note: note,
    })
    try {
      const audit = req.scope.resolve(AUDIT_MODULE) as AuditModuleService
      await audit.append({
        actor_customer_id: actor,
        entity_type: "brand_page_review",
        entity_id: brandId,
        action_type: "brand_page_info_requested",
        reason: note,
      })
    } catch {
      /* optional */
    }
    res.status(200).json({ brand: updated })
    return
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "action moet approve, reject, request_info of merge zijn."
  )
}
