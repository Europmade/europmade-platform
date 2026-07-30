import { z } from "@medusajs/framework/zod"

export const AdminEanMatchBody = z.object({
  identifier_value: z.string().trim().min(1),
  identifier_type: z.enum(["GTIN", "MPN"]).optional(),
  country_scope: z.string().trim().min(1).nullable().optional(),
  draft_product_id: z.string().trim().min(1).optional(),
  candidate_product_ids: z.array(z.string().trim().min(1)).optional(),
})
export type AdminEanMatchBodyInput = z.infer<typeof AdminEanMatchBody>

/** Minimale seed voor E2E van de matchingpijplijn (S3-03-03). */
export const AdminSeedProductWithEanBody = z.object({
  brand_id: z.string().trim().min(1),
  manufacturer_id: z.string().trim().min(1),
  current_owner_seller_id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  identifier_value: z.string().trim().min(1),
  identifier_type: z.enum(["GTIN", "MPN"]).optional().default("GTIN"),
  country_scope: z.string().trim().min(1).nullable().optional(),
  variant_type: z
    .enum([
      "Kleur",
      "Maat",
      "Inhoud",
      "Vermogen",
      "Spanning",
      "Materiaal",
      "Uitvoering",
      "Bundel",
    ])
    .optional()
    .default("Uitvoering"),
  variant_value: z.string().trim().min(1).optional().default("Standaard"),
  category_name: z.string().trim().min(1).optional().default("Algemeen"),
})
export type AdminSeedProductWithEanBodyInput = z.infer<
  typeof AdminSeedProductWithEanBody
>
