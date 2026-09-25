import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { PRODUCT_CLOUD_MODULE } from "../../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../../modules/commerce-cloud/service"
import { PARTNER_MODULE } from "../../../../../modules/partner"
import type PartnerModuleService from "../../../../../modules/partner/service"
import {
  formatProductManagerLabel,
  isRealBrandId,
  normalizeProductManagerKind,
  resolveOfferSellerIdsForProduct,
} from "../../../../../modules/product-cloud/catalog-edit-auth"
import {
  buildProductManagerSnapshot,
} from "../../../../../modules/product-cloud/product-manager-assignment"
import {
  evaluateBulkProductManagerChoice,
  formatCurrentManagerDisplay,
  intersectBulkPmCandidates,
  type BulkPmCandidate,
  type BulkPmProductContext,
} from "../../../../../modules/product-cloud/bulk-product-manager"
import {
  approvedOwnerClaim,
  brandOwnerCompanyId,
  type BrandPublicRow,
} from "../../../../store/brands/ownership"

const BodySchema = z.object({
  product_ids: z.array(z.string().trim().min(1)).min(1).max(200),
  /** Preview shared candidates + current managers (no kind required). */
  preview_only: z.boolean().optional(),
  /** Validate choice without writing. Required together with kind for confirm step. */
  dry_run: z.boolean().optional(),
  kind: z.enum(["seller", "brand_owner", "none"]).optional(),
  seller_id: z.string().trim().min(1).nullable().optional(),
  transfer_reason: z.string().trim().max(2000).nullable().optional(),
})

async function resolveSellerDisplayName(
  partner: PartnerModuleService,
  sellerId: string
): Promise<string> {
  try {
    const seller = await partner.retrieveSeller(sellerId, {
      relations: ["company"],
    })
    const company = seller.company as { legal_name?: string } | undefined
    return company?.legal_name?.trim() || sellerId
  } catch {
    return sellerId
  }
}

async function buildProductContexts(
  req: AuthenticatedMedusaRequest,
  productIds: string[]
): Promise<BulkPmProductContext[]> {
  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }

  const contexts: BulkPmProductContext[] = []

  for (const productId of productIds) {
    const product = await productCloud.retrieveProduct(productId)
    const kind = normalizeProductManagerKind(
      (product as { product_manager_kind?: string }).product_manager_kind
    )
    const managerSellerId =
      (product as { product_manager_seller_id?: string | null })
        .product_manager_seller_id || null

    const offerSellerIds = await resolveOfferSellerIdsForProduct(
      productCloud,
      commerce,
      productId
    )

    const offer_sellers: Array<{ seller_id: string; label: string }> = []
    for (const sid of offerSellerIds) {
      offer_sellers.push({
        seller_id: sid,
        label: await resolveSellerDisplayName(partner, sid),
      })
    }

    let brand_id: string | null = isRealBrandId(product.brand_id)
      ? product.brand_id
      : null
    let brand_name: string | null = null
    let brand_owner: {
      seller_id: string | null
      label: string
    } | null = null
    let brandOwnerAvailable = false

    if (brand_id) {
      try {
        const brand = (await partner.retrieveBrand(brand_id)) as BrandPublicRow & {
          id: string
          name?: string
        }
        brand_name = brand.name?.trim() || brand_id
        const claim = await approvedOwnerClaim(partner, brand_id)
        if (claim) {
          brandOwnerAvailable = true
          const ownerLabel = claim.seller_id
            ? await resolveSellerDisplayName(partner, claim.seller_id)
            : brandOwnerCompanyId(brand) || "Merkeigenaar"
          brand_owner = {
            seller_id: claim.seller_id || null,
            label: ownerLabel,
          }
        }
      } catch {
        brand_name = brand_id
      }
    }

    const managerSellerName =
      kind === "seller" && managerSellerId
        ? await resolveSellerDisplayName(partner, managerSellerId)
        : null

    const currentSnap = buildProductManagerSnapshot({
      kind,
      seller_id: managerSellerId,
      seller_name: managerSellerName,
      brand_id,
      brand_name:
        kind === "brand_owner"
          ? brand_owner
            ? `${brand_name || brand_id} (${brand_owner.label})`
            : brand_name
          : brand_name,
    })

    const candidates: BulkPmCandidate[] = [
      { kind: "none", seller_id: null, label: formatProductManagerLabel("none") },
    ]
    if (brand_owner && brand_id) {
      candidates.push({
        kind: "brand_owner",
        seller_id: brand_owner.seller_id,
        label: `Merkeigenaar — ${brand_name || brand_id} (${brand_owner.label})`,
      })
    }
    for (const s of offer_sellers) {
      candidates.push({
        kind: "seller",
        seller_id: s.seller_id,
        label: `Seller — ${s.label}`,
      })
    }

    let title: string | null = null
    try {
      const versions = (await productCloud.listProductVersions(
        { product_id: productId },
        { order: { version_number: "DESC" }, take: 5 }
      )) as Array<{ title?: string; publication_status?: string }>
      const working =
        versions.find((v) => v.publication_status === "Gepubliceerd") ||
        versions.find((v) => v.publication_status === "In review") ||
        versions[0]
      title = working?.title?.trim() || null
    } catch {
      title = null
    }

    contexts.push({
      product_id: productId,
      title,
      current: {
        kind: currentSnap.kind,
        seller_id: currentSnap.seller_id,
        label: currentSnap.label,
        display_name: formatCurrentManagerDisplay({
          kind: currentSnap.kind,
          seller_name: currentSnap.seller_name,
          seller_id: currentSnap.seller_id,
          brand_name: currentSnap.brand_name,
          label: currentSnap.label,
        }),
      },
      offerSellerIds,
      brandOwnerAvailable,
      candidates,
    })
  }

  return contexts
}

