import { describe, expect, it } from "@jest/globals"
import {
  AFFILIATE_RETURN_HOLD_DAYS,
  affiliateEligibleAt,
  isAffiliateCommissionPastHold,
  prorateAffiliateCommission,
  resolveAffiliateRefundDisposition,
} from "../affiliate-hold-rules"

describe("affiliate-hold-rules", () => {
  const orderAt = new Date("2026-01-01T12:00:00.000Z")

  it("uses 30-day hold", () => {
    expect(AFFILIATE_RETURN_HOLD_DAYS).toBe(30)
  })

  it("pending before 30 days", () => {
    const day29 = new Date("2026-01-30T12:00:00.000Z")
    expect(isAffiliateCommissionPastHold(orderAt, day29)).toBe(false)
  })

  it("eligible at exact 30 days", () => {
    const day30 = affiliateEligibleAt(orderAt)
    expect(isAffiliateCommissionPastHold(orderAt, day30)).toBe(true)
  })

  it("eligible after 30 days", () => {
    const day45 = new Date("2026-02-15T12:00:00.000Z")
    expect(isAffiliateCommissionPastHold(orderAt, day45)).toBe(true)
  })

  it("full reverse within hold when no/partial covers full", () => {
    expect(
      resolveAffiliateRefundDisposition({
        orderCreatedAt: orderAt,
        originalCommission: 10,
        originalSubtotal: 100,
        refundAmount: 100,
        now: new Date("2026-01-10T12:00:00.000Z"),
      })
    ).toEqual({ action: "full_reverse" })
  })

  it("prorates partial refund within hold", () => {
    const d = resolveAffiliateRefundDisposition({
      orderCreatedAt: orderAt,
      originalCommission: 10,
      originalSubtotal: 100,
      refundAmount: 50,
      now: new Date("2026-01-10T12:00:00.000Z"),
    })
    expect(d).toEqual({ action: "prorate", new_amount: 5 })
  })

  it("locks after hold — no reverse", () => {
    expect(
      resolveAffiliateRefundDisposition({
        orderCreatedAt: orderAt,
        originalCommission: 10,
        originalSubtotal: 100,
        refundAmount: 100,
        now: new Date("2026-02-15T12:00:00.000Z"),
      })
    ).toEqual({ action: "lock", reason: "past_hold" })
  })

  it("locks partial refund after hold", () => {
    expect(
      resolveAffiliateRefundDisposition({
        orderCreatedAt: orderAt,
        originalCommission: 10,
        originalSubtotal: 100,
        refundAmount: 50,
        now: new Date("2026-02-15T12:00:00.000Z"),
      })
    ).toEqual({ action: "lock", reason: "past_hold" })
  })

  it("prorate helper", () => {
    expect(prorateAffiliateCommission(11, 100, 25)).toBe(8.25)
    expect(prorateAffiliateCommission(10, 100, 100)).toBe(0)
  })
})
