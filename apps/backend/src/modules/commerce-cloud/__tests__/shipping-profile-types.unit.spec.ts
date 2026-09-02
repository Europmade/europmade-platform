import {
  defaultCountryConfig,
  defaultProcessingSettings,
  deliveryDaysMaxForCode,
  normalizeCountryConfig,
  resolveEffectiveShippingCost,
  validateShippingProfileInput,
} from "../shipping-profile-types"

describe("shipping profile types", () => {
  it("maps delivery time codes to max days", () => {
    expect(deliveryDaysMaxForCode("2_3")).toBe(3)
    expect(deliveryDaysMaxForCode("5_plus")).toBe(7)
  })

  it("normalizes legacy country rate shape", () => {
    const cfg = normalizeCountryConfig({
      shipping_cost: 4.95,
      delivery_days_max: 2,
    })
    expect(cfg?.shipping_cost).toBe(4.95)
    expect(cfg?.delivery_days_max).toBe(2)
    expect(cfg?.active).toBe(true)
  })

  it("resolves free shipping", () => {
    const cfg = defaultCountryConfig(6.95)
    expect(resolveEffectiveShippingCost({ ...cfg, free_shipping: true })).toBe(0)
    expect(resolveEffectiveShippingCost(cfg, 100)).toBe(6.95)
    expect(
      resolveEffectiveShippingCost(
        { ...cfg, free_shipping_threshold: 50 },
        60
      )
    ).toBe(0)
  })

  it("validates required profile fields", () => {
    const issues = validateShippingProfileInput({
      name: "",
      country_rates: {},
      processing_settings: defaultProcessingSettings(),
    })
    expect(issues.some((i) => i.field === "name")).toBe(true)
    expect(issues.some((i) => i.field === "country_rates")).toBe(true)
  })

  it("accepts active profile with one country", () => {
    const issues = validateShippingProfileInput({
      name: "Standaard pakket EU",
      country_rates: {
        NL: defaultCountryConfig(4.95),
      },
      processing_settings: defaultProcessingSettings(),
    })
    expect(issues).toHaveLength(0)
  })
})
