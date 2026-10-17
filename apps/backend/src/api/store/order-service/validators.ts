import { z } from "@medusajs/framework/zod"

export const StoreCheckoutRevalidateBody = z.object({
  delivery_country: z.string().trim().min(2).max(2).optional(),
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
  affiliate_click_id: z.string().trim().min(1).optional().nullable(),
  affiliate_coupon_code: z.string().trim().min(1).optional().nullable(),
  guest_checkout_token: z.string().trim().min(8).optional().nullable(),
})
export type StoreCheckoutPlaceBodyInput = z.infer<typeof StoreCheckoutPlaceBody>

export const StoreClaimGuestOrderBody = z.object({
  payment_reference: z.string().trim().min(8).max(128),
  guest_checkout_token: z.string().trim().min(8).optional().nullable(),
})
export type StoreClaimGuestOrderBodyInput = z.infer<typeof StoreClaimGuestOrderBody>

export const StoreCartLineBody = z.object({
  offer_id: z.string().trim().min(1),
  quantity: z.number().int().positive(),
})
export type StoreCartLineBodyInput = z.infer<typeof StoreCartLineBody>

export const StoreCartMergeBody = z.object({
  guest_token: z.string().trim().min(8).optional().nullable(),
})
export type StoreCartMergeBodyInput = z.infer<typeof StoreCartMergeBody>

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

export const StoreSendMessageBody = z.object({
  body: z.string().trim().min(1).max(5000),
})
export type StoreSendMessageBodyInput = z.infer<typeof StoreSendMessageBody>
