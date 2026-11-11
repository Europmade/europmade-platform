import { discountLabelKind } from "../discount-label"

describe("discountLabelKind", () => {
  it("returns no label without a valid regular price above the current price", () => {
    expect(discountLabelKind(null, 9000)).toBeNull()
    expect(discountLabelKind(undefined, 9000)).toBeNull()
    expect(discountLabelKind(10000, null)).toBeNull()
    expect(discountLabelKind(10000, 0)).toBeNull()
    expect(discountLabelKind(10000, 10000)).toBeNull()
    expect(discountLabelKind(9000, 10000)).toBeNull()
    expect(discountLabelKind(Number.NaN, 9000)).toBeNull()
  })

  it("labels a discount under or exactly 10 percent as discount", () => {
    expect(discountLabelKind(10000, 9500)).toBe("discount")
    expect(discountLabelKind(10000, 9000)).toBe("discount")
  })

  it("labels a discount above 10 percent as high discount", () => {
    expect(discountLabelKind(10000, 8999)).toBe("high_discount")
    expect(discountLabelKind(10000, 5000)).toBe("high_discount")
  })
})
