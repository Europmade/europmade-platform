import { StoreShippingProfileBody } from "../../../api/store/commerce-cloud/validators"

describe("StoreShippingProfileBody (Zod 4 record keys)", () => {
  const handover = {
    enabled: true,
    cutoff_time: "15:00",
    processing_time_code: "next_day" as const,
  }

  const nlRate = {
    active: true,
    shipping_cost: 4.95,
    free_shipping: false,
    free_shipping_threshold: null,
    delivery_time_code: "2_3" as const,
    delivery_days_max: 3,
    delivery_weekdays: [1, 2, 3, 4, 5, 6],
    carrier_ref: null,
  }

  it("accepts create payload with NL rate, decimals, and weekday processing settings", () => {
    const parsed = StoreShippingProfileBody.safeParse({
      name: "UAT Test Nederland",
      description: "Test verzendprofiel",
      status: "draft",
      country_rates: { NL: nlRate },
      processing_settings: {
        same_for_all_weekdays: true,
        default_handover: handover,
        weekdays: {
          mon: { ...handover },
          tue: { ...handover },
          wed: { ...handover },
          thu: { ...handover },
          fri: { ...handover },
          sat: { ...handover, enabled: false },
          sun: { ...handover, enabled: false },
        },
      },
      carrier_mode: "own",
      carrier_ref: null,
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.country_rates.NL.shipping_cost).toBe(4.95)
    expect(parsed.data.status).toBe("draft")
    expect(parsed.data.processing_settings?.weekdays?.mon?.cutoff_time).toBe(
      "15:00"
    )
  })

  it("accepts active status", () => {
    const parsed = StoreShippingProfileBody.safeParse({
      name: "Actief NL",
      status: "active",
      country_rates: { NL: nlRate },
      processing_settings: {
        same_for_all_weekdays: true,
        default_handover: handover,
        weekdays: {
          mon: { ...handover },
          tue: { ...handover },
          wed: { ...handover },
          thu: { ...handover },
          fri: { ...handover },
          sat: { ...handover, enabled: false },
          sun: { ...handover, enabled: false },
        },
      },
      carrier_mode: "own",
      carrier_ref: null,
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.status).toBe("active")
  })

  it("coerces comma decimal shipping cost strings", () => {
    const parsed = StoreShippingProfileBody.safeParse({
      name: "Decimal comma",
      status: "draft",
      country_rates: {
        NL: { ...nlRate, shipping_cost: "4,95" as unknown as number },
      },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.country_rates.NL.shipping_cost).toBe(4.95)
    }
  })
})