/**
 * POST /admin/product-cloud/products/bulk-product-manager
 *
 * - preview_only: shared candidates + current managers (no writes)
 * - dry_run + kind: validate choice for ALL products (no writes)
 * - kind without dry_run: atomic apply — all valid or nothing
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const parsed = BodySchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      parsed.error.issues[0]?.message || "Ongeldige bulk-toewijzing."
    )
  }

  const {
    product_ids,
    preview_only,
    dry_run,
    kind,
    seller_id,
    transfer_reason,
  } = parsed.data
  const uniqueIds = [...new Set(product_ids)]

  let contexts: BulkPmProductContext[]
  try {
    contexts = await buildProductContexts(req, uniqueIds)
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      err instanceof Error ? err.message : "Product(en) niet gevonden."
    )
  }

  const shared_candidates = intersectBulkPmCandidates(
    contexts.map((c) => c.candidates)
  )

  if (preview_only) {
    res.json({
      preview_only: true,
      count: contexts.length,
      shared_candidates,
      products: contexts.map((c) => ({
        product_id: c.product_id,
        title: c.title,
        current_display: c.current.display_name,
        current_type: c.current.label,
      })),
    })
    return
  }

  if (!kind) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Kies een Productbeheerder (kind) of gebruik preview_only."
    )
  }

  const chosen = shared_candidates.find(
    (c) =>
      c.kind === kind &&
      (c.seller_id || null) === (seller_id || null)
  )
  const new_display =
    chosen?.label ||
    (kind === "none"
      ? "Geen beheerder"
      : kind === "brand_owner"
        ? "Merkeigenaar"
        : seller_id || "Seller")
  const new_type = formatProductManagerLabel(kind)

  const evaluation = evaluateBulkProductManagerChoice({
    products: contexts,
    kind,
    seller_id,
    new_display,
    new_type,
  })

  if (dry_run) {
    res.json({
      dry_run: true,
      all_valid: evaluation.all_valid,
      count: evaluation.rows.length,
      invalid_count: evaluation.invalid_rows.length,
      new_manager: {
        kind,
        seller_id: seller_id ?? null,
        label: new_display,
        type: new_type,
      },
      shared_candidates,
      products: evaluation.rows,
      invalid_products: evaluation.invalid_rows,
    })
    return
  }

  if (!evaluation.all_valid) {
    res.status(400).json({
      message:
        "Bulktoewijzing geblokkeerd: de gekozen Productbeheerder is niet geldig voor alle geselecteerde producten. Er is niets gewijzigd.",
      all_valid: false,
      updated_count: 0,
      count: evaluation.rows.length,
      invalid_count: evaluation.invalid_rows.length,
      new_manager: {
        kind,
        seller_id: seller_id ?? null,
        label: new_display,
        type: new_type,
      },
      products: evaluation.rows,
      invalid_products: evaluation.invalid_rows,
    })
    return
  }

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService

  // Atomic intent: validate-all-then-apply-all. On mid-loop failure, report
  // without claiming partial success as OK (should be rare after validation).
  const applied: string[] = []
  try {
    for (const productId of uniqueIds) {
      await productCloud.assignProductManager({
        product_id: productId,
        kind,
        seller_id: seller_id ?? null,
        actor_admin_id: req.auth_context?.actor_id ?? null,
        transfer_reason:
          transfer_reason ||
          `Bulk Productbeheerder-toewijzing (${uniqueIds.length} producten)`,
      })
      applied.push(productId)
    }
  } catch (err) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Bulktoewijzing afgebroken na ${applied.length}/${uniqueIds.length} producten: ${
        err instanceof Error ? err.message : "onbekende fout"
      }. Controleer de Productbeheerder-historie.`
    )
  }

  res.json({
    all_valid: true,
    updated_count: applied.length,
    count: uniqueIds.length,
    invalid_count: 0,
    new_manager: {
      kind,
      seller_id: seller_id ?? null,
      label: new_display,
      type: new_type,
    },
    products: evaluation.rows,
    message: `${applied.length} product(en) bijgewerkt.`,
  })
}
