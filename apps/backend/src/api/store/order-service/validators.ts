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
  delivery_country: z.string().trim().min(2).max(2).optional().default("NL"),
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

export const StoreCartLineBody = z.object({
  offer_id: z.string().trim().min(1),
  quantity: z.number().int().positive(),
})
export type StoreCartLineBodyInput = z.infer<typeof StoreCartLineBody>

export const StoreCartLinePatchBody = z.object({
  quantity: z.number().int().positive(),
})
export type StoreCartLinePatchBodyInput = z.infer<typeof StoreCartLinePatchBody>

export const AdminResolveExceptionBody = z.object({
  reason: z.string().trim().min(3),
})
export type AdminResolveExceptionBodyInput = z.infer<
  typeof AdminResolveExceptionBody
>

export const StoreRequestReturnBody = z.object({
  order_line_id: z.string().trim().min(1),
  reason: z.string().trim().min(3).max(2000),
})
export type StoreRequestReturnBodyInput = z.infer<typeof StoreRequestReturnBody>

export const StoreSellerRejectReturnBody = z.object({
  decision_reason: z.string().trim().min(3).max(2000),
})
export type StoreSellerRejectReturnBodyInput = z.infer<
  typeof StoreSellerRejectReturnBody
>

export const AdminForceRefundBody = z.object({
  force_reason: z.string().trim().min(3).max(2000),
})
export type AdminForceRefundBodyInput = z.infer<typeof AdminForceRefundBody>
