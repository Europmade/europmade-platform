import { adminParentCategoryOptions } from "@europmade/utils"
import { resolveEffectiveMadeInEuropeBands } from "../../../api/store/product-cloud/made-in-europe-helpers"

describe("admin parent category dropdown", () => {
  const rows = [
    { id: "baby-full", name: "Baby & Kind", slug: "baby-en-kind", parent_id: null, link_count: 5 },
    { id: "baby-empty", name: "Baby & Kind", slug: "baby-kind", parent_id: null, link_count: 0 },
    { id: "e2e", name: "E2E Cat", slug: null, parent_id: null, link_count: 11 },
    { id: "robot", name: "Robotstofzuiger", slug: "robotstofzuiger", parent_id: null, link_count: 26 },
    { id: "mode", name: "Mode", slug: "mode", parent_id: null, link_count: 0 },
    { id: "kleding", name: "Kleding", slug: "kleding", parent_id: null, link_count: 15 },
    { id: "heren", name: "Heren", slug: "heren", parent_id: "kleding", link_count: 6 },
  ]

  it("shows one parent per canonical name and hides technical roots", () => {
    const options = adminParentCategoryOptions(rows)
    const names = options.map((row) => row.name)
    expect(names.filter((name) => name === "Baby & Kind")).toHaveLength(1)
    expect(options.find((row) => row.name === "Baby & Kind")?.id).toBe("baby-full")
    expect(names).not.toContain("E2E Cat")
    expect(names).not.toContain("Robotstofzuiger")
    expect(names).not.toContain("Mode")
    expect(names).not.toContain("Heren")
    expect(names).toContain("Kleding")
  })

  it("keeps a selected technical or duplicate category so existing links are not dropped", () => {
    const options = adminParentCategoryOptions(rows, ["e2e", "baby-empty"])
    expect(options.some((row) => row.id === "e2e")).toBe(true)
    expect(options.find((row) => row.name === "Baby & Kind")?.id).toBe("baby-empty")
  })
})

describe("made in europe band resolution", () => {
  it("does not default a facility-only update to eu_100", () => {
    const bands = resolveEffectiveMadeInEuropeBands(
      { production_facility_id: "fac_1" },
      {
        id: "fac_1",
        brand_id: "brand_1",
        name: "Locatie",
        country_code: "DE",
      },
      null
    )
    expect(bands.assembly_eu_band).toBeNull()
    expect(bands.parts_eu_level).toBeNull()
    expect(bands.materials_eu_level).toBeNull()
    expect(bands.primary_assembly_country).toBe("DE")
  })

  it("keeps bands that were already stored", () => {
    const bands = resolveEffectiveMadeInEuropeBands(
      { production_facility_id: "fac_1" },
      null,
      {
        assembly_eu_band: "eu_75_99",
        parts_eu_level: "eu_partial",
        materials_eu_level: "eu_none",
        primary_assembly_country: "NL",
      }
    )
    expect(bands.assembly_eu_band).toBe("eu_75_99")
    expect(bands.parts_eu_level).toBe("eu_partial")
    expect(bands.materials_eu_level).toBe("eu_none")
  })
})
