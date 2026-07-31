import { z } from "@medusajs/framework/zod"

export const StoreRegisterAffiliateBody = z.object({
  channel_url: z.string().trim().min(3).max(2000),
  legal_name: z.string().trim().min(2).max(200),
  iban: z.string().trim().min(8).max(34),
  country_code: z.string().trim().min(2).max(2).optional().default("NL"),
  chamber_of_commerce_number: z.string().trim().min(1).max(64).optional(),
  vat_number: z.string().trim().min(1).max(64).optional().nullable(),
})
export type StoreRegisterAffiliateBodyInput = z.infer<
  typeof StoreRegisterAffiliateBody
>

export const StoreAffiliateConsentBody = z.object({
  visitor_key: z.string().trim().min(8).max(128),
  consent_given: z.boolean(),
})
export type StoreAffiliateConsentBodyInput = z.infer<
  typeof StoreAffiliateConsentBody
>

export const StoreAffiliateClickBody = z.object({
  tracking_param: z.string().trim().min(3).max(128),
  visitor_key: z.string().trim().min(8).max(128),
})
export type StoreAffiliateClickBodyInput = z.infer<
  typeof StoreAffiliateClickBody
>

export const StoreAffiliateLinkBody = z.object({
  target_url: z.string().trim().min(1).max(2000),
})
export type StoreAffiliateLinkBodyInput = z.infer<typeof StoreAffiliateLinkBody>

export const StoreAffiliateCouponBody = z.object({
  code: z.string().trim().min(3).max(32).optional(),
})
export type StoreAffiliateCouponBodyInput = z.infer<
  typeof StoreAffiliateCouponBody
>

export const AdminDecideAffiliateBody = z.object({
  reason: z.string().trim().min(3).max(2000).optional(),
})
export type AdminDecideAffiliateBodyInput = z.infer<
  typeof AdminDecideAffiliateBody
>
