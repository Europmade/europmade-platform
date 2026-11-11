import {
  buildCategoryFactPackages,
  loadCategoryFactSource,
  type CategoryFactSource,
} from "../category-fact-package"

function source(patch: Partial<CategoryFactSource> = {}): CategoryFactSource {
  return {
    categories: [
      { id: "mode", name: "Mode", slug: "mode", parent_id: null },
      { id: "e2e", name: "E2E Cat", slug: "", parent_id: null },
      { id: "el", name: "Elektronica", slug: "elektronica", parent_id: null },
      { id: "audio", name: "Audio", slug: "audio", parent_id: "el" },
      { id: "radio", name: "Radio", slug: "radio", parent_id: "audio" },
      { id: "tuin", name: "Tuin", slug: "tuin", parent_id: null },
    ],
    products: [
      { id: "p1", brand_id: "b1", lifecycle_status: "Actief" },
      { id: "p2", brand_id: "b2", lifecycle_status: "Gearchiveerd" },
      { id: "p3", brand_id: "b1", lifecycle_status: "Actief" },
      { id: "p4", brand_id: "b2", lifecycle_status: "Actief" },
    ],
    versions: [
      { id: "v1", product_id: "p1", version_number: 1, publication_status: "Gepubliceerd", title: "Radio" },
      { id: "v2", product_id: "p2", version_number: 2, publication_status: "Gepubliceerd", title: "Archief" },
      { id: "v2old", product_id: "p2", version_number: 1, publication_status: "Gepubliceerd", title: "Oud" },
      { id: "v3", product_id: "p3", version_number: 1, publication_status: "Concept", title: "Concept" },
    ],
    links: [
      { product_id: "p1", category_id: "radio" },
      { product_id: "p2", category_id: "el" },
      { product_id: "p3", category_id: "audio" },
      { product_id: "p4", category_id: "mode" },
    ],
    brands: [
      { id: "b1", name: "Noord", logo_url: "https://example.test/logo.svg", owner_company_country: "NL" },
      { id: "b2", name: "Zuid", logo_url: "", owner_company_country: "NL" },
    ],
    origins: [
      {
        product_version_id: "v1",
        production_country: "DE",
        primary_assembly_country: "DE",
        status: "Geverifieerd",
        production_facility_id: "fac",
        assembly_eu_band: "eu_100",
        parts_eu_level: "eu_majority",
        materials_eu_level: "eu_majority",
      },
      {
        product_version_id: "v2",
        production_country: "DUITSLAND",
        primary_assembly_country: null,
        status: "Niet aangevraagd",
        production_facility_id: "fac",
        assembly_eu_band: null,
        parts_eu_level: null,
        materials_eu_level: null,
      },
    ],
    facilities: [{ id: "fac", name: "Hal", country_code: "FR" }],
    definitions: [
      {
        id: "d1",
        category_id: "radio",
        code: "vermogen",
        name: "Vermogen",
        is_filterable: true,
        is_comparable: true,
        is_active: true,
        requirement_tier: "optional",
      },
      {
        id: "d2",
        category_id: "radio",
        code: "gpsr_manufacturer_country",
        name: "GPSR-land",
        is_filterable: true,
        is_comparable: true,
        is_active: true,
        requirement_tier: "compliance_required",
      },
    ],
    values: [{ product_version_id: "v1", attribute_definition_id: "d1", value: "800" }],
    relations: [],
    evidence: [
      { product_id: "p1", evidence_kind: "made_in_europe", verification_status: "approved" },
    ],
    ...patch,
  }
}

