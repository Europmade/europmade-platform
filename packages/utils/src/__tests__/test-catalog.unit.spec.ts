import {
  TEST_CATALOG_GTINS,
  TEST_CATALOG_SELLER_ID,
  isTestCatalogEnabled,
  isTestCatalogGtin,
  mergeTestCatalogProducts,
  testCatalogDemoBasePrice,
  testCatalogDemoCheckoutAllowed,
  testCatalogProductInCategory,
  testCatalogRowAllowed,
} from "../test-catalog"

const conceptRow = {
  gtin: "4002516629290",
  sellerId: TEST_CATALOG_SELLER_ID,
  lifecycleStatus: "Concept gecontroleerd",
  publicationStatus: "Concept",
  offerCount: 0,
}

describe("test catalog gate", () => {
  it("stays off in production even when the flag is set", () => {
    expect(
      isTestCatalogEnabled({
        NODE_ENV: "production",
        EUROPMADE_TEST_CATALOG: "1",
      })
    ).toBe(false)
  })

  it("stays off when the stage is production", () => {
    expect(
      isTestCatalogEnabled({
        NODE_ENV: "development",
        EUROPMADE_ENV: "production",
        EUROPMADE_TEST_CATALOG: "1",
      })
    ).toBe(false)
  })

  it("stays off in test and when the flag is explicitly disabled", () => {
    expect(isTestCatalogEnabled({ NODE_ENV: "test" })).toBe(false)
    expect(
      isTestCatalogEnabled({
        NODE_ENV: "development",
        EUROPMADE_TEST_CATALOG: "0",
      })
    ).toBe(false)
  })

  it("is on in development unless disabled", () => {
    expect(isTestCatalogEnabled({ NODE_ENV: "development" })).toBe(true)
    expect(
      isTestCatalogEnabled({
        NODE_ENV: "development",
        EUROPMADE_TEST_CATALOG: "1",
      })
    ).toBe(true)
  })

  it("allows staging only with an explicit flag", () => {
    expect(
      isTestCatalogEnabled({
        NODE_ENV: "production",
        EUROPMADE_ENV: "staging",
      })
    ).toBe(false)
    expect(
      isTestCatalogEnabled({
        NODE_ENV: "production",
        EUROPMADE_ENV: "staging",
        EUROPMADE_TEST_CATALOG: "1",
      })
    ).toBe(true)
  })
})

describe("test catalog allowlist", () => {
  it("contains the 22 imported Bosch and Miele GTINs", () => {
    expect(new Set(TEST_CATALOG_GTINS).size).toBe(22)
    expect(isTestCatalogGtin("4002516866640")).toBe(true)
    expect(isTestCatalogGtin("0000000000000")).toBe(false)
  })

  it("rejects another seller and a published row, and keeps a demo offer visible", () => {
    expect(testCatalogRowAllowed(conceptRow)).toBe(true)
    expect(testCatalogRowAllowed({ ...conceptRow, sellerId: "sell_other" })).toBe(false)
    expect(testCatalogRowAllowed({ ...conceptRow, gtin: "123" })).toBe(false)
    expect(
      testCatalogRowAllowed({ ...conceptRow, publicationStatus: "Gepubliceerd" })
    ).toBe(false)
    expect(testCatalogRowAllowed({ ...conceptRow, offerCount: 1 })).toBe(true)
    expect(
      testCatalogRowAllowed({ ...conceptRow, lifecycleStatus: "Gearchiveerd" })
    ).toBe(false)
  })

  it("uses the fixed local demo price for each product group", () => {
    expect(testCatalogDemoBasePrice(["huishouden", "was-droog", "wasmachines"])).toBe(749)
    expect(testCatalogDemoBasePrice(["huishouden", "was-droog", "wasdrogers"])).toBe(699)
    expect(testCatalogDemoBasePrice(["huishouden", "vrijstaande-vaatwassers"])).toBe(629)
    expect(testCatalogDemoBasePrice(["was-droogcombinaties"])).toBe(899)
    expect(testCatalogDemoBasePrice(["huishouden"])).toBe(549)
  })

  it("allows demo checkout only for the local allowlist", () => {
    expect(
      testCatalogDemoCheckoutAllowed({
        gtin: conceptRow.gtin,
        sellerId: TEST_CATALOG_SELLER_ID,
        env: { NODE_ENV: "development" },
      })
    ).toBe(true)
    expect(
      testCatalogDemoCheckoutAllowed({
        gtin: conceptRow.gtin,
        sellerId: TEST_CATALOG_SELLER_ID,
        env: { NODE_ENV: "production", EUROPMADE_TEST_CATALOG: "1" },
      })
    ).toBe(false)
    expect(
      testCatalogDemoCheckoutAllowed({
        gtin: conceptRow.gtin,
        sellerId: "sell_other",
        env: { NODE_ENV: "development" },
      })
    ).toBe(false)
  })

  it("keeps a published product in front of the same test id", () => {
    const merged = mergeTestCatalogProducts(
      [{ slug: "prod_live", title: "Bosch live" }],
      [
        { slug: "prod_live", title: "Bosch test" },
        { slug: "prod_test", title: "Miele test" },
      ]
    )
    expect(merged).toEqual([
      { slug: "prod_live", title: "Bosch live" },
      { slug: "prod_test", title: "Miele test" },
    ])
  })

  it("matches only the expanded category slugs", () => {
    expect(
      testCatalogProductInCategory(
        ["huishouden", "vaatwassers"],
        "huishouden,inbouwapparatuur,vaatwassers"
      )
    ).toBe(true)
    expect(testCatalogProductInCategory(["was-droog"], "vaatwassers")).toBe(false)
    expect(testCatalogProductInCategory(["vaatwassers"], "")).toBe(false)
  })
})
