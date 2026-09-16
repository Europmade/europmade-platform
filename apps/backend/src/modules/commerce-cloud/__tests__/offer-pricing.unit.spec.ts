import { buildEffectivePriceView, isPromoActive } from "../offer-pricing"

describe("Offer pricing / promo window", () => {
  it("uses regular price when no promo", () => {
    const view = buildEffectivePriceView({
      base_price: 249,
      shipping_cost: 4.95,
    })
    expect(view.promo_active).toBe(false)
    expect(view.unit_price).toBe(249)
    expect(view.total_customer_price).toBe(253.95)
    expect(view.discount_amount).toBe(0)
  })

  it("applies promo inside window", () => {
    const now = new Date("2026-08-16T12:00:00Z")
    const view = buildEffectivePriceView({
      base_price: 249,
      shipping_cost: 4.95,
      promo_price: 199,
      promo_starts_at: "2026-08-01T00:00:00Z",
      promo_ends_at: "2026-08-31T23:59:59Z",
      now,
    })
    expect(view.promo_active).toBe(true)
    expect(view.unit_price).toBe(199)
    expect(view.discount_amount).toBe(50)
    expect(view.discount_percent).toBe(20.1)
    expect(view.total_customer_price).toBeCloseTo(203.95)
  })

  it("ignores promo outside window", () => {
    expect(
      isPromoActive({
        promo_price: 100,
        promo_starts_at: "2026-09-01T00:00:00Z",
        promo_ends_at: "2026-09-30T00:00:00Z",
        now: new Date("2026-08-16T12:00:00Z"),
      })
    ).toBe(false)
  })

  it("adds extra delivery cost to customer total without changing unit price", () => {
    const view = buildEffectivePriceView({
      base_price: 199,
      shipping_cost: 4.95,
      extra_delivery_cost: 2,
    })
    expect(view.unit_price).toBe(199)
    expect(view.total_customer_price).toBeCloseTo(205.95)
  })
})
