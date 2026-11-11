import {
  adminCentralImportLabels,
  intentionalSellerOnlyCommerceNl,
  sellerCentralImportFields,
  stripRequirementSuffix,
  sellerDisplayHeaders,
} from "../central-product-fields"
import {
  buildProductImportTemplate,
  buildXlsxWorkbook,
  parseXlsxWorkbook,
} from "../import-xlsx"
import { buildBrandImportWorkbook } from "../brand-import-template"
import { MANUAL_LANGUAGE_OPTIONS } from "../category-attributes"

const HIERARCHY = [
  { id: "cat_kleding", name: "Kleding", slug: "kleding", parent_id: null },
  {
    id: "cat_heren",
    name: "Heren",
    slug: "heren",
    parent_category_id: "cat_kleding",
  },
]

describe("central product field alignment", () => {
  it("keeps shared central NL names between seller and admin templates", () => {
    const sellerNl = sellerCentralImportFields().map((f) => f.nl_name)
    const admin = new Set(adminCentralImportLabels())
    const missingInAdmin = sellerNl.filter(
      (name) =>
        !admin.has(name) &&
        name !== "GPSR-fabrikantnaam (etiket)" &&
        !name.startsWith("GPSR-fabrikantnaam")
    )
    // Seller has GPSR-fabrikantnaam; Admin uses catalog Fabrikant only — intentional.
    expect(missingInAdmin).toEqual([])
    expect(admin.has("Fabrikant")).toBe(true)
    expect(admin.has("Niveau 2")).toBe(true)
    expect(admin.has("Niveau 1")).toBe(true)
  })

  it("lists commerce fields only on the seller template", () => {
    const commerce = intentionalSellerOnlyCommerceNl()
    expect(commerce).toEqual(
      expect.arrayContaining([
        "Seller SKU / artikelnummer",
        "Reguliere verkoopprijs",
        "Voorraad",
        "Verzendprofiel",
      ])
    )
    const admin = adminCentralImportLabels().join(" ")
    for (const name of commerce) {
      expect(admin).not.toContain(name)
    }
  })

  it("embeds the same category hierarchy and language list in both workbooks", () => {
    const sellerTpl = buildProductImportTemplate([], { categories: HIERARCHY })
    const sellerBuf = buildXlsxWorkbook(sellerTpl.sheets, {
      definedNames: sellerTpl.definedNames,
    })
    const adminBuf = buildBrandImportWorkbook({ categories: HIERARCHY })
    const seller = parseXlsxWorkbook(sellerBuf)
    const admin = parseXlsxWorkbook(adminBuf)
    const sellerList = seller.sheets.get("Lijsten") || []
    const adminList = admin.sheets.get("Lijsten") || []
    expect(sellerList[0]).toEqual(expect.arrayContaining(["talen", "niveau1"]))
    expect(adminList[0]).toEqual(expect.arrayContaining(["talen", "niveau1"]))
    const sellerTalen = sellerList.slice(1).map((r) => r[8]).filter(Boolean)
    expect(sellerTalen).toEqual(expect.arrayContaining(MANUAL_LANGUAGE_OPTIONS.slice(0, 3)))
    expect(admin.sheets.has("CatDeps")).toBe(true)
    expect(seller.sheets.has("Kenmerken")).toBe(true)
    expect(admin.sheets.has("Kenmerken")).toBe(true)
    const maat = (admin.sheets.get("Kenmerken") || []).find((r) => r[1] === "maat")
    expect(maat?.[0]).toBe("Kleding")
  })

  it("maps seller display headers back to canonical NL names", () => {
    const stripped = sellerDisplayHeaders().map(stripRequirementSuffix)
    expect(stripped).toEqual(expect.arrayContaining(["EAN / GTIN", "Niveau 2", "Merk"]))
  })
})
