import {
  ASSEMBLY_EU_BAND_LABELS,
  MATERIALS_EU_LEVEL_LABELS,
  PARTS_EU_LEVEL_LABELS,
  parseAssemblyEuBandLabel,
  parseMaterialsEuLevelLabel,
  parsePartsEuLevelLabel,
} from "../../verification/made-in-europe"
import {
  EUROPEAN_OWNERSHIP_BAND_LABELS,
  EUROPEAN_OWNERSHIP_BANDS,
} from "../../verification/european-ownership"
import { IMPORT_FIELDS, importDisplayHeader } from "../import-columns"
import { BRAND_COMMERCIAL_FIELDS } from "../brand-import"
import {
  brandTemplateHeaders,
  buildBrandImportWorkbook,
} from "../brand-import-template"
import {
  buildProductImportTemplate,
  buildXlsxWorkbook,
  parseXlsxWorkbook,
} from "../import-xlsx"
import {
  coalesceUspsIntoValues,
  joinUspsFromImportValues,
  splitUspsToColumns,
  USP_FIELD_CODES,
} from "../import-usps"
import { intentionalSellerOnlyCommerceNl } from "../central-product-fields"

const HIERARCHY = [
  { id: "cat_kleding", name: "Kleding", slug: "kleding", parent_id: null },
  {
    id: "cat_heren",
    name: "Heren",
    slug: "heren",
    parent_category_id: "cat_kleding",
  },
]

const COMMERCIAL = new Set<string>(BRAND_COMMERCIAL_FIELDS)

