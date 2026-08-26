import {
  applyGpsrComplianceAttributes,
  manufacturerNeedsSeparateEuOperator,
  manufacturerToGpsrValues,
  overlayGpsrManufacturerAttributes,
} from "../gpsr-manufacturer"

describe("GPSR manufacturer overlay", () => {
  const manufacturer = {
    name: "Atelier Noord BV",
    street: "Keizersgracht",
    house_number: "11",
    postal_code: "1015CJ",
    city: "Amsterdam",
    country_code: "nl",
    contact_email: "gpsr@atelier.example",
  }

  it("maps a manufacturer profile to GPSR attribute values", () => {
    expect(manufacturerToGpsrValues(manufacturer)).toEqual({
      gpsr_manufacturer_name: "Atelier Noord BV",
      gpsr_manufacturer_address: "Keizersgracht 11",
      gpsr_manufacturer_postal_city: "1015CJ Amsterdam",
      gpsr_manufacturer_country: "NL",
      gpsr_manufacturer_email: "gpsr@atelier.example",
    })
  })

  it("uses live manufacturer data instead of copied product attributes", () => {
    const overlay = overlayGpsrManufacturerAttributes(
      [
        {
          code: "gpsr_manufacturer_name",
          value: "Oude naam per product",
        },
        { code: "ce_marking", value: "Zichtbaar" },
      ],
      manufacturer
    )
    expect(overlay.find((row) => row.code === "gpsr_manufacturer_name")?.value).toBe(
      "Atelier Noord BV"
    )
    expect(overlay.find((row) => row.code === "ce_marking")?.value).toBe(
      "Zichtbaar"
    )
  })

  it("leaves attributes unchanged without a manufacturer", () => {
    const attrs = [{ code: "gpsr_manufacturer_name", value: "Los ingevuld" }]
    expect(overlayGpsrManufacturerAttributes(attrs, null)).toEqual(attrs)
  })

  it("does not require a separate EU operator when the manufacturer is in the EU", () => {
    expect(manufacturerNeedsSeparateEuOperator(manufacturer)).toBe(false)
    const overlay = applyGpsrComplianceAttributes(
      [
        {
          code: "gpsr_eu_responsible_name",
          value: null,
          tier: "compliance_required",
          requirement_tier: "compliance_required",
        },
        {
          code: "gpsr_eu_responsible_address",
          value: "oud adres",
          tier: "compliance_required",
        },
      ],
      manufacturer
    )
    expect(
      overlay.find((row) => row.code === "gpsr_eu_responsible_name")?.tier
    ).toBe("not_applicable")
    expect(
      overlay.find((row) => row.code === "gpsr_eu_responsible_name")
        ?.requirement_tier
    ).toBe("not_applicable")
    expect(
      overlay.find((row) => row.code === "gpsr_eu_responsible_address")?.tier
    ).toBe("not_applicable")
  })

  it("keeps EU operator fields required when the manufacturer is outside the EU", () => {
    const nonEu = { ...manufacturer, country_code: "US" }
    expect(manufacturerNeedsSeparateEuOperator(nonEu)).toBe(true)
    const overlay = applyGpsrComplianceAttributes(
      [
        {
          code: "gpsr_eu_responsible_name",
          value: null,
          tier: "compliance_required",
          requirement_tier: "compliance_required",
        },
      ],
      nonEu
    )
    expect(
      overlay.find((row) => row.code === "gpsr_eu_responsible_name")?.tier
    ).toBe("compliance_required")
    expect(
      overlay.find((row) => row.code === "gpsr_eu_responsible_name")
        ?.requirement_tier
    ).toBe("compliance_required")
  })

  it("does not duplicate manufacturer fields as EU-responsible values", () => {
    const overlay = applyGpsrComplianceAttributes(
      [
        {
          code: "gpsr_manufacturer_name",
          value: "Oud",
          tier: "compliance_required",
        },
        {
          code: "gpsr_eu_responsible_name",
          value: null,
          tier: "compliance_required",
        },
      ],
      manufacturer
    )
    expect(
      overlay.find((row) => row.code === "gpsr_manufacturer_name")?.value
    ).toBe("Atelier Noord BV")
    expect(
      overlay.find((row) => row.code === "gpsr_eu_responsible_name")?.value
    ).toBeNull()
  })
})
