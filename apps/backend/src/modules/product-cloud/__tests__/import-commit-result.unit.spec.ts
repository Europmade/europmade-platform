import {
  buildImportCommitResult,
  categoryPendingWarning,
  categoryStatusFromResolution,
  importCommitShouldShowUnknownError,
  readImportApiErrorMessage,
  recoverImportCommitFromCatalog,
  type ImportCommitProduct,
} from "../import-commit-result"
import { applyCategoryResolution } from "../import-category"
import { uniqueImportCategoryCatalog } from "../import-category"

const CATALOG = uniqueImportCategoryCatalog([
  { id: "cat_huishouden", name: "Huishouden", slug: "huishouden" },
  { id: "cat_badkamer", name: "Badkamer", slug: "badkamer" },
  { id: "cat_beauty", name: "Beauty & Verzorging", slug: "beauty-verzorging" },
])

function product(partial: Partial<ImportCommitProduct>): ImportCommitProduct {
  return {
    row: 2,
    product_id: "pcprod_1",
    title: "Testproduct",
    action: "created",
    lifecycle_status: "Retailer Created",
    publication_status: "Concept",
    category_status: "linked",
    category_raw: "Huishouden",
    category_name: "Huishouden",
    category_suggestions: [],
    warning: null,
    ...partial,
  }
}

const translations = {
  provider_configured: false,
  queued: 0,
  skipped_manual: 0,
}

