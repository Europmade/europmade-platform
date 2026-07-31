import { z } from "@medusajs/framework/zod"

export const AdminDecideModerationCaseBody = z.object({
  decision: z.enum(["geen_actie", "escaleren"]),
  reason: z.string().trim().min(1).max(2000).optional().nullable(),
})
export type AdminDecideModerationCaseBodyInput = z.infer<
  typeof AdminDecideModerationCaseBody
>
