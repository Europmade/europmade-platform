import { readFileSync } from "node:fs"
import { join } from "node:path"
import { MedusaError } from "@medusajs/framework/utils"
import {
  ApprovalRejected,
  approveProductWithDeps,
  matchesApprovalRelation,
  runBulkProductApproval,
  type ProductApprovalDeps,
} from "../product-approval-decision"
import type { SectionReviewRow } from "../section-review-helpers"

function review(status: SectionReviewRow["status"]): SectionReviewRow {
  return {
    id: null,
    section_key: "product_info",
    label_nl: "Productinformatie",
    status,
    comment: null,
    decided_by: null,
    decided_at: null,
    product_version_id: null,
  }
}

function deps(
  overrides: Partial<ProductApprovalDeps> = {}
): ProductApprovalDeps & { decided: string[] } {
  const decided: string[] = []
  const base: ProductApprovalDeps = {
    retrieveProduct: async (id) => ({
      id,
      brand_id: "brand_riess",
      manufacturer_id: "mfr_riess",
    }),
    listProductVersions: async () => [
      {
        id: "ver_review",
        title: "Riess braadslede",
        publication_status: "In review",
        version_number: 1,
      },
    ],
    listSectionReviews: async () => [review("unreviewed")],
    loadPublishable: async () => ({ publishable: true, reason: null }),
    assertGtin: async () => undefined,
    decide: async (input) => {
      decided.push(input.product_id)
      return { version: { id: input.version_id }, lifecycle_status: "Actief" }
    },
  }
  return { ...base, ...overrides, decided }
}

describe("individual approval gates", () => {
  it("approves an in-review product and records the actor path once", async () => {
    const harness = deps()
    const result = await approveProductWithDeps(harness, {
      productId: "prod_ok",
      actorId: "user_admin",
      reason: "gecontroleerd",
    })
    expect(result.version_id).toBe("ver_review")
    expect(harness.decided).toEqual(["prod_ok"])
  })

  it("ignores a historical claims review when approving the product", async () => {
    const harness = deps({
      listSectionReviews: async () => [
        review("unreviewed"),
        { ...review("needs_info"), section_key: "claims" } as unknown as ReturnType<typeof review>,
      ],
    })
    const result = await approveProductWithDeps(harness, {
      productId: "prod_ok",
      actorId: "user_admin",
    })
    expect(result.version_id).toBe("ver_review")
    expect(harness.decided).toEqual(["prod_ok"])
  })

  it("skips a concept product before the approval write", async () => {
    const harness = deps({
      listProductVersions: async () => [
        {
          id: "ver_concept",
          title: "Concept",
          publication_status: "Concept",
          version_number: 1,
        },
      ],
    })
    await expect(
      approveProductWithDeps(harness, { productId: "prod_concept", actorId: "user_admin" })
    ).rejects.toBeInstanceOf(ApprovalRejected)
    expect(harness.decided).toEqual([])
  })

  it("skips products that fail the existing content gates", async () => {
    const sections = deps({
      listSectionReviews: async () => [review("needs_info")],
    })
    await expect(
      approveProductWithDeps(sections, { productId: "prod_section", actorId: "user_admin" })
    ).rejects.toThrow("Aanvullen/Afwijzen")
    expect(sections.decided).toEqual([])

    const incomplete = deps({
      loadPublishable: async () => ({ publishable: false, reason: "Ontbreekt: EAN" }),
    })
    await expect(
      approveProductWithDeps(incomplete, { productId: "prod_gap", actorId: "user_admin" })
    ).rejects.toThrow("Ontbreekt: EAN")
    expect(incomplete.decided).toEqual([])

    const gtin = deps({
      assertGtin: async () => {
        throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "EAN/GTIN is vereist")
      },
    })
    await expect(
      approveProductWithDeps(gtin, { productId: "prod_ean", actorId: "user_admin" })
    ).rejects.toThrow("EAN/GTIN is vereist")
    expect(gtin.decided).toEqual([])
  })
})

