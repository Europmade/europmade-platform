import {
  defineMiddlewares,
  validateAndTransformBody,
  authenticate,
} from "@medusajs/framework/http"
import multer from "multer"
import {
  StoreStartPartnerOnboarding,
  StoreUpdatePartnerOnboardingDraft,
  StoreSubmitPartnerOnboarding,
} from "./store/partner-onboarding/validators"
import {
  AdminRejectPartnerOnboarding,
  AdminRequestPartnerOnboardingInfo,
  AdminPatchPartnerRolesBody,
} from "./admin/partners/validators"
import {
  AdminEanMatchBody,
  AdminSeedProductWithEanBody,
  AdminDecideClaimBody,
  AdminArchiveProductBody,
  AdminDecideChangeProposalBody,
  AdminDecideProductLinkGroupBody,
  AdminDeactivateProductLinkGroupBody,
} from "./admin/product-cloud/validators"
import {
  StoreEanMatchBody,
  StoreCreateProductBody,
  StoreUpsertConceptBody,
  StoreAddMediaBody,
  StoreOwnerLifecycleBody,
  StoreSubmitClaimBody,
  StoreSubmitChangeProposalBody,
  StoreDecideChangeProposalBody,
  StoreSubmitProductLinkGroupProposalBody,
  StorePatchProductCategoriesBody,
  StoreAssignMadeInEuropeBody,
  StoreBulkMadeInEuropeBody,
  StoreCsvMadeInEuropeBody,
  StoreBulkBrandLocationBody,
  StoreBulkShippingProfileBody,
  StoreProductShippingProfileBody,
} from "./store/product-cloud/validators"
import { StoreUpsertOfferBody, StorePatchOfferBody, StoreShippingProfileBody, StorePatchShippingProfileBody, StoreDuplicateShippingProfileBody } from "./store/commerce-cloud/validators"
import {
  StoreCreateBrandBody,
  StorePatchBrandBody,
  StorePatchBrandMarketBody,
  StoreUpsertProductionFacilityBody,
} from "./store/brands/validators"
import {
  StoreCheckoutRevalidateBody,
  StoreCheckoutPlaceBody,
  AdminResolveExceptionBody,
  StoreCartLineBody,
  StoreCartLinePatchBody,
  StoreCartMergeBody,
  StoreClaimGuestOrderBody,
  StoreRequestReturnBody,
  StoreSellerRejectReturnBody,
  AdminForceRefundBody,
  StoreSendMessageBody,
} from "./store/order-service/validators"
import { StoreSubmitReviewBody } from "./store/reviews/validators"
import {
  StoreRegisterAffiliateBody,
  StoreAffiliateConsentBody,
  StoreAffiliateClickBody,
  StoreAffiliateLinkBody,
  StoreAffiliateCouponBody,
  AdminDecideAffiliateBody,
} from "./store/affiliate/validators"
import { AdminDecideModerationCaseBody } from "./admin/moderation/validators"
import { AdminGenerateAiRecommendationBody } from "./admin/ai-support/validators"

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

/** Product images — server processes variants; 10 MB upload cap. */
const productMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

const customerAuth = authenticate("customer", ["session", "bearer"])
const customerAuthOptional = authenticate("customer", ["session", "bearer"], {
  allowUnauthenticated: true,
})
const adminAuth = authenticate("user", ["session", "bearer"])

