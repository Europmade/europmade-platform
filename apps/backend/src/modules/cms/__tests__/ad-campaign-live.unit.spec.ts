import {
  explainAdCampaign,
  formatUtcDate,
  mergeSellerOverPlatform,
  parseSellerBannerPresentation,
  resolveMediaUrl,
  selectLiveAdCampaigns,
  sellerBannerImageStyle,
  sellerLogoFrame,
  type AdCampaignCandidate,
} from "@europmade/utils"

const WMF_WEEKS = [
  ["2026-09-21T00:00:00.000Z", "2026-09-27T23:59:59.999Z"],
  ["2026-09-28T00:00:00.000Z", "2026-10-04T23:59:59.999Z"],
  ["2026-10-05T00:00:00.000Z", "2026-10-11T23:59:59.999Z"],
].flatMap(([start, end]) =>
  ["NL", "BE", "DE", "AT", "FR"].map((market) => ({
    market_code: market,
    week_start: start,
    week_end: end,
    created_at: "2026-09-15T14:20:41.525Z",
  }))
)

function wmf(overrides: Partial<AdCampaignCandidate> = {}): AdCampaignCandidate {
  return {
    id: "adcmp_wmf",
    status: "approved",
    placement: "homepage",
    targetValue: null,
    markets: ["NL", "BE", "DE", "AT", "FR"],
    weeks: WMF_WEEKS,
    ...overrides,
  }
}

describe("seller banner live window", () => {
  it("shows an approved homepage campaign in NL BE DE AT and FR during the booked weeks", () => {
    const now = new Date("2026-10-05T12:00:00.000Z")
    for (const market of ["NL", "BE", "DE", "AT", "FR"]) {
      const visibility = explainAdCampaign(wmf(), {
        now,
        visitorMarket: market,
        requestedPlacement: "homepage",
      })
      expect(visibility.publicNow).toBe(true)
      expect(visibility.reasons).toEqual([])
    }
  })

  it("hides the same campaign when the visitor market was not booked", () => {
    const visibility = explainAdCampaign(wmf(), {
      now: new Date("2026-10-05T12:00:00.000Z"),
      visitorMarket: "ES",
      requestedPlacement: "homepage",
    })
    expect(visibility.publicNow).toBe(false)
    expect(visibility.reasons).toEqual(["market_mismatch"])
  })

  it("keeps the last booked instant visible and hides the campaign afterwards", () => {
    const last = new Date("2026-10-11T23:59:59.999Z")
    expect(
      explainAdCampaign(wmf(), { now: last, visitorMarket: "NL" }).publicNow
    ).toBe(true)
    const after = explainAdCampaign(wmf(), {
      now: new Date("2026-10-12T00:00:00.000Z"),
      visitorMarket: "NL",
    })
    expect(after.publicNow).toBe(false)
    expect(after.reasons).toEqual(["expired"])
    expect(formatUtcDate(after.activeUntil)).toBe("11 Oct 2026")
  })

  it("parses Date objects without a string round-trip", () => {
    const campaign = wmf({
      weeks: [
        {
          market_code: "NL",
          week_start: new Date("2026-10-05T00:00:00.000Z"),
          week_end: new Date("2026-10-11T23:59:59.999Z"),
        },
      ],
    })
    expect(
      explainAdCampaign(campaign, {
        now: new Date("2026-10-08T00:00:00.000Z"),
        visitorMarket: "NL",
      }).publicNow
    ).toBe(true)
  })

  it.each(["draft", "pending_review", "rejected", "cancelled"])(
    "hides status %s",
    (status) => {
      const visibility = explainAdCampaign(wmf({ status }), {
        now: new Date("2026-10-05T12:00:00.000Z"),
        visitorMarket: "NL",
      })
      expect(visibility.publicNow).toBe(false)
      expect(visibility.approved).toBe(false)
      expect(visibility.reasons).toEqual([status])
    }
  )

  it("does not show a campaign before its first booked week", () => {
    const visibility = explainAdCampaign(wmf(), {
      now: new Date("2026-09-20T23:00:00.000Z"),
      visitorMarket: "NL",
    })
    expect(visibility.reasons).toEqual(["not_started"])
  })

  it("lets the earliest booking win and leaves both campaigns unchanged", () => {
    const early = wmf({
      id: "adcmp_early",
      weeks: WMF_WEEKS.map((week) => ({
        ...week,
        created_at: "2026-09-01T00:00:00.000Z",
      })),
    })
    const late = wmf({
      id: "adcmp_late",
      weeks: WMF_WEEKS.map((week) => ({
        ...week,
        created_at: "2026-09-10T00:00:00.000Z",
      })),
    })
    const before = late.id
    const selected = selectLiveAdCampaigns([late, early], {
      now: new Date("2026-10-05T12:00:00.000Z"),
      placement: "homepage",
      visitorMarket: "NL",
    })
    expect(selected.live.map((row) => row.id)).toEqual(["adcmp_early"])
    expect(selected.suppressed).toEqual([
      { id: "adcmp_late", winnerId: "adcmp_early" },
    ])
    expect(late.id).toBe(before)
    expect(late.weeks).toHaveLength(WMF_WEEKS.length)
  })

  it("replaces the visible platform banner and restores it when the seller campaign ends", () => {
    const platform = [
      { id: "cms", position: 2 as const, source: "platform" as const },
    ]
    const seller = { id: "adcmp_wmf", position: 1 as const, source: "seller" as const }
    const live = mergeSellerOverPlatform(platform, seller)
    expect(live).toEqual([
      { id: "adcmp_wmf", position: 2, source: "seller" },
    ])
    expect(mergeSellerOverPlatform(platform, null)).toEqual(platform)
  })

  it("rewrites a localhost banner URL to the host the admin tab is using", () => {
    const stored = "/static/1792063301740-Bobbie%204.0%20aansluiten.jpg"
    const logo = "http://localhost:9000/static/logo.png"
    expect(resolveMediaUrl(stored, "http://192.168.2.17:9000")).toBe(
      "http://192.168.2.17:9000/static/1792063301740-Bobbie%204.0%20aansluiten.jpg"
    )
    expect(resolveMediaUrl(logo, "http://192.168.2.17:9000")).toBe(
      "http://192.168.2.17:9000/static/logo.png"
    )
  })

  it("builds a full static image URL and a cover frame for a 2400x600 creative", () => {
    expect(
      resolveMediaUrl(
        "/static/banner-2400x600.webp",
        "http://localhost:9000"
      )
    ).toBe("http://localhost:9000/static/banner-2400x600.webp")
    const presentation = parseSellerBannerPresentation({
      imagePositionX: 80,
      imagePositionY: 40,
      logoScale: 4,
      overlayAlign: "right",
      textColor: "black",
    })
    expect(sellerBannerImageStyle(presentation)).toEqual({
      objectFit: "cover",
      objectPosition: "80% 40%",
    })
    expect(sellerLogoFrame(presentation.logoScale).objectFit).toBe("contain")
    expect(presentation.logoScale).toBe(1.5)
  })
})
