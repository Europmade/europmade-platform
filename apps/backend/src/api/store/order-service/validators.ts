import { z } from "@medusajs/framework/zod"

export const StoreCheckoutRevalidateBody = z.object({
  lines: z
    .array(
      z.object({
        offer_id: z.string().trim().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
})
export type StoreCheckoutRevalidateBodyInput = z.infer<
  typeof StoreCheckoutRevalidateBody
>

export const StoreCheckoutPlaceBody = z.object({
  payment_reference: z.string().trim().min(8).max(128),
  payment_mode: z.enum(["simulated"]).default("simulated"),
  shipping_address: z.string().trim().min(3),
  billing_address: z.string().trim().min(3),
  lines: z
    .array(
      z.object({
        offer_id: z.string().trim().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
})
export type StoreCheckoutPlaceBodyInput = z.infer<typeof StoreCheckoutPlaceBody>

export const AdminResolveExceptionBody = z.object({
  reason: z.string().trim().min(3),
})
export type AdminResolveExceptionBodyInput = z.infer<
  typeof AdminResolveExceptionBody
>
