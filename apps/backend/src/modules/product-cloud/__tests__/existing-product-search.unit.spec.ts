import {
  certaintyForKinds,
  gtinDigitsFromQuery,
  gtinIsStrongestMatch,
  isAutomaticIdentityMatch,
  mergeSearchDrafts,
  normalizeSearchQuery,
  ownSellerSkuMatches,
  paginateSearchHits,
  repeatedOfferUpsertCreatesDuplicate,
  searchQueryIsEmpty,
  searchQueryIsTooShort,
  selectionCreatesProductCloudRecord,
  sellerMayManageOffer,
  strongestMatchKind,
  textIncludesInsensitive,
  type ExistingProductSearchDraft,
} from "../existing-product-search"

function draft(
  partial: Partial<ExistingProductSearchDraft> & {
    product_id: string
    match_kinds: ExistingProductSearchDraft["match_kinds"]
  }
): ExistingProductSearchDraft {
  return {
    title: null,
    brand_id: "brand_x",
    brand_name: null,
    ean: null,
    mpn: null,
    identifier_id: null,
    category_names: [],
    primary_image_url: null,
    own_offer: false,
    ...partial,
  }
}

describe("existing Product Cloud search", () => {
  it("matches a full product title", () => {
    const hits = mergeSearchDrafts([
      draft({
        product_id: "prod_dt990",
        title: "beyerdynamic DT 990 PRO",
        match_kinds: ["title"],
      }),
    ])
    expect(textIncludesInsensitive("beyerdynamic DT 990 PRO", "beyerdynamic DT 990 PRO")).toBe(
      true
    )
    expect(hits).toHaveLength(1)
    expect(hits[0].certainty).toBe("candidate")
  })

  it("matches a partial product title", () => {
    expect(textIncludesInsensitive("beyerdynamic DT 990 PRO", "DT 990")).toBe(
      true
    )
  })

  it("matches a brand name case-insensitively and trims spaces", () => {
    expect(normalizeSearchQuery("  Beyerdynamic  ")).toBe("Beyerdynamic")
    expect(textIncludesInsensitive("beyerdynamic", "BEYERDYNAMIC")).toBe(true)
  })

  it("treats digit queries as EAN/GTIN lookup keys", () => {
    expect(gtinDigitsFromQuery("4010118718175")).toBe("4010118718175")
    expect(gtinDigitsFromQuery("  4010118718175  ")).toBe("4010118718175")
  })

  it("matches MPN as a candidate, never as an automatic definitive link", () => {
    const hits = mergeSearchDrafts([
      draft({
        product_id: "prod_dt990",
        mpn: "DT 990 PRO",
        match_kinds: ["mpn"],
      }),
    ])
    expect(hits[0].certainty).toBe("candidate")
    expect(isAutomaticIdentityMatch(hits[0].match_kinds)).toBe(false)
  })

  it("matches only the logged-in seller's SKU", () => {
    expect(
      ownSellerSkuMatches({
        query: "ART-123",
        sku: "ART-123",
        offerSellerId: "sel_own",
        actorSellerId: "sel_own",
      })
    ).toBe(true)
    expect(
      ownSellerSkuMatches({
        query: "ART-123",
        sku: "ART-123",
        offerSellerId: "sel_other",
        actorSellerId: "sel_own",
      })
    ).toBe(false)
  })

  it("returns multiple results as a ranked list", () => {
    const hits = mergeSearchDrafts([
      draft({
        product_id: "prod_title",
        title: "DT 990 PRO black",
        match_kinds: ["title"],
      }),
      draft({
        product_id: "prod_ean",
        title: "DT 990 PRO",
        ean: "4010118718175",
        match_kinds: ["ean"],
      }),
      draft({
        product_id: "prod_brand",
        title: "Other beyerdynamic",
        brand_name: "beyerdynamic",
        match_kinds: ["brand"],
      }),
    ])
    expect(hits).toHaveLength(3)
    expect(hits[0].product_id).toBe("prod_ean")
    expect(hits.map((h) => h.product_id)).toEqual([
      "prod_ean",
      "prod_title",
      "prod_brand",
    ])
  })

  it("lets the seller choose one result without creating a Product Cloud product", () => {
    const hits = mergeSearchDrafts([
      draft({ product_id: "prod_a", match_kinds: ["title"] }),
      draft({ product_id: "prod_b", match_kinds: ["title"] }),
    ])
    const selected = hits.find((h) => h.product_id === "prod_b")
    expect(selected?.product_id).toBe("prod_b")
    expect(selectionCreatesProductCloudRecord()).toBe(false)
  })

  it("keeps an empty result set empty so the UI can offer Nieuw product invoeren", () => {
    expect(mergeSearchDrafts([])).toEqual([])
  })

  it("does not auto-link on name or brand alone", () => {
    expect(isAutomaticIdentityMatch(["title"])).toBe(false)
    expect(isAutomaticIdentityMatch(["brand"])).toBe(false)
    expect(isAutomaticIdentityMatch(["title", "brand"])).toBe(false)
    expect(certaintyForKinds(["title", "brand"])).toBe("candidate")
  })

  it("keeps EAN as the strongest match kind", () => {
    expect(gtinIsStrongestMatch(["ean", "title", "brand"])).toBe(true)
    expect(strongestMatchKind(["brand", "mpn", "ean"])).toBe("ean")
    expect(isAutomaticIdentityMatch(["ean"])).toBe(true)
  })

  it("does not treat another seller's SKU as own offer", () => {
    const hits = mergeSearchDrafts([
      draft({
        product_id: "prod_sku",
        own_offer: false,
        match_kinds: ["title"],
      }),
    ])
    expect(hits[0].own_offer).toBe(false)
    expect(
      ownSellerSkuMatches({
        query: "OTHER-SKU",
        sku: "OTHER-SKU",
        offerSellerId: "sel_b",
        actorSellerId: "sel_a",
      })
    ).toBe(false)
  })

  it("blocks managing another seller's offer", () => {
    expect(sellerMayManageOffer("sel_b", "sel_a")).toBe(false)
    expect(sellerMayManageOffer("sel_a", "sel_a")).toBe(true)
  })

  it("does not create a second offer when the seller already has one", () => {
    expect(
      repeatedOfferUpsertCreatesDuplicate({ existingOwnOffer: true })
    ).toBe(false)
    expect(
      repeatedOfferUpsertCreatesDuplicate({ existingOwnOffer: false })
    ).toBe(true)
  })

  it("rejects empty queries so the catalog is not dumped", () => {
    expect(searchQueryIsEmpty("   ")).toBe(true)
    expect(searchQueryIsTooShort("a")).toBe(true)
    expect(searchQueryIsTooShort("DT")).toBe(false)
  })

  it("paginates ranked results", () => {
    const rows = mergeSearchDrafts([
      draft({ product_id: "p1", title: "A", match_kinds: ["title"] }),
      draft({ product_id: "p2", title: "B", match_kinds: ["title"] }),
      draft({ product_id: "p3", title: "C", match_kinds: ["title"] }),
    ])
    const page = paginateSearchHits(rows, 1, 1)
    expect(page.count).toBe(3)
    expect(page.items).toHaveLength(1)
    expect(page.limit).toBe(1)
  })

  it("caps the page size", () => {
    expect(paginateSearchHits([1, 2, 3], 0, 999).limit).toBe(50)
  })
})
