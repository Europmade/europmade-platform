import { z } from "@medusajs/framework/zod"

/**
 * Partneroverzicht — partner-center/spec.md §2: zoeken (bedrijfsnaam/KvK-
 * nummer, de enige doorzoekbare tekstvelden die daadwerkelijk op `company`
 * bestaan) en filteren (rol, land). `is_*`-filters komen als querystring-
 * tekst binnen ("true"/"false"), vandaar het enum in plaats van z.boolean().
 */
export const AdminListPartnersQuery = z.object({
  q: z.string().trim().min(1).optional(),
  is_retailer: z.enum(["true", "false"]).optional(),
  is_producer_or_brand_owner: z.enum(["true", "false"]).optional(),
  is_distributor: z.enum(["true", "false"]).optional(),
  country_code: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})
export type AdminListPartnersQueryInput = z.infer<typeof AdminListPartnersQuery>

/** Afkeuren vereist altijd een reden — spec §1.2 ("met reden"), §2.12. */
export const AdminRejectPartnerOnboarding = z.object({
  reason: z.string().trim().min(1, "Een afkeurreden is verplicht."),
})
export type AdminRejectPartnerOnboardingInput = z.infer<
  typeof AdminRejectPartnerOnboarding
>

/**
 * Aanvullende informatie vragen vereist een specifiek, per-onderdeel
 * benoemd verzoek — spec §2.8A ("nooit een generieke tekst").
 */
export const AdminRequestPartnerOnboardingInfo = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Een specifiek verzoek om aanvullende informatie is verplicht."),
})
export type AdminRequestPartnerOnboardingInfoInput = z.infer<
  typeof AdminRequestPartnerOnboardingInfo
>