describe("european product fields + multi USP templates", () => {
  it("includes Assemblage, Onderdelen, Materialen with UI labels in both templates", () => {
    const sellerTpl = buildProductImportTemplate([], { categories: HIERARCHY })
    const sellerBuf = buildXlsxWorkbook(sellerTpl.sheets, {
      definedNames: sellerTpl.definedNames,
    })
    const adminBuilt = buildBrandImportWorkbook({ categories: HIERARCHY })
    const seller = parseXlsxWorkbook(sellerBuf)
    const admin = parseXlsxWorkbook(adminBuilt)
    const sellerHeaders = (seller.sheets.get("Producten") || [])[0] || []
    const adminHeaders = (admin.sheets.get("Importtemplate") || [])[0] || []
    for (const name of ["Assemblage", "Onderdelen", "Materialen"]) {
      expect(sellerHeaders.some((h) => String(h).startsWith(name))).toBe(true)
      expect(adminHeaders.some((h) => String(h) === name || String(h).startsWith(name))).toBe(
        true
      )
    }
    const sellerList = seller.sheets.get("Lijsten") || []
    expect(sellerList[0]).toEqual(
      expect.arrayContaining([
        "mie_assemblage",
        "mie_onderdelen",
        "mie_materialen",
        "europees_eigendom",
      ])
    )
    const assemblyCol = sellerList.slice(1).map((r) => r[9]).filter(Boolean)
    expect(assemblyCol).toEqual(Object.values(ASSEMBLY_EU_BAND_LABELS))
    const partsCol = sellerList.slice(1).map((r) => r[10]).filter(Boolean)
    expect(partsCol).toEqual(Object.values(PARTS_EU_LEVEL_LABELS))
    const materialsCol = sellerList.slice(1).map((r) => r[11]).filter(Boolean)
    expect(materialsCol).toEqual(Object.values(MATERIALS_EU_LEVEL_LABELS))
    expect(parseAssemblyEuBandLabel("100% assemblage in EU")).toBe("eu_100")
    expect(parsePartsEuLevelLabel("Overwegend EU")).toBe("eu_majority")
    expect(parseMaterialsEuLevelLabel("Gedeeltelijk EU")).toBe("eu_partial")
  })

  it("includes Europees eigendom van het merk with all ownership bands", () => {
    const sellerTpl = buildProductImportTemplate([], { categories: HIERARCHY })
    const headers = sellerTpl.sheets[0].rows[0]
    expect(
      headers.some((h) => String(h).startsWith("Europees eigendom van het merk"))
    ).toBe(true)
    const adminHeaders = brandTemplateHeaders()
    expect(adminHeaders).toContain("Europees eigendom van het merk")
    const list = sellerTpl.sheets.find((s) => s.name === "Lijsten")!.rows
    const eo = list.slice(1).map((r) => r[12]).filter(Boolean)
    expect(eo).toEqual(Object.values(EUROPEAN_OWNERSHIP_BAND_LABELS))
    expect(eo.length).toBe(EUROPEAN_OWNERSHIP_BANDS.length)
  })

  it("joins multi USP columns without dropping values; legacy single usps still works", () => {
    expect(
      joinUspsFromImportValues({
        usp_1: "A",
        usp_2: "B",
        usp_3: "",
        usp_4: "C",
        usp_5: "",
      })
    ).toBe("A\nB\nC")
    expect(joinUspsFromImportValues({ usps: "Legacy\nTwo" })).toBe("Legacy\nTwo")
    expect(coalesceUspsIntoValues({ usp_1: "X", title: "T" }).usps).toBe("X")
    expect(coalesceUspsIntoValues({ title: "T" }).usps).toBeUndefined()
    const split = splitUspsToColumns("one\ntwo\nthree\nfour\nfive\nsix")
    expect(split[0]).toBe("one")
    expect(split[4]).toContain("five")
    expect(split[4]).toContain("six")
    expect(USP_FIELD_CODES).toHaveLength(5)
    const uspHeaders = IMPORT_FIELDS.filter((f) => f.column.startsWith("usp_"))
    expect(uspHeaders).toHaveLength(5)
    expect(uspHeaders.map((f) => f.nl_name)).toEqual([
      "Belangrijkste kenmerk 1",
      "Belangrijkste kenmerk 2",
      "Belangrijkste kenmerk 3",
      "Belangrijkste kenmerk 4",
      "Belangrijkste kenmerk 5",
    ])
  })

  it("keeps Seller/Admin central columns aligned minus the ten commerce columns", () => {
    const sellerCentral = IMPORT_FIELDS.filter((f) => !COMMERCIAL.has(f.column)).map(
      (f) => f.nl_name
    )
    const admin = brandTemplateHeaders()
    for (const name of sellerCentral) {
      expect(admin).toContain(name)
    }
    // Same relative order for shared central columns
    const adminCentralOrder = admin.filter((h) => sellerCentral.includes(h))
    expect(adminCentralOrder).toEqual(sellerCentral)
    const commerce = intentionalSellerOnlyCommerceNl()
    expect(commerce).toHaveLength(10)
    for (const name of commerce) {
      expect(admin.join(" | ")).not.toContain(name)
    }
    const sellerDisplay = IMPORT_FIELDS.map(importDisplayHeader)
    for (const needle of [
      "Seller SKU",
      "Reguliere verkoopprijs",
      "Verzendprofiel",
    ]) {
      expect(sellerDisplay.some((h) => h.includes(needle))).toBe(true)
      expect(admin.some((h) => h.includes(needle))).toBe(false)
    }
  })

  it("keeps CatDeps / Kenmerken / dependent subcategory validations", () => {
    const sellerTpl = buildProductImportTemplate([], { categories: HIERARCHY })
    expect(sellerTpl.sheets.some((s) => s.name === "CatDeps")).toBe(true)
    expect(sellerTpl.sheets.some((s) => s.name === "Kenmerken")).toBe(true)
    expect(sellerTpl.definedNames.length).toBeGreaterThan(0)
    const sub = sellerTpl.sheets[0].validations?.find((v) =>
      /INDIRECT\(VLOOKUP\(/.test(v.formula)
    )
    expect(sub).toBeTruthy()
  })
})
