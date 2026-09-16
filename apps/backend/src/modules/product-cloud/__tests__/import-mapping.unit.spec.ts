import {
  applyMapping,
  parseCsv,
  suggestMapping,
  validateImportRows,
} from "../import-mapping"
import { buildProductImportTemplate, parseXlsxFirstSheet, parseXlsxProductGrid, buildXlsxWorkbook } from "../import-xlsx"
import { BOSCH_EXAMPLE } from "../import-columns"

describe("product import mapping", () => {
  it("auto-maps Dutch column aliases", () => {
    const headers = [
      "EAN-code",
      "Artikelnummer",
      "Productnaam",
      "Merknaam",
      "Categorie",
      "Prijs",
      "Voorraad",
    ]
    const mapping = suggestMapping(headers)
    expect(mapping.ean).toBe("EAN-code")
    expect(mapping.sku).toBe("Artikelnummer")
    expect(mapping.title).toBe("Productnaam")
    expect(mapping.brand).toBe("Merknaam")
    expect(mapping.category).toBe("Categorie")
    expect(mapping.regular_price).toBe("Prijs")
    expect(mapping.stock).toBe("Voorraad")
  })

  it("does not map a processor column onto productnaam", () => {
    const mapping = suggestMapping(
      ["processor", "Productnaam", "Merk", "Categorie"],
      ["processor"]
    )
    expect(mapping.title).toBe("Productnaam")
    expect(mapping.processor).toBe("processor")
    expect(mapping.brand).toBe("Merk")
  })

  it("maps Dutch labelled template headers to canonical fields", () => {
    const tpl = buildProductImportTemplate()
    const headers = tpl.sheets[0].rows[0]
    const mapping = suggestMapping(headers)
    expect(mapping.ean).toBeTruthy()
    expect(mapping.title).toBeTruthy()
    expect(mapping.brand).toBeTruthy()
    expect(mapping.category).toBeTruthy()
    expect(mapping.mpn).toBeTruthy()
    expect(mapping.primary_image_url).toBeTruthy()
    expect(mapping.gpsr_manufacturer_name).toBeTruthy()
    expect(mapping.title_en).toBeUndefined()
  })

  it("imports a new concept without EAN when MPN or SKU is present", () => {
    const csv = `ean,title,brand,category,sku
,Vaatwasser Concept,Bosch,Huishouden,SKU-1
4242005482320,Bosch vaatwasser,Bosch,Huishouden,SKU-2`
    const { headers, rows } = parseCsv(csv)
    const mapping = suggestMapping(headers)
    const mapped = applyMapping(headers, rows, mapping)
    const result = validateImportRows(mapped, new Set())
    expect(result.summary.rows).toBe(2)
    expect(result.summary.missing_ean).toBe(1)
    expect(result.summary.concept_without_ean).toBe(1)
    expect(result.summary.error_rows).toBe(0)
    expect(result.summary.new_products).toBe(2)
  })

  it("rejects new products missing title, brand or category", () => {
    const mapped = [{ ean: "", title: "", brand: "", category: "" }]
    const result = validateImportRows(mapped, new Set())
    expect(result.summary.error_rows).toBe(1)
    expect(result.preview[0].issues.map((i) => i.field).sort()).toEqual([
      "brand",
      "category",
      "identifier",
      "title",
    ])
  })

  it("keeps existing products separate from errors", () => {
    const mapped = [
      {
        ean: "4242005482320",
        title: "Bosch",
        brand: "Bosch",
        category: "Huishouden",
      },
    ]
    const result = validateImportRows(mapped, new Set(["4242005482320"]))
    expect(result.summary.existing_products).toBe(1)
    expect(result.summary.new_products).toBe(0)
    expect(result.summary.error_rows).toBe(0)
  })

  it("matches owned MPN only when EAN is empty", () => {
    const mapped = [
      {
        ean: "",
        mpn: "SMD8TCX04E",
        title: "Bosch",
        brand: "Bosch",
        category: "Huishouden",
      },
    ]
    const result = validateImportRows(
      mapped,
      new Set(),
      new Set(),
      new Set(["SMD8TCX04E"])
    )
    expect(result.summary.existing_products).toBe(1)
  })

  it("builds a general template with Bosch example and without category-specific columns", () => {
    const tpl = buildProductImportTemplate()
    const headers = tpl.sheets[0].rows[0]
    expect(headers.some((h) => h.includes("EAN") && h.includes("Voorwaardelijk"))).toBe(
      true
    )
    expect(headers.some((h) => h.includes("Fabrikantnummer") && h.includes("Optioneel"))).toBe(
      true
    )
    expect(headers.some((h) => h.startsWith("Productnaam (Verplicht)"))).toBe(true)
    expect(headers.some((h) => h.includes("Hoofdafbeelding"))).toBe(true)
    expect(headers.some((h) => h.includes("CE-markering"))).toBe(true)
    expect(headers.some((h) => /title_en|description_en|title_fr/i.test(h))).toBe(
      false
    )
    expect(headers.some((h) => h.toLowerCase().includes("zuigkracht"))).toBe(false)
    expect(headers.some((h) => h.toLowerCase() === "maat")).toBe(false)
    const example = tpl.sheets[0].rows[1]
    const title = example[headers.findIndex((h) => h.startsWith("Productnaam (Verplicht)"))]
    expect(title).toContain("Bosch")
    expect(title).not.toContain("Zoef")
    expect(example[headers.findIndex((h) => h.includes("EAN"))]).toBe(BOSCH_EXAMPLE.ean)
    expect(example[headers.findIndex((h) => h.includes("Fabrikantnummer"))]).toBe("")
    expect(example[headers.findIndex((h) => h.includes("Seller SKU"))]).toBe("")
    expect(tpl.sheets.map((s) => s.name)).toEqual([
      "Producten",
      "Uitleg velden",
      "Lijsten",
      "Legenda",
    ])
    expect(tpl.csv).toContain("Bosch")
    expect(tpl.csv).not.toContain("zuigkracht")
    const guide = tpl.sheets[1].rows.map((r) => r.join(" ")).join("\n")
    expect(guide).toContain("Verplicht")
    expect(guide).toContain("Optioneel")
    expect(guide).toContain("Voorwaardelijk verplicht")
    expect(guide).toContain("Automatisch")
    expect(guide).toContain("Admincontrole")
    expect(guide).toContain("Via seller-wizard")
    expect(guide).toContain("CE-bewijs: via seller-wizard uploaden")
    expect(guide).not.toContain("title_en")
  })

  it("does not block a concept when publication-only fields are empty", () => {
    const mapped = [
      {
        ean: "",
        title: "Concept vaatwasser",
        brand: "Bosch",
        category: "Huishouden",
        sku: "SKU-CONCEPT",
        regular_price: "",
        primary_image_url: "",
        gpsr_manufacturer_name: "",
      },
    ]
    const result = validateImportRows(mapped, new Set())
    expect(result.summary.error_rows).toBe(0)
    expect(result.summary.concept_without_ean).toBe(1)
    expect(result.preview[0].status).toBe("new")
  })

  it("rejects an invalid EAN checksum", () => {
    const mapped = [
      {
        ean: "4242005482321",
        title: "Bosch",
        brand: "Bosch",
        category: "Huishouden",
      },
    ]
    const result = validateImportRows(mapped, new Set())
    expect(result.summary.error_rows).toBe(1)
    expect(result.preview[0].issues[0].field).toBe("ean")
  })

  it("roundtrips the xlsx template through the parser without treating Bosch as a new error", () => {
    const tpl = buildProductImportTemplate()
    const buf = buildXlsxWorkbook(tpl.sheets)
    const parsed = parseXlsxFirstSheet(buf)
    expect(parsed.headers.some((h) => h.includes("EAN"))).toBe(true)
    expect(parsed.rows[0].join(" ")).toContain("Bosch")
    const mapping = suggestMapping(parsed.headers)
    expect(mapping.ean).toBeTruthy()
    expect(mapping.title).toBeTruthy()
    const mapped = applyMapping(parsed.headers, parsed.rows, mapping)
    const owned = validateImportRows(mapped, new Set([BOSCH_EXAMPLE.ean]))
    expect(owned.summary.error_rows).toBe(0)
    expect(owned.summary.existing_products).toBe(1)
    const foreign = validateImportRows(
      mapped,
      new Set(),
      new Set([BOSCH_EXAMPLE.ean])
    )
    expect(foreign.summary.error_rows).toBe(1)
  })

  it("maps labelled Dutch headers including (Verplicht) into canonical values", () => {
    const headers = [
      "EAN / GTIN (Voorwaardelijk verplicht)",
      "Fabrikantnummer / MPN (Optioneel)",
      "Seller SKU / artikelnummer (Optioneel)",
      "Productnaam (Verplicht)",
      "Merk (Verplicht)",
      "Productcategorie (Verplicht)",
      "Korte omschrijving (Optioneel)",
      "Reguliere verkoopprijs (Voorwaardelijk verplicht)",
    ]
    const mapping = suggestMapping(headers)
    expect(mapping.title).toBe("Productnaam (Verplicht)")
    expect(mapping.brand).toBe("Merk (Verplicht)")
    expect(mapping.category).toBe("Productcategorie (Verplicht)")
    expect(mapping.ean).toContain("EAN")
    expect(mapping.sku).toContain("Seller SKU")
    const mapped = applyMapping(
      headers,
      [
        [
          "",
          "MPN-1",
          "SKU-MIN",
          "MOEVE Superwuschel badlaken",
          "MOEVE",
          "Huishouden",
          "Kort",
          "12,50",
        ],
      ],
      mapping
    )
    expect(mapped[0].title).toBe("MOEVE Superwuschel badlaken")
    expect(mapped[0].brand).toBe("MOEVE")
    expect(mapped[0].sku).toBe("SKU-MIN")
    expect(mapped[0].short_description).toBe("Kort")
    expect(mapped[0].regular_price).toBe("12,50")
    expect(validateImportRows(mapped, new Set()).summary.error_rows).toBe(0)
  })

  it("maps headers with line breaks and non-breaking spaces", () => {
    const headers = [
      "Productnaam\n(Verplicht)",
      "Merk\u00a0(Verplicht)",
      "Productcategorie (Verplicht)",
      "Seller SKU / artikelnummer (Optioneel)",
    ]
    const mapping = suggestMapping(headers)
    expect(mapping.title).toBeTruthy()
    const mapped = applyMapping(
      headers,
      [["Handdoek", "MOEVE", "Huishouden", "SKU-1"]],
      mapping
    )
    expect(mapped[0].title).toBe("Handdoek")
  })

  it("resolves a mapping string that differs only by labels or spaces", () => {
    const headers = [
      "Productnaam (Verplicht)",
      "Merk (Verplicht)",
      "Productcategorie (Verplicht)",
      "Seller SKU / artikelnummer (Optioneel)",
    ]
    const mapped = applyMapping(headers, [["Badlaken", "MOEVE", "Huishouden", "SKU-1"]], {
      title: "Productnaam(Verplicht)",
      brand: "Merk (Verplicht)",
      category: "Productcategorie (Verplicht)",
      sku: "Seller SKU / artikelnummer (Optioneel)",
    })
    expect(mapped[0].title).toBe("Badlaken")
  })

  it("names the excel row and internal field when productnaam is missing", () => {
    const result = validateImportRows(
      [{ title: "", brand: "MOEVE", category: "Huishouden", sku: "SKU-1" }],
      new Set(),
      new Set(),
      new Set(),
      new Set(),
      [7]
    )
    const titleIssue = result.preview[0].issues.find((i) => i.field === "title")
    expect(titleIssue?.message).toMatch(/Excel-regel 7/)
    expect(titleIssue?.message).toMatch(/interne naam: title/)
    expect(titleIssue?.message).toMatch(/waarde ontbreekt/)
  })

  it("keeps one xlsx data row as one product with labelled headers", () => {
    const tpl = buildProductImportTemplate()
    const headers = tpl.sheets[0].rows[0]
    const example = [...tpl.sheets[0].rows[1]]
    const titleIdx = headers.findIndex((h) => h.startsWith("Productnaam"))
    const eanIdx = headers.findIndex((h) => h.includes("EAN"))
    const skuIdx = headers.findIndex((h) => h.includes("Seller SKU"))
    example[titleIdx] = "MOEVE Superwuschel badlaken"
    example[eanIdx] = ""
    example[skuIdx] = "SKU-MOEVE-1"
    const buf = buildXlsxWorkbook([{ name: "Producten", rows: [headers, example] }])
    const parsed = parseXlsxProductGrid(buf)
    expect(parsed.rows).toHaveLength(1)
    const mapping = suggestMapping(parsed.headers)
    const mapped = applyMapping(parsed.headers, parsed.rows, mapping)
    expect(mapped).toHaveLength(1)
    expect(mapped[0].title).toBe("MOEVE Superwuschel badlaken")
    expect(validateImportRows(mapped, new Set()).summary.error_rows).toBe(0)
  })
})
