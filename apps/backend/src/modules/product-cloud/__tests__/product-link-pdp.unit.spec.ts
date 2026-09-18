import { readFileSync } from "node:fs"
import { join } from "node:path"
import { transformSync } from "@swc/core"

const helperPath = join(process.cwd(), "../web/app/_lib/product-link-pdp.ts")
const compiled = transformSync(readFileSync(helperPath, "utf8"), {
  filename: helperPath,
  jsc: {
    parser: { syntax: "typescript" },
    target: "es2022",
  },
  module: { type: "commonjs" },
})
const loaded = { exports: {} as Record<string, unknown> }
new Function("exports", "module", compiled.code as string)(
  loaded.exports,
  loaded
)

const {
  currentLinkMember,
  memberMatchingValues,
  optionsForDimension,
  shouldShowProductLinkSelector,
  storefrontProductHref,
  usesImageSwatchForDimension,
} = loaded.exports as {
  currentLinkMember: (group: Group, productId: string) => Member | null
  memberMatchingValues: (
    group: Group,
    values: Record<string, string>
  ) => Member | null
  optionsForDimension: (
    group: Group,
    currentProductId: string,
    dimension: string
  ) => Array<{
    value: string
    selected: boolean
    available: boolean
    href: string | null
    product_id: string | null
    image_url: string | null
  }>
  shouldShowProductLinkSelector: (group: Group | null) => boolean
  storefrontProductHref: (productId: string) => string
  usesImageSwatchForDimension: (
    dimension: string,
    options: Array<{ image_url?: string | null }>
  ) => boolean
}

type Member = {
  product_id: string
  product_title: string | null
  values: Record<string, string>
  image_url?: string | null
}
type Group = {
  id: string
  name: string
  dimensions: string[]
  members: Member[]
}

const oneDim: Group = {
  id: "plgrp_1",
  name: "Kleur",
  dimensions: ["Kleur"],
  members: [
    {
      product_id: "prod_black",
      product_title: "Zwart",
      values: { Kleur: "Zwart" },
      image_url: "https://cdn.example/black.jpg",
    },
    {
      product_id: "prod_white",
      product_title: "Wit",
      values: { Kleur: "Wit" },
      image_url: "https://cdn.example/white.jpg",
    },
  ],
}

const twoDim: Group = {
  id: "plgrp_2",
  name: "KleurMaat",
  dimensions: ["Kleur", "Maat"],
  members: [
    {
      product_id: "prod_zm",
      product_title: "Zwart M",
      values: { Kleur: "Zwart", Maat: "M" },
      image_url: "https://cdn.example/zm.jpg",
    },
    {
      product_id: "prod_zl",
      product_title: "Zwart L",
      values: { Kleur: "Zwart", Maat: "L" },
      image_url: "https://cdn.example/zl.jpg",
    },
    {
      product_id: "prod_wm",
      product_title: "Wit M",
      values: { Kleur: "Wit", Maat: "M" },
      image_url: "https://cdn.example/wm.jpg",
    },
  ],
}

const detailSrc = readFileSync(
  join(process.cwd(), "../web/app/_components/product/product-detail.tsx"),
  "utf8"
)
const selectorSrc = readFileSync(
  join(process.cwd(), "../web/app/_components/product/product-link-selector.tsx"),
  "utf8"
)
const catalogSrc = readFileSync(
  join(process.cwd(), "../web/app/_lib/storefront-catalog.ts"),
  "utf8"
)
const adminProductsSrc = readFileSync(
  join(
    process.cwd(),
    "../admin/app/(shell)/product-cloud/products/page.tsx"
  ),
  "utf8"
)
const adminPlgDetailSrc = readFileSync(
  join(
    process.cwd(),
    "../admin/app/(shell)/product-cloud/product-links/[id]/page.tsx"
  ),
  "utf8"
)
const helpersSrc = readFileSync(
  join(process.cwd(), "src/api/store/catalog/catalog-helpers.ts"),
  "utf8"
)
const publicShapeSrc = readFileSync(
  join(process.cwd(), "src/modules/product-cloud/product-link-groups.ts"),
  "utf8"
)

