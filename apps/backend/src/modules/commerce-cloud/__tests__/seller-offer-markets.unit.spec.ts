import { readFileSync } from "node:fs"
import { join } from "node:path"
import { transformSync } from "@swc/core"
import {
  inheritedSellerSku,
  sellerSkuUsedByOtherProduct,
} from "../offer-sellability"
import {
  basePriceForThisOffer,
  pricesAfterMarketEdit,
} from "../offer-market-price"
import { shippingProfileBelongsToSeller } from "../shipping-profile-engine"

function loadTsModule(relativePath: string) {
  const filePath = join(process.cwd(), relativePath)
  const compiled = transformSync(readFileSync(filePath, "utf8"), {
    filename: filePath,
    jsc: {
      parser: { syntax: "typescript", tsx: filePath.endsWith(".tsx") },
      target: "es2022",
    },
    module: { type: "commonjs" },
  })
  const loaded = { exports: {} as Record<string, unknown> }
  new Function("exports", "module", compiled.code as string)(loaded.exports, loaded)
  return loaded.exports
}

describe("seller SKU per product", () => {
  const offers = [
    { id: "offr_nl", identifier_id: "id_a", seller_sku: "SKU-1" },
    { id: "offr_de", identifier_id: "id_a", seller_sku: "SKU-1" },
    { id: "offr_other", identifier_id: "id_b", seller_sku: "SKU-2" },
  ]

  it("allows the same SKU on another market of the same product", () => {
    expect(
      sellerSkuUsedByOtherProduct(offers, {
        sellerSku: "SKU-1",
        identifierId: "id_a",
        excludeOfferId: "offr_nl",
      })
    ).toBe(false)
  })

  it("rejects the same SKU on a different product of this seller", () => {
    expect(
      sellerSkuUsedByOtherProduct(offers, {
        sellerSku: "SKU-2",
        identifierId: "id_a",
      })
    ).toBe(true)
  })

  it("inherits the SKU already used for this product", () => {
    expect(inheritedSellerSku(offers, "id_a")).toBe("SKU-1")
    expect(inheritedSellerSku(offers, "id_missing")).toBeNull()
  })
})

describe("market prices stay independent", () => {
  it("saves the price of the offer being edited", () => {
    expect(
      basePriceForThisOffer({
        base_price: 410,
        regular_customer_price: 389,
        existing_base_price: 389,
      })
    ).toBe(410)
  })

  it("does not change the other market when one price or promo changes", () => {
    const next = pricesAfterMarketEdit(
      [
        { region: "NL", base: 389, promo: 350 },
        { region: "DE", base: 389, promo: null },
      ],
      { region: "DE", base: 410, promo: 399 }
    )
    expect(next).toEqual([
      { region: "NL", base: 389, promo: 350 },
      { region: "DE", base: 410, promo: 399 },
    ])
  })

  it("does not copy one offer price onto sibling offers", () => {
    const src = readFileSync(
      join(process.cwd(), "src/workflows/commerce-cloud/upsert-offer.ts"),
      "utf8"
    )
    expect(src).not.toContain("base_price: central")
    expect(src).not.toContain("sibPrice")
    expect(src).toContain("basePriceForThisOffer")
  })
})

describe("shipping profile ownership", () => {
  it("rejects a profile that belongs to another seller before it can be linked", () => {
    expect(
      shippingProfileBelongsToSeller({ seller_id: "sel_a" }, "sel_a")
    ).toBe(true)
    expect(
      shippingProfileBelongsToSeller({ seller_id: "sel_b" }, "sel_a")
    ).toBe(false)
    expect(shippingProfileBelongsToSeller(null, "sel_a")).toBe(false)
    const src = readFileSync(
      join(
        process.cwd(),
        "src/modules/commerce-cloud/shipping-profile-engine.ts"
      ),
      "utf8"
    )
    const check = src.indexOf("shippingProfileBelongsToSeller")
    const write = src.indexOf("shipping_profile_id: opts.profileId")
    expect(check).toBeGreaterThan(-1)
    expect(write).toBeGreaterThan(check)
  })
})

describe("seller product wizard gaps", () => {
  const wizard = loadTsModule(
    "../web/app/seller/products/[id]/_lib/product-wizard.ts"
  ) as {
    wizardStepGaps: (product: Record<string, unknown>, step: string) => string[]
    wizardStepShowsGaps: (
      step: string,
      attention: { visited: string[]; attempted: string[] }
    ) => boolean
    wizardChromeStatus: (
      product: Record<string, unknown>,
      step: string,
      attention: { visited: string[]; attempted: string[] }
    ) => string
  }

  const product = {
    title: "Boor",
    brand_id: "br_1",
    offer: { has_offer: true, price: 389, stock: 2 },
    offers: { offer_count: 1, price: 389, stock_total: 2 },
    shipping_profile_id: null,
    media: [],
    completeness: {
      sale_blocked_reasons: [
        "Ontbreekt: EAN / GTIN",
        "Ontbreekt: Fabrikantnaam",
        "Ontbreekt: Vertaling EN",
        "Verkoopaanbod ontbreekt",
      ],
      publication_blocked_reasons: ["Ontbreekt: EAN / GTIN"],
      publishable: false,
    },
  }

  it("does not list future-step gaps on the offer step", () => {
    expect(wizard.wizardStepGaps(product, "offer")).toEqual([])
    expect(wizard.wizardStepGaps(product, "offer").join(" ")).not.toMatch(
      /EAN|Fabrikant|Vertaling/
    )
  })

  it("hides step gaps until the seller tries to continue", () => {
    const hidden = { visited: ["offer"], attempted: [] }
    const shown = { visited: ["offer"], attempted: ["offer"] }
    expect(wizard.wizardStepShowsGaps("offer", hidden)).toBe(false)
    expect(wizard.wizardStepShowsGaps("offer", shown)).toBe(true)
    expect(wizard.wizardStepShowsGaps("compliance", hidden)).toBe(false)
    expect(wizard.wizardChromeStatus(product, "media", hidden)).toBe("empty")
  })
})

describe("return from a new shipping profile", () => {
  const helper = loadTsModule(
    "../web/app/seller/_lib/shipping-profile-return.ts"
  ) as {
    shippingProfileReturnPath: (
      returnTo: string | null,
      profileId: string
    ) => string | null
  }

  it("returns to the same product and shipping step with the new profile selected", () => {
    expect(
      helper.shippingProfileReturnPath(
        "/seller/products/prod_1?step=shipping&resume=1",
        "shp_new"
      )
    ).toBe(
      "/seller/products/prod_1?step=shipping&resume=1&profile=shp_new"
    )
  })

  it("ignores a return path outside the seller product flow", () => {
    expect(
      helper.shippingProfileReturnPath("/seller/products", "shp_new")
    ).toBeNull()
    expect(
      helper.shippingProfileReturnPath("https://evil.example/seller/products/prod_1", "shp_new")
    ).toBeNull()
  })
})
