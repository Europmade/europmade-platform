import {
  defineMiddlewares,
  validateAndTransformBody,
  authenticate,
} from "@medusajs/framework/http"
import {
  StoreStartPartnerOnboarding,
  StoreUpdatePartnerOnboardingDraft,
  StoreSubmitPartnerOnboarding,
} from "./store/partner-onboarding/validators"
import {
  AdminRejectPartnerOnboarding,
  AdminRequestPartnerOnboardingInfo,
  AdminBlockPartner,
} from "./admin/partners/validators"

/**
 * S3-02-02 — Partner Onboarding-statusverloop.
 * S3-02-04 — Partnerbeheer (admin, uitsluitend lezend, Goedgekeurd).
 * S3-02-05 — Partnerbeheer UI-ondersteuning (reviewer-overzicht/-detail,
 *            blokkeren).
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
      matcher: "/admin/partners/:id/block",
      methods: ["POST"],
      middlewares: [
        authenticate("user", ["session", "bearer"]),
        validateAndTransformBody(AdminBlockPartner),
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
  ],
})
