import { z } from "zod"

export const StoreCreateBrandBody = z.object({
  name: z.string().trim().min(1).max(200),
  intro: z.string().trim().max(2000).optional().nullable(),
})

export const StorePatchBrandBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  intro: z.string().trim().max(2000).optional().nullable(),
  story: z.string().trim().max(20000).optional().nullable(),
  website_url: z.string().trim().max(500).optional().nullable(),
  logo_url: z.string().trim().max(800).optional().nullable(),
  hero_image_url: z.string().trim().max(800).optional().nullable(),
  story_title: z.string().trim().max(200).optional().nullable(),
  story_image_url: z.string().trim().max(800).optional().nullable(),
  public_page_status: z.enum(["unpublished", "published"]).optional(),
  submit_for_review: z.boolean().optional(),
  page_document: z.unknown().optional(),
})

export const StorePatchBrandMarketBody = z.object({
  intro: z.string().trim().max(2000).optional().nullable(),
  story: z.string().trim().max(20000).optional().nullable(),
  contact_info: z.string().trim().max(2000).optional().nullable(),
})

const AssemblyEuBand = z.enum(["eu_100", "eu_75_99", "eu_50_74", "eu_below_50"])
const PartsEuLevel = z.enum(["eu_majority", "eu_partial", "eu_none"])
const MaterialsEuLevel = z.enum(["eu_majority", "eu_partial", "eu_none"])

export const StoreUpsertProductionFacilityBody = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().max(200).optional().nullable(),
  country_code: z.string().trim().min(2).max(2),
  street: z.string().trim().max(200).optional().nullable(),
  house_number: z.string().trim().max(40).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  region: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  manufacturer_id: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional(),
  assembly_eu_band: AssemblyEuBand.optional().nullable(),
  parts_eu_level: PartsEuLevel.optional().nullable(),
  materials_eu_level: MaterialsEuLevel.optional().nullable(),
  primary_assembly_country: z
    .string()
    .trim()
    .length(2)
    .optional()
    .nullable(),
})
