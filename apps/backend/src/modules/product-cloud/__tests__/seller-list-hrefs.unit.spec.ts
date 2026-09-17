import { readFileSync } from "node:fs"
import { join } from "node:path"
import { transformSync } from "@swc/core"

const helperPath = join(
  process.cwd(),
  "../web/app/seller/_lib/seller-list-actions.ts"
)
const compiled = transformSync(readFileSync(helperPath, "utf8"), {
  filename: helperPath,
  jsc: {
    parser: { syntax: "typescript" },
    target: "es2022",
  },
  module: { type: "commonjs" },
})
const actions = { exports: {} as Record<string, unknown> }
new Function("exports", "module", compiled.code as string)(
  actions.exports,
  actions
)

type ListRef = {
  id: string
  title?: string | null
  catalog_owner?: boolean
  identifier_id?: string | null
  offer?: { identifier_id?: string | null } | null
}

const {
  canEditCatalogInformation,
  isManagerProductPath,
  isSellerCatalogOwner,
  sellerCatalogInformationHref,
  sellerCatalogTabHref,
  sellerOfferHref,
  sellerProductHref,
} = actions.exports as {
  canEditCatalogInformation: (
    product: ListRef,
    actions?: Record<string, boolean>
  ) => boolean
  isManagerProductPath: (href: string) => boolean
  isSellerCatalogOwner: (product: ListRef) => boolean
  sellerCatalogInformationHref: (product: ListRef) => string | null
  sellerCatalogTabHref: (product: ListRef, tab: string) => string | null
  sellerOfferHref: (product: ListRef) => string
  sellerProductHref: (product: ListRef) => string
}

const managerSrc = readFileSync(
  join(process.cwd(), "src/api/store/product-cloud/product-manager.ts"),
  "utf8"
)
const offerPageSrc = readFileSync(
  join(process.cwd(), "../web/app/seller/products/offer/page.tsx"),
  "utf8"
)

const dt990 = {
  id: "prod_dt990",
  title: "beyerdynamic DT 990 PRO",
  catalog_owner: false as const,
  identifier_id: "idn_dt990",
  offer: { identifier_id: "idn_dt990" },
}

const moeve = {
  id: "prod_moeve",
  title: "MOEVE",
  catalog_owner: true as const,
  identifier_id: "idn_moeve",
  offer: { identifier_id: "idn_moeve" },
}

