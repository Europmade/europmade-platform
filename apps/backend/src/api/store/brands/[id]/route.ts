import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PARTNER_MODULE } from "../../../../modules/partner"
import type PartnerModuleService from "../../../../modules/partner/service"
import { PRODUCT_CLOUD_MODULE } from "../../../../modules/product-cloud"
import type ProductCloudModuleService from "../../../../modules/product-cloud/service"
import { COMMERCE_CLOUD_MODULE } from "../../../../modules/commerce-cloud"
import type CommerceCloudModuleService from "../../../../modules/commerce-cloud/service"
import { resolveApprovedSeller } from "../../product-cloud/resolve-seller"
import {
  buildSellerProductManagerRow,
  loadSellerOfferLookup,
} from "../../product-cloud/product-manager"
import {
  assertBrandCentralEdit,
  assertBrandPublicPageEdit,
  resolveBrandAccess,
} from "../brand-access"
import {
  listFacilitiesForBrand,
  loadBrandOrThrow,
  persistBrandRecord,
} from "../brand-helpers"
import { StorePatchBrandBody } from "../validators"
import { hasPermission } from "../../../../modules/partner/permissions"
import {
  latestClaim,
  listClaimsForSellerBrand,
  approvedOwnerClaim,
  resolveBrandPageFlowStatus,
  sellerMayFileOwnershipClaim,
} from "../ownership"
import {
  liveBrandPageDraft,
  mergeDraftPatch,
  sanitizeBrandPageDraft,
} from "../brand-page-document"

type RouteParams = { id: string }

type RequestWithBody = MedusaRequest & {
  validatedBody?: {
    name?: string
    intro?: string | null
    story?: string | null
    website_url?: string | null
    logo_url?: string | null
    hero_image_url?: string | null
    story_title?: string | null
    story_image_url?: string | null
    public_page_status?: "unpublished" | "published"
    submit_for_review?: boolean
    page_document?: unknown
  }
}

/**
 * GET /store/brands/:id — merkdetail + rechten + producten voor seller-backoffice.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const brand = await loadBrandOrThrow(req.scope, id)
  const access = await resolveBrandAccess(req.scope, seller, brand)
  if (access.level === "none") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen toegang tot dit merk."
    )
  }

  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const marketRows = await partner.listBrandMarketContents(
    { brand_id: brand.id },
    { take: 50 }
  )
  const facilities = await listFacilitiesForBrand(partner, brand.id)

  const productCloud = req.scope.resolve(
    PRODUCT_CLOUD_MODULE
  ) as ProductCloudModuleService
  let commerce: CommerceCloudModuleService | null = null
  try {
    commerce = req.scope.resolve(
      COMMERCE_CLOUD_MODULE
    ) as CommerceCloudModuleService
  } catch {
    commerce = null
  }
  const offerMaps = await loadSellerOfferLookup(commerce, seller.id)
  const ownProducts = await productCloud.listProducts(
    { current_owner_seller_id: seller.id },
    { take: 300 }
  )
  const products = []
  for (const product of ownProducts) {
    if (product.brand_id !== brand.id) continue
    const row = await buildSellerProductManagerRow(
      productCloud,
      commerce,
      product,
      seller.id,
      {
        offerMaps,
        partner,
        brandNameCache: new Map(),
        container: req.scope,
      }
    )
    products.push({
      id: row.id,
      title: row.title ?? null,
      ean: row.identifier_type === "GTIN" ? row.identifier_value : null,
      sku: row.sku_hint ?? row.offers?.sku_display ?? row.offer?.seller_sku ?? null,
      identifier_value: row.identifier_value ?? null,
      identifier_type: row.identifier_type ?? null,
      category: (row.category_names || [])[0] ?? null,
      category_names: row.category_names || [],
      status: row.publication_status || row.lifecycle_status || "Concept",
      image_url: row.primary_image_url ?? null,
    })
  }

  const claims = await listClaimsForSellerBrand(partner, brand.id, seller.id)
  const claim = latestClaim(claims)
  const approved = await approvedOwnerClaim(partner, brand.id)
  const live = liveBrandPageDraft(brand as Parameters<typeof liveBrandPageDraft>[0])
  const draft = sanitizeBrandPageDraft(
    (brand as { page_draft?: unknown }).page_draft,
    live
  )
  const public_page_status =
    (brand as { public_page_status?: string }).public_page_status ??
    "unpublished"
  const page_review_status =
    (brand as { page_review_status?: string }).page_review_status ?? "draft"
  res.status(200).json({
    brand: {
      ...brand,
      intro: draft.intro,
      story: draft.story,
      story_title: draft.story_title,
      story_image_url: draft.story_image_url,
      logo_url: draft.logo_url,
      hero_image_url: draft.hero_image_url,
      page_document: draft.page_document,
    },
    access,
    ownership: {
      can_file_claim: await sellerMayFileOwnershipClaim(partner, seller, brand),
      claim,
      public_page_status,
      page_review_status,
      page_review_note: (brand as { page_review_note?: string | null }).page_review_note ?? null,
      page_flow_status: resolveBrandPageFlowStatus({
        ownership_status: claim?.status ?? null,
        public_page_status,
        page_review_status,
      }),
      claimed: Boolean(approved),
      claimed_by_seller_id: approved?.seller_id ?? null,
      editor_scope: approved
        ? "Alleen de geverifieerde merkeigenaar"
        : "Iedere seller met dit merk (niet geclaimd)",
    },
    market_content: marketRows,
    facilities,
    products,
  })
}

/**
 * PATCH /store/brands/:id — merkbeschrijving/centrale content (BRAND_OWNER).
 */
