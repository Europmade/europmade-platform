import fs from "node:fs"
import path from "node:path"
import {
  BRAND_SPOTLIGHT_FRAME_CLASS,
  CAMPAIGN_CARD_FRAME_CLASS,
  CAMPAIGN_CARD_MEDIA_CLASS,
  HOMEPAGE_BANNER_HEIGHT_CSS,
  HOMEPAGE_CONTENT_GUTTER,
  homepageBannerHeight,
  homepageCampaignCardHeight,
  homepageSectionBody,
} from "@europmade/utils"

const repo = path.resolve(__dirname, "../../../../../..")

describe("homepage section layout", () => {
  it("keeps a visible heading when a section has no cards", () => {
    expect(homepageSectionBody(0)).toBe("placeholder")
    expect(homepageSectionBody(3)).toBe("cards")
  })

  it("gives the homepage banner the same height as a campaign card", () => {
    for (const viewport of ["mobile", "tablet", "desktop"] as const) {
      for (const width of [360, 900, 1096]) {
        expect(homepageBannerHeight(width, viewport)).toBeCloseTo(
          homepageCampaignCardHeight(width, viewport),
          5
        )
      }
    }
    expect(homepageBannerHeight(1096, "desktop")).toBeGreaterThan(100)
    expect(homepageBannerHeight(360, "mobile")).toBeGreaterThan(80)
  })

  it("keeps campaign and brand frames on the shared content width", () => {
    expect(HOMEPAGE_CONTENT_GUTTER).toBe("px-4 tablet:px-8")
    expect(CAMPAIGN_CARD_MEDIA_CLASS).toContain("aspect-[2.4/1]")
    expect(CAMPAIGN_CARD_FRAME_CLASS).toContain("w-[78%]")
    expect(CAMPAIGN_CARD_FRAME_CLASS).toContain("tablet:w-[46%]")
    expect(CAMPAIGN_CARD_FRAME_CLASS).toContain("desktop:w-[calc((100%-1.5rem)/3)]")
    expect(BRAND_SPOTLIGHT_FRAME_CLASS).toContain("aspect-[3.4/1]")
    expect(HOMEPAGE_BANNER_HEIGHT_CSS.mobile).toBe("aspect-ratio: 2.4 / 0.78")
    expect(HOMEPAGE_BANNER_HEIGHT_CSS.tablet).toBe("aspect-ratio: 2.4 / 0.46")
    expect(HOMEPAGE_BANNER_HEIGHT_CSS.desktop).toBe(
      "height: calc((100cqi - 1.5rem) / 3 / 2.4)"
    )
  })

  it("scans the shared class strings and emits the banner height", () => {
    const tailwind = fs.readFileSync(
      path.join(repo, "apps/web/tailwind.config.ts"),
      "utf8"
    )
    const css = fs.readFileSync(path.join(repo, "apps/web/app/globals.css"), "utf8")
    expect(tailwind).toContain("packages/utils/src/**/*.{ts,tsx}")
    expect(css).toContain(HOMEPAGE_BANNER_HEIGHT_CSS.mobile)
    expect(css).toContain(HOMEPAGE_BANNER_HEIGHT_CSS.tablet)
    expect(css).toContain(HOMEPAGE_BANNER_HEIGHT_CSS.desktop)
    expect(css).toContain("@media (min-width: 834px)")
    expect(css).toContain("@media (min-width: 1080px)")
  })
})
