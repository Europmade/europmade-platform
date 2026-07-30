import { z } from "@medusajs/framework/zod"

export const StoreUpsertOfferBody = z.object({
  identifier_id: z.string().trim().min(1),
  region_code: z.string().trim().min(2).max(2),
  quantity_available: z.number().int(),
  base_price: z.number(),
  shipping_cost: z.number(),
  vat_rate: z.number().min(0).max(1).optional().default(0.21),
})
export type StoreUpsertOfferBodyInput = z.infer<typeof StoreUpsertOfferBody>
