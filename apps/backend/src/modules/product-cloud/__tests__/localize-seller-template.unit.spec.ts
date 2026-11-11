import { readFileSync } from "node:fs"
import path from "node:path"
import {
  localizeApprovedSellerTemplateXlsx,
  parseXlsxProductGrid,
} from "../import-xlsx"

const assetPath = path.join(
  __dirname,
  "../assets/seller-product-template.xlsx"
)

describe("localizeApprovedSellerTemplateXlsx", () => {
  const source = readFileSync(assetPath)

  it("keeps NL workbook unchanged", () => {
    const out = localizeApprovedSellerTemplateXlsx(source, "nl")
    expect(out.equals(source)).toBe(true)
  })

  it("rewrites EN headers and still parses as product grid", () => {
    const out = localizeApprovedSellerTemplateXlsx(source, "en")
    expect(out.length).toBeGreaterThan(1000)
    const grid = parseXlsxProductGrid(out)
    expect(grid.headers.some((h) => /Product name/i.test(h))).toBe(true)
    expect(grid.headers.some((h) => /Level 1/i.test(h))).toBe(true)
    expect(grid.headers.some((h) => /Productnaam/i.test(h))).toBe(false)
  })

  it("generates DE and FR header locales", () => {
    const de = parseXlsxProductGrid(
      localizeApprovedSellerTemplateXlsx(source, "de")
    )
    const fr = parseXlsxProductGrid(
      localizeApprovedSellerTemplateXlsx(source, "fr")
    )
    expect(de.headers.some((h) => /Produktname/i.test(h))).toBe(true)
    expect(fr.headers.some((h) => /Nom du produit/i.test(h))).toBe(true)
  })
})
