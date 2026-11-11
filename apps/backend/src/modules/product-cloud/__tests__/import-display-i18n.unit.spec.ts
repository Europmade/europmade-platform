import { resolveImportCategory } from "../import-category"
import {
  resolveNlDisplayName,
  translateImportDisplayName,
} from "../import-template-display-i18n"
import { readFileSync } from "node:fs"
import path from "node:path"
import {
  localizeApprovedSellerTemplateXlsx,
  parseXlsxWorkbook,
} from "../import-xlsx"

describe("import display i18n", () => {
  it("translates core category labels", () => {
    expect(translateImportDisplayName("Huishouden", "en")).toBe("Household")
    expect(translateImportDisplayName("Schoonmaak", "en")).toBe("Cleaning")
    expect(resolveNlDisplayName("Household")).toBe("Huishouden")
    expect(resolveNlDisplayName("Cleaning")).toBe("Schoonmaak")
  })

  it("resolves EN category labels on import", () => {
    const catalog = [
      {
        id: "c1",
        name: "Huishouden",
        slug: "huishouden",
        parent_id: null,
      },
      {
        id: "c2",
        name: "Schoonmaak",
        slug: "schoonmaak",
        parent_id: "c1",
      },
    ]
    const r = resolveImportCategory("Household", catalog)
    expect(r.status).toBe("linked")
    expect(r.matched?.slug).toBe("huishouden")
  })

  it("localizes category dropdown values in EN/DE/FR workbooks", () => {
    const source = readFileSync(
      path.join(__dirname, "../assets/seller-product-template.xlsx")
    )
    const en = [...parseXlsxWorkbook(localizeApprovedSellerTemplateXlsx(source, "en")).sheets.values()].flat().flat().join("\n")
    const de = [...parseXlsxWorkbook(localizeApprovedSellerTemplateXlsx(source, "de")).sheets.values()].flat().flat().join("\n")
    const fr = [...parseXlsxWorkbook(localizeApprovedSellerTemplateXlsx(source, "fr")).sheets.values()].flat().flat().join("\n")
    expect(en).toContain("Household")
    expect(en).toContain("Cleaning")
    expect(en).toMatch(/Product specifications/i)
    expect(de).toContain("Haushalt")
    expect(de).toContain("Reinigung")
    expect(fr).toContain("Maison")
    expect(fr).toContain("Nettoyage")
    expect(en.includes("Robotstofzuiger")).toBe(false)
  }, 120000)
})
