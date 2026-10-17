import { readFileSync } from "node:fs"
import { join } from "node:path"

const admin = join(__dirname, "../../../../../admin")
const api = join(__dirname, "../../../api/admin/product-cloud")

describe("admin offer and EAN wiring", () => {
  it("opens an offer by offer id and does not write central product data", () => {
    const list = readFileSync(join(admin, "app/(shell)/product-cloud/offers/page.tsx"), "utf8")
    expect(list).toContain("href={`/product-cloud/offers/${row.id}`}")
    expect(list).not.toContain("href={`/product-cloud/products/${row.product_id}`}")
    const route = readFileSync(join(api, "offers/[id]/route.ts"), "utf8")
    expect(route).toContain("retrieveOffer(offerId)")
    expect(route).toContain("shipping_profile")
    expect(route).not.toMatch(/updateProducts|updateProductVersions|updateIdentifiers/)
    const page = readFileSync(join(admin, "app/(shell)/product-cloud/offers/[id]/page.tsx"), "utf8")
    expect(page).toContain("Open centrale productreview")
    expect(page).toContain("updateAdminOffer")
    expect(page).not.toContain("updateAdminProductGtin")
  })

  it("corrects the central GTIN without touching offers", () => {
    const route = readFileSync(join(api, "products/[id]/identifier/route.ts"), "utf8")
    expect(route).toContain("planGtinAssignment")
    expect(route).toContain("updateIdentifiers")
    expect(route).not.toMatch(/updateOffers|updateOfferPrices|updateOfferInventories/)
    const wizard = readFileSync(
      join(admin, "components/product-cloud/admin-wizard-shell.tsx"),
      "utf8"
    )
    const forms = readFileSync(
      join(admin, "components/product-cloud/admin-central-forms.tsx"),
      "utf8"
    )
    expect(wizard).toContain("CentralInformationForm")
    expect(forms).toContain("saveAdminProductSection")
    expect(forms).toContain("EAN / GTIN")
  })

  it("does not pass an empty image src in the catalog, offers or review", () => {
    const files = [
      "app/(shell)/product-cloud/products/page.tsx",
      "app/(shell)/product-cloud/offers/page.tsx",
      "app/(shell)/product-cloud/offers/[id]/page.tsx",
      "app/(shell)/product-cloud/products/approvals/page.tsx",
      "app/(shell)/product-cloud/change-proposals/page.tsx",
      "components/product-cloud/admin-wizard-shell.tsx",
      "components/product-cloud/admin-section-proposal-reviews.tsx",
    ]
    for (const file of files) {
      const source = readFileSync(join(admin, file), "utf8")
      expect(source).not.toMatch(/src=\{[^}\n]*\|\|\s*""/)
      expect(source).not.toMatch(/src=\{[^}\n]*\?\?\s*""/)
    }
  })
})
