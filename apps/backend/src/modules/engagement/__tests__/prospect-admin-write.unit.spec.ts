import {
  assertContactEmailAvailable,
  assertRoleAvailable,
  planContactIdentity,
  planOrganizationIdentity,
  planOutreachStatus,
  planRoleRemoval,
  refuseManualConversionChange,
} from "../prospect-rules"

describe("prospect admin write", () => {
  it("maakt een organisatie met de bestaande defaults", () => {
    expect(
      planOrganizationIdentity({
        company_name: "  Noord & Co  ",
        self_classification_payload: { route: "direct" },
      })
    ).toEqual({
      company_name: "Noord & Co",
      website: null,
      category: null,
      sales_model: "unknown",
      outreach_status: "new",
      source: "excel_import",
      outreach_purpose: null,
      self_classification_payload: { route: "direct" },
    })
  })

  it("accepteert de vaste prospectstatus en laat de oude default staan", () => {
    expect(planOutreachStatus(" in_gesprek ")).toBe("in_gesprek")
    expect(planOutreachStatus(undefined)).toBe("new")
    expect(planOutreachStatus("new", "new")).toBe("new")
    expect(planOutreachStatus("eigen tekst", "eigen tekst")).toBe("eigen tekst")
    expect(() => planOutreachStatus("willekeurig")).toThrow(/prospectstatus/)
  })

  it("weigert een ongeldig sales_model", () => {
    expect(() =>
      planOrganizationIdentity({
        company_name: "Noord",
        sales_model: "DTC",
      })
    ).toThrow(/direct_to_consumer/)
  })

  it("weigert handmatige conversierefs", () => {
    expect(() =>
      refuseManualConversionChange({ converted_customer_id: "cus_1" })
    ).toThrow(/convertOrganization/)
    expect(() =>
      refuseManualConversionChange({ converted_seller_id: null })
    ).toThrow(/convertOrganization/)
    expect(() => refuseManualConversionChange({})).not.toThrow()
  })

  it("weigert een dubbele rol en een onbekende rol", () => {
    expect(() => assertRoleAvailable(["brand"], "brand")).toThrow(/bestaat al/)
    expect(() => assertRoleAvailable(["unknown"], "seller")).not.toThrow()
    expect(() => planRoleRemoval(["brand"], "catalog_brand")).toThrow(/rol/)
  })

  it("zet unknown terug als de laatste andere rol verdwijnt", () => {
    expect(planRoleRemoval(["seller"], "seller")).toEqual({
      remove: "seller",
      restoreUnknown: true,
    })
    expect(planRoleRemoval(["brand", "unknown"], "unknown")).toEqual({
      remove: "unknown",
      restoreUnknown: false,
    })
  })

  it("laat de enige unknown-rol staan", () => {
    expect(() => planRoleRemoval(["unknown"], "unknown")).toThrow(
      /unknown blijft staan/
    )
  })

  it("vereist een organisatie en een unieke e-mail voor een contact", () => {
    expect(
      planContactIdentity({
        organization_id: " eorg_1 ",
        email: " Ada@Example.com ",
        name: " Ada ",
      })
    ).toEqual({
      organization_id: "eorg_1",
      email: "ada@example.com",
      name: "Ada",
    })
    expect(() =>
      planContactIdentity({ organization_id: " ", email: "a@b.nl" })
    ).toThrow(/organization_id/)
    expect(() =>
      assertContactEmailAvailable(["ada@example.com"], "ada@example.com")
    ).toThrow(/bestaat al/)
  })
})