describe("import commit result", () => {
  it("returns success for a row with a valid canonical category", () => {
    const { resolution } = applyCategoryResolution(
      { category: "Huishouden", title: "Vaatwasser" },
      CATALOG
    )
    const result = buildImportCommitResult({
      products: [
        product({
          title: "Vaatwasser",
          category_status: categoryStatusFromResolution(resolution),
          category_raw: resolution.raw,
          category_name: resolution.matched?.name ?? null,
        }),
      ],
      source_language_code: "nl",
      translations,
    })
    expect(result.success).toBe(true)
    expect(result.created_count).toBe(1)
    expect(result.warning_count).toBe(0)
    expect(result.products[0].category_status).toBe("linked")
    expect(result.message).toBe("Import geslaagd.")
  })

  it("returns success with category_pending for an unknown category", () => {
    const { resolution } = applyCategoryResolution(
      { category: "Badkamer & verzorging", title: "MOEVE handdoek" },
      CATALOG
    )
    expect(resolution.matched).toBeNull()
    const result = buildImportCommitResult({
      products: [
        product({
          title: "MOEVE Superwuschel badlaken kleur snow",
          category_status: categoryStatusFromResolution(resolution),
          category_raw: resolution.raw,
          category_name: null,
          category_suggestions: resolution.suggestions.map((s) => s.name),
          warning: categoryPendingWarning(resolution.raw),
        }),
      ],
      source_language_code: "nl",
      translations,
    })
    expect(result.success).toBe(true)
    expect(result.created_count).toBe(1)
    expect(result.warning_count).toBe(1)
    expect(result.products[0].category_status).toBe("category_pending")
    expect(result.products[0].category_raw).toBe("Badkamer & verzorging")
    expect(result.products[0].publication_status).toBe("Concept")
    expect(result.warnings[0]).toContain("kies een EuropMade-categorie")
  })

  it("treats a successful commit body with warnings as frontend success", () => {
    const result = buildImportCommitResult({
      products: [
        product({
          category_status: "category_pending",
          warning: categoryPendingWarning("Badkamer & verzorging"),
        }),
      ],
      source_language_code: "nl",
      translations,
    })
    expect(
      importCommitShouldShowUnknownError({ httpOk: true, body: result })
    ).toBe(false)
    expect(result.success).toBe(true)
    expect(result.product_ids).toEqual(["pcprod_1"])
  })

  it("does not surface An unknown error occurred when products were created", () => {
    expect(
      importCommitShouldShowUnknownError({
        httpOk: false,
        body: {
          message: "An unknown error occurred.",
          product_ids: ["pcprod_1"],
        },
      })
    ).toBe(false)
    expect(
      readImportApiErrorMessage(
        { message: "An unknown error occurred." },
        "Import mislukt."
      )
    ).toBe("Import mislukt.")
    expect(
      readImportApiErrorMessage(
        { message: "AN UNKNOWN ERROR OCCURRED." },
        "Import mislukt."
      )
    ).toBe("Import mislukt.")
  })

  it("keeps a real backend error visible when nothing was created", () => {
    expect(
      importCommitShouldShowUnknownError({
        httpOk: false,
        body: { message: "Onbekend merk 'X'." },
      })
    ).toBe(true)
    expect(readImportApiErrorMessage({ message: "Onbekend merk 'X'." })).toBe(
      "Onbekend merk 'X'."
    )
    expect(
      readImportApiErrorMessage({ error: { message: "Validatie mislukt." } })
    ).toBe("Validatie mislukt.")
  })

  it("returns product id and a seller product path", () => {
    const result = buildImportCommitResult({
      products: [product({ product_id: "pcprod_live_1", title: "MOEVE" })],
      source_language_code: "nl",
      translations,
    })
    expect(result.products[0].product_id).toBe("pcprod_live_1")
    expect(`/seller/products/${result.products[0].product_id}`).toBe(
      "/seller/products/pcprod_live_1"
    )
  })

  it("counts a repeated import of the same EAN as update, not a second create", () => {
    const first = buildImportCommitResult({
      products: [product({ action: "created", product_id: "pcprod_same" })],
      source_language_code: "nl",
      translations,
    })
    const second = buildImportCommitResult({
      products: [product({ action: "updated", product_id: "pcprod_same" })],
      source_language_code: "nl",
      translations,
    })
    expect(first.created_count).toBe(1)
    expect(second.created_count).toBe(0)
    expect(second.updated_count).toBe(1)
    expect(second.product_ids).toEqual(["pcprod_same"])
  })

  it("summarises mixed valid and unknown category rows", () => {
    const result = buildImportCommitResult({
      products: [
        product({
          row: 2,
          product_id: "pcprod_ok",
          title: "Gekoppeld product",
          category_status: "linked",
          category_raw: "Huishouden",
          category_name: "Huishouden",
        }),
        product({
          row: 3,
          product_id: "pcprod_pending",
          title: "MOEVE handdoek",
          category_status: "category_pending",
          category_raw: "Badkamer & verzorging",
          category_name: null,
          warning: categoryPendingWarning("Badkamer & verzorging"),
        }),
      ],
      skipped_count: 1,
      errors: [],
      source_language_code: "nl",
      translations,
    })
    expect(result.created_count).toBe(2)
    expect(result.warning_count).toBe(1)
    expect(result.skipped_count).toBe(1)
    expect(
      result.products.filter((p) => p.category_status === "category_pending")
    ).toHaveLength(1)
  })

  it("treats an existing EAN match as updated, not created", () => {
    const result = buildImportCommitResult({
      products: [
        product({
          action: "updated",
          product_id: "pcprod_ean",
          title: "Bestaande EAN",
        }),
      ],
      source_language_code: "nl",
      translations,
    })
    expect(result.created_count).toBe(0)
    expect(result.updated_count).toBe(1)
    expect(result.imported).toBe(0)
    expect(result.updated).toBe(1)
  })

  it("recovers a catalog match after a generic unknown error", () => {
    const recovered = recoverImportCommitFromCatalog({
      catalog: [
        {
          id: "prod_moeve_1",
          title: "MOEVE Superwuschel badlaken kleur snow",
          lifecycle_status: "Concept",
          publication_status: "Concept",
          category_assignment_status: "category_pending",
          category_names: [],
          identifier_value: "4013165840592",
        },
      ],
      preview: [
        {
          title: "MOEVE Superwuschel badlaken kleur snow",
          ean: "4013165840592",
          category_raw: "Badkamer & verzorging",
          suggestions: ["Badkamer", "Beauty & Verzorging"],
        },
      ],
    })
    expect(recovered?.success).toBe(true)
    expect(recovered?.products[0].product_id).toBe("prod_moeve_1")
    expect(recovered?.products[0].category_status).toBe("category_pending")
    expect(
      importCommitShouldShowUnknownError({ httpOk: true, body: recovered })
    ).toBe(false)
  })
})
