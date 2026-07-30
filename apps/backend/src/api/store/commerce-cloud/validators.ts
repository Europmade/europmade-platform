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

export const StorePatchOfferBody = z
  .object({
    quantity_available: z.number().int().optional(),
    base_price: z.number().optional(),
    shipping_cost: z.number().optional(),
    vat_rate: z.number().min(0).max(1).optional(),
  })
  .refine(
    (body) =>
      body.quantity_available !== undefined ||
      body.base_price !== undefined ||
      body.shipping_cost !== undefined ||
      body.vat_rate !== undefined,
    {
      message:
        "Geef minstens één veld op: quantity_available, base_price, shipping_cost of vat_rate.",
    }
  )
export type StorePatchOfferBodyInput = z.infer<typeof StorePatchOfferBody>
