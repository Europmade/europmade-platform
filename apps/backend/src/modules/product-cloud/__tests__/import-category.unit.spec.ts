import {
  applianceGroupSlug,
  applyCategoryHierarchyResolution,
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

const HIERARCHY = uniqueImportCategoryCatalog([
  { id: "cat_kleding", name: "Kleding", slug: "kleding", parent_id: null },
  {
    id: "cat_heren",
    name: "Heren",
    slug: "heren",
    parent_category_id: "cat_kleding",
  },
  { id: "cat_wonen", name: "Wonen", slug: "wonen", parent_id: null },
  {
    id: "cat_keuken",
    name: "Keuken",
    slug: "keuken",
    parent_category_id: "cat_wonen",
  },
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
    expect(
      result.preview[0].issues.find((i) => i.field === "category")?.message
    ).toBe("Categorie niet herkend — kies een EuropMade-categorie.")
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
    expect(listHeader).toContain("niveau1")
    expect(listHeader).toContain("niveau2_flat")
    expect(listHeader).toContain("niveau2_naam")
    expect(tpl.sheets.some((s) => s.name === "CatDepsL3")).toBe(true)
    const listNames = (tpl.sheets.find((s) => s.name === "Lijsten")?.rows || [])
      .slice(1)
      .map((row) => row[4])
      .filter(Boolean)
    expect(listNames).toEqual(
      expect.arrayContaining(["Huishouden", "Badkamer", "Beauty & Verzorging"])
    )
    const productSheet = tpl.sheets.find((s) => s.name === "Producten")
    const categoryValidation = productSheet?.validations?.find((v) =>
      v.formula.includes("$E$")
    )
    expect(categoryValidation?.formula).toMatch(/'Lijsten'!\$E\$2:\$E\$/)
    const buf = buildXlsxWorkbook(tpl.sheets, { definedNames: tpl.definedNames })
    expect(buf.length).toBeGreaterThan(1000)
  })

  it("splits root and subcategory lists when hierarchy is present", () => {
    const tpl = buildProductImportTemplate([], { categories: HIERARCHY })
    const rows = tpl.sheets.find((s) => s.name === "Lijsten")?.rows || []
    const roots = rows.slice(1).map((row) => row[4]).filter(Boolean)
    const children = rows.slice(1).map((row) => row[5]).filter(Boolean)
    expect(roots).toEqual(expect.arrayContaining(["Kleding", "Wonen"]))
    expect(roots).not.toEqual(expect.arrayContaining(["Heren"]))
    expect(children).toEqual(expect.arrayContaining(["Heren", "Keuken"]))
    const productSheet = tpl.sheets.find((s) => s.name === "Producten")
    const subValidation = productSheet?.validations?.find((v) =>
      /INDIRECT|CatDeps|\$F\$/.test(v.formula)
    )
    expect(subValidation?.formula).toMatch(/INDIRECT\(VLOOKUP\(/)
    expect(tpl.sheets.some((s) => s.name === "CatDeps")).toBe(true)
    expect(tpl.definedNames?.length).toBeGreaterThan(0)
    expect(tpl.sheets.some((s) => s.name === "Kenmerken")).toBe(true)
    const kenmerken = tpl.sheets.find((s) => s.name === "Kenmerken")?.rows || []
    const maatRow = kenmerken.find((r) => r[1] === "maat")
    expect(maatRow?.[0]).toBe("Kleding")
    expect(maatRow?.[3]).toMatch(/XS/)
  })

  it("rejects a subcategory that does not belong to the selected root", () => {
    const resolved = applyCategoryHierarchyResolution(
      { category: "Kleding", subcategory: "Keuken" },
      HIERARCHY
    )
    expect(resolved.values.subcategory_status).toBe("invalid")
    expect(resolved.values.subcategory_error).toMatch(/hoort niet/)
  })

  it("links an English breadcrumb inside the parent and does not jump to another root", () => {
    const catalog = uniqueImportCategoryCatalog([
      { id: "cat_wonen", name: "Wonen", slug: "wonen", parent_id: null },
      {
        id: "cat_textiel",
        name: "Woontextiel",
        slug: "woontextiel",
        parent_id: "cat_wonen",
      },
      {
        id: "cat_kussens",
        name: "Sierkussens & plaids",
        slug: "sierkussens-en-plaids",
        parent_id: "cat_textiel",
      },
      { id: "cat_dames", name: "Dames", slug: "dames", parent_id: null },
      {
        id: "cat_dames_kussens",
        name: "Sierkussens & plaids",
        slug: "sierkussens-dames",
        parent_id: "cat_dames",
      },
    ])
    const resolved = applyCategoryHierarchyResolution(
      { category: "Home → Home Textiles → Cushions & Throws" },
      catalog
    )
    expect(resolved.link_ids).toEqual(["cat_wonen", "cat_textiel", "cat_kussens"])
    expect(resolved.resolution.matched?.name).toBe("Wonen")
    expect(resolved.subcategory_resolution.matched?.name).toBe("Woontextiel")
    expect(resolved.values.category).not.toBe("Dames")
  })

  it("leaves an uncertain child unmatched instead of borrowing another branch", () => {
    const catalog = uniqueImportCategoryCatalog([
      { id: "cat_wonen", name: "Wonen", slug: "wonen", parent_id: null },
      { id: "cat_dames", name: "Dames", slug: "dames", parent_id: null },
      {
        id: "cat_women_leaf",
        name: "Sierkussens & plaids",
        slug: "sierkussens-dames",
        parent_id: "cat_dames",
      },
    ])
    const resolved = applyCategoryHierarchyResolution(
      {
        category: "Wonen",
        subcategory: "Onbekend textiel",
        subcategory_l3: "Cushions & Throws",
      },
      catalog
    )
    expect(resolved.resolution.matched?.id).toBe("cat_wonen")
    expect(resolved.link_ids).toEqual(["cat_wonen"])
    expect(resolved.link_ids).not.toContain("cat_dames")
  })

  it("links parent and child from hierarchy columns", () => {
    const resolved = applyCategoryHierarchyResolution(
      { category: "Kleding", subcategory: "Heren" },
      HIERARCHY
    )
    expect(resolved.link_ids).toEqual(["cat_kleding", "cat_heren"])
    expect(resolved.resolution.matched?.id).toBe("cat_kleding")
    expect(resolved.subcategory_resolution.matched?.id).toBe("cat_heren")
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

  it("keeps both dishwasher groups when the display name is shared", () => {
    const catalog = uniqueImportCategoryCatalog([
      { id: "hh", name: "Huishouden", slug: "huishouden" },
      { id: "inbouw", name: "Inbouwapparatuur", slug: "inbouwapparatuur", parent_id: "hh" },
      { id: "vrij", name: "Vrijstaande apparaten", slug: "vrijstaande-apparaten", parent_id: "hh" },
      { id: "inbouw-vaat", name: "Vaatwassers", slug: "vaatwassers", parent_id: "inbouw" },
      { id: "vrij-vaat", name: "Vaatwassers", slug: "vrijstaande-vaatwassers", parent_id: "vrij" },
      { id: "was", name: "Wassen & drogen", slug: "was-droog", parent_id: "hh" },
      { id: "machines", name: "Wasmachines", slug: "wasmachines", parent_id: "was" },
      { id: "drogers", name: "Wasdrogers", slug: "wasdrogers", parent_id: "was" },
      { id: "combo", name: "Was-droogcombinaties", slug: "was-droogcombinaties", parent_id: "was" },
    ])
    expect(catalog.filter((row) => row.name === "Vaatwassers")).toHaveLength(2)
    const ambiguous = resolveImportCategory("Vaatwassers", catalog)
    expect(ambiguous.status).toBe("suggested")
    expect(ambiguous.matched).toBeNull()

    const freestanding = applyCategoryHierarchyResolution(
      {
        category: "Vaatwassers",
        title: "Bosch Freestanding Dishwasher",
        inbouw_of_vrijstaand: "Freestanding",
      },
      catalog
    )
    expect(freestanding.link_ids).toEqual(["hh", "vrij", "vrij-vaat"])

    const builtin = applyCategoryHierarchyResolution(
      {
        category: "Huishouden",
        subcategory: "Inbouwapparatuur",
        subcategory_l3: "Vaatwassers",
        title: "Bosch integrated dishwasher",
        inbouw_of_vrijstaand: "Integrated",
      },
      catalog
    )
    expect(builtin.link_ids).toEqual(["hh", "inbouw", "inbouw-vaat"])

    const combo = applyCategoryHierarchyResolution(
      { title: "Washer Dryer 8 kg", product_type: "washer-dryer" },
      catalog
    )
    expect(combo.link_ids).toEqual(["hh", "was", "combo"])
    expect(combo.link_ids).not.toContain("machines")
    expect(combo.link_ids).not.toContain("drogers")
    expect(applianceGroupSlug({ title: "Washing Machine 9 kg" })).toBe("wasmachines")
    expect(applianceGroupSlug({ title: "Heat Pump Tumble Dryer" })).toBe("wasdrogers")
  })

  it("keeps Bosch example category linked without inventing a new category", () => {
    const res = resolveImportCategory(BOSCH_EXAMPLE.category, CATALOG)
    expect(BOSCH_EXAMPLE.category).toBe("Huishouden")
    expect(res.status).toBe("linked")
    expect(res.matched?.name).toBe("Huishouden")
    expect(CATALOG.some((c) => c.name === "Bosch")).toBe(false)
  })
})