describe("seller list actions: owner vs non-owner offer", () => {
  it("opens Productinformatie on the existing manager for a catalog owner", () => {
    expect(sellerCatalogInformationHref(moeve)).toBe(
      "/seller/products/prod_moeve?step=information"
    )
    expect(isManagerProductPath(sellerCatalogInformationHref(moeve)!)).toBe(
      true
    )
  })

  it("keeps Productbeheer on the manager for a catalog owner", () => {
    expect(sellerProductHref(moeve)).toBe("/seller/products/prod_moeve")
  })

  it("keeps Verkoopinformatie on the manager offer tab for a catalog owner", () => {
    expect(sellerOfferHref(moeve)).toBe(
      "/seller/products/prod_moeve?tab=offer"
    )
  })

  it("opens Verkoopinformatie on the offer page for a non-owner with an own offer", () => {
    expect(sellerOfferHref(dt990)).toBe(
      "/seller/products/offer?identifier_id=idn_dt990"
    )
    expect(isManagerProductPath(sellerOfferHref(dt990))).toBe(false)
  })

  it("does not send a non-owner with an own offer to a manager URL (no 403 path)", () => {
    expect(isManagerProductPath(sellerProductHref(dt990))).toBe(false)
    expect(isManagerProductPath(sellerOfferHref(dt990))).toBe(false)
    expect(sellerCatalogInformationHref(dt990)).toBe(
      "/seller/products/catalog/prod_dt990"
    )
    expect(sellerCatalogTabHref(dt990, "information")).toBeNull()
    expect(sellerCatalogTabHref(dt990, "offer")).toBeNull()
    expect(sellerCatalogTabHref(dt990, "media")).toBeNull()
    expect(sellerCatalogTabHref(dt990, "variants")).toBeNull()
    expect(sellerCatalogTabHref(dt990, "history")).toBeNull()
  })

  it("does not open the central Product Manager for a non-owner", () => {
    expect(isSellerCatalogOwner(dt990)).toBe(false)
    expect(canEditCatalogInformation(dt990, { edit_information: true })).toBe(
      false
    )
    expect(sellerProductHref(dt990)).not.toContain("/seller/products/prod_dt990")
  })

  it("lets a non-owner manage own commercial fields via the offer form", () => {
    const href = sellerOfferHref(dt990)
    expect(href).toContain("/seller/products/offer?identifier_id=")
    expect(href).toContain("idn_dt990")
  })

  it("keeps central Product Cloud data protected for non-owners", () => {
    expect(canEditCatalogInformation(dt990)).toBe(false)
    expect(sellerCatalogInformationHref(dt990)).toBe(
      "/seller/products/catalog/prod_dt990"
    )
  })

  it("uses the offer flow for DT 990 PRO", () => {
    expect(dt990.title).toBe("beyerdynamic DT 990 PRO")
    expect(sellerProductHref(dt990)).toBe(
      "/seller/products/offer?identifier_id=idn_dt990"
    )
    expect(sellerOfferHref(dt990)).toBe(
      "/seller/products/offer?identifier_id=idn_dt990"
    )
  })

  it("uses the manager flow for a seller-owned MOEVE product", () => {
    expect(moeve.title).toBe("MOEVE")
    expect(isSellerCatalogOwner(moeve)).toBe(true)
    expect(sellerProductHref(moeve)).toBe("/seller/products/prod_moeve")
    expect(sellerCatalogInformationHref(moeve)).toBe(
      "/seller/products/prod_moeve?step=information"
    )
  })

  it("does not create a second Product Cloud product URL for an offered catalog item", () => {
    expect(sellerProductHref(dt990)).not.toMatch(
      /\/seller\/products\/new/
    )
    expect(sellerProductHref(dt990)).not.toBe(
      `/seller/products/${dt990.id}`
    )
  })

  it("does not invent a second offer path besides identifier_id", () => {
    expect(sellerOfferHref(dt990)).toBe(sellerProductHref(dt990))
    expect(sellerOfferHref(dt990)).not.toContain("?tab=offer")
  })

  it("never falls back to [id]?tab=offer when a non-owner has identifier_id", () => {
    expect(sellerOfferHref(dt990)).not.toBe(
      "/seller/products/prod_dt990?tab=offer"
    )
    expect(
      sellerOfferHref({
        ...dt990,
        identifier_id: null,
        offer: { identifier_id: "idn_from_offer" },
      })
    ).toBe("/seller/products/offer?identifier_id=idn_from_offer")
  })

  it("lets a non-owner change own price on the offer form", () => {
    expect(sellerOfferHref(dt990)).toContain("/seller/products/offer")
    expect(offerPageSrc).toContain("base_price: base")
    expect(offerPageSrc).toContain("setBasePrice")
  })

  it("lets a non-owner change own stock on the offer form", () => {
    expect(offerPageSrc).toContain("quantity_available: qty")
    expect(offerPageSrc).toContain("setQuantity")
  })

  it("lets a non-owner change own SKU on the offer form", () => {
    expect(offerPageSrc).toContain("seller_sku: sellerSku.trim()")
    expect(offerPageSrc).toContain("setSellerSku")
  })

  it("keeps the Product Cloud owner check on the manager detail loader", () => {
    expect(managerSrc).toContain(
      "if (product.current_owner_seller_id !== sellerId)"
    )
    expect(managerSrc).toMatch(
      /export async function buildSellerProductManagerDetail[\s\S]*if \(product\.current_owner_seller_id !== sellerId\)/
    )
  })
})
