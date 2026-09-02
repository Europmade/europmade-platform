import { z } from "@medusajs/framework/zod"
import { IDENTIFIER_TYPES } from "../../../modules/product-cloud/identifier-types"

export const StoreEanMatchBody = z.object({
  identifier_value: z.string().trim().min(1),
  identifier_type: z.enum(IDENTIFIER_TYPES).optional(),
  country_scope: z.string().trim().min(1).nullable().optional(),
  draft_product_id: z.string().trim().min(1).optional(),
  candidate_product_ids: z.array(z.string().trim().min(1)).optional(),
})
export type StoreEanMatchBodyInput = z.infer<typeof StoreEanMatchBody>

const MediaInput = z.object({
  media_type: z.enum(["Hoofdafbeelding", "Overige afbeelding", "Video"]),
  storage_reference: z.string().trim().min(1),
})

export const StoreCreateProductBody = z.object({
  brand_id: z.string().trim().min(1),
  manufacturer_id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category_name: z.string().trim().min(1).optional().default("Algemeen"),
  category_names: z.array(z.string().trim().min(1)).optional(),
  identifier_type: z.enum(IDENTIFIER_TYPES).optional().default("GTIN"),
  identifier_value: z.string().trim().min(1).optional(),
  mpn: z.string().trim().min(1).optional(),
  country_scope: z.string().trim().min(1).nullable().optional(),
  create_as_retailer: z.boolean().optional(),
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
    .optional(),
  variant_value: z.string().trim().min(1).optional(),
  media: z.array(MediaInput).optional(),
})
export type StoreCreateProductBodyInput = z.infer<typeof StoreCreateProductBody>

export const StorePatchProductCategoriesBody = z.object({
  category_names: z.array(z.string().trim().min(1)).min(1),
})
export type StorePatchProductCategoriesBodyInput = z.infer<
  typeof StorePatchProductCategoriesBody
>

export const StoreUpsertConceptBody = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
})
export type StoreUpsertConceptBodyInput = z.infer<typeof StoreUpsertConceptBody>

export const StoreAddMediaBody = z.object({
  version_id: z.string().trim().min(1).optional(),
  media_type: z.enum(["Hoofdafbeelding", "Overige afbeelding", "Video"]),
  storage_reference: z.string().trim().min(1),
})
export type StoreAddMediaBodyInput = z.infer<typeof StoreAddMediaBody>

export const StoreOwnerLifecycleBody = z.object({
  target_status: z.enum(["Uitlopend", "Niet meer leverbaar"]),
})
export type StoreOwnerLifecycleBodyInput = z.infer<
  typeof StoreOwnerLifecycleBody
>

export const StoreSubmitClaimBody = z.object({
  product_id: z.string().trim().min(1),
})
export type StoreSubmitClaimBodyInput = z.infer<typeof StoreSubmitClaimBody>

export const StoreSubmitChangeProposalBody = z.object({
  product_id: z.string().trim().min(1),
  proposed_title: z.string().trim().min(1).nullable().optional(),
  proposed_description: z.string().trim().min(1).nullable().optional(),
  toelichting: z.string().trim().min(1),
})
export type StoreSubmitChangeProposalBodyInput = z.infer<
  typeof StoreSubmitChangeProposalBody
>

export const StoreDecideChangeProposalBody = z.object({
  decision: z.enum(["accept", "reject"]),
  decision_reason: z.string().trim().min(1).optional(),
})
export type StoreDecideChangeProposalBodyInput = z.infer<
  typeof StoreDecideChangeProposalBody
>

const AssemblyEuBand = z.enum(["eu_100", "eu_75_99", "eu_50_74", "eu_below_50"])
const PartsEuLevel = z.enum(["eu_majority", "eu_partial", "eu_none"])
const MaterialsEuLevel = z.enum(["eu_majority", "eu_partial", "eu_none"])

/** Single-product Made in Europe assign (score always computed server-side). */
export const StoreAssignMadeInEuropeBody = z.object({
  production_facility_id: z.string().trim().min(1).optional().nullable(),
  assembly_eu_band: AssemblyEuBand.optional(),
  parts_eu_level: PartsEuLevel.optional(),
  materials_eu_level: MaterialsEuLevel.optional(),
  primary_assembly_country: z.string().trim().length(2).optional().nullable(),
})
export type StoreAssignMadeInEuropeBodyInput = z.infer<
  typeof StoreAssignMadeInEuropeBody
>

/** Bulk assign same facility/profile to many owned products. */
export const StoreBulkMadeInEuropeBody = z.object({
  product_ids: z.array(z.string().trim().min(1)).min(1).max(500),
  production_facility_id: z.string().trim().min(1).optional().nullable(),
  assembly_eu_band: AssemblyEuBand.optional(),
  parts_eu_level: PartsEuLevel.optional(),
  materials_eu_level: MaterialsEuLevel.optional(),
  primary_assembly_country: z.string().trim().length(2).optional().nullable(),
})
export type StoreBulkMadeInEuropeBodyInput = z.infer<
  typeof StoreBulkMadeInEuropeBody
>

/** CSV-style bulk rows (stable IDs only). */
export const StoreCsvMadeInEuropeBody = z.object({
  rows: z
    .array(
      z.object({
        product_id: z.string().trim().min(1).optional(),
        sku: z.string().trim().min(1).optional(),
        ean: z.string().trim().min(1).optional(),
        production_facility_id: z.string().trim().min(1).optional().nullable(),
        assembly_eu_band: AssemblyEuBand.optional(),
        parts_eu_level: PartsEuLevel.optional(),
        materials_eu_level: MaterialsEuLevel.optional(),
        primary_assembly_country: z
          .string()
          .trim()
          .length(2)
          .optional()
          .nullable(),
      })
    )
    .min(1)
    .max(500),
})
export type StoreCsvMadeInEuropeBodyInput = z.infer<
  typeof StoreCsvMadeInEuropeBody
>

export const StoreBulkBrandLocationBody = z.object({
  product_ids: z.array(z.string().trim().min(1)).min(1).max(500),
  brand_id: z.string().trim().min(1),
  production_facility_id: z.string().trim().min(1),
})
export type StoreBulkBrandLocationBodyInput = z.infer<
  typeof StoreBulkBrandLocationBody
>
