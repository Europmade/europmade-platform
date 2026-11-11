import { validateImportRows } from "../import-mapping"
import {
  adminStoredIdentity,
  planBrandCommit,
  previewBrandImport,
  type ExistingProductHit,
} from "../brand-import"

const BOSCH = "4242005482320"
const BRANDS = [
  { id: "brand_bosch", name: "Bosch" },
  { id: "brand_home", name: "Bosch Home" },
]

function sellerDecision(
  rows: Record<string, string>[],
  existingEans: Set<string> = new Set(),
  knownBrands = BRANDS
) {
  return validateImportRows(
    rows,
    existingEans,
    new Set(),
    new Set(),
    new Set(),
    undefined,
    undefined,
    new Set(),
    { knownBrands }
  )
}

function adminDecision(
  headers: string[],
  rows: string[][],
  existing: ExistingProductHit[] = [],
  knownBrands = BRANDS
) {
  return previewBrandImport({
    headers,
    rows,
    source_language_code: "nl",
    language_confirmed: true,
    mapping_confirmed: true,
    known_brands: knownBrands,
    categories: [{ id: "cat", name: "Huishouden", slug: "huishouden" }],
    existing,
  })
}

function stored(status: string): "error" | "concept" {
  return status === "error" ? "error" : "concept"
}

