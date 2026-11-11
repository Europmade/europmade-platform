import { chooseCategoryPlacementAd, selectCategoryBrandBanner } from "../category-brand-banner"

const day = new Date("2026-11-11T12:00:00.000Z")

describe("category brand banner", () => {
  it("skips a brand without an official logo", () => {
    const banner = selectCategoryBrandBanner(
      [
        { brand: "Miele", brandSlug: "miele", title: "Miele wasmachine", slug: "miele-1" },
        { brand: " ", title: "Zonder merk" },
      ],
      "wasmachines",
      day
    )
    expect(banner).toBeNull()
  })

  it("builds the headline and subline from the product description", () => {
    const banner = selectCategoryBrandBanner(
      [
        {
          brand: "Bosch",
          brandSlug: "bosch",
          brandLogoUrl: "/brands/bosch.svg",
          brandPagePublished: true,
          slug: "smd",
          title: "Bosch Serie 8 volledig geïntegreerde vaatwasser 60 cm",
          description:
            "De Bosch series 8 SMD8TCX04E inbouwvaatwasser is een volledig geïntegreerde vaatwasser van 60 cm breed en biedt extra programma's.",
        },
        {
          brand: "Miele",
          brandSlug: "miele",
          brandLogoUrl: "/brands/miele.svg",
          title: "Miele wasmachine",
          slug: "miele-1",
        },
      ],
      "huishouden",
      day
    )
    expect(banner?.brandName).toBe("Bosch")
    expect(banner?.headline).toBe("Serie 8 inbouwvaatwasser")
    expect(banner?.headline).not.toContain("Bosch")
    expect(banner?.subline.toLowerCase()).toContain("geïntegreerde vaatwasser")
    expect(banner?.subline.toLowerCase()).not.toContain("europa")
    expect(banner?.scene).toBe("kitchen")
  })

  it("rotates brands that are equally documented", () => {
    const products = [
      { brand: "Bosch", brandSlug: "bosch", brandLogoUrl: "/bosch.svg", title: "Bosch Series 6 Washing Machine 9 kg", slug: "b" },
      { brand: "Siemens", brandSlug: "siemens", brandLogoUrl: "/siemens.svg", title: "Siemens Series 6 Washing Machine 9 kg", slug: "s" },
    ]
    const first = selectCategoryBrandBanner(products, "wasmachines", day)
    expect(first).toEqual(selectCategoryBrandBanner(products, "wasmachines", day))
    const seen = new Set<string>()
    for (let offset = 0; offset < 14; offset += 1) {
      const banner = selectCategoryBrandBanner(products, "wasmachines", new Date(Date.UTC(2026, 10, 11 + offset, 12)))
      seen.add(banner?.brandName ?? "")
    }
    expect(seen).toEqual(new Set(["Bosch", "Siemens"]))
    expect(first?.headline).toBe("Serie 6 wasmachine")
    expect(first?.subline).toBe("Wasmachine van 9 kg.")
    expect(first?.scene).toBe("laundry")
  })

  it("returns nothing when the products have no recognizable type", () => {
    expect(
      selectCategoryBrandBanner(
        [{ brand: "Bosch", brandLogoUrl: "/bosch.svg", title: "Accessoire", slug: "x" }],
        "tuin",
        day
      )
    ).toBeNull()
  })

  it("lets a live campaign replace the brand banner and returns the brand afterwards", () => {
    expect(chooseCategoryPlacementAd(true, true).kind).toBe("sponsored")
    expect(chooseCategoryPlacementAd(false, true).kind).toBe("brand")
    expect(chooseCategoryPlacementAd(false, false).kind).toBe("none")
  })
})
