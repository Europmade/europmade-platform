import {
  BRAND_SPOTLIGHT_FRAME_CLASS,
  BRAND_SPOTLIGHT_GRID_CLASS,
  CAMPAIGN_CARD_FRAME_CLASS,
  CAMPAIGN_CARD_MEDIA_CLASS,
  brandCardStyleFromLegacy,
  brandSpotlightHref,
  cardShowsButton,
  defaultCampaignCardStyle,
  parseCampaignCardStyle,
  singleCardHref,
} from "@europmade/utils"

describe("campaign card overlay", () => {
  it("keeps a readable left layout when a campaign has no card settings", () => {
    expect(parseCampaignCardStyle(undefined)).toEqual(defaultCampaignCardStyle())
    expect(parseCampaignCardStyle(undefined)).toMatchObject({
      logo: null,
      horizontal: "left",
      vertical: "center",
      textAlign: "left",
      overlay: "light",
      titleColor: "#151515",
    })
  })

  it("keeps logo scale, colours and position inside bounds", () => {
    const card = parseCampaignCardStyle({
      logo: "https://example.test/logo.webp",
      logoWidth: 400,
      horizontal: "right",
      vertical: "bottom",
      textAlign: "center",
      titleColor: "#ffffff",
      descriptionColor: "#eeeeee",
      overlay: "dark",
      cta: {
        preset: "transparent",
      },
    })
    expect(card.logoWidth).toBe(220)
    expect(card).toMatchObject({
      logo: "https://example.test/logo.webp",
      horizontal: "right",
      vertical: "bottom",
      textAlign: "center",
      titleColor: "#ffffff",
      descriptionColor: "#eeeeee",
      overlay: "dark",
    })
    expect(card.cta.transparent).toBe(true)
    expect(card.cta.text).toBe("#ffffff")
    expect(card.cta.border).toBe("#ffffff")
  })

  it("ignores an invalid colour and a missing logo", () => {
    const card = parseCampaignCardStyle({
      logo: "  ",
      titleColor: "red",
      logoWidth: 10,
      overlay: "huge",
    })
    expect(card.logo).toBeNull()
    expect(card.titleColor).toBe("#151515")
    expect(card.logoWidth).toBe(48)
    expect(card.overlay).toBe("light")
    expect(card.showCta).toBe(true)
  })

  it("hides the button without adding a second link", () => {
    const visible = defaultCampaignCardStyle()
    expect(cardShowsButton(visible, "Shop nu")).toBe(true)
    expect(cardShowsButton({ showCta: false }, "Shop nu")).toBe(false)
    expect(cardShowsButton(visible, "  ")).toBe(false)
    expect(singleCardHref("  /acties/herfst-mode  ")).toBe("/acties/herfst-mode")
    expect(singleCardHref("   ")).toBeNull()
    expect(parseCampaignCardStyle({ showCta: false }).showCta).toBe(false)
    expect(parseCampaignCardStyle({}).showCta).toBe(true)
  })

  it("opens a brand card through one explicit link or the brand page", () => {
    expect(brandSpotlightHref({ href: " /merk/bosch ", slug: "other" })).toBe(
      "/merk/bosch"
    )
    expect(brandSpotlightHref({ href: "", slug: "bosch" })).toBe("/merk/bosch")
    expect(brandSpotlightHref({ href: "  ", slug: "  " })).toBeNull()
    const legacy = brandCardStyleFromLegacy({
      logo: "https://example.test/logo.webp",
      logoPosition: "right",
      textColor: "#ffffff",
      overlayStrength: 62,
    })
    expect(legacy.showCta).toBe(false)
    expect(legacy).toMatchObject({
      logo: "https://example.test/logo.webp",
      horizontal: "right",
      textAlign: "right",
      titleColor: "#ffffff",
      descriptionColor: "#ffffff",
      overlay: "light",
    })
    expect(
      brandCardStyleFromLegacy({
        card: { showCta: true, horizontal: "center", logoWidth: 80 },
      }).showCta
    ).toBe(true)
  })

  it("keeps the campaign and brand card frames", () => {
    expect(CAMPAIGN_CARD_MEDIA_CLASS).toContain("aspect-[2.4/1]")
    expect(CAMPAIGN_CARD_FRAME_CLASS).toContain("w-[78%]")
    expect(CAMPAIGN_CARD_FRAME_CLASS).toContain("tablet:w-[46%]")
    expect(CAMPAIGN_CARD_FRAME_CLASS).toContain(
      "desktop:w-[calc((100%-1.5rem)/3)]"
    )
    expect(BRAND_SPOTLIGHT_FRAME_CLASS).toContain("aspect-[3.4/1]")
    expect(BRAND_SPOTLIGHT_GRID_CLASS).toContain("grid-cols-1")
    expect(BRAND_SPOTLIGHT_GRID_CLASS).toContain("tablet:grid-cols-2")
    expect(BRAND_SPOTLIGHT_GRID_CLASS).toContain("desktop:grid-cols-3")
  })
})
