import { planGtinAssignment } from "../gtin-validation"

const VALID = "4242005482320"

describe("admin GTIN assignment", () => {
  it("accepts a valid checksum and reports an unchanged value", () => {
    expect(
      planGtinAssignment({
        raw: "4242 0054 82320",
        productId: "prod_a",
        currentValue: VALID,
        owners: [{ identifier_id: "idn_1", product_id: "prod_a", value: VALID }],
      })
    ).toEqual({ ok: true, digits: VALID, unchanged: true })
  })

  it("rejects a bad checksum and a duplicate on another product", () => {
    expect(
      planGtinAssignment({
        raw: "4242005482321",
        productId: "prod_a",
        currentValue: VALID,
        owners: [],
      })
    ).toEqual({ ok: false, message: "EAN/GTIN is ongeldig (lengte of checksum)." })

    expect(
      planGtinAssignment({
        raw: VALID,
        productId: "prod_b",
        currentValue: null,
        owners: [{ identifier_id: "idn_1", product_id: "prod_a", value: VALID }],
      })
    ).toEqual({
      ok: false,
      message: "Deze EAN/GTIN hoort al bij een ander product (prod_a).",
    })
  })

  it("allows the same product to keep or replace its own GTIN", () => {
    const next = planGtinAssignment({
      raw: "4006381333931",
      productId: "prod_a",
      currentValue: VALID,
      owners: [{ identifier_id: "idn_1", product_id: "prod_a", value: VALID }],
    })
    expect(next).toEqual({ ok: true, digits: "4006381333931", unchanged: false })
  })
})
