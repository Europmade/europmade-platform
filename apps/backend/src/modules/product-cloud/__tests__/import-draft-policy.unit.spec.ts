import { readFileSync } from "node:fs"
import { applyMapping, suggestMapping, validateImportRows } from "../import-mapping"
import { parseXlsxProductGrid } from "../import-xlsx"
import {
  classifyImportBrand,
  importDraftSeed,
  sellerImportBrandRecord,
  stableConceptDraftIdentifier,
  uniqueNewBrandCount,
} from "../import-row-policy"
import { SUBMIT_GTIN_MESSAGE } from "../../../api/store/product-cloud/submit-gates"

const BOSCH = [{ id: "brand_bosch", name: "Bosch" }]

describe("seller import draft policy", () => {
  it("keeps a new product with an existing brand as a draft without a brand warning", () => {
    const result = validateImportRows(
      [
        {
          ean: "4242005482320",
          title: "Bosch vaatwasser",
          brand: "bosch",
          category: "Huishouden",
        },
      ],
      new Set(),
      new Set(),
      new Set(),
      new Set(),
      undefined,
      undefined,
      new Set(),
      { knownBrands: BOSCH }
    )
    expect(result.summary.error_rows).toBe(0)
    expect(result.summary.new_products).toBe(1)
    expect(result.summary.new_brands).toBe(0)
    expect(result.preview[0].brand_resolution).toMatchObject({
      status: "existing",
      id: "brand_bosch",
    })
  })

  it("plans an unconfirmed brand instead of blocking an unknown brand", () => {
    const result = validateImportRows(
      [
        {
          ean: "",
          sku: "SKU-ACME",
          title: "Handdoek",
          brand: "Acme Textiel",
          category: "Huishouden",
        },
      ],
      new Set(),
      new Set(),
      new Set(),
      new Set(),
      undefined,
      undefined,
      new Set(),
      { knownBrands: BOSCH }
    )
    expect(result.summary.error_rows).toBe(0)
    expect(result.summary.new_products).toBe(1)
    expect(result.summary.new_brands).toBe(1)
    expect(result.preview[0].status).toBe("new")
    const brand = result.preview[0].issues.find((issue) => issue.field === "brand")
    expect(brand?.severity).toBe("requires_review")
    expect(brand?.blocking).toBe(false)
    expect(sellerImportBrandRecord({
      name: "Acme Textiel",
      slug: "acme-textiel",
      sellerId: "sel_1",
    }).page_review_status).toBe("in_review")
    expect(
      sellerImportBrandRecord({
        name: "Acme Textiel",
        slug: "acme-textiel",
        sellerId: "sel_1",
      }).public_page_status
    ).toBe("unpublished")
  })

  it("does not create a second brand for another spelling of the same name", () => {
    expect(classifyImportBrand("BOSCH", BOSCH).status).toBe("existing")
    expect(classifyImportBrand("  Bosch  ", BOSCH).status).toBe("existing")
    expect(
      uniqueNewBrandCount(["Acme Textiel", "acme   textiel", "ACME TEXTIEL"])
    ).toBe(1)
  })

  it("creates a draft when EAN is missing and keeps submit blocked", () => {
    const result = validateImportRows(
      [
        {
          ean: "",
          sku: "SKU-1",
          title: "Concept",
          brand: "Bosch",
          category: "Huishouden",
        },
      ],
      new Set()
    )
    expect(result.summary.error_rows).toBe(0)
    expect(result.preview[0].status).toBe("new")
    const ean = result.preview[0].issues.find((issue) => issue.field === "ean")
    expect(ean?.severity).toBe("missing")
    expect(ean?.blocks).toEqual(
      expect.arrayContaining(["submit", "approval", "publication", "sale"])
    )
    expect(ean?.blocks).not.toContain("draft")
    expect(SUBMIT_GTIN_MESSAGE).toMatch(/indienen/)
  })

  it("does not block a draft when optional fields are empty", () => {
    const result = validateImportRows(
      [
        {
          ean: "",
          sku: "SKU-OPT",
          title: "Concept",
          brand: "Bosch",
          category: "Huishouden",
          short_description: "",
        },
      ],
      new Set()
    )
    expect(result.summary.error_rows).toBe(0)
    expect(
      result.preview[0].issues.some((issue) => issue.field === "short_description")
    ).toBe(false)
  })

  it("records an empty conditional field without blocking the draft", () => {
    const result = validateImportRows(
      [
        {
          ean: "",
          sku: "SKU-GPSR",
          title: "Concept",
          brand: "Bosch",
          category: "Huishouden",
          gpsr_manufacturer_name: "",
        },
      ],
      new Set()
    )
    expect(result.summary.error_rows).toBe(0)
    const gpsr = result.preview[0].issues.find(
      (issue) => issue.field === "gpsr_manufacturer_name"
    )
    expect(gpsr?.severity).toBe("missing")
    expect(gpsr?.blocking).toBe(false)
    expect(gpsr?.blocks).toContain("publication")
  })

  it("keeps an invalid value and still plans a draft", () => {
    const result = validateImportRows(
      [
        {
          ean: "4242005482321",
          title: "Bosch",
          brand: "Bosch",
          category: "Huishouden",
          regular_price: "geen-prijs",
        },
      ],
      new Set()
    )
    expect(result.summary.error_rows).toBe(0)
    expect(result.preview[0].values.ean).toBe("4242005482321")
    expect(result.preview[0].values.regular_price).toBe("geen-prijs")
    expect(result.preview[0].offer_action).toBe("none")
    expect(
      result.preview[0].issues.find((issue) => issue.field === "regular_price")
        ?.severity
    ).toBe("invalid")
  })

  it("imports the valid rows when another row has a recoverable or technical problem", () => {
    const result = validateImportRows(
      [
        {
          ean: "",
          sku: "SKU-OK",
          title: "Goed product",
          brand: "Bosch",
          category: "Huishouden",
        },
        {
          ean: "4242005482321",
          title: "Ongeldige ean",
          brand: "Bosch",
          category: "Huishouden",
        },
        {
          ean: "",
          title: "",
          brand: "",
          category: "",
        },
      ],
      new Set()
    )
    expect(result.summary.rows).toBe(3)
    expect(result.summary.new_products).toBe(2)
    expect(result.summary.error_rows).toBe(1)
    expect(result.preview[2].status).toBe("error")
    expect(result.preview[0].status).toBe("new")
    expect(result.preview[1].status).toBe("new")
  })

  it("uses the same draft key when the same incomplete row is imported again", () => {
    const seed = importDraftSeed({
      sellerId: "sel_1",
      eanRaw: "4242005482321",
      mpn: "",
      sku: "SKU-1",
    })
    expect(stableConceptDraftIdentifier(seed).identifier_value).toBe(
      stableConceptDraftIdentifier(seed).identifier_value
    )
    expect(stableConceptDraftIdentifier(seed).identifier_value).not.toBe(
      stableConceptDraftIdentifier(`${seed}|other`).identifier_value
    )
    const again = validateImportRows(
      [
        {
          ean: "",
          sku: "SKU-1",
          title: "Concept",
          brand: "Bosch",
          category: "Huishouden",
          regular_price: "10",
        },
      ],
      new Set(),
      new Set(),
      new Set(),
      new Set(),
      undefined,
      undefined,
      new Set(),
      { sellerSkus: new Set(["SKU-1"]) }
    )
    expect(again.summary.existing_products).toBe(1)
    expect(again.summary.new_products).toBe(0)
    expect(again.summary.offers_to_update).toBe(1)
    expect(again.summary.offers_to_create).toBe(0)
  })

  it("reads the delivered De Rezer template without changing it", () => {
    const path =
      "C:\\Users\\sjoer\\Downloads\\EuropMade_product_template_De-Rezer-01.45.xlsx"
    const before = readFileSync(path)
    const grid = parseXlsxProductGrid(before)
    expect(grid.structure_error).toBeNull()
    expect(grid.headers.some((header) => /productnaam|product name/i.test(header))).toBe(
      true
    )
    expect(grid.headers.some((header) => /\bmerk\b|brand/i.test(header))).toBe(true)
    const mapping = suggestMapping(grid.headers)
    expect(mapping.title).toBeTruthy()
    expect(mapping.brand).toBeTruthy()
    const mapped = applyMapping(grid.headers, grid.rows, mapping)
    const result = validateImportRows(
      mapped,
      new Set(),
      new Set(),
      new Set(),
      new Set(),
      grid.excel_row_numbers,
      undefined,
      new Set(),
      { knownBrands: [] }
    )
    expect(result.summary.rows).toBe(mapped.length)
    expect(result.summary.rows).toBeGreaterThan(0)
    for (const row of result.preview) {
      const onlyBrand = row.issues.every((issue) => issue.field === "brand")
      if (row.status === "error" && onlyBrand) {
        throw new Error(`Rij ${row.row} werd alleen door het merk tegengehouden.`)
      }
    }
    expect(readFileSync(path).equals(before)).toBe(true)
  })
})