describe("seller and admin import the same row the same way", () => {
  it("keeps an existing brand as a concept", () => {
    const seller = sellerDecision([
      { ean: BOSCH, title: "Pan", brand: "Bosch", category: "Huishouden" },
    ])
    const admin = adminDecision(
      ["EAN", "Productnaam", "Merk", "Categorie"],
      [[BOSCH, "Pan", "Bosch", "Huishouden"]]
    )
    expect(stored(seller.preview[0].status)).toBe("concept")
    expect(stored(admin.preview[0].status)).toBe("concept")
    expect(seller.preview[0].brand_resolution?.status).toBe("existing")
    expect(admin.brand_proposals).toEqual([])
  })

  it("creates an unknown brand for review and does not verify it", () => {
    const seller = sellerDecision([
      { ean: BOSCH, title: "Pan", brand: "Acme Textiel", category: "Huishouden" },
    ])
    const admin = adminDecision(
      ["EAN", "Productnaam", "Merk", "Categorie"],
      [[BOSCH, "Pan", "Acme Textiel", "Huishouden"]]
    )
    expect(stored(seller.preview[0].status)).toBe("concept")
    expect(stored(admin.preview[0].status)).toBe("concept")
    expect(seller.preview[0].brand_resolution?.status).toBe("create")
    expect(admin.brand_proposals[0]?.status).toBe("create")
    expect(seller.preview[0].issues.some((issue) => /niet automatisch geverifieerd/.test(issue.message))).toBe(true)
    expect(admin.preview[0].issues.some((issue) => /niet automatisch geverifieerd/.test(issue.message))).toBe(true)
  })

  it("holds an ambiguous brand for review on both sides", () => {
    const ambiguous = [
      { id: "brand_home", name: "Bosch Home" },
      { id: "brand_pro", name: "Bosch Professional" },
    ]
    const seller = sellerDecision(
      [{ ean: BOSCH, title: "Pan", brand: "Bosch", category: "Huishouden" }],
      new Set(),
      ambiguous
    )
    const admin = adminDecision(
      ["EAN", "Productnaam", "Merk", "Categorie"],
      [[BOSCH, "Pan", "Bosch", "Huishouden"]],
      [],
      ambiguous
    )
    expect(seller.preview[0].status).toBe("error")
    expect(admin.preview[0].status).toBe("error")
    expect(seller.preview[0].brand_resolution?.status).toBe("ambiguous")
    expect(admin.brand_proposals[0]?.status).toBe("ambiguous")
  })

  it("keeps a missing EAN and a missing specification as a concept", () => {
    const seller = sellerDecision([
      {
        ean: "",
        mpn: "MPN-1",
        title: "Pan",
        brand: "Bosch",
        category: "Huishouden",
        spec_value_1: "blauw",
      },
    ])
    const admin = adminDecision(
      ["EAN", "Productnaam", "Merk", "Categorie", "MPN", "Waarde 1"],
      [["", "Pan", "Bosch", "Huishouden", "MPN-1", "blauw"]]
    )
    expect(stored(seller.preview[0].status)).toBe("concept")
    expect(stored(admin.preview[0].status)).toBe("concept")
    expect(seller.preview[0].issues.some((issue) => issue.field === "ean")).toBe(true)
    expect(admin.preview[0].issues.some((issue) => issue.field === "ean" && !issue.blocking)).toBe(true)
    expect(seller.preview[0].issues.some((issue) => issue.field === "specifications" && !issue.blocking)).toBe(true)
    expect(admin.preview[0].issues.some((issue) => issue.field === "specifications" && !issue.blocking)).toBe(true)
  })

  it("reports an invalid price without storing zero", () => {
    const seller = sellerDecision([
      {
        ean: BOSCH,
        title: "Pan",
        brand: "Bosch",
        category: "Huishouden",
        regular_price: "geen-prijs",
      },
    ])
    const headers = ["EAN", "Productnaam", "Merk", "Categorie", "Prijs"]
    const rows = [[BOSCH, "Pan", "Bosch", "Huishouden", "geen-prijs"]]
    const admin = adminDecision(headers, rows)
    expect(stored(seller.preview[0].status)).toBe("concept")
    expect(stored(admin.preview[0].status)).toBe("concept")
    expect(seller.preview[0].issues.some((issue) => /geen prijs 0/.test(issue.message))).toBe(true)
    expect(admin.preview[0].issues.some((issue) => /geen prijs 0/.test(issue.message) && !issue.blocking)).toBe(true)
    const plan = planBrandCommit(admin, { headers, rows, mapping_confirmed: true })
    const created = plan.actions.find((action) => action.type === "create")
    expect(created && created.type === "create" ? created.ean : "").toBe(BOSCH)
    expect(JSON.stringify(created)).not.toContain('"0"')
  })

  it("commits the valid row when another row cannot be stored", () => {
    const seller = sellerDecision([
      { ean: BOSCH, title: "Pan", brand: "Bosch", category: "Huishouden" },
      { ean: "4006381333931", title: "", brand: "Bosch", category: "Huishouden" },
    ])
    const headers = ["EAN", "Productnaam", "Merk", "Categorie"]
    const rows = [
      [BOSCH, "Pan", "Bosch", "Huishouden"],
      ["4006381333931", "", "Bosch", "Huishouden"],
    ]
    const admin = adminDecision(headers, rows)
    expect(seller.preview.map((row) => stored(row.status))).toEqual(["concept", "error"])
    expect(admin.preview.map((row) => stored(row.status))).toEqual(["concept", "error"])
    const plan = planBrandCommit(admin, { headers, rows, mapping_confirmed: true })
    expect(plan.blocked).toBe(false)
    expect(plan.actions.filter((action) => action.type === "create")).toHaveLength(1)
  })

  it("matches an existing product instead of creating a second one", () => {
    const seller = sellerDecision(
      [{ ean: BOSCH, title: "Pan", brand: "Bosch", category: "Huishouden" }],
      new Set([BOSCH])
    )
    const existing: ExistingProductHit[] = [
      {
        product_id: "prod_pan",
        publication_status: "Concept",
        title: "Pan",
        description: "",
        gtin: BOSCH,
        mpn: null,
        translations: [],
      },
    ]
    const headers = ["EAN", "Productnaam", "Merk", "Categorie"]
    const rows = [[BOSCH, "Pan", "Bosch", "Huishouden"]]
    const admin = adminDecision(headers, rows, existing)
    expect(seller.preview[0].status).toBe("existing")
    expect(admin.preview[0].status).toBe("existing")
    const plan = planBrandCommit(admin, { headers, rows, existing, mapping_confirmed: true })
    expect(plan.actions.some((action) => action.type === "create")).toBe(false)
  })

  it("drops the price warning once the price is corrected", () => {
    const broken = sellerDecision([
      { ean: BOSCH, title: "Pan", brand: "Bosch", regular_price: "geen-prijs" },
    ])
    const fixed = sellerDecision([
      { ean: BOSCH, title: "Pan", brand: "Bosch", regular_price: "12.50" },
    ])
    expect(broken.preview[0].issues.some((issue) => issue.field === "regular_price")).toBe(true)
    expect(fixed.preview[0].issues.some((issue) => issue.field === "regular_price")).toBe(false)

    const headers = ["EAN", "Productnaam", "Merk", "Prijs"]
    const before = adminDecision(headers, [[BOSCH, "Pan", "Bosch", "geen-prijs"]])
    const after = adminDecision(headers, [[BOSCH, "Pan", "Bosch", "12,50"]])
    expect(before.preview[0].issues.some((issue) => issue.field === "regular_price")).toBe(true)
    expect(after.preview[0].issues.some((issue) => issue.field === "regular_price")).toBe(false)
  })

  it("recognizes a repeated concept that has no valid EAN", () => {
    const headers = ["EAN", "Productnaam", "Merk"]
    const rows = [["123", "Pan", "Bosch"]]
    const first = adminDecision(headers, rows)
    const plan = planBrandCommit(first, { headers, rows, mapping_confirmed: true })
    const created = plan.actions.find((action) => action.type === "create")
    const draft = created && created.type === "create" ? created.import_ref || "" : ""
    expect(draft).toMatch(/^DRAFT-/)
    expect(adminStoredIdentity(headers, rows[0], first.links).draftKey).toBe(draft)
    const again = adminDecision(headers, rows, [
      {
        product_id: "prod_draft",
        publication_status: "Concept",
        title: "Pan",
        description: "",
        gtin: null,
        mpn: null,
        import_ref: draft,
        translations: [],
      },
    ])
    expect(again.preview[0].status).toBe("existing")
    const second = planBrandCommit(again, {
      headers,
      rows,
      mapping_confirmed: true,
      existing: [
        {
          product_id: "prod_draft",
          publication_status: "Concept",
          title: "Pan",
          description: "",
          gtin: null,
          mpn: null,
          import_ref: draft,
          translations: [],
        },
      ],
    })
    expect(second.actions.some((action) => action.type === "create")).toBe(false)
  })
})
