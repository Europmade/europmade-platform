import { readFileSync } from "node:fs"
import path from "node:path"
import {
  buildSellerImportPreview,
  buildSellerImportResult,
  sellerImportPhase,
} from "../../../../../web/app/seller/products/import/import-result-model"
import { conditionalFieldIssues } from "../import-row-policy"

const labels = [
  { column: "shipping_profile_id", nl_name: "Verzendprofiel" },
  { column: "manual_languages", nl_name: "Handleidingtaal" },
  { column: "video_url", nl_name: "Video" },
  { column: "category", nl_name: "Categorie" },
]

function product(row: number, action: "created" | "updated" | "reused" = "created") {
  return {
    row,
    product_id: `prod_${row}`,
    title: `Product ${row}`,
    action,
    category_status: "linked" as const,
    category_raw: "Home > Home Textiles > Cushions & Throws",
    category_name: "Sierkussens & plaids",
    warning: null,
  }
}

describe("seller import result", () => {
  it("does not treat an empty manual or shipping profile as a required gap", () => {
    const issues = conditionalFieldIssues(
      {
        title: "Kussen",
        manual_languages: "",
        manual_url: "",
        shipping_profile_id: "",
        ean: "5430004920175",
      },
      2,
      []
    )
    expect(issues.some((issue) => issue.field === "manual_languages")).toBe(false)
    expect(issues.some((issue) => issue.field === "manual_url")).toBe(false)
    const shipping = issues.find((issue) => issue.field === "shipping_profile_id")
    expect(shipping?.blocking).toBe(false)
    expect(shipping?.blocks).toEqual([])
  })

  it("counts products and offers separately for several new products", () => {
    const view = buildSellerImportResult(
      {
        products: [product(2), product(3), product(4)],
        skipped_count: 0,
      },
      {
        field_labels: labels,
        preview: [2, 3, 4].map((row) => ({
          row,
          status: "new" as const,
          values: {
            title: `Product ${row}`,
            ean: `543000000000${row}`,
            brand: "Opoggi",
            category: "Sierkussens & plaids",
          },
          issues: [],
          offer_action: "create" as const,
          category_resolution: {
            status: "linked",
            raw: "Home > Home Textiles > Cushions & Throws",
            matched: { name: "Sierkussens & plaids" },
          },
        })),
      }
    )
    expect(view.summary.processedRows).toBe(3)
    expect(view.summary.importedProducts).toBe(3)
    expect(view.summary.createdProducts).toBe(3)
    expect(view.summary.newOffers).toBe(3)
    expect(view.summary.importedProducts + view.summary.newOffers).not.toBe(
      view.summary.processedRows
    )
    expect(view.summary.green).toBe(3)
    expect(view.summary.red).toBe(0)
    expect(view.rows[0].europmadeCategory).toBe("Sierkussens & plaids")
    expect(view.rows[0].productId).toBe("prod_2")
  })

  it("reports one stored product and fourteen unprocessed rows", () => {
    const previewRows = Array.from({ length: 15 }, (_, index) => ({
      row: index + 2,
      status: "new" as const,
      values: { title: `Rij ${index + 2}`, ean: String(1000 + index), brand: "Opoggi" },
      issues:
        index === 0
          ? []
          : [
              {
                field: "title",
                message: "Titel ontbreekt",
                blocking: true,
                blocks: ["draft"],
              },
            ],
    }))
    const view = buildSellerImportResult(
      { products: [product(2)], received_rows: 15 },
      { preview: previewRows }
    )
    expect(view.summary.importedProducts).toBe(1)
    expect(view.summary.createdProducts).toBe(1)
    expect(view.summary.red).toBe(14)
    expect(view.summary.errorRows).toBe(14)
    expect(view.summary.processedRows).toBe(15)
  })

  it("keeps a new brand as attention, not a failed import", () => {
    const view = buildSellerImportResult(
      { products: [product(2)] },
      {
        preview: [
          {
            row: 2,
            status: "new",
            values: { title: "Kussen", ean: "5430004920175", brand: "Opoggi" },
            issues: [
              {
                field: "brand",
                message: "Merk 'Opoggi' bestaat nog niet.",
                severity: "requires_review",
                blocks: [],
              },
            ],
          },
        ],
      }
    )
    expect(view.rows[0].tone).toBe("orange")
    expect(view.rows[0].warnings[0].kind).toBe("brand")
    expect(view.rows[0].action).toBe("created")
    expect(view.summary.red).toBe(0)
  })

  it("shows a missing shipping profile as a sale gap without the internal field name", () => {
    const view = buildSellerImportResult(
      { products: [product(2)] },
      {
        field_labels: labels,
        preview: [
          {
            row: 2,
            status: "new",
            values: { title: "Kussen", ean: "5430004920175", brand: "Opoggi" },
            issues: [
              {
                field: "shipping_profile_id",
                message:
                  "Excel-regel 2, veld Verzendprofiel (interne naam: shipping_profile_id): voorwaardelijk verplicht veld is leeg.",
                severity: "missing",
                blocks: ["publication", "sale"],
              },
            ],
          },
        ],
      }
    )
    const row = view.rows[0]
    expect(row.tone).toBe("green")
    expect(row.required).toHaveLength(0)
    expect(row.warnings).toHaveLength(0)
    expect(row.followUps[0].label).toBe("Verzendprofiel")
    expect(row.followUps[0].step).toBe("followup")
    expect(JSON.stringify(row)).not.toContain("shipping_profile_id")
  })

  it("keeps a product green when only the manual language is empty", () => {
    const view = buildSellerImportResult(
      { products: [product(2)] },
      {
        field_labels: labels,
        preview: [
          {
            row: 2,
            status: "new",
            values: { title: "Kussen", ean: "5430004920175", brand: "Opoggi" },
            issues: [
              {
                field: "manual_languages",
                message:
                  "Excel-regel 2, veld Taal handleiding (interne naam: manual_languages): voorwaardelijk verplicht veld is leeg.",
                severity: "missing",
                blocks: ["publication"],
              },
            ],
          },
        ],
      }
    )
    expect(view.rows[0].tone).toBe("green")
    expect(view.rows[0].required).toHaveLength(0)
    expect(view.rows[0].warnings).toHaveLength(0)
    expect(view.rows[0].followUps).toHaveLength(0)
    expect(JSON.stringify(view.rows[0])).not.toContain("manual_languages")
  })

  it("keeps an optional gap green", () => {
    const view = buildSellerImportResult(
      { products: [product(2)] },
      {
        field_labels: labels,
        preview: [
          {
            row: 2,
            status: "new",
            values: { title: "Kussen", brand: "Opoggi" },
            issues: [
              {
                field: "video_url",
                message: "Video ontbreekt",
                severity: "warning",
                blocks: [],
              },
            ],
          },
        ],
      }
    )
    expect(view.rows[0].tone).toBe("green")
    expect(view.rows[0].optional).toHaveLength(1)
    expect(view.rows[0].required).toHaveLength(0)
  })

  it("does not present an uncertain category as a matched EuropMade category", () => {
    const stored = product(2)
    stored.category_status = "category_pending"
    stored.category_name = null
    const view = buildSellerImportResult(
      { products: [stored] },
      {
        field_labels: labels,
        preview: [
          {
            row: 2,
            status: "new",
            values: { title: "Kussen", brand: "Opoggi" },
            issues: [],
            category_resolution: {
              status: "pending",
              raw: "Home > Women",
              matched: null,
            },
          },
        ],
      }
    )
    expect(view.rows[0].europmadeCategory).toBeNull()
    expect(view.rows[0].excelCategory).toBe("Home > Women")
    expect(view.rows[0].categoryUncertain).toBe(true)
    expect(view.rows[0].tone).toBe("orange")
  })

  it("switches from result back to a clean upload step", () => {
    expect(sellerImportPhase({ hasPreview: true, hasResult: true })).toBe("result")
    expect(sellerImportPhase({ hasPreview: true, hasResult: false })).toBe("preview")
    expect(sellerImportPhase({ hasPreview: false, hasResult: false })).toBe("upload")
  })

  it("previews each excel row once and keeps column matching collapsed", () => {
    const view = buildSellerImportPreview(
      {
        field_labels: labels,
        preview: [
          {
            row: 2,
            status: "new",
            values: { title: "Groen kussen", ean: "111", brand: "Opoggi" },
            issues: [],
            offer_action: "create",
            category_resolution: {
              status: "linked",
              raw: "Home > Home Textiles > Cushions & Throws",
              matched: { name: "Sierkussens & plaids" },
            },
          },
          {
            row: 3,
            status: "existing",
            values: { title: "Bestaand kussen", ean: "222", brand: "Opoggi" },
            issues: [
              {
                field: "shipping_profile_id",
                message:
                  "Excel-regel 3, veld Verzendprofiel (interne naam: shipping_profile_id): leeg.",
                severity: "missing",
                blocks: ["publication", "sale"],
              },
            ],
            offer_action: "update",
            category_resolution: {
              status: "linked",
              raw: "Home",
              matched: { name: "Wonen" },
            },
          },
          {
            row: 4,
            status: "error",
            values: { title: "Fout", ean: "333", brand: "Opoggi" },
            issues: [
              {
                field: "title",
                message: "Titel ontbreekt",
                blocking: true,
                blocks: ["draft"],
              },
            ],
            offer_action: "create",
          },
          {
            row: 5,
            status: "new",
            values: { title: "Onzeker", ean: "444", brand: "Opoggi" },
            issues: [],
            offer_action: "none",
            category_resolution: {
              status: "suggested",
              raw: "Home > Women",
              matched: { name: "Dames" },
            },
          },
        ],
      }
    )
    expect(view.phase).toBe("preview")
    expect(view.rows).toHaveLength(4)
    expect(view.rows.map((row) => row.tone)).toEqual([
      "green",
      "green",
      "red",
      "orange",
    ])
    expect(view.rows[0].europmadeCategory).toBe("Sierkussens & plaids")
    expect(view.rows[1].required).toHaveLength(0)
    expect(view.rows[1].followUps[0].label).toBe("Verzendprofiel")
    expect(JSON.stringify(view.rows[1])).not.toContain("shipping_profile_id")
    expect(view.rows[3].europmadeCategory).toBeNull()
    expect(view.summary.processedRows).toBe(4)
    expect(view.summary.createdProducts).toBe(2)
    expect(view.summary.reusedProducts).toBe(1)
    expect(view.summary.newOffers).toBe(1)
    expect(view.summary.updatedOffers).toBe(1)
    expect(view.summary.red).toBe(1)
    expect(view.summary.importedProducts).toBe(3)
    const page = readFileSync(
      path.join(
        __dirname,
        "../../../../../web/app/seller/products/import/page.tsx"
      ),
      "utf8"
    )
    const previewPanel = readFileSync(
      path.join(
        __dirname,
        "../../../../../web/app/seller/products/import/import-preview-panel.tsx"
      ),
      "utf8"
    )
    expect(page).toContain("SellerImportPreview")
    expect(page).not.toContain("importColumnMatching")
    expect(page).not.toContain("Overige gegevens")
    expect(previewPanel).toContain('data-preview-table="true"')
    expect(previewPanel).toContain('data-advanced-columns="true"')
    expect(previewPanel).toContain("importAdvancedColumns")
    expect(previewPanel).toContain("importWillCreate")
    expect(previewPanel.indexOf("importSubmit")).toBeLessThan(
      previewPanel.indexOf("data-advanced-columns")
    )
  })

  it("hides column matching on the result step and links to the product", () => {
    const page = readFileSync(
      path.join(
        __dirname,
        "../../../../../web/app/seller/products/import/page.tsx"
      ),
      "utf8"
    )
    const panel = readFileSync(
      path.join(
        __dirname,
        "../../../../../web/app/seller/products/import/import-result-panel.tsx"
      ),
      "utf8"
    )
    expect(page).toContain("SellerImportPreview")
    expect(page).not.toContain("importColumnMatching")
    expect(page).toContain("startNewImport")
    expect(page).toContain("setPreview(null)")
    expect(page).toContain("setCommitResult(null)")
    expect(panel).toContain('data-import-phase="result"')
    expect(panel).toContain("/seller/products/")
    expect(panel).toContain("importViewImportedProduct")
    expect(panel).not.toContain("importColumnMatching")
  })
})
