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
  }>
  shouldShowProductLinkSelector: (group: Group | null) => boolean
  storefrontProductHref: (productId: string) => string
}

type Member = {
  product_id: string
  product_title: string | null
  values: Record<string, string>
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
    },
    {
      product_id: "prod_white",
      product_title: "Wit",
      values: { Kleur: "Wit" },
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
    },
    {
      product_id: "prod_zl",
      product_title: "Zwart L",
      values: { Kleur: "Zwart", Maat: "L" },
    },
    {
      product_id: "prod_wm",
      product_title: "Wit M",
      values: { Kleur: "Wit", Maat: "M" },
    },
  ],
}

const detailSrc = readFileSync(
  join(process.cwd(), "../web/app/_components/product/product-detail.tsx"),
  "utf8"
)
const catalogSrc = readFileSync(
  join(process.cwd(), "../web/app/_lib/storefront-catalog.ts"),
  "utf8"
)

describe("PDP product link selector", () => {
  it("does not show a selector without an active group", () => {
    expect(shouldShowProductLinkSelector(null)).toBe(false)
    expect(
      shouldShowProductLinkSelector({
        id: "x",
        name: "x",
        dimensions: ["Kleur"],
        members: [oneDim.members[0]],
      })
    ).toBe(false)
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

  it("uses real product URLs", () => {
    expect(storefrontProductHref("prod_01ABC")).toBe("/product/prod_01ABC")
    expect(detailSrc).toContain("ProductLinkSelector")
    expect(detailSrc).toContain("productLinkGroup")
    expect(catalogSrc).toContain("product_link_group")
  })

  it("keeps offer data on the standalone product page", () => {
    expect(currentLinkMember(oneDim, "prod_black")?.product_id).toBe(
      "prod_black"
    )
    expect(detailSrc).toContain("detail.offers")
    expect(detailSrc).not.toContain("productLinkGroup.offers")
  })
})
