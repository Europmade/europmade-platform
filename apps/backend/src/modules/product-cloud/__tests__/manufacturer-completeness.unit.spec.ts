import { resolveEffectiveManufacturerId } from "../manufacturer-completeness"

describe("resolveEffectiveManufacturerId", () => {
  it("prefers explicit manufacturer_id", () => {
    expect(
      resolveEffectiveManufacturerId({
        manufacturer_id: "mfr_123",
        mie_facility_id: "pfac_456",
        resolved_manufacturer_name: "Acme",
      })
    ).toBe("mfr_123")
  })

  it("accepts production facility when manufacturer_id is empty", () => {
    expect(
      resolveEffectiveManufacturerId({
        manufacturer_id: "",
        mie_facility_id: "pfac_789",
        resolved_manufacturer_name: null,
      })
    ).toBe("pfac_789")
  })

  it("accepts resolved manufacturer profile when only GPSR name is known", () => {
    expect(
      resolveEffectiveManufacturerId({
        manufacturer_id: null,
        mie_facility_id: null,
        resolved_manufacturer_name: "Fabrikant BV",
      })
    ).toBe("manufacturer-resolved")
  })

  it("returns null when no manufacturer or facility is linked", () => {
    expect(
      resolveEffectiveManufacturerId({
        manufacturer_id: "  ",
        mie_facility_id: null,
        resolved_manufacturer_name: "",
      })
    ).toBeNull()
  })
})
