import { z } from "@medusajs/framework/zod"

/**
 * Reviewer-wachtrij/overzicht (S3-02-05) — tabs Alle / Aanvragen / Actief.
 * ANDERS dan GET /admin/partners (S3-02-04, uitsluitend Goedgekeurd).
 */
export const AdminListPartnerOnboardingQuery = z.object({
  q: z.string().trim().min(1).optional(),
  tab: z
    .enum(["queue", "active", "blocked", "all"])
    .optional()
    .default("queue"),
  is_retailer: z.enum(["true", "false"]).optional(),
  is_producer_or_brand_owner: z.enum(["true", "false"]).optional(),
  is_distributor: z.enum(["true", "false"]).optional(),
  country_code: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})
export type AdminListPartnerOnboardingQueryInput = z.infer<
  typeof AdminListPartnerOnboardingQuery
>
