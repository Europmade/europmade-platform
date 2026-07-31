import { z } from "zod"

export const AdminGenerateAiRecommendationBody = z.object({
  subject_type: z.enum([
    "moderation_case",
    "claim",
    "match_candidate",
    "product_origin",
  ]),
  subject_id: z.string().min(1),
  force: z.boolean().optional(),
})

export type AdminGenerateAiRecommendationBodyInput = z.infer<
  typeof AdminGenerateAiRecommendationBody
>
