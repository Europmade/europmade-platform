import { z } from "@medusajs/framework/zod"

export const StoreSubmitReviewBody = z.object({
  order_line_id: z.string().trim().min(1),
  review_type: z.enum(["Productreview", "Verkopersreview"]),
  score: z.number().int().min(1).max(5),
  text: z.string().trim().max(5000).optional().nullable(),
})
export type StoreSubmitReviewBodyInput = z.infer<typeof StoreSubmitReviewBody>
