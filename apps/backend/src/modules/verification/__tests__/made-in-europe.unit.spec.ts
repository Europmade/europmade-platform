import {
  computeMadeInEuropeScore,
  isAssemblyEuBand,
  isEuCountryCode,
  isMaterialsEuLevel,
  isPartsEuLevel,
} from "../made-in-europe"

describe("Made in Europe score engine", () => {
  it("scores 100% assembly + majority parts/materials as 100", () => {
    const score = computeMadeInEuropeScore({
      assembly_eu_band: "eu_100",
      parts_eu_level: "eu_majority",
      materials_eu_level: "eu_majority",
      primary_assembly_country: "NL",
    })
    expect(score.is_made_in_europe).toBe(true)
    expect(score.score).toBe(100)
    expect(score.assembly_points).toBe(75)
    expect(score.parts_points).toBe(15)
    expect(score.materials_points).toBe(10)
  })

  it("scores 75–99% assembly band as 56 + parts/materials", () => {
    const score = computeMadeInEuropeScore({
      assembly_eu_band: "eu_75_99",
      parts_eu_level: "eu_majority",
      materials_eu_level: "eu_majority",
      primary_assembly_country: "DE",
    })
    expect(score.is_made_in_europe).toBe(true)
    expect(score.score).toBe(81)
    expect(score.assembly_points).toBe(56)
  })

  it("scores 50–74% assembly band as 38 + parts/materials", () => {
    const score = computeMadeInEuropeScore({
      assembly_eu_band: "eu_50_74",
      parts_eu_level: "eu_partial",
      materials_eu_level: "eu_partial",
      primary_assembly_country: "FR",
    })
    expect(score.is_made_in_europe).toBe(true)
    expect(score.score).toBe(51)
    expect(score.assembly_points).toBe(38)
    expect(score.parts_points).toBe(8)
    expect(score.materials_points).toBe(5)
  })

  it("rejects <50% assembly as not Made in Europe", () => {
    const score = computeMadeInEuropeScore({
      assembly_eu_band: "eu_below_50",
      parts_eu_level: "eu_majority",
      materials_eu_level: "eu_majority",
      primary_assembly_country: "IT",
    })
    expect(score.is_made_in_europe).toBe(false)
    expect(score.score).toBeNull()
    expect(score.assembly_points).toBe(0)
  })

  it("rejects non-EU primary assembly country", () => {
    const score = computeMadeInEuropeScore({
      assembly_eu_band: "eu_100",
      parts_eu_level: "eu_majority",
      materials_eu_level: "eu_majority",
      primary_assembly_country: "CN",
    })
    expect(score.is_made_in_europe).toBe(false)
    expect(score.score).toBeNull()
  })

  it("handles parts/materials none variants", () => {
    const score = computeMadeInEuropeScore({
      assembly_eu_band: "eu_100",
      parts_eu_level: "eu_none",
      materials_eu_level: "eu_none",
      primary_assembly_country: "PL",
    })
    expect(score.is_made_in_europe).toBe(true)
    expect(score.score).toBe(75)
  })

  it("never accepts seller-entered numeric score fields (engine only)", () => {
    // Type surface has no `score` input — only bands/levels.
    const score = computeMadeInEuropeScore({
      assembly_eu_band: "eu_75_99",
      parts_eu_level: "eu_none",
      materials_eu_level: "eu_partial",
    })
    expect(score.score).toBe(61)
    expect(Object.keys(score)).not.toContain("manual_score")
  })

  it("validates stable IDs", () => {
    expect(isAssemblyEuBand("eu_100")).toBe(true)
    expect(isAssemblyEuBand("100")).toBe(false)
    expect(isPartsEuLevel("eu_majority")).toBe(true)
    expect(isMaterialsEuLevel("eu_partial")).toBe(true)
    expect(isEuCountryCode("nl")).toBe(true)
    expect(isEuCountryCode("UK")).toBe(false)
  })
})
