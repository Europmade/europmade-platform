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
import {
  productPublicationBlockers,
  publicationAlreadyLive,
  publishVersionAfterApproval,
} from "../approval-publication"

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

  it("reports every blocker and still approves when only the offer is incomplete", async () => {
    const harness = deps({
      loadPublishable: async (productId) => {
        if (productId === "prod_gap") {
          return {
            publishable: false,
            reason: "Ontbreekt: EAN / GTIN",
            findings: [
              {
                code: "ean",
                field: "EAN / GTIN",
                category: "submission" as const,
                blocks: ["submission", "approval", "publication"] as const,
                severity: "blocker" as const,
                message: "Ontbreekt: EAN / GTIN",
                action: "Vul een geldige EAN/GTIN in en sla op.",
                status: "open" as const,
              },
              {
                code: "shipping_profile",
                field: "Verzendprofiel",
                category: "sale" as const,
                blocks: ["sale"] as const,
                severity: "blocker" as const,
                message: "Verzendprofiel koppelen",
                action: "Koppel een verzendprofiel en sla het aanbod op.",
                status: "open" as const,
              },
            ],
          }
        }
        return {
          publishable: true,
          reason: null,
          findings: [
            {
              code: "delivery",
              field: "Levertijd",
              category: "sale" as const,
              blocks: ["sale"] as const,
              severity: "blocker" as const,
              message: "Levertijd/verzending instellen",
              action: "Stel de levertijd in en sla het aanbod op.",
              status: "open" as const,
            },
          ],
        }
      },
    })
    const report = await runBulkProductApproval(
      { ...harness, listProducts: async () => [] },
      {
        mode: "selected",
        product_ids: ["prod_gap", "prod_ok"],
        dry_run: true,
        actor_id: "user_admin",
      }
    )
    const gap = report.results.find((row) => row.product_id === "prod_gap")
    const ok = report.results.find((row) => row.product_id === "prod_ok")
    expect(gap?.status).toBe("skipped")
    expect(gap?.findings?.map((finding) => finding.code)).toEqual([
      "ean",
      "shipping_profile",
    ])
    expect(ok?.status).toBe("eligible")
    expect(ok?.findings?.map((finding) => finding.code)).toEqual(["delivery"])
    expect(harness.decided).toEqual([])
  })

  it("previews several products and records the actor only on approved rows", async () => {
    const actors: string[] = []
    const harness = deps({
      listProductVersions: async (productId) => [
        {
          id: `ver_${productId}`,
          title: productId === "prod_title" ? "Pan" : "Concept",
          publication_status: productId === "prod_closed" ? "Concept" : "In review",
          version_number: 1,
        },
      ],
      loadPublishable: async (productId) => ({
        publishable: productId !== "prod_ean",
        reason: productId === "prod_ean" ? "Ontbreekt: EAN / GTIN" : null,
        preview: {
          identifier: productId === "prod_title" ? "8720000000001" : null,
          lifecycle_status: "Actief",
          publication_status: productId === "prod_closed" ? "Concept" : "In review",
          offer_status: "Geen aanbod",
          sellability: "Niet verkoopbaar",
        },
        findings:
          productId === "prod_ean"
            ? [
                {
                  code: "ean",
                  field: "EAN / GTIN",
                  category: "submission" as const,
                  blocks: ["submission", "approval", "publication"] as const,
                  severity: "blocker" as const,
                  message: "Ontbreekt: EAN / GTIN",
                  action: "Vul een geldige EAN/GTIN in en sla op.",
                  status: "open" as const,
                },
              ]
            : productId === "prod_title"
              ? [
                  {
                    code: "warranty_extra",
                    field: "Extra garantie",
                    category: "warning" as const,
                    blocks: ["warning"] as const,
                    severity: "warning" as const,
                    message: "Aanbevolen: Extra garantie is nog leeg.",
                    action: "Vul Extra garantie in als de waarde bekend is.",
                    status: "open" as const,
                  },
                ]
              : [],
      }),
      decide: async (input) => {
        actors.push(input.actor_id)
        return { version: { id: input.version_id, publication_status: "Gepubliceerd" }, lifecycle_status: "Actief" }
      },
    })
    const preview = await runBulkProductApproval(
      { ...harness, listProducts: async () => [] },
      {
        mode: "selected",
        product_ids: ["prod_title", "prod_ean", "prod_closed"],
        dry_run: true,
        actor_id: "user_admin",
      }
    )
    expect(preview.selected_count).toBe(3)
    expect(preview.eligible_count).toBe(1)
    expect(preview.skipped_count).toBe(2)
    expect(preview.warning_count).toBe(1)
    expect(preview.partial).toBe(false)
    expect(preview.results.find((row) => row.product_id === "prod_title")).toMatchObject({
      outcome_label: "Geschikt voor goedkeuring",
      identifier: "8720000000001",
      publication_status: "In review",
      offer_status: "Geen aanbod",
    })
    expect(preview.results.find((row) => row.product_id === "prod_ean")?.outcome_label).toBe(
      "Niet goedgekeurd"
    )
    expect(preview.results.find((row) => row.product_id === "prod_closed")?.outcome_label).toBe(
      "Overgeslagen"
    )
    expect(actors).toEqual([])

    const applied = await runBulkProductApproval(
      { ...harness, listProducts: async () => [] },
      {
        mode: "selected",
        product_ids: ["prod_title", "prod_ean"],
        dry_run: false,
        actor_id: "user_admin",
      }
    )
    expect(applied.partial).toBe(true)
    expect(applied.approved_count).toBe(1)
    expect(applied.skipped_count).toBe(1)
    expect(applied.results.find((row) => row.product_id === "prod_title")).toMatchObject({
      outcome_label: "Goedgekeurd en gepubliceerd",
      decided_by: "user_admin",
    })
    expect(actors).toEqual(["user_admin"])
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

describe("approval publication", () => {
  it("does not publish again when the version is already published", async () => {
    const publish = jest.fn()
    const revert = jest.fn()
    const result = await publishVersionAfterApproval({
      statusAfterApproval: "Gepubliceerd",
      publish,
      revertToReview: revert,
    })
    expect(publicationAlreadyLive("Gepubliceerd")).toBe(true)
    expect(result.published).toBe(false)
    expect(publish).not.toHaveBeenCalled()
    expect(revert).not.toHaveBeenCalled()
  })

  it("rolls the version back to review when publication fails", async () => {
    const revert = jest.fn(async () => undefined)
    await expect(
      publishVersionAfterApproval({
        statusAfterApproval: "Goedgekeurd",
        publish: async () => {
          throw new Error("geen hoofdafbeelding")
        },
        revertToReview: revert,
      })
    ).rejects.toThrow("geen hoofdafbeelding")
    expect(revert).toHaveBeenCalledTimes(1)
  })

  it("publishes once after approval", async () => {
    const revert = jest.fn()
    const result = await publishVersionAfterApproval({
      statusAfterApproval: "Goedgekeurd",
      publish: async () => ({ publication_status: "Gepubliceerd" }),
      revertToReview: revert,
    })
    expect(result).toEqual({
      published: true,
      result: { publication_status: "Gepubliceerd" },
    })
    expect(revert).not.toHaveBeenCalled()
  })

  it("keeps offer gaps out of the product approval gate", () => {
    expect(
      productPublicationBlockers([
        "Geen verkoopaanbod aanwezig",
        "Verkoopprijs invullen",
      ])
    ).toEqual([])
    expect(
      productPublicationBlockers([
        "Geen verkoopaanbod aanwezig",
        "Ontbreekt: Titel",
      ])
    ).toEqual(["Ontbreekt: Titel"])
  })
})

describe("approval wiring", () => {
  const root = join(__dirname, "..", "..", "..", "..")

  it("publishes the same version from admin approval and bulk approval", () => {
    const route = readFileSync(
      join(root, "src/api/admin/product-cloud/products/[id]/approval/route.ts"),
      "utf8"
    )
    const depsFile = readFileSync(
      join(root, "src/api/admin/product-cloud/products/approval-deps.ts"),
      "utf8"
    )
    const workflow = readFileSync(join(root, "src/workflows/product-cloud/versions.ts"), "utf8")
    const service = readFileSync(join(root, "src/modules/product-cloud/service.ts"), "utf8")
    const bulk = readFileSync(
      join(root, "src/api/admin/product-cloud/products/bulk-approval/route.ts"),
      "utf8"
    )
    const sellerPage = readFileSync(
      join(root, "..", "..", "apps/web/app/seller/products/[id]/page.tsx"),
      "utf8"
    )
    expect(route).toContain("approveProductWithDeps")
    expect(route).toContain("request_info")
    expect(route).not.toContain("publishVersionWorkflow")
    expect(route).not.toContain("publishVersionGraph")
    expect(depsFile).toContain("publishVersionWorkflow")
    expect(depsFile).toContain("publishVersionAfterApproval")
    expect(depsFile).toContain("productPublicationBlockers")
    expect(bulk).toContain("runBulkProductApproval")
    expect(bulk).toContain("buildAdminApprovalDeps")
    expect(bulk).toContain("actor_id: actor")
    const middlewares = readFileSync(join(root, "src/api/middlewares.ts"), "utf8")
    const bulkMiddleware = middlewares.slice(middlewares.indexOf('"/admin/product-cloud/products/bulk-approval"'))
    expect(bulkMiddleware.slice(0, 180)).toContain("adminAuth")
    expect(bulk).not.toContain("publishVersionWorkflow")
    expect(workflow).toContain("publishVersionGraph")
    expect(workflow).toContain('publication_status === "Gepubliceerd"')
    expect(workflow).toContain('publication_status: "Goedgekeurd"')
    expect(workflow).not.toContain('new_value: "Gepubliceerd"')
    const graph = service.slice(service.indexOf("async publishVersionGraph_"))
    const guardAt = graph.indexOf('publication_status === "Gepubliceerd"')
    const archiveAt = graph.indexOf('publication_status: "Gearchiveerd"')
    expect(guardAt).toBeGreaterThan(-1)
    expect(archiveAt).toBeGreaterThan(guardAt)
    expect(sellerPage).toContain("submitForApproval")
    expect(sellerPage).not.toContain("Product publiceren")
  })
})