describe("category fact packages", () => {
  it("rolls published products up and leaves Mode and E2E Cat out", () => {
    const packages = buildCategoryFactPackages(source())
    expect(packages.map((row) => row.slug).sort()).toEqual(["audio", "elektronica", "radio", "tuin"])
    const hub = packages.find((row) => row.slug === "elektronica")!
    expect(hub.profile).toBe("level_1")
    expect(hub.available_facts.counts).toMatchObject({
      linked: 3,
      published: 2,
      active: 2,
      direct_published: 1,
    })
    expect(hub.available_facts.children.map((child) => [child.slug, child.published_count])).toEqual([
      ["audio", 1],
    ])
    expect(hub.available_facts.published_products.map((product) => product.id)).toEqual(["p2", "p1"])
    expect(packages.find((row) => row.slug === "tuin")!.missing_data.map((gap) => gap.code)).toContain(
      "empty_product_tree"
    )
  })

  it("does not treat a brand country, a facility country or a free-text country as European origin", () => {
    const hub = buildCategoryFactPackages(source()).find((row) => row.slug === "elektronica")!
    expect(hub.derived_insights.eu_market_production_product_count).toBe(1)
    expect(hub.derived_insights.made_in_europe_score_count).toBe(1)
    expect(hub.derived_insights.made_in_europe_with_approved_evidence_count).toBe(1)
    expect(hub.available_facts.production_countries.map((row) => row.raw).sort()).toEqual(["DE", "DUITSLAND"])
    const prose = hub.available_facts.origins.find((row) => row.product_id === "p2")!
    expect(prose.iso_code).toBeNull()
    expect(prose.facility_country).toBe("FR")
    expect(prose.production_country).toBe("DUITSLAND")
    expect(prose.made_in_europe).toBe(false)
    expect(hub.available_facts.brands.find((brand) => brand.id === "b1")!.owner_company_country).toBe("NL")
    expect(hub.missing_data.map((gap) => gap.code)).toContain("brand_country_not_in_model")
    expect(hub.missing_data.map((gap) => gap.code)).toContain("production_country_not_iso")
  })

  it("keeps profile blocks factual and fingerprints only stored product data", () => {
    const packages = buildCategoryFactPackages(source())
    const hub = packages.find((row) => row.slug === "elektronica")!
    const leaf = packages.find((row) => row.slug === "radio")!
    expect(hub.editorial_opportunities.map((row) => row.block)).toEqual([
      "subcategory_tiles",
      "product_carousel",
      "product_carousel",
      "brand_overview",
      "brand_overview",
      "why_europmade",
      "why_europmade",
      "why_europmade",
    ])
    expect(leaf.editorial_opportunities.map((row) => row.block)).toContain("filters")
    expect(leaf.editorial_opportunities.map((row) => row.block)).not.toContain("subcategory_tiles")
    expect(leaf.available_facts.specification_summary.filterable_count).toBe(1)
    expect(hub.available_facts.definitions.map((row) => row.code)).toEqual(["vermogen"])
    expect(JSON.stringify(hub.editorial_opportunities)).not.toMatch(/producten in|Merken in/)
    const again = buildCategoryFactPackages(source())
    expect(again.find((row) => row.slug === "radio")!.fingerprint).toBe(leaf.fingerprint)
    const changed = buildCategoryFactPackages(source({
      values: [{ product_version_id: "v1", attribute_definition_id: "d1", value: "900" }],
    }))
    expect(changed.find((row) => row.slug === "radio")!.fingerprint).not.toBe(leaf.fingerprint)
  })

  it("pages every service list until a short page and does not query per product", async () => {
    const skips: number[] = []
    const listProducts = async (_filters: Record<string, unknown>, config: { skip: number }) => {
      skips.push(config.skip)
      if (config.skip === 0) {
        return Array.from({ length: 500 }, (_, index) => ({
          id: `p${index}`,
          brand_id: null,
          lifecycle_status: "Actief",
        }))
      }
      return [{ id: "plast", brand_id: "b", lifecycle_status: "Actief" }]
    }
    const empty = async () => []
    const loaded = await loadCategoryFactSource({
      listCategories: empty,
      listProducts,
      listProductVersions: empty,
      listProductCategories: empty,
      listAttributeDefinitions: empty,
      listAttributeValues: empty,
      listProductRelations: empty,
      listBrands: empty,
      listProductionFacilities: empty,
      listProductOrigins: empty,
      listProductOriginEvidences: empty,
    })
    expect(skips).toEqual([0, 500])
    expect(loaded.products).toHaveLength(501)
  })
})
