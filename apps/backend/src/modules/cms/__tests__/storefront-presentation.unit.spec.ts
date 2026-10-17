import {
  applyCategoryFilterControls,
  bannerImageStyle,
  parseBannerPresentation,
  parseBrandCardPresentation,
  selectConfiguredBrandSpotlights,
  suggestCategoryCopy,
} from "@europmade/utils"

describe("storefront presentation", () => {
  it("keeps a 2400x600 banner fillable with cover and a chosen position", () => {
    const presentation = parseBannerPresentation({
      fit: "cover",
      positionX: 20,
      positionY: 80,
      scale: 1.4,
      textColor: "white",
      buttonColor: "black",
    })
    expect(bannerImageStyle(presentation)).toEqual({
      objectFit: "cover",
      objectPosition: "20% 80%",
      transform: "scale(1.4)",
      transformOrigin: "20% 80%",
    })
  })

  it("uses contain when products must stay fully visible", () => {
    expect(parseBannerPresentation({ fit: "contain" }).fit).toBe("contain")
  })

  it("hides, renames and reorders only filters that exist on products", () => {
    const groups = [
      { attributeKey: "brand", label: "Merk" },
      { attributeKey: "color", label: "Kleur" },
      { attributeKey: "size", label: "Maat" },
    ]
    const next = applyCategoryFilterControls(groups, [
      { attributeKey: "size", visible: true, label: "Afmeting", sortOrder: 0 },
      { attributeKey: "brand", visible: true, label: "", sortOrder: 1 },
      { attributeKey: "color", visible: false, label: "Kleur", sortOrder: 2 },
      { attributeKey: "warranty", visible: true, label: "Garantie", sortOrder: 3 },
    ])
    expect(next.map((group) => group.attributeKey)).toEqual(["size", "brand"])
    expect(next[0]?.label).toBe("Afmeting")
    expect(next[1]?.label).toBe("Merk")
  })

  it("suggests only facts and never overwrites by itself", () => {
    const suggestion = suggestCategoryCopy({
      title: "Elektronica",
      productCount: 12,
      brands: ["Nordlux", "Nordlux", ""],
      attributes: ["Aansluiting"],
    })
    const text = JSON.stringify(suggestion)
    expect(text).toContain("12 producten")
    expect(text).toContain("Nordlux")
    expect(text).toContain("Aansluiting")
    expect(text).not.toMatch(/garant|keurmerk|gemaakt in|certified/i)
    expect(suggestion.usps.length).toBeGreaterThan(0)
  })

  it("shows the CMS brands and does not fill other popular brands", () => {
    const shown = selectConfiguredBrandSpotlights(
      [
        {
          slug: "",
          name: "Freiluft",
          image: "https://example.test/freiluft.jpg",
          logo: "https://example.test/logo.webp",
          description: "Buitenkeukens",
        },
        {
          slug: "bosch",
          name: "",
          image: "",
          logo: null,
        },
      ],
      [
        {
          slug: "bosch",
          name: "Bosch",
          image: "https://example.test/bosch-hero.jpg",
          logo: "https://example.test/bosch-logo.webp",
        },
        {
          slug: "beyerdynamic",
          name: "beyerdynamic",
          image: "https://example.test/beyerdynamic.jpg",
          logo: null,
        },
      ]
    )
    expect(shown.map((row) => row.name)).toEqual(["Freiluft", "Bosch"])
    expect(shown[0]?.image).toBe("https://example.test/freiluft.jpg")
    expect(shown[1]?.logo).toBe("https://example.test/bosch-logo.webp")
    expect(shown.some((row) => row.slug === "beyerdynamic")).toBe(false)
  })

  it("keeps brand-card logo size, position, text color and overlay within bounds", () => {
    expect(
      parseBrandCardPresentation({
        logoSize: 400,
        logoPosition: "right",
        textColor: "#ffffff",
        overlayStrength: -5,
      })
    ).toEqual({
      logoSize: 160,
      logoPosition: "right",
      textColor: "#ffffff",
      overlayStrength: 0,
    })
    expect(parseBrandCardPresentation({ textColor: "red" }).textColor).toBe(
      "#111827"
    )
  })
})
