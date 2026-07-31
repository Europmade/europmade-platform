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
} from "./admin/partners/validators"
import {
  AdminEanMatchBody,
  AdminSeedProductWithEanBody,
  AdminDecideClaimBody,
  AdminArchiveProductBody,
  AdminDecideChangeProposalBody,
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
} from "./store/product-cloud/validators"
import { StoreUpsertOfferBody, StorePatchOfferBody } from "./store/commerce-cloud/validators"
import {
  StoreCheckoutRevalidateBody,
  StoreCheckoutPlaceBody,
  AdminResolveExceptionBody,
  StoreCartLineBody,
  StoreCartLinePatchBody,
  StoreRequestReturnBody,
  StoreSellerRejectReturnBody,
  AdminForceRefundBody,
  StoreSendMessageBody,
} from "./store/order-service/validators"

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

const customerAuth = authenticate("customer", ["session", "bearer"])
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
      matcher: "/store/product-cloud/products",
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
      matcher: "/store/product-cloud/products/:id/media",
      methods: ["POST"],
      middlewares: [customerAuth, validateAndTransformBody(StoreAddMediaBody)],
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
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/checkout/revalidate",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreCheckoutRevalidateBody),
      ],
    },
    {
      matcher: "/store/order-service/cart",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/cart",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreCartLineBody),
      ],
    },
    {
      matcher: "/store/order-service/cart/lines/:id",
      methods: ["PATCH"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreCartLinePatchBody),
      ],
    },
    {
      matcher: "/store/order-service/cart/lines/:id",
      methods: ["DELETE"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/checkout/place",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreCheckoutPlaceBody),
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
      matcher: "/store/order-service/orders/:id/messages",
      methods: ["GET"],
      middlewares: [customerAuth],
    },
    {
      matcher: "/store/order-service/orders/:id/messages",
      methods: ["POST"],
      middlewares: [
        customerAuth,
        validateAndTransformBody(StoreSendMessageBody),
      ],
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
      matcher: "/store/order-service/seller/returns",
      methods: ["GET"],
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
      matcher: "/admin/product-cloud/ean-match",
      methods: ["POST"],
      middlewares: [adminAuth, validateAndTransformBody(AdminEanMatchBody)],
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
      matcher: "/admin/product-cloud/change-proposals/:id/decide",
      methods: ["POST"],
      middlewares: [
        adminAuth,
        validateAndTransformBody(AdminDecideChangeProposalBody),
      ],
    },
  ],
})
