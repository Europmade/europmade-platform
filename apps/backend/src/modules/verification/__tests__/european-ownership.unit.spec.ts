import {
  EUROPEAN_OWNERSHIP_BAND_LABELS,
  EUROPEAN_OWNERSHIP_BANDS,
  EUROPEAN_OWNERSHIP_SOURCE_LABELS,
  EUROPEAN_OWNERSHIP_SOURCES,
  isEuropeanOwnershipBand,
  isEuropeanOwnershipSource,
  isStorefrontVisibleStatus,
  statusAfterAdminDecision,
  statusAfterSellerSubmit,
} from "../european-ownership"

describe("European ownership domain", () => {
  it("exposes all ownership bands", () => {
    expect(EUROPEAN_OWNERSHIP_BANDS).toEqual([
      "eu_0",
      "eu_1_25",
      "eu_26_50",
      "eu_51_75",
      "eu_76_99",
      "eu_100",
      "unknown",
    ])
    expect(EUROPEAN_OWNERSHIP_BAND_LABELS.eu_51_75).toBe("51–75%")
    expect(EUROPEAN_OWNERSHIP_BAND_LABELS.unknown).toBe("Niet bekend")
  })

  it("exposes all sources including reseller", () => {
    expect(EUROPEAN_OWNERSHIP_SOURCES).toEqual([
      "brand_producer",
      "factory",
      "reseller",
      "other",
    ])
    expect(EUROPEAN_OWNERSHIP_SOURCE_LABELS.reseller).toBe("Reseller")
  })

  it("validates bands and sources", () => {
    expect(isEuropeanOwnershipBand("eu_0")).toBe(true)
    expect(isEuropeanOwnershipBand("eu_50")).toBe(false)
    expect(isEuropeanOwnershipSource("reseller")).toBe(true)
    expect(isEuropeanOwnershipSource("buyer")).toBe(false)
  })

  it("maps seller submit status from optional evidence", () => {
    expect(statusAfterSellerSubmit(false)).toBe("Opgegeven door aanbieder")
    expect(statusAfterSellerSubmit(true)).toBe("Bewijs aangeleverd")
  })

  it("maps admin decisions without changing band", () => {
    expect(statusAfterAdminDecision("approve")).toBe(
      "Geverifieerd door EuropMade"
    )
    expect(statusAfterAdminDecision("request_info")).toBe("Bewijs opgevraagd")
    expect(statusAfterAdminDecision("reject")).toBe("Afgewezen")
  })

  it("hides rejected claims from storefront", () => {
    expect(isStorefrontVisibleStatus("Opgegeven door aanbieder")).toBe(true)
    expect(isStorefrontVisibleStatus("Geverifieerd door EuropMade")).toBe(true)
    expect(isStorefrontVisibleStatus("Afgewezen")).toBe(false)
    expect(isStorefrontVisibleStatus("Bewijs opgevraagd")).toBe(false)
    expect(isStorefrontVisibleStatus("Niet opgegeven")).toBe(false)
  })
})