/**
 * S3-02-02 — Partner Onboarding.
 * S3-02-04/05 — Partnerbeheer.
 * S3-03-03 — EAN-matching.
 * S3-03-04 — Product-CRUD + Retailer Created + claims + wijzigingsvoorstellen.
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/mfa",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/mfa/enroll",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/mfa/confirm",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/mfa/challenges",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/partner-onboarding",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/partner-onboarding",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreStartPartnerOnboarding),
      ],
    },
    {
      matcher: "/store/partner-onboarding",
      methods: ["PATCH"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreUpdatePartnerOnboardingDraft),
      ],
    },
    {
      matcher: "/store/partner-onboarding/submit",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreSubmitPartnerOnboarding),
      ],
    },
    {
      matcher: "/store/partner-onboarding/submit-addition",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/partner-onboarding/documents",
      methods: ["POST"],
      middlewares: [customerAuth, documentUpload.single("file")],
    },
    {
      matcher: "/store/product-cloud/ean-match",
      methods: ["POST"],
      middlewares: [customerAuth, validateAndTransformBody(StoreEanMatchBody)],
    },
    {
      matcher: "/store/product-cloud/search",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/import/template",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/import/preview",
      methods: ["POST"],
      middlewares: [customerAuth, documentUpload.single("file")],
    },
    {
      matcher: "/store/product-cloud/import",
      methods: ["POST"],
      middlewares: [customerAuth, documentUpload.single("file")],
    },
    {
      matcher: "/store/product-cloud/languages",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/facilities",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreCreateProductBody),
      ],
    },
    {
      matcher: "/store/product-cloud/products/:id",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products/:id",
      methods: ["PATCH"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StorePatchProductCategoriesBody),
      ],
    },
    {
      matcher: "/store/product-cloud/products/:id/manager",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products/:id/information",
      methods: ["PATCH"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products/:id/versions",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreUpsertConceptBody),
      ],
    },
    {
      matcher: "/store/product-cloud/products/:id/versions/:versionId/submit",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products/:id/versions/:versionId/publish",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products/:id/media/reorder",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products/:id/media",
      methods: ["POST"],
      middlewares: [customerAuth, validateAndTransformBody(StoreAddMediaBody)],
    },
    {
      matcher: "/store/product-cloud/products/:id/media/upload",
      methods: ["POST"],
      middlewares: [customerAuth, productMediaUpload.single("file")],
    },
    {
      matcher: "/store/product-cloud/products/:id/media/:mediaId",
      methods: ["PATCH", "DELETE"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products/bulk-information",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products/bulk-brand-location",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreBulkBrandLocationBody),
      ],
    },
    {
      matcher: "/store/product-cloud/products/bulk-shipping-profile",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreBulkShippingProfileBody),
      ],
    },
    {
      matcher: "/store/product-cloud/products/:id/shipping-profile",
      methods: ["PATCH"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreProductShippingProfileBody),
      ],
    },
    {
      matcher: "/store/product-cloud/products/:id/lifecycle",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreOwnerLifecycleBody),
      ],
    },
    {
      matcher: "/store/product-cloud/products/:id/made-in-europe/evidence",
      methods: ["GET", "POST"],
      middlewares: [customerAuth],
    },
    {
      matcher:
        "/store/product-cloud/products/:id/made-in-europe/evidence/:evidenceId",
      methods: ["DELETE"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products/:id/variants",
      methods: ["GET", "POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products/:id/variants/:variantId",
      methods: ["PATCH", "DELETE"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products/:id/made-in-europe",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/products/:id/made-in-europe",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreAssignMadeInEuropeBody),
      ],
    },
    {
      matcher: "/store/product-cloud/made-in-europe/bulk",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreBulkMadeInEuropeBody),
      ],
    },
    {
      matcher: "/store/product-cloud/made-in-europe/csv",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreCsvMadeInEuropeBody),
      ],
    },
    {
      matcher: "/store/product-cloud/products/:id/translations",
      methods: ["GET", "PATCH", "POST", "PUT"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/claims",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/claims",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreSubmitClaimBody),
      ],
    },
    {
      matcher: "/store/product-cloud/change-proposals",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/change-proposals",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreSubmitChangeProposalBody),
      ],
    },
    {
      matcher: "/store/product-cloud/change-proposals/:id/decide",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreDecideChangeProposalBody),
      ],
    },
    {
      matcher: "/store/product-cloud/product-link-groups/proposals",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/product-link-groups/proposals",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreSubmitProductLinkGroupProposalBody),
      ],
    },
    {
      matcher: "/store/commerce-cloud/offers",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/commerce-cloud/offers",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreUpsertOfferBody),
      ],
    },
    {
      matcher: "/store/commerce-cloud/offers/:id",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/commerce-cloud/offers/:id",
      methods: ["PATCH"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StorePatchOfferBody),
      ],
    },
    {
      matcher: "/store/commerce-cloud/offers/:id",
      methods: ["DELETE"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/commerce-cloud/buy-box",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher: "/store/commerce-cloud/shipping-profiles",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/commerce-cloud/shipping-profiles",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreShippingProfileBody),
      ],
    },
    {
      matcher: "/store/commerce-cloud/shipping-profiles/:id",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/commerce-cloud/shipping-profiles/:id",
      methods: ["PATCH"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StorePatchShippingProfileBody),
      ],
    },
    {
      matcher: "/store/commerce-cloud/shipping-profiles/:id",
      methods: ["DELETE"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/commerce-cloud/shipping-profiles/:id/duplicate",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreDuplicateShippingProfileBody),
      ],
    },
    {
      matcher: "/store/catalog/products",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher: "/store/catalog/category-nav",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher: "/store/catalog/commercial-nav/visit",
      methods: ["POST"],
      middlewares: [],
    },
    {
      matcher: "/store/order-service/checkout/revalidate",
      methods: ["POST"],
      middlewares: [
        customerAuthOptional,
        validateAndTransformBody(StoreCheckoutRevalidateBody),
      ],
    },
    {
      matcher: "/store/order-service/cart",
      methods: ["GET"],
      middlewares: [customerAuthOptional],
    },
    {
      matcher: "/store/order-service/cart",
      methods: ["POST"],
      middlewares: [
        customerAuthOptional,
        validateAndTransformBody(StoreCartLineBody),
      ],
    },
    {
      matcher: "/store/order-service/cart/merge",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreCartMergeBody),
      ],
    },
    {
      matcher: "/store/order-service/cart/lines/:id",
      methods: ["PATCH"],
      middlewares: [
        customerAuthOptional,
        validateAndTransformBody(StoreCartLinePatchBody),
      ],
    },
    {
      matcher: "/store/order-service/cart/lines/:id",
      methods: ["DELETE"],
      middlewares: [customerAuthOptional],
    },
    {
      matcher: "/store/order-service/checkout/place",
      methods: ["POST"],
      middlewares: [
        customerAuthOptional,
        validateAndTransformBody(StoreCheckoutPlaceBody),
      ],
    },
    {
      matcher: "/store/order-service/orders/confirmation/:payment_reference",
      methods: ["GET"],
      middlewares: [customerAuthOptional],
    },
    {
      matcher: "/store/order-service/orders/claim",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreClaimGuestOrderBody),
      ],
    },
    {
      matcher: "/store/order-service/orders",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/orders/:id",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/conversations/:id",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/conversations/:id",
      methods: ["POST"],
      middlewares: [customerAuth, documentUpload.array("files", 5)],
    },
    {
      matcher: "/store/order-service/orders/:id/messages",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/orders/:id/messages",
      methods: ["POST"],
      middlewares: [customerAuth, documentUpload.array("files", 5)],
    },
    {
      matcher: "/store/order-service/messages",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/messages",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/messages/reads",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/messages/:conversationId/read",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/customers",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/orders/lookup",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/conversations",
      methods: ["POST"],
      middlewares: [customerAuth, documentUpload.array("files", 5)],
    },
    {
      matcher: "/store/order-service/seller/conversations/:id",
      methods: ["GET", "PATCH"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/conversations/:id",
      methods: ["POST"],
      middlewares: [customerAuth, documentUpload.array("files", 5)],
    },
    {
      matcher: "/admin/order-service/orders",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/order-service/orders/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/order-service/orders/:id/messages",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/order-service/exceptions",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/order-service/orders/:id/resolve-exception",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminResolveExceptionBody),
      ],
    },
    {
      matcher: "/store/order-service/returns",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/returns",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreRequestReturnBody),
      ],
    },
    {
      matcher: "/store/order-service/returns/:id",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/returns/:id/escalate",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/orders",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/orders/:id",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/orders/:id/shipment",
      methods: ["PUT", "POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/orders/:id/documents",
      methods: ["POST"],
      middlewares: [customerAuth, documentUpload.array("files", 1)],
    },
    {
      matcher:
        "/store/order-service/seller/orders/:id/documents/packing-slip/generate",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/orders/:id/message",
      methods: ["GET", "POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/returns",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/returns",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/returns/:id/tracking",
      methods: ["PATCH"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/returns/:id/confirm",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/returns/:id/receive",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/returns/:id/approve",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/seller/returns/:id/reject",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreSellerRejectReturnBody),
      ],
    },
    {
      matcher: "/admin/order-service/returns",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/order-service/returns/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/order-service/returns/:id/force-refund",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminForceRefundBody),
      ],
    },
    {
      matcher: "/admin/partners",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/partners/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/partners/:id/roles",
      methods: ["PATCH"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminPatchPartnerRolesBody),
      ],
    },
    {
      matcher: "/admin/partners/:id/approve",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/partners/:id/reject",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminRejectPartnerOnboarding),
      ],
    },
    {
      matcher: "/admin/partners/:id/request-additional-info",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminRequestPartnerOnboardingInfo),
      ],
    },
    {
      matcher: "/admin/partner-onboarding",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/partner-onboarding/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/seed",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminSeedProductWithEanBody),
      ],
    },
    {
      matcher: "/admin/product-cloud/categories",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/categories",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/categories/:id/attributes",
      methods: ["GET", "POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/categories/:id/attributes/:attrId",
      methods: ["PATCH"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/categories/:id/attribute-suggestions",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/categories/:id/redirects",
      methods: ["GET", "POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/categories/:id",
      methods: ["GET", "PATCH"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/category-proposals",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/category-proposals/:id",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/translations",
      methods: ["GET", "POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/translations/overview",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/translations/summary",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/translations/enqueue",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/translations/publish",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/translations/manual",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/translations/mark-stale",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/translations/retranslate",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/store/product-cloud/categories",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher: "/store/product-cloud/category-redirects",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher: "/store/product-cloud/category-proposals",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/product-cloud/translations",
      methods: ["GET", "POST"],
      middlewares: [],
    },
    {
      matcher: "/admin/product-cloud/ean-match",
      methods: ["POST"],
      middlewares: [adminAuth, validateAndTransformBody(AdminEanMatchBody)],
    },
    {
      matcher: "/admin/product-cloud/compliance/evidence",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/approvals",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/products/:id/approval",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/products/:id/section-reviews",
      methods: ["GET", "PUT"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/products/:id/evidence/:evidenceId/review",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/products",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/products/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/products/:id/lifecycle",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminArchiveProductBody),
      ],
    },
    {
      matcher: "/admin/product-cloud/claims",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/claims/:id/decide",
      methods: ["POST"],
      middlewares: [adminAuth, validateAndTransformBody(AdminDecideClaimBody)],
    },
    {
      matcher: "/admin/product-cloud/change-proposals",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/change-proposals/:id/decide",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminDecideChangeProposalBody),
      ],
    },
    {
      matcher: "/admin/product-cloud/product-link-groups",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/product-link-groups/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/product-cloud/product-link-groups/:id/decide",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminDecideProductLinkGroupBody),
      ],
    },
    {
      matcher: "/admin/product-cloud/product-link-groups/:id/deactivate",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminDeactivateProductLinkGroupBody),
      ],
    },
    {
      matcher: "/store/notifications",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/notifications/:id/read",
      methods: ["POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/admin/audit-log",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/store/reviews",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher: "/store/reviews",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreSubmitReviewBody),
      ],
    },
    {
      matcher: "/store/reviews/eligible",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/reviews/mine",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/catalog/products/:id",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher: "/store/catalog/manufacturers/:slug",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher: "/store/catalog/brands",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher: "/store/catalog/brands/:slug",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher: "/store/catalog/sellers/:slug",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher: "/store/brands/media",
      methods: ["POST"],
      middlewares: [customerAuth, documentUpload.single("file")],
    },
    {
      matcher: "/store/brands/:id/ownership-claim",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/brands/:id/ownership-claim",
      methods: ["POST"],
      middlewares: [customerAuth, documentUpload.single("file")],
    },
    {
      matcher: "/admin/brand-ownership/pages/:brandId",
      methods: ["GET", "POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/brand-ownership",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/brand-ownership/:id",
      methods: ["GET", "POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/store/brands",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/brands",
      methods: ["POST"],
      middlewares: [customerAuth, validateAndTransformBody(StoreCreateBrandBody)],
    },
    {
      matcher: "/store/brands/:id",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/brands/:id",
      methods: ["PATCH"],
      middlewares: [customerAuth, validateAndTransformBody(StorePatchBrandBody)],
    },
    {
      matcher: "/store/brands/:id/markets/:countryCode",
      methods: ["PATCH"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StorePatchBrandMarketBody),
      ],
    },
    {
      matcher: "/store/brands/:id/facilities",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/brands/:id/facilities",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreUpsertProductionFacilityBody),
      ],
    },
    {
      matcher: "/store/brands/:id/facilities/:facilityId",
      methods: ["DELETE"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/brands/:id/facilities/:facilityId/products",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/partner/account",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/partner/account",
      methods: ["PATCH"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/partner/manufacturers",
      methods: ["GET", "POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/partner/manufacturers/:id",
      methods: ["PATCH"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/affiliate",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/affiliate",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreRegisterAffiliateBody),
      ],
    },
    {
      matcher: "/store/affiliate/consent",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(StoreAffiliateConsentBody)],
    },
    {
      matcher: "/store/affiliate/clicks",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(StoreAffiliateClickBody)],
    },
    {
      matcher: "/store/affiliate/links",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/affiliate/links",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreAffiliateLinkBody),
      ],
    },
    {
      matcher: "/store/affiliate/coupons",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/affiliate/coupons",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreAffiliateCouponBody),
      ],
    },
    {
      matcher: "/store/affiliate/dashboard",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/affiliate/stats",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/affiliate/commissions",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/affiliate/commission-settings",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/admin/affiliates",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/affiliates/performance",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/affiliates/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/affiliates/:id/approve",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/affiliates/:id/reject",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminDecideAffiliateBody),
      ],
    },
    {
      matcher: "/admin/moderation/queues",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/moderation/queues/:queue",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/moderation/queues/:queue/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/moderation/cases/:id/decide",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminDecideModerationCaseBody),
      ],
    },
    {
      matcher: "/store/finance/seller",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/finance/affiliate/payouts",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/admin/finance/payouts",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/payouts/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/payouts/:id/process",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/overview",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/transactions",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/transactions/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/sellers",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/sellers/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/affiliates",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/affiliates/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/invoicing",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/settlements",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/settlements/:id",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/finance/reprocess",
      methods: ["POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/store/finance/seller/invoices",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/finance/seller/invoices/:id",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/finance/seller/sales",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/finance/seller/settlements",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/finance/seller/settlements/:id",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/admin/ai-support/recommendations",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminGenerateAiRecommendationBody),
      ],
    },
    {
      matcher: "/admin/cms/meta",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/homepage",
      methods: ["GET", "PUT"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/theme",
      methods: ["GET", "PUT"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/banners",
      methods: ["GET", "POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/banners/:id",
      methods: ["GET", "PUT", "DELETE"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/pages",
      methods: ["GET", "POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/pages/:id",
      methods: ["GET", "PUT", "DELETE"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/categories",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/categories/:slug",
      methods: ["GET", "PUT"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/products",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/products/:id",
      methods: ["GET", "PUT"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/translate",
      methods: ["GET", "POST"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/media",
      methods: ["POST"],
      middlewares: [adminAuth, documentUpload.single("file")],
    },
    {
      matcher: "/admin/cms/commercial-nav/icons",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/cms/commercial-nav/icons/:key",
      methods: ["PUT", "DELETE"],
      middlewares: [adminAuth],
    },

    // ── Advertising (seller) ──
    {
      matcher: "/store/advertising/campaigns",
      methods: ["GET", "POST"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/advertising/campaigns/:id",
      methods: ["GET", "PATCH"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/advertising/availability",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/advertising/media",
      methods: ["POST"],
      middlewares: [customerAuth, documentUpload.single("file")],
    },
    {
      matcher: "/store/advertising/live-slots",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher: "/store/advertising/public/sellers/:sellerSlug",
      methods: ["GET"],
      middlewares: [],
    },
    {
      matcher:
        "/store/advertising/public/sellers/:sellerSlug/campaigns/:campaignSlug",
      methods: ["GET"],
      middlewares: [],
    },

    // ── Advertising (admin) ──
    {
      matcher: "/admin/advertising/campaigns",
      methods: ["GET"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/advertising/campaigns/:id",
      methods: ["GET", "PATCH"],
      middlewares: [adminAuth],
    },
    {
      matcher: "/admin/advertising/pricing",
      methods: ["GET", "POST"],
      middlewares: [adminAuth],
    },
  ],
})
