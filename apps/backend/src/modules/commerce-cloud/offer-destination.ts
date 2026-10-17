import { offerShipsToCountry } from "@europmade/utils"
import { normalizeCountryRates } from "./shipping-profile-types"

type ShippingProfileRow = {
  status?: string | null
  country_rates?: unknown
} | null

/**
 * Een aanbod levert naar het land wanneer de markt van het aanbod dat land is
 * en, bij een gekoppeld verzendprofiel, dat land daar actief op staat.
 */
export async function offerReachesDestination(
  offer: {
    region_code?: string | null
    shipping_profile_id?: string | null
  },
  destination: string,
  loadProfile: (profileId: string) => Promise<ShippingProfileRow>,
  cache?: Map<string, { status: string; countryActive: boolean } | null>
): Promise<boolean> {
  const profileId = offer.shipping_profile_id?.trim() || ""
  if (!profileId) {
    return offerShipsToCountry({
      regionCode: offer.region_code,
      destinationCountry: destination,
    })
  }
  const cacheKey = `${profileId}:${destination.trim().toUpperCase()}`
  let cached = cache?.get(cacheKey)
  if (cached === undefined) {
    const profile = await loadProfile(profileId)
    if (!profile) {
      cached = null
    } else {
      const rates = normalizeCountryRates(
        profile.country_rates as Record<string, unknown> | null
      )
      const row = rates[destination.trim().toUpperCase()]
      cached = {
        status: String(profile.status ?? "active"),
        countryActive: Boolean(row && row.active !== false),
      }
    }
    cache?.set(cacheKey, cached)
  }
  if (!cached) {
    return offerShipsToCountry({
      regionCode: offer.region_code,
      destinationCountry: destination,
      shippingProfileId: profileId,
      profileStatus: "inactive",
      countryActive: false,
    })
  }
  return offerShipsToCountry({
    regionCode: offer.region_code,
    destinationCountry: destination,
    shippingProfileId: profileId,
    profileStatus: cached.status,
    countryActive: cached.countryActive,
  })
}