describe("bulk approval", () => {
  it("approves only the selected products that pass and reports the rest", async () => {
    const harness = deps({
      listProductVersions: async (productId) => [
        {
          id: `ver_${productId}`,
          title: productId,
          publication_status: productId === "prod_concept" ? "Concept" : "In review",
          version_number: 1,
        },
      ],
      loadPublishable: async (productId) => ({
        publishable: productId !== "prod_gap",
        reason: productId === "prod_gap" ? "Ontbreekt: categorie" : null,
      }),
    })
    const report = await runBulkProductApproval(
      { ...harness, listProducts: async () => [] },
      {
        mode: "selected",
        product_ids: ["prod_ok", "prod_ok", "prod_concept", "prod_gap"],
        dry_run: false,
        actor_id: "user_admin",
      }
    )
    expect(report.approved_count).toBe(1)
    expect(report.skipped_count).toBe(2)
    expect(report.failed_count).toBe(0)
    expect(harness.decided).toEqual(["prod_ok"])
    expect(report.results.map((row) => row.status)).toEqual([
      "approved",
      "skipped",
      "skipped",
    ])
  })

  it("previews a brand without approving and ignores another brand", async () => {
    const harness = deps()
    const listProducts = jest.fn(async (filter: { brand_id?: string }) => {
      expect(filter).toEqual({ brand_id: "brand_riess" })
      return [
        { id: "prod_ok", brand_id: "brand_riess", manufacturer_id: "mfr_riess" },
        { id: "prod_other", brand_id: "brand_other", manufacturer_id: "mfr_riess" },
      ]
    })
    const report = await runBulkProductApproval(
      { ...harness, listProducts },
      { mode: "relation", brand_id: "brand_riess", dry_run: true, actor_id: "user_admin" }
    )
    expect(report.eligible_count).toBe(1)
    expect(report.approved_count).toBe(0)
    expect(harness.decided).toEqual([])
    expect(report.results.find((row) => row.product_id === "prod_other")?.reason).toContain(
      "gekozen merk"
    )
  })

  it("matches a manufacturer only by id, not by a stored name", async () => {
    expect(
      matchesApprovalRelation(
        { brand_id: "brand_riess", manufacturer_id: "Riess Kelomat GmbH" },
        { manufacturer_id: "mfr_riess" }
      )
    ).toBe(false)
    const harness = deps()
    const report = await runBulkProductApproval(
      {
        ...harness,
        listProducts: async (filter) => {
          expect(filter).toEqual({ manufacturer_id: "mfr_riess" })
          return [
            { id: "prod_ok", brand_id: "brand_riess", manufacturer_id: "mfr_riess" },
            {
              id: "prod_name",
              brand_id: "brand_riess",
              manufacturer_id: "Riess Kelomat GmbH",
            },
          ]
        },
      },
      {
        mode: "relation",
        manufacturer_id: "mfr_riess",
        dry_run: false,
        actor_id: "user_admin",
      }
    )
    expect(harness.decided).toEqual(["prod_ok"])
    expect(report.results.find((row) => row.product_id === "prod_name")?.status).toBe(
      "skipped"
    )
  })

  it("keeps going when one approval write fails", async () => {
    const harness = deps({
      decide: async (input) => {
        if (input.product_id === "prod_fail") throw new Error("schrijffout na controle")
        return { version: { id: input.version_id }, lifecycle_status: "Actief" }
      },
    })
    const report = await runBulkProductApproval(
      { ...harness, listProducts: async () => [] },
      {
        mode: "selected",
        product_ids: ["prod_a", "prod_fail", "prod_b"],
        dry_run: false,
        actor_id: "user_admin",
      }
    )
    expect(report.results.map((row) => [row.product_id, row.status])).toEqual([
      ["prod_a", "approved"],
      ["prod_fail", "failed"],
      ["prod_b", "approved"],
    ])
    expect(report.results[1]?.reason).toBe("schrijffout na controle")
  })
})

describe("approval wiring", () => {
  const root = join(__dirname, "..", "..", "..", "..")

  it("keeps individual approval on the shared decision and the existing publish rule", () => {
    const route = readFileSync(
      join(root, "src/api/admin/product-cloud/products/[id]/approval/route.ts"),
      "utf8"
    )
    const workflow = readFileSync(join(root, "src/workflows/product-cloud/versions.ts"), "utf8")
    const bulk = readFileSync(
      join(root, "src/api/admin/product-cloud/products/bulk-approval/route.ts"),
      "utf8"
    )
    expect(route).toContain("approveProductWithDeps")
    expect(route).toContain("request_info")
    expect(route).not.toContain("publishVersionGraph")
    expect(workflow).toContain("publishVersionGraph")
    expect(workflow).toContain('publication_status: "Goedgekeurd"')
    expect(workflow).not.toContain('new_value: "Gepubliceerd"')
    expect(bulk).not.toContain("createManufacturers")
    expect(bulk).not.toContain("updateOffers")
  })
})
