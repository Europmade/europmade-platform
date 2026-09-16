import {
  applyCategoryResolution,
  resolveImportCategory,
  uniqueImportCategoryCatalog,
} from "../import-category"
import { validateImportRows } from "../import-mapping"
import { computeProductCompleteness } from "../completeness"
import { BOSCH_EXAMPLE } from "../import-columns"
import {
  buildProductImportTemplate,
  buildXlsxWorkbook,
} from "../import-xlsx"

const CATALOG = uniqueImportCategoryCatalog([
  { id: "cat_huishouden", name: "Huishouden", slug: "huishouden" },
  { id: "cat_badkamer", name: "Badkamer", slug: "badkamer" },
  { id: "cat_beauty", name: "Beauty & Verzorging", slug: "beauty-verzorging" },
  { id: "cat_keuken", name: "Keuken", slug: "keuken" },
  { id: "cat_elek", name: "Elektronica", slug: "elektronica" },
])

describe("import category resolver", () => {
  it("links an exact canonical category", () => {
    const res = resolveImportCategory("Huishouden", CATALOG)
    expect(res.status).toBe("linked")
    expect(res.matched?.id).toBe("cat_huishouden")
  })

  it("links despite letter case", () => {
    const res = resolveImportCategory("huishouden", CATALOG)
    expect(res.status).toBe("linked")
    expect(res.matched?.name).toBe("Huishouden")
  })

  it("links despite extra spaces, newlines and nbsp", () => {
    const res = resolveImportCategory("  Huishouden \u00a0\n ", CATALOG)
    expect(res.status).toBe("linked")
    expect(res.matched?.slug).toBe("huishouden")
  })

  it("links & versus en for an existing Dutch name", () => {
    const res = resolveImportCategory("Beauty en Verzorging", CATALOG)
    expect(res.status).toBe("linked")
    expect(res.matched?.id).toBe("cat_beauty")
  })

  it("links a Dutch alias that matches an existing category", () => {
    const res = resolveImportCategory("BADKAMER", CATALOG)
    expect(res.status).toBe("linked")
    expect(res.matched?.id).toBe("cat_badkamer")
  })

  it("does not auto-link an unknown combined category", () => {
    const res = resolveImportCategory("Badkamer & verzorging", CATALOG)
    expect(res.status).toBe("suggested")
    expect(res.matched).toBeNull()
    expect(res.suggestions.map((s) => s.name)).toEqual(
      expect.arrayContaining(["Badkamer", "Beauty & Verzorging"])
    )
    expect(res.suggestions).toHaveLength(2)
  })

  it("does not auto-link a completely unknown category", () => {
    const res = resolveImportCategory("Sportartikelen XYZ", CATALOG)
    expect(res.status).toBe("pending")
    expect(res.matched).toBeNull()
    expect(res.suggestions).toEqual([])
  })

  it("does not block the full import when category is unknown", () => {
    const { values } = applyCategoryResolution(
      {
        title: "MOEVE handdoek",
        brand: "MOEVE",
        category: "Badkamer & verzorging",
        ean: "",
        sku: "MOEVE-1",
      },
      CATALOG
    )
    const result = validateImportRows([values], new Set())
    expect(result.summary.error_rows).toBe(0)
    expect(result.preview[0].status).toBe("new")
    expect(result.preview[0].issues.some((i) => i.blocking === false)).toBe(
      true
    )
    expect(result.preview[0].issues[0].message).toBe(
      "Categorie niet herkend — kies een EuropMade-categorie."
    )
  })

  it("keeps product name and identification when category is pending", () => {
    const { values, resolution } = applyCategoryResolution(
      {
        title: "MOEVE Superwuschel",
        brand: "MOEVE",
        category: "Badkamer & verzorging",
        ean: "",
        mpn: "MW-100",
        sku: "SKU-MOEVE",
      },
      CATALOG
    )
    const result = validateImportRows([values], new Set())
    expect(result.preview[0].values.title).toBe("MOEVE Superwuschel")
    expect(result.preview[0].values.sku).toBe("SKU-MOEVE")
    expect(result.preview[0].values.mpn).toBe("MW-100")
    expect(resolution.raw).toBe("Badkamer & verzorging")
    expect(resolution.status).toBe("suggested")
  })

  it("blocks publication when category is still pending", () => {
    const report = computeProductCompleteness({
      basis: {
        title: "MOEVE handdoek",
        brand_id: "brand_1",
        manufacturer_id: "mfr_1",
        category_names: [],
        identifier_value: "4000000000004",
        has_primary_image: true,
      },
      attributes: [],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: true,
      },
    })
    expect(report.publishable).toBe(false)
    expect(report.publication_blocked_reasons).toContain(
      "Categorie niet herkend — kies een EuropMade-categorie."
    )
  })

  it("embeds a live category dropdown in the XLSX template", () => {
    const tpl = buildProductImportTemplate([], { categories: CATALOG })
    const listHeader = tpl.sheets.find((s) => s.name === "Lijsten")?.rows[0]
    expect(listHeader).toContain("categorieen")
    const listNames = (tpl.sheets.find((s) => s.name === "Lijsten")?.rows || [])
      .slice(1)
      .map((row) => row[5])
      .filter(Boolean)
    expect(listNames).toEqual(
      expect.arrayContaining(["Huishouden", "Badkamer", "Beauty & Verzorging"])
    )
    const productSheet = tpl.sheets.find((s) => s.name === "Producten")
    const categoryValidation = productSheet?.validations?.find((v) =>
      v.formula.includes("$F$")
    )
    expect(categoryValidation?.formula).toMatch(/'Lijsten'!\$F\$2:\$F\$/)
    const buf = buildXlsxWorkbook(tpl.sheets)
    expect(buf.length).toBeGreaterThan(1000)
  })

  it("uses the same resolver for preview values and commit overlay", () => {
    const preview = applyCategoryResolution(
      { category: "  BADKAMER  " },
      CATALOG
    )
    const commit = applyCategoryResolution(
      {
        category: "  BADKAMER  ",
        category_raw: "  BADKAMER  ",
        category_override: "",
      },
      CATALOG
    )
    expect(preview.resolution.matched?.id).toBe(commit.resolution.matched?.id)
    expect(preview.resolution.status).toBe("linked")
  })

  it("keeps Bosch example category linked without inventing a new category", () => {
    const res = resolveImportCategory(BOSCH_EXAMPLE.category, CATALOG)
    expect(BOSCH_EXAMPLE.category).toBe("Huishouden")
    expect(res.status).toBe("linked")
    expect(res.matched?.name).toBe("Huishouden")
    expect(CATALOG.some((c) => c.name === "Bosch")).toBe(false)
  })
})
