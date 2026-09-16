import { z } from "@medusajs/framework/zod"

export const StoreUpsertOfferBody = z.object({
  identifier_id: z.string().trim().min(1),
  region_code: z.string().trim().min(2).max(2),
  quantity_available: z.number().int(),
  base_price: z.number(),
  shipping_cost: z.number(),
  vat_rate: z.number().min(0).max(1).optional().default(0.21),
  seller_sku: z.string().trim().min(1).max(128).nullable().optional(),
  sales_status: z.enum(["active", "paused"]).optional(),
  delivery_days_max: z.number().int().min(0).max(365).nullable().optional(),
  extra_delivery_cost: z.number().min(0).nullable().optional(),
  regular_customer_price: z.number().min(0).nullable().optional(),
  promo_price: z.number().nullable().optional(),
  promo_starts_at: z.string().datetime().nullable().optional(),
  promo_ends_at: z.string().datetime().nullable().optional(),
  clear_promo: z.boolean().optional(),
})
export type StoreUpsertOfferBodyInput = z.infer<typeof StoreUpsertOfferBody>

export const StorePatchOfferBody = z
  .object({
    quantity_available: z.number().int().optional(),
    base_price: z.number().optional(),
    shipping_cost: z.number().optional(),
    vat_rate: z.number().min(0).max(1).optional(),
    seller_sku: z.string().trim().min(1).max(128).nullable().optional(),
    sales_status: z.enum(["active", "paused"]).optional(),
    delivery_days_max: z.number().int().min(0).max(365).nullable().optional(),
    extra_delivery_cost: z.number().min(0).nullable().optional(),
    regular_customer_price: z.number().min(0).nullable().optional(),
    promo_price: z.number().nullable().optional(),
    promo_starts_at: z.string().datetime().nullable().optional(),
    promo_ends_at: z.string().datetime().nullable().optional(),
    clear_promo: z.boolean().optional(),
    shipping_profile_id: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (body) =>
      body.quantity_available !== undefined ||
      body.base_price !== undefined ||
      body.shipping_cost !== undefined ||
      body.vat_rate !== undefined ||
      body.seller_sku !== undefined ||
      body.sales_status !== undefined ||
      body.delivery_days_max !== undefined ||
      body.extra_delivery_cost !== undefined ||
      body.regular_customer_price !== undefined ||
      body.promo_price !== undefined ||
      body.promo_starts_at !== undefined ||
      body.promo_ends_at !== undefined ||
      body.clear_promo !== undefined ||
      body.shipping_profile_id !== undefined,
    {
      message:
        "Geef minstens één offer-veld op om te wijzigen.",
    }
  )
export type StorePatchOfferBodyInput = z.infer<typeof StorePatchOfferBody>

const DeliveryTimeCodeSchema = z.enum([
  "same_day",
  "next_day",
  "1_2",
  "2_3",
  "3_5",
  "5_plus",
])

const CarrierRefSchema = z.object({
  carrier_id: z.string().trim().min(1),
  service_id: z.string().trim().min(1).nullable().optional(),
})

const HandoverDaySchema = z.object({
  enabled: z.boolean(),
  cutoff_time: z.string().regex(/^\d{2}:\d{2}$/),
  processing_time_code: DeliveryTimeCodeSchema,
})

const WeekdayKeySchema = z.enum([
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
])

const ProcessingSettingsSchema = z.object({
  same_for_all_weekdays: z.boolean(),
  default_handover: HandoverDaySchema,
  // Zod 4: z.record(value) treats the arg as KEY schema — always pass key + value.
  weekdays: z.record(WeekdayKeySchema, HandoverDaySchema).optional(),
})

const CountryConfigSchema = z.object({
  active: z.boolean().default(true),
  shipping_cost: z.preprocess((value) => {
    if (typeof value === "string") {
      const normalized = value.trim().replace(",", ".")
      if (!normalized) return Number.NaN
      return Number(normalized)
    }
    return value
  }, z.number().finite().min(0)),
  free_shipping: z.boolean().default(false),
  free_shipping_threshold: z.preprocess((value) => {
    if (value == null || value === "") return null
    if (typeof value === "string") {
      const normalized = value.trim().replace(",", ".")
      if (!normalized) return null
      return Number(normalized)
    }
    return value
  }, z.number().finite().min(0).nullable().optional()),
  delivery_time_code: DeliveryTimeCodeSchema,
  delivery_days_max: z.number().int().min(0).max(365).nullable().optional(),
  delivery_weekdays: z.array(z.number().int().min(1).max(7)).optional(),
  carrier_ref: CarrierRefSchema.nullable().optional(),
})

export const StoreShippingProfileBody = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  status: z.enum(["draft", "active", "inactive"]).optional(),
  country_rates: z.record(z.string().length(2), CountryConfigSchema).default({}),
  processing_settings: ProcessingSettingsSchema.optional(),
  carrier_mode: z.enum(["own", "carrier"]).optional(),
  carrier_ref: CarrierRefSchema.nullable().optional(),
})
export type StoreShippingProfileBodyInput = z.infer<
  typeof StoreShippingProfileBody
>

export const StorePatchShippingProfileBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    status: z.enum(["draft", "active", "inactive"]).optional(),
    country_rates: z
      .record(z.string().length(2), CountryConfigSchema)
      .optional(),
    processing_settings: ProcessingSettingsSchema.optional(),
    carrier_mode: z.enum(["own", "carrier"]).optional(),
    carrier_ref: CarrierRefSchema.nullable().optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.description !== undefined ||
      body.status !== undefined ||
      body.country_rates !== undefined ||
      body.processing_settings !== undefined ||
      body.carrier_mode !== undefined ||
      body.carrier_ref !== undefined,
    { message: "Geef minstens één veld op om te wijzigen." }
  )
export type StorePatchShippingProfileBodyInput = z.infer<
  typeof StorePatchShippingProfileBody
>

export const StoreDuplicateShippingProfileBody = z.object({
  name: z.string().trim().min(1).max(120),
})
export type StoreDuplicateShippingProfileBodyInput = z.infer<
  typeof StoreDuplicateShippingProfileBody
>
