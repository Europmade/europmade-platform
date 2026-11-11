import {
  MAX_PRODUCT_SPECIFICATIONS,
  VARIANT_BOUND_SPEC_CODES,
  buildSpecDepsColumns,
  mergeProductSpecSlotsIntoValues,
  normalizeProductSpecs,
  orphanedSpecCodes,
  productSpecsForSubcategory,
  SUBCATEGORY_PRODUCT_SPEC_CATALOGS,
} from "../product-specifications"
import {
  buildProductImportTemplate,
  buildXlsxWorkbook,
  parseXlsxWorkbook,
} from "../import-xlsx"
import { buildBrandImportWorkbook } from "../brand-import-template"
import { IMPORT_FIELDS, PRODUCT_SPEC_SLOT_COUNT } from "../import-columns"
import { BRAND_COMMERCIAL_FIELDS } from "../brand-import"
import { validateImportRows } from "../import-mapping"

const SAMPLE_CATEGORIES = [
  {
    id: "root-tuin",
    name: "Tuin",
    slug: "tuin",
    parent_id: null as string | null,
  },
  {
    id: "child-maaier",
    name: "Grasmaaiers & Robots",
    slug: "grasmaaiers-robots",
    parent_id: "root-tuin",
  },
  {
    id: "child-hark",
    name: "Tuinhandgereedschap",
    slug: "tuinhandgereedschap",
    parent_id: "root-tuin",
  },
]

describe("product-specifications catalog", () => {
  it("exposes different specs for two subcategories under the same root", () => {
    const mowers = productSpecsForSubcategory("Grasmaaiers & Robots")
    const rakes = productSpecsForSubcategory("Tuinhandgereedschap")
    expect(mowers.length).toBeGreaterThan(0)
    expect(rakes.length).toBeGreaterThan(0)
    expect(mowers.map((s) => s.code)).toContain("maaibreedte")
    expect(rakes.map((s) => s.code)).toContain("werkbreedte")
    expect(mowers.map((s) => s.code)).not.toContain("werkbreedte")
    expect(rakes.map((s) => s.code)).not.toContain("maaibreedte")
  })

  it("caps catalogs at 10 and keeps bron codes including historical variant keys", () => {
    const bloated = normalizeProductSpecs([
      ...Array.from({ length: 12 }, (_, i) => ({
        code: `spec_${i}`,
        name: `Spec ${i}`,
        data_type: "Tekst-met-eenheid" as const,
        is_required: true,
        requirement_tier: "category_required" as const,
        sort_order: i + 1,
      })),
      {
        code: "maat",
        name: "Maat",
        data_type: "Keuzelijst" as const,
        is_required: false,
        requirement_tier: "optional" as const,
        sort_order: 0,
      },
    ])
    expect(bloated.length).toBe(MAX_PRODUCT_SPECIFICATIONS)
    expect(bloated.some((s) => VARIANT_BOUND_SPEC_CODES.has(s.code))).toBe(true)
    expect(bloated.every((s) => s.requirement_tier === "optional")).toBe(true)
  })

  it("keeps every managed catalog at or under 10", () => {
    for (const [key, list] of Object.entries(SUBCATEGORY_PRODUCT_SPEC_CATALOGS)) {
      expect(normalizeProductSpecs(list).length).toBeLessThanOrEqual(10)
      expect(key).toBeTruthy()
    }
  })
})

describe("mergeProductSpecSlotsIntoValues", () => {
  it("maps slot values by position and skips empties (no clear)", () => {
    const merged = mergeProductSpecSlotsIntoValues({
      subcategory: "Grasmaaiers & Robots",
      spec_value_1: "42",
      spec_value_2: "",
      spec_label_4: "Aandrijving",
      spec_value_4: "Accu",
      existing_attr: "keep-me",
    })
    expect(merged.errors).toEqual([])
    expect(merged.values.maaibreedte).toBe("42")
    expect(merged.values.aandrijving).toBe("Accu")
    expect(merged.values.existing_attr).toBe("keep-me")
    expect(merged.values.spec_value_1).toBeUndefined()
    expect(merged.values.maaihoogte).toBeUndefined()
  })

  it("rejects invalid labels and option values for a subcategory", () => {
    const badLabel = mergeProductSpecSlotsIntoValues({
      subcategory: "Tuinhandgereedschap",
      spec_label_1: "Maaibreedte",
      spec_value_1: "40",
    })
    expect(badLabel.errors.length).toBeGreaterThan(0)

    const badOption = mergeProductSpecSlotsIntoValues({
      subcategory: "Grasmaaiers & Robots",
      spec_label_4: "Aandrijving",
      spec_value_4: "Stoom",
    })
    expect(badOption.errors.some((e) => /niet toegestaan/i.test(e))).toBe(true)
  })

  it("flags orphans when subcategory catalog changes", () => {
    const next = productSpecsForSubcategory("Tuinhandgereedschap")
    const orphans = orphanedSpecCodes(
      [
        { code: "maaibreedte", value: "40" },
        { code: "werkbreedte", value: "30" },
        { code: "maat", value: "L" },
      ],
      next
    )
    expect(orphans).toContain("maaibreedte")
    expect(orphans).not.toContain("werkbreedte")
    expect(orphans).not.toContain("maat")
  })
})

