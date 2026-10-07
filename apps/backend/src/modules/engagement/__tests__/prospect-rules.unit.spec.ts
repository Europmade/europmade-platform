import {
  DEFAULT_ORGANIZATION_ROLE,
  DEFAULT_ORGANIZATION_SOURCE,
  DEFAULT_OUTREACH_STATUS,
  DEFAULT_SALES_MODEL,
  isSalesModel,
  normalizeContactEmail,
  normalizeOrganizationRoles,
} from "../prospect-rules"

describe("prospect CRM rules", () => {
  it("defaults an empty role set to unknown", () => {
    expect(normalizeOrganizationRoles(undefined)).toEqual(["unknown"])
    expect(normalizeOrganizationRoles([])).toEqual(["unknown"])
  })

  it("keeps several roles and rejects a single brand-or-seller type", () => {
    expect(
      normalizeOrganizationRoles(["brand", "seller", "brand"])
    ).toEqual(["brand", "seller"])
    expect(() => normalizeOrganizationRoles(["brand_owner"])).toThrow(/rol/)
  })

  it("uses the locked sales-model tokens, including direct_to_consumer", () => {
    expect(isSalesModel("direct_to_consumer")).toBe(true)
    expect(isSalesModel("DTC")).toBe(false)
    expect(isSalesModel(DEFAULT_SALES_MODEL)).toBe(true)
  })

  it("normalizes a contact email and rejects a missing address", () => {
    expect(normalizeContactEmail("  Ada@Example.com ")).toBe("ada@example.com")
    expect(() => normalizeContactEmail("geen-adres")).toThrow(/e-mail/)
  })

  it("keeps import defaults explicit", () => {
    expect(DEFAULT_OUTREACH_STATUS).toBe("new")
    expect(DEFAULT_ORGANIZATION_SOURCE).toBe("excel_import")
    expect(DEFAULT_ORGANIZATION_ROLE).toBe("unknown")
  })
})
