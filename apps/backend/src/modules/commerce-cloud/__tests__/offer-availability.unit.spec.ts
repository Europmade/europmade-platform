import { resolveVisitorMarket } from "@europmade/types"
import {
  catalogDestinationFromHref,
  classifyProductAvailability,
  commercialBannerAllowed,
  offerShipsToCountry,
} from "@europmade/utils"
import { offerReachesDestination } from "../offer-destination"

describe("landafhankelijke beschikbaarheid", () => {
  it("levert een aanbod alleen naar de eigen markt", () => {
    expect(
      offerShipsToCountry({ regionCode: "NL", destinationCountry: "NL" })
    ).toBe(true)
    expect(
      offerShipsToCountry({ regionCode: "NL", destinationCountry: "DE" })
    ).toBe(false)
  })

  it("blokkeert een inactief land in het verzendprofiel", () => {
    expect(
      offerShipsToCountry({
        regionCode: "DE",
        destinationCountry: "DE",
        shippingProfileId: "shp_1",
        profileStatus: "active",
        countryActive: false,
      })
    ).toBe(false)
    expect(
      offerShipsToCountry({
        regionCode: "NL",
        destinationCountry: "NL",
        shippingProfileId: "shp_1",
        profileStatus: "inactive",
        countryActive: true,
      })
    ).toBe(false)
  })

  it("houdt een aanbod zonder profiel leverbaar in de eigen markt", () => {
    expect(
      offerShipsToCountry({
        regionCode: "NL",
        destinationCountry: "NL",
        shippingProfileId: null,
      })
    ).toBe(true)
  })

  it("scheidt bestelbaar, uitverkocht, gepauzeerd, niet leverbaar en niet gepubliceerd", () => {
    const base = {
      regionCode: "NL",
      shippingProfileId: null,
      salesStatus: "active",
      quantityAvailable: 3,
    }
    expect(
      classifyProductAvailability({
        published: true,
        destinationCountry: "NL",
        offers: [base],
      })
    ).toBe("orderable")
    expect(
      classifyProductAvailability({
        published: true,
        destinationCountry: "NL",
        offers: [{ ...base, quantityAvailable: 0 }],
      })
    ).toBe("out_of_stock")
    expect(
      classifyProductAvailability({
        published: true,
        destinationCountry: "NL",
        offers: [{ ...base, salesStatus: "paused", quantityAvailable: 4 }],
      })
    ).toBe("paused")
    expect(
      classifyProductAvailability({
        published: true,
        destinationCountry: "DE",
        offers: [base],
      })
    ).toBe("not_deliverable")
    expect(
      classifyProductAvailability({
        published: false,
        destinationCountry: "NL",
        offers: [base],
      })
    ).toBe("not_published")
  })

  it("negeert de taal bij de landkeuze", () => {
    expect(
      resolveVisitorMarket({ locale: "en", cookie: "DE" }).market
    ).toBe("DE")
    expect(
      resolveVisitorMarket({ locale: "en", geoSuggestion: "DE" })
    ).toEqual({ market: "DE", source: "suggestion" })
    expect(
      resolveVisitorMarket({
        locale: "de",
        explicit: "NL",
        geoSuggestion: "DE",
        cookie: "FR",
      }).market
    ).toBe("NL")
    expect(resolveVisitorMarket({ locale: "en" })).toEqual({
      market: "NL",
      source: "default",
    })
  })

  it("verbergt alleen een commerciële banner met een bekende lege bestemming", () => {
    expect(catalogDestinationFromHref("https://example.com/info").kind).toBe(
      "informational"
    )
    expect(
      commercialBannerAllowed({ informative: true, orderableCount: 0 })
    ).toBe(true)
    expect(
      commercialBannerAllowed({ international: true, orderableCount: 0 })
    ).toBe(true)
    expect(commercialBannerAllowed({ orderableCount: null })).toBe(true)
    expect(commercialBannerAllowed({ orderableCount: 0 })).toBe(false)
    expect(commercialBannerAllowed({ orderableCount: 2 })).toBe(true)
    expect(catalogDestinationFromHref("/categorie/pannen").kind).toBe("category")
    expect(
      catalogDestinationFromHref("http://localhost:3000/categorie/tuin").kind
    ).toBe("category")
    expect(catalogDestinationFromHref("/product/prod_1").kind).toBe("product")
  })

  it("leest het verzendprofiel per land en hergebruikt die uitkomst niet voor een ander land", async () => {
    const loads: string[] = []
    const cache = new Map<string, { status: string; countryActive: boolean } | null>()
    const load = async () => {
      loads.push("once")
      return {
        status: "active",
        country_rates: {
          NL: { active: true },
          DE: { active: false },
        },
      }
    }
    const offer = { region_code: "NL", shipping_profile_id: "shp_1" }
    await expect(
      offerReachesDestination(offer, "NL", load, cache)
    ).resolves.toBe(true)
    await expect(
      offerReachesDestination(
        { region_code: "DE", shipping_profile_id: "shp_1" },
        "DE",
        load,
        cache
      )
    ).resolves.toBe(false)
    expect(loads).toHaveLength(2)
  })
})