describe("PDP product link selector", () => {
  it("shows active group only when >=2 public members", () => {
    expect(shouldShowProductLinkSelector(null)).toBe(false)
    expect(
      shouldShowProductLinkSelector({
        id: "x",
        name: "x",
        dimensions: ["Kleur"],
        members: [oneDim.members[0]],
      })
    ).toBe(false)
    expect(shouldShowProductLinkSelector(oneDim)).toBe(true)
  })

  it("hides selector wiring for proposed/rejected via public null shape", () => {
    expect(publicShapeSrc).toContain("members.length < 2")
    expect(publicShapeSrc).toContain('group.status === "active"')
    expect(helpersSrc).toContain('publication_status: "Gepubliceerd"')
    expect(helpersSrc).toContain("toPublicProductLinkGroup")
    expect(helpersSrc).toContain("hasSellableOffer")
    expect(helpersSrc).toContain("quantity_available")
  })

  it("selects the current product for one dimension", () => {
    const kleur = optionsForDimension(oneDim, "prod_black", "Kleur")
    expect(kleur.find((o) => o.value === "Zwart")?.selected).toBe(true)
    expect(kleur.find((o) => o.value === "Wit")?.href).toBe(
      "/product/prod_white"
    )
  })

  it("maps existing multi-dimension combinations to the right product", () => {
    expect(
      memberMatchingValues(twoDim, { Kleur: "Zwart", Maat: "L" })?.product_id
    ).toBe("prod_zl")
    const maat = optionsForDimension(twoDim, "prod_zm", "Maat")
    expect(maat.find((o) => o.value === "L")?.product_id).toBe("prod_zl")
  })

  it("does not send a missing combination to another product", () => {
    expect(
      memberMatchingValues(twoDim, { Kleur: "Wit", Maat: "L" })
    ).toBeNull()
    const maatFromWhite = optionsForDimension(twoDim, "prod_wm", "Maat")
    const l = maatFromWhite.find((o) => o.value === "L")
    expect(l?.available).toBe(false)
    expect(l?.href).toBeNull()
  })

  it("uses real product URLs and keeps non-public members out of hrefs", () => {
    expect(storefrontProductHref("prod_01ABC")).toBe("/product/prod_01ABC")
    expect(detailSrc).toContain("ProductLinkSelector")
    expect(detailSrc).toContain("productLinkGroup")
    expect(catalogSrc).toContain("product_link_group")
    expect(catalogSrc).toContain("resolveMediaUrl(m.image_url")
    const publicOnly = {
      ...oneDim,
      members: [oneDim.members[0]],
    }
    expect(shouldShowProductLinkSelector(publicOnly)).toBe(false)
  })

  it("uses image swatches for Kleur and text for Maat/Uitvoering", () => {
    const kleurOpts = optionsForDimension(oneDim, "prod_black", "Kleur")
    expect(usesImageSwatchForDimension("Kleur", kleurOpts)).toBe(true)
    expect(usesImageSwatchForDimension("Maat", kleurOpts)).toBe(false)
    expect(usesImageSwatchForDimension("Uitvoering", kleurOpts)).toBe(false)
    expect(
      usesImageSwatchForDimension("Kleur", [{ image_url: null }])
    ).toBe(false)
    expect(selectorSrc).toContain("usesImageSwatchForDimension")
    expect(selectorSrc).toContain("<img")
    expect(optionsForDimension(oneDim, "prod_black", "Kleur")[0].image_url).toBe(
      "https://cdn.example/black.jpg"
    )
  })

  it("renders multiple dimensions independently", () => {
    const kleur = optionsForDimension(twoDim, "prod_zm", "Kleur")
    const maat = optionsForDimension(twoDim, "prod_zm", "Maat")
    expect(kleur.map((o) => o.value).sort()).toEqual(["Wit", "Zwart"])
    expect(maat.map((o) => o.value).sort()).toEqual(["L", "M"])
    expect(selectorSrc).toContain("group.dimensions.map")
  })

  it("keeps offer data on the standalone product page", () => {
    expect(currentLinkMember(oneDim, "prod_black")?.product_id).toBe(
      "prod_black"
    )
    expect(detailSrc).toContain("detail.offers")
    expect(detailSrc).not.toContain("productLinkGroup.offers")
  })

  it("shows compact primary images in admin product list and PLG detail", () => {
    expect(adminProductsSrc).toContain("primary_image_url")
    expect(adminProductsSrc).toContain("displayMediaUrl")
    expect(adminProductsSrc).toContain("h-10 w-10")
    expect(adminPlgDetailSrc).toContain("primary_image_url")
    expect(adminPlgDetailSrc).toContain("displayMediaUrl")
    expect(adminPlgDetailSrc).toContain("formatValues")
  })
})