describe("combined import sheet (no separate Spec sheet for import)", () => {
  it("seller template has Spec 1–10 on Producten and SpecDeps helper sheet", () => {
    const tpl = buildProductImportTemplate([], { categories: SAMPLE_CATEGORIES })
    const sheetNames = tpl.sheets.map((s) => s.name)
    expect(sheetNames).toContain("Producten")
    expect(sheetNames).toContain("SpecDeps")
    expect(sheetNames).not.toContain("Specificaties")

    const headers = tpl.sheets.find((s) => s.name === "Producten")!.rows[0]
    for (let i = 1; i <= PRODUCT_SPEC_SLOT_COUNT; i++) {
      expect(headers.some((h) => h.includes(`Specificatie ${i}`))).toBe(true)
      expect(headers.some((h) => h.includes(`Waarde ${i}`) || h === `Waarde ${i}`)).toBe(
        true
      )
    }

    const labelIdx = IMPORT_FIELDS.findIndex((f) => f.column === "spec_label_1")
    const row2 = tpl.sheets.find((s) => s.name === "Producten")!.rows[1]
    expect(row2[labelIdx]).toMatch(/^=IFERROR\(INDEX\(INDIRECT\(VLOOKUP\(/)

    const buf = buildXlsxWorkbook(tpl.sheets, { definedNames: tpl.definedNames })
    const parsed = parseXlsxWorkbook(buf)
    expect(parsed.sheets.has("SpecDeps")).toBe(true)
    expect(parsed.sheets.has("Specificaties")).toBe(false)
    expect(tpl.definedNames.some((n) => n.name.startsWith("spec_"))).toBe(true)
    expect(parsed.sheetNames).toContain("SpecDeps")
    // Compressed xlsx may not expose sheet names as plain utf8; builder + parse cover it.
    expect(buf.length).toBeGreaterThan(1000)
  })

  it("admin template mirrors Spec 1–10 without commerce columns", () => {
    const buf = buildBrandImportWorkbook({ categories: SAMPLE_CATEGORIES })
    const parsed = parseXlsxWorkbook(buf)
    const headers = parsed.sheets.get("Importtemplate")?.[0] || []
    for (let i = 1; i <= 10; i++) {
      expect(headers).toContain(`Specificatie ${i} (automatisch)`)
      expect(headers).toContain(`Waarde ${i}`)
    }
    for (const field of BRAND_COMMERCIAL_FIELDS) {
      const nl = IMPORT_FIELDS.find((f) => f.column === field)?.nl_name
      if (nl) expect(headers).not.toContain(nl)
    }
    expect(parsed.sheets.has("SpecDeps")).toBe(true)
    expect(parsed.sheets.has("Specificaties")).toBe(false)
  })

  it("validateImportRows rejects invalid specs across mixed subcategories", () => {
    const result = validateImportRows(
      [
        {
          title: "Maaier A",
          brand: "Test",
          category: "Tuin",
          subcategory: "Grasmaaiers & Robots",
          subcategory_l3: "Alles in Grasmaaiers & Robots",
          ean: "4242005482320",
          spec_value_1: "40",
        },
        {
          title: "Hark B",
          brand: "Test",
          category: "Tuin",
          subcategory: "Tuinhandgereedschap",
          subcategory_l3: "Alles in Tuinhandgereedschap",
          ean: "4242005482321",
          spec_label_1: "Maaibreedte",
          spec_value_1: "20",
        },
      ],
      new Set()
    )
    expect(result.preview[0].status).not.toBe("error")
    expect(result.preview[1].status).not.toBe("error")
    expect(result.preview[1].issues.some((i) => i.field === "specifications" && !i.blocking)).toBe(true)
    expect(
      result.preview[1].issues.some((i) => /hoort niet bij categor/i.test(i.message))
    ).toBe(true)
  })

  it("buildSpecDepsColumns lists both sample children", () => {
    const cols = buildSpecDepsColumns(SAMPLE_CATEGORIES)
    const names = cols.map((c) => c.displayName)
    expect(names.some((n) => /grasmaai|robots/i.test(n))).toBe(true)
    expect(names.some((n) => /tuinhand/i.test(n))).toBe(true)
    expect(cols.every((c) => c.labels.length <= 10)).toBe(true)
  })
})
