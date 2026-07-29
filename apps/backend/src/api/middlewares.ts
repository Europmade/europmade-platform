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
} from "./admin/partners/validators"

/**
 * S3-02-02 — Partner Onboarding-statusverloop.
 * S3-02-04 — Partnerbeheer (admin, uitsluitend lezend).
 *
 * Store-routes: standaard Medusa Customer-sessieauthenticatie
 * (`authenticate("customer", ...)`, zelfde patroon als alle overige
 * Store-endpoints, `authenticatie/spec.md`, server-side sessiebeheer).
 * Admin-routes (reviewer-beslissingen + Partnerbeheer-overzicht/-detail):
 * standaard Medusa Admin User-authenticatie (`authenticate("user", ...)`) —
 * geen extra, zelfgebouwde RBAC-laag (die is nog niet in scope van dit
 * ticket, zelfde afspraak als bij S3-02-02's admin-routes).
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
  ],
})
