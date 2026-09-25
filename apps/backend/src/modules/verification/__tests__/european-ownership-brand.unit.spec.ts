import {
  findClaimForProductRefs,
  toPublicEuropeanOwnership,
  type EuropeanOwnershipClaimRow,
} from "../../../api/store/product-cloud/european-ownership-helpers"

describe("european ownership brand-level resolution", () => {
  const brandClaim: EuropeanOwnershipClaimRow = {
    id: "euown_brand",
    brand_id: "brand_moeve",
    manufacturer_id: "manu_legacy",
    seller_id: "sel_1",
    ownership_band: "eu_76_99",
    source: "brand_producer",
    status: "Geverifieerd door EuropMade",
  }

  const legacyClaim: EuropeanOwnershipClaimRow = {
    id: "euown_legacy",
    brand_id: null,
    manufacturer_id: "manu_legacy",
    seller_id: "sel_1",
    ownership_band: "eu_51_75",
    source: "factory",
    status: "Opgegeven door aanbieder",
  }

  it("prefers brand claim over manufacturer fallback for existing brand reuse", async () => {
    const verification = {
      listEuropeanOwnershipClaims: jest.fn(async (filter: { brand_id?: string; manufacturer_id?: string }) => {
        if (filter.brand_id === "brand_moeve") return [brandClaim]
        if (filter.manufacturer_id === "manu_legacy") return [legacyClaim]
        return []
      }),
    }

    const claim = await findClaimForProductRefs(verification as never, {
      brand_id: "brand_moeve",
      manufacturer_id: "manu_legacy",
    })
    expect(claim?.id).toBe("euown_brand")
    expect(claim?.ownership_band).toBe("eu_76_99")
  })

  it("falls back to manufacturer claim when brand has no claim yet", async () => {
    const verification = {
      listEuropeanOwnershipClaims: jest.fn(async (filter: { brand_id?: string; manufacturer_id?: string }) => {
        if (filter.brand_id) return []
        if (filter.manufacturer_id === "manu_legacy") return [legacyClaim]
        return []
      }),
    }

    const claim = await findClaimForProductRefs(verification as never, {
      brand_id: "brand_new",
      manufacturer_id: "manu_legacy",
    })
    expect(claim?.id).toBe("euown_legacy")
  })

  it("exposes brand_id on public PDP payload", () => {
    const pub = toPublicEuropeanOwnership(brandClaim)
    expect(pub?.brand_id).toBe("brand_moeve")
    expect(pub?.ownership_band_label).toContain("76")
    expect(pub?.verified_by_europmade).toBe(true)
  })
})
