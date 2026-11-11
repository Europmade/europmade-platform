import {
  HEADER_MISSING_MESSAGE,
  NO_DATA_ROWS_MESSAGE,
  TRANSPOSE_MESSAGE,
  parseImportGrid,
  splitDelimitedText,
  unknownImportColumns,
} from "../import-table"
import {
  applyMapping,
  materializeMappedRows,
  parseCsv,
  suggestMapping,
  validateImportRows,
} from "../import-mapping"
import { buildProductImportTemplate, parseXlsxProductGrid, buildXlsxWorkbook, parseXlsxSheetXml } from "../import-xlsx"
import { IMPORT_FIELDS, importDisplayHeader } from "../import-columns"

describe("import table: one row is one product", () => {
  it("maps one data row with many columns to exactly one product", () => {
    const csv = `Productnaam,Merk,Categorie,EAN/GTIN,MPN,Seller SKU,Processor
Product A,Merk A,Elektronica,1234567890128,ABC-100,SKU-001,ARM`
    const { headers, rows } = parseCsv(csv)
    expect(rows).toHaveLength(1)
    const mapping = suggestMapping(headers, ["processor"])
    const mapped = applyMapping(headers, rows, mapping)
    expect(mapped).toHaveLength(1)
    expect(mapped[0].title).toBe("Product A")
    expect(mapped[0].processor).toBe("ARM")
    expect(mapped[0].title).not.toBe("Productnaam")
  })

  it("maps two data rows to exactly two products", () => {
    const csv = `Productnaam,Merk,Categorie,EAN/GTIN,MPN,Seller SKU
Product A,Merk A,Elektronica,,ABC-100,SKU-001
Product B,Merk B,Keuken,,DEF-200,SKU-002`
    const { rows } = parseCsv(csv)
    expect(rows).toHaveLength(2)
    const result = validateImportRows(
      applyMapping(
        ["Productnaam", "Merk", "Categorie", "EAN/GTIN", "MPN", "Seller SKU"],
        rows,
        suggestMapping([
          "Productnaam",
          "Merk",
          "Categorie",
          "EAN/GTIN",
          "MPN",
          "Seller SKU",
        ])
      ),
      new Set()
    )
    expect(result.summary.rows).toBe(2)
    expect(result.summary.new_products).toBe(2)
    expect(result.preview.map((p) => p.values.title)).toEqual([
      "Product A",
      "Product B",
    ])
  })

  it("never creates a product from the header row", () => {
    const grid = parseImportGrid(
      splitDelimitedText(`Productnaam,Merk,Categorie,Seller SKU
Product A,Merk A,Keuken,SKU-001`)
    )
    expect(grid.rows).toHaveLength(1)
    const mapped = applyMapping(grid.headers, grid.rows, suggestMapping(grid.headers))
    expect(mapped.some((r) => r.title === "Productnaam")).toBe(false)
    expect(mapped.some((r) => r.title === "Merk")).toBe(false)
    expect(mapped.some((r) => r.title === "Categorie")).toBe(false)
  })

  it("does not create one product per column", () => {
    const csv = `Productnaam,Merk,Categorie,EAN/GTIN,MPN,Seller SKU
Product A,Merk A,Elektronica,1234567890128,ABC-100,SKU-001`
    const { rows } = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].length).toBeGreaterThan(1)
  })

  it("skips empty rows", () => {
    const grid = parseImportGrid(
      splitDelimitedText(`Productnaam,Merk,Categorie,sku

Product A,Merk A,Keuken,SKU-1

Product B,Merk B,Keuken,SKU-2
`)
    )
    expect(grid.rows).toHaveLength(2)
    expect(grid.skipped_empty).toBeGreaterThanOrEqual(1)
  })

  it("reports unknown columns without creating extra products", () => {
    const headers = ["Productnaam", "Merk", "Categorie", "sku", "FooBarOnbekend"]
    const rows = [["Product A", "Merk A", "Keuken", "SKU-1", "x"]]
    const mapping = suggestMapping(headers)
    const mapped = applyMapping(headers, rows, mapping)
    expect(mapped).toHaveLength(1)
    expect(unknownImportColumns(headers, mapping)).toContain("FooBarOnbekend")
  })

  it("attaches category attributes to the same product record", () => {
    const csv = `Productnaam,Merk,Categorie,sku,processor,vermogen
Laptop A,Merk A,Elektronica,SKU-9,ARM,45 W`
    const { headers, rows } = parseCsv(csv)
    const mapping = suggestMapping(headers, ["processor", "vermogen"])
    const mapped = applyMapping(headers, rows, mapping)
    expect(mapped).toHaveLength(1)
    expect(mapped[0].title).toBe("Laptop A")
    expect(mapped[0].processor).toBe("ARM")
    expect(mapped[0].vermogen).toBe("45 W")
  })

  it("reads productnaam from xlsx column D with empty A–C", () => {
    const buf = buildXlsxWorkbook([
      {
        name: "Producten",
        rows: [
          [
            "",
            "",
            "",
            "Productnaam (Verplicht)",
            "Merk (Verplicht)",
            "Productcategorie (Verplicht)",
            "sku",
          ],
          [
            "",
            "",
            "",
            "MOEVE Superwuschel badlaken kleur snow",
            "MOEVE",
            "Huishouden",
            "SKU-1",
          ],
        ],
      },
    ])
    const grid = parseXlsxProductGrid(buf)
    const mapped = applyMapping(
      grid.headers,
      grid.rows,
      suggestMapping(grid.headers)
    )
    expect(mapped).toHaveLength(1)
    expect(mapped[0].title).toBe("MOEVE Superwuschel badlaken kleur snow")
  })

  it("does not swallow D2 when Excel writes an empty self-closing C2", () => {
    const xml = `<?xml version="1.0"?><worksheet><sheetData>
      <row r="1">
        <c r="A1" t="inlineStr"><is><t>EAN / GTIN (Voorwaardelijk verplicht)</t></is></c>
        <c r="B1" t="inlineStr"><is><t>Fabrikantnummer / MPN (Optioneel)</t></is></c>
        <c r="C1" t="inlineStr"><is><t>Seller SKU / artikelnummer (Optioneel)</t></is></c>
        <c r="D1" t="inlineStr"><is><t>Productnaam (Verplicht)</t></is></c>
        <c r="E1" t="inlineStr"><is><t>Merk (Verplicht)</t></is></c>
        <c r="F1" t="inlineStr"><is><t>Productcategorie (Verplicht)</t></is></c>
      </row>
      <row r="2">
        <c r="A2"><v>4013165840592</v></c>
        <c r="B2" t="s"><v>0</v></c>
        <c r="C2" s="4"/>
        <c r="D2" t="s"><v>1</v></c>
        <c r="E2" t="s"><v>2</v></c>
        <c r="F2" t="s"><v>3</v></c>
      </row>
    </sheetData></worksheet>`
    const table = parseXlsxSheetXml(xml, [
      "017258775-100160-001",
      "MOEVE Superwuschel badlaken kleur snow",
      "MOEVE",
      "Huishouden",
    ])
    const grid = parseImportGrid(table)
    const mapped = applyMapping(
      grid.headers,
      grid.rows,
      suggestMapping(grid.headers)
    )
    expect(mapped[0].title).toBe("MOEVE Superwuschel badlaken kleur snow")
    expect(mapped[0].sku).toBe("")
    expect(mapped[0].mpn).toBe("017258775-100160-001")
    expect(mapped[0].brand).toBe("MOEVE")
    expect(mapped[0].category).toBe("Huishouden")
  })

  it("reads productnaam from column A", () => {
    const grid = parseImportGrid([
      ["Productnaam (Verplicht)", "Merk (Verplicht)", "Productcategorie (Verplicht)", "sku"],
      ["Badlaken kolom A", "MOEVE", "Huishouden", "SKU-A"],
    ])
    const mapped = applyMapping(
      grid.headers,
      grid.rows,
      suggestMapping(grid.headers)
    )
    expect(mapped[0].title).toBe("Badlaken kolom A")
    expect(mapped[0].sku).toBe("SKU-A")
  })

  it("keeps a genuinely empty productnaam as missing", () => {
    const result = validateImportRows(
      [{ title: "", brand: "MOEVE", category: "Huishouden", sku: "SKU-1" }],
      new Set(),
      new Set(),
      new Set(),
      new Set(),
      [2]
    )
    expect(result.preview[0].issues.some((i) => i.field === "title")).toBe(true)
    expect(result.preview[0].values.title).toBe("")
  })

  it("does not treat guide-sheet field names as products", () => {
    const tpl = buildProductImportTemplate()
    const buf = buildXlsxWorkbook(tpl.sheets)
    const grid = parseXlsxProductGrid(buf)
    expect(grid.structure_error).toBeNull()
    expect(grid.rows).toHaveLength(1)
    const mapping = suggestMapping(grid.headers)
    const mapped = applyMapping(grid.headers, grid.rows, mapping)
    expect(mapped[0].title).toContain("Bosch")
    expect(mapped.map((r) => r.title)).not.toEqual(
      expect.arrayContaining(["Productnaam", "Merk", "Categorie"])
    )
    expect(mapped.some((r) => /^Elektronica kenmerk/i.test(r.title || ""))).toBe(
      false
    )
  })

  it("allows a concept with MPN and no EAN", () => {
    const mapped = [
      {
        ean: "",
        mpn: "ABC-100",
        sku: "",
        title: "Product A",
        brand: "Merk A",
        category: "Keuken",
      },
    ]
    const result = validateImportRows(mapped, new Set())
    expect(result.summary.error_rows).toBe(0)
    expect(result.preview[0].status).toBe("new")
  })

  it("allows a concept with Seller SKU and no EAN", () => {
    const mapped = [
      {
        ean: "",
        mpn: "",
        sku: "SKU-001",
        title: "Product A",
        brand: "Merk A",
        category: "Keuken",
      },
    ]
    const result = validateImportRows(mapped, new Set())
    expect(result.summary.error_rows).toBe(0)
  })

  it("rejects a product without EAN, MPN and Seller SKU", () => {
    const mapped = [
      {
        ean: "",
        mpn: "",
        sku: "",
        title: "Product A",
        brand: "Merk A",
        category: "Keuken",
      },
    ]
    const result = validateImportRows(mapped, new Set())
    expect(result.summary.error_rows).toBe(1)
    expect(result.preview[0].issues[0].message).toMatch(/minimaal één echte identificatie/)
  })

  it("errors when the header row is missing", () => {
    const grid = parseImportGrid([
      ["Product A", "Merk A", "Keuken", "SKU-1"],
      ["Product B", "Merk B", "Keuken", "SKU-2"],
    ])
    expect(grid.structure_error).toBe(HEADER_MISSING_MESSAGE)
    expect(grid.rows).toHaveLength(0)
  })

  it("errors when the sheet looks transposed", () => {
    const grid = parseImportGrid([
      ["Productnaam", "Product A", "Product B"],
      ["Merk", "Merk A", "Merk B"],
      ["Categorie", "Elektronica", "Keuken"],
      ["Seller SKU", "SKU-001", "SKU-002"],
    ])
    expect(grid.transposed).toBe(true)
    expect(grid.structure_error).toBe(TRANSPOSE_MESSAGE)
    expect(grid.rows).toHaveLength(0)
  })

  it("errors when only headers exist", () => {
    const grid = parseImportGrid([
      ["Productnaam", "Merk", "Categorie", "Seller SKU"],
    ])
    expect(grid.structure_error).toBe(NO_DATA_ROWS_MESSAGE)
    expect(grid.rows).toHaveLength(0)
  })

  it("reads productnaam from column D when A–C are empty", () => {
    const grid = parseImportGrid([
      [
        "",
        "",
        "",
        "Productnaam (Verplicht)",
        "Merk (Verplicht)",
        "Productcategorie (Verplicht)",
        "Seller SKU / artikelnummer (Optioneel)",
      ],
      [
        "MOEVE Superwuschel badlaken kleur snow",
        "MOEVE",
        "Huishouden",
        "SKU-1",
      ],
    ])
    expect(grid.structure_error).toBeNull()
    const mapping = suggestMapping(grid.headers)
    expect(mapping.title).toContain("Productnaam")
    const first = materializeMappedRows(grid.headers, grid.rows, mapping)
    const second = materializeMappedRows(grid.headers, grid.rows, mapping)
    expect(first.records[0].values.title).toBe(
      "MOEVE Superwuschel badlaken kleur snow"
    )
    expect(first.records[0].values).toEqual(second.records[0].values)
    expect(first.indexes.title).toBe(3)
  })

  it("maps Productnaam (Verplicht) and packed leading empty columns", () => {
    const headers = [
      "",
      "Productnaam (Verplicht)",
      "Merk (Verplicht)",
      "Productcategorie (Verplicht)",
      "Optionele Seller SKU / artikelnummer",
    ]
    const mapping = suggestMapping(headers)
    expect(mapping.sku).toBeTruthy()
    const mapped = applyMapping(
      headers,
      [["Badlaken", "MOEVE", "Huishouden", "SKU-9"]],
      mapping
    )
    expect(mapped[0].title).toBe("Badlaken")
    expect(mapped[0].sku).toBe("SKU-9")
  })

  it("maps two product rows with different names", () => {
    const grid = parseImportGrid([
      ["Productnaam (Verplicht)", "Merk (Verplicht)", "Categorie", "MPN"],
      ["Handdoek A", "MOEVE", "Huishouden", "A-1"],
      ["Handdoek B", "MOEVE", "Huishouden", "B-2"],
    ])
    const mapped = applyMapping(grid.headers, grid.rows, suggestMapping(grid.headers))
    expect(mapped.map((r) => r.title)).toEqual(["Handdoek A", "Handdoek B"])
  })

  it("maps every template field from its Dutch labelled header", () => {
    const headers = IMPORT_FIELDS.map((f) => importDisplayHeader(f))
    const row = IMPORT_FIELDS.map((f) => `VAL-${f.column}`)
    const mapping = suggestMapping(headers)
    const mapped = applyMapping(headers, [row], mapping)
    expect(mapped).toHaveLength(1)
    for (const field of IMPORT_FIELDS) {
      expect(mapping[field.column]).toBe(importDisplayHeader(field))
      expect(mapped[0][field.column]).toBe(`VAL-${field.column}`)
    }
  })

  it("maps technical headers title/brand/category", () => {
    const mapped = applyMapping(
      ["title", "brand", "category", "sku"],
      [["TechName", "TechBrand", "Keuken", "SKU-T"]],
      suggestMapping(["title", "brand", "category", "sku"])
    )
    expect(mapped[0]).toMatchObject({
      title: "TechName",
      brand: "TechBrand",
      category: "Keuken",
      sku: "SKU-T",
    })
  })

  it("does not treat DRAFT or IMPORT_REF as a real identifier", () => {
    const result = validateImportRows(
      [
        {
          ean: "DRAFT-ABC",
          mpn: "IMPORT_REF",
          sku: "DRAFT-1",
          title: "Product A",
          brand: "Merk A",
          category: "Keuken",
        },
      ],
      new Set()
    )
    expect(result.summary.error_rows).toBe(1)
    expect(result.preview[0].issues.some((i) => i.field === "identifier")).toBe(
      true
    )
  })

  it("reports a technical read error instead of a missing value", () => {
    const result = validateImportRows(
      [{ title: "", brand: "MOEVE", category: "Huishouden", sku: "SKU-1" }],
      new Set(),
      new Set(),
      new Set(),
      new Set(),
      [2],
      [{ title: "kolomindex 9 valt buiten de gegevensregel (4 cellen)" }]
    )
    expect(
      result.preview[0].issues.find((issue) => issue.field === "title")?.message
    ).toMatch(/uitlezen of mappen/)
    expect(
      result.preview[0].issues.find((issue) => issue.field === "title")?.message
    ).not.toMatch(/waarde ontbreekt\.$/)
  })

  it("keeps preview values identical to a second materialize pass (commit)", () => {
    const headers = [
      "Productnaam (Verplicht)",
      "Merk (Verplicht)",
      "Productcategorie (Verplicht)",
      "Korte omschrijving (Optioneel)",
      "Uitgebreide omschrijving",
      "Fabrikantnummer / MPN",
    ]
    const rows = [
      [
        "MOEVE Superwuschel badlaken kleur snow",
        "MOEVE",
        "Huishouden",
        "Kort",
        "Lang",
        "017258775",
      ],
    ]
    const mapping = suggestMapping(headers)
    const preview = materializeMappedRows(headers, rows, mapping)
    const commit = materializeMappedRows(headers, rows, mapping)
    expect(preview.records[0].values).toEqual(commit.records[0].values)
    expect(preview.records[0].values.description).toBe("Lang")
    expect(preview.records[0].values.short_description).toBe("Kort")
    expect(preview.records[0].values.mpn).toBe("017258775")
  })
})