export async function PATCH(req: RequestWithBody, res: MedusaResponse) {
  const { id } = req.params as RouteParams
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const brand = await loadBrandOrThrow(req.scope, id)
  const body = StorePatchBrandBody.parse(req.validatedBody ?? req.body ?? {})
  const access = await resolveBrandAccess(req.scope, seller, brand)
  if (access.level === "none") {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Geen toegang tot dit merk.")
  }
  const wantsNameEdit = body.name != null
  const wantsPublicPageEdit =
    body.intro !== undefined ||
    body.story !== undefined ||
    body.website_url !== undefined ||
    body.logo_url !== undefined ||
    body.hero_image_url !== undefined ||
    body.story_title !== undefined ||
    body.story_image_url !== undefined ||
    body.page_document !== undefined ||
    body.submit_for_review === true
  if (wantsNameEdit && !hasPermission(seller, "brands.manage")) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Geen rechten om merknaam te wijzigen."
    )
  }
  if (wantsNameEdit) {
    await assertBrandCentralEdit(req.scope, seller, brand)
  }
  if (wantsPublicPageEdit) {
    await assertBrandPublicPageEdit(req.scope, seller, brand)
  }
  const extra: Record<string, unknown> = {}
  if (body.name != null) extra.name = body.name
  if (wantsPublicPageEdit) {
    const live = liveBrandPageDraft(brand as Parameters<typeof liveBrandPageDraft>[0])
    const current = sanitizeBrandPageDraft(
      (brand as { page_draft?: unknown }).page_draft,
      live
    )
    const next = mergeDraftPatch(current, {
      intro: body.intro,
      story: body.story,
      story_title: body.story_title,
      story_image_url: body.story_image_url,
      logo_url: body.logo_url,
      hero_image_url: body.hero_image_url,
      page_document: body.page_document,
    })
    extra.page_draft = next
    if (body.submit_for_review === true) {
      extra.page_review_status = "in_review"
      extra.page_submitted_by_seller_id = seller.id
      extra.page_review_note = null
    } else if (
      (brand as { page_review_status?: string }).page_review_status ===
      "published"
    ) {
      extra.page_review_status = "draft"
    }
  }
  delete extra.public_page_status
  delete extra.submit_for_review
  delete extra.website_url
  const partner = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const updated = await persistBrandRecord(partner, brand, extra)

  res.status(200).json({ brand: updated })
}
