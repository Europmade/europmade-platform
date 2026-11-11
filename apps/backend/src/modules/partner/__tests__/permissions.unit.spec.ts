import {
  assertPermission,
  hasPermission,
  normalizeRoleFlags,
  permissionsFromSeller,
  rolesFromSeller,
} from "../permissions"

describe("partner permissions (P2.6)", () => {
  it("maps a retailer-only partner to marketplace rights without brand edit", () => {
    const flags = { is_retailer: true }
    expect(rolesFromSeller(flags)).toEqual(["RETAILER"])
    expect(hasPermission(flags, "offers.manage")).toBe(true)
    expect(hasPermission(flags, "orders.manage")).toBe(true)
    expect(hasPermission(flags, "products.submit_approval")).toBe(true)
    expect(hasPermission(flags, "brands.view")).toBe(true)
    expect(hasPermission(flags, "brands.edit_description")).toBe(false)
    expect(hasPermission(flags, "facilities.manage")).toBe(false)
    expect(hasPermission(flags, "mie.manage")).toBe(false)
  })

  it("lets a brand owner edit description, facilities and Made in Europe, not offers", () => {
    const flags = { is_brand_owner: true }
    expect(rolesFromSeller(flags)).toEqual(["BRAND_OWNER"])
    expect(hasPermission(flags, "brands.edit_description")).toBe(true)
    expect(hasPermission(flags, "brands.manage")).toBe(true)
    expect(hasPermission(flags, "facilities.manage")).toBe(true)
    expect(hasPermission(flags, "mie.manage")).toBe(true)
    expect(hasPermission(flags, "offers.manage")).toBe(false)
  })

  it("lets a producer manage facilities and Made in Europe, not brand description", () => {
    const flags = { is_producer: true }
    expect(rolesFromSeller(flags)).toEqual(["PRODUCER"])
    expect(hasPermission(flags, "facilities.manage")).toBe(true)
    expect(hasPermission(flags, "mie.manage")).toBe(true)
    expect(hasPermission(flags, "brands.edit_description")).toBe(false)
    expect(hasPermission(flags, "offers.manage")).toBe(false)
  })

  it("combines retailer + brand owner + producer", () => {
    const flags = {
      is_retailer: true,
      is_brand_owner: true,
      is_producer: true,
    }
    expect(rolesFromSeller(flags)).toEqual([
      "RETAILER",
      "BRAND_OWNER",
      "PRODUCER",
    ])
    const permissions = permissionsFromSeller(flags)
    expect(permissions).toEqual(
      expect.arrayContaining([
        "offers.manage",
        "brands.edit_description",
        "facilities.manage",
        "mie.manage",
      ])
    )
  })

  it("treats legacy is_producer_or_brand_owner as both brand owner and producer", () => {
    const flags = { is_producer_or_brand_owner: true }
    const normalized = normalizeRoleFlags(flags)
    expect(normalized.is_brand_owner).toBe(true)
    expect(normalized.is_producer).toBe(true)
    expect(hasPermission(flags, "brands.edit_description")).toBe(true)
    expect(hasPermission(flags, "mie.manage")).toBe(true)
  })

  it("does not let a producer-only partner edit brand description", () => {
    expect(() =>
      assertPermission({ is_producer: true }, "brands.edit_description")
    ).toThrow(/brands.edit_description/)
  })

  it("clears brand-owner/producer when split flags are explicitly false", () => {
    const flags = {
      is_retailer: true,
      is_brand_owner: false,
      is_producer: false,
      is_producer_or_brand_owner: true,
    }
    const normalized = normalizeRoleFlags({
      ...flags,
      is_producer_or_brand_owner:
        flags.is_brand_owner || flags.is_producer,
    })
    expect(normalized.is_brand_owner).toBe(false)
    expect(normalized.is_producer).toBe(false)
    expect(hasPermission(normalized, "brands.edit_description")).toBe(false)
  })
})
