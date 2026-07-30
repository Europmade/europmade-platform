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
} from "./admin/product-cloud/validators"

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

/**
 * S3-02-02 — Partner Onboarding.
 * S3-02-04/05 — Partnerbeheer.
 * S3-03-03 — EAN-matching (dunne admin-testroutes; volledige CRUD = S3-03-04).
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/partner-onboarding",
      methods: ["GET"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/partner-onboarding",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(StoreStartPartnerOnboarding),
      ],
    },
    {
      matcher: "/store/partner-onboarding",
      methods: ["PATCH"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(StoreUpdatePartnerOnboardingDraft),
      ],
    },
    {
      matcher: "/store/partner-onboarding/submit",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(StoreSubmitPartnerOnboarding),
      ],
    },
    {
      matcher: "/store/partner-onboarding/submit-addition",
      methods: ["POST"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/partner-onboarding/documents",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        documentUpload.single("file"),
      ],
    },
    {
      matcher: "/admin/partners",
      methods: ["GET"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/partners/:id",
      methods: ["GET"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/partners/:id/approve",
      methods: ["POST"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/partners/:id/reject",
      methods: ["POST"],
      middlewares: [
        authenticate("user", ["session", "bearer"]),
        validateAndTransformBody(AdminRejectPartnerOnboarding),
      ],
    },
    {
      matcher: "/admin/partners/:id/request-additional-info",
      methods: ["POST"],
      middlewares: [
        authenticate("user", ["session", "bearer"]),
        validateAndTransformBody(AdminRequestPartnerOnboardingInfo),
      ],
    },
    {
      matcher: "/admin/partner-onboarding",
      methods: ["GET"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/partner-onboarding/:id",
      methods: ["GET"],
      middlewares: [authenticate("user", ["session", "bearer"])],
    },
    {
      matcher: "/admin/product-cloud/seed",
      methods: ["POST"],
      middlewares: [
        authenticate("user", ["session", "bearer"]),
        validateAndTransformBody(AdminSeedProductWithEanBody),
      ],
    },
    {
      matcher: "/admin/product-cloud/ean-match",
      methods: ["POST"],
      middlewares: [
        authenticate("user", ["session", "bearer"]),
        validateAndTransformBody(AdminEanMatchBody),
      ],
    },
  ],
})
