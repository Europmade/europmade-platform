import {
  composeVariantFromAxes,
  suggestVariantAxesForCategory,
} from "../variant-axes"

describe("variant axes compose", () => {
  it("uses single axis as type+value", () => {
    const r = composeVariantFromAxes([{ axis: "Kleur", value: "Zwart" }])
    expect(r).toEqual({ variant_type: "Kleur", variant_value: "Zwart" })
  })

  it("joins multi-axis values under Uitvoering", () => {
    const r = composeVariantFromAxes([
      { axis: "Kleur", value: "Zwart" },
      { axis: "Maat", value: "M" },
    ])
    expect(r.variant_type).toBe("Uitvoering")
    expect(r.variant_value).toBe("Zwart / M")
  })

  it("suggests clothing axes", () => {
    expect(suggestVariantAxesForCategory("Kleding")).toEqual(
      expect.arrayContaining(["Kleur", "Maat"])
    )
  })
})
