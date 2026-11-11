import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  EvidenceReviewRejected,
  planEvidenceReview,
  summarizeProductEvidence,
} from "../evidence-review"

const origin = "Ingediend"
const score = 72

describe("evidence review decisions", () => {
  it("approves evidence without changing origin or score", () => {
    const plan = planEvidenceReview({
      status: "approved",
      actor_id: "user_admin",
      uploaded_by_customer_id: "seller_1",
    })
    const summary = summarizeProductEvidence({
      statuses: [plan.verification_status],
      score_qualifies: true,
      origin_status: origin,
      score,
    })
    expect(plan.verification_status).toBe("approved")
    expect(plan.verified_by).toBe("user_admin")
    expect(plan.field_code).toBe("compliance.approved")
    expect(plan.updates_origin).toBe(false)
    expect(plan.updates_score).toBe(false)
    expect(summary.origin_status).toBe(origin)
    expect(summary.score).toBe(score)
    expect(summary.is_made_in_europe_score).toBe(true)
    expect(summary.is_made_in_europe_verified).toBe(true)
  })

  it("rejects only with a reason", () => {
    expect(() =>
      planEvidenceReview({
        status: "rejected",
        actor_id: "user_admin",
        uploaded_by_customer_id: "seller_1",
      })
    ).toThrow(EvidenceReviewRejected)
    const plan = planEvidenceReview({
      status: "rejected",
      reason: "Document is onleesbaar",
      actor_id: "user_admin",
      uploaded_by_customer_id: "seller_1",
    })
    expect(plan.verification_status).toBe("rejected")
    expect(plan.verification_notes).toBe("Document is onleesbaar")
    expect(plan.updates_origin).toBe(false)
    expect(plan.updates_score).toBe(false)
  })

  it("requests more evidence only with an explanation", () => {
    expect(() =>
      planEvidenceReview({
        status: "needs_info",
        actor_id: "user_admin",
      })
    ).toThrow("toelichting")
    const plan = planEvidenceReview({
      status: "needs_info",
      reason: "Stuur de productiefactuur mee",
      actor_id: "user_admin",
      uploaded_by_customer_id: "seller_1",
    })
    const summary = summarizeProductEvidence({
      statuses: ["needs_info"],
      score_qualifies: true,
      origin_status: origin,
      score,
    })
    expect(plan.verification_status).toBe("needs_info")
    expect(plan.field_code).toBe("compliance.needs_info")
    expect(summary.evidence_status).toBe("needs_info")
    expect(summary.origin_status).toBe(origin)
    expect(summary.score).toBe(score)
    expect(summary.is_made_in_europe_verified).toBe(false)
  })

  it("blocks a seller and an anonymous actor", () => {
    expect(() =>
      planEvidenceReview({
        status: "approved",
        actor_id: "seller_1",
        uploaded_by_customer_id: "seller_1",
      })
    ).toThrow("seller mag eigen bewijs niet goedkeuren")
    expect(() =>
      planEvidenceReview({
        status: "approved",
        actor_id: "  ",
      })
    ).toThrow("bevoegde admin")
  })
})

describe("evidence review wiring", () => {
  const root = join(__dirname, "..", "..", "..", "..")

  it("keeps the queue and the product page on the same admin route", () => {
    const route = readFileSync(
      join(
        root,
        "src/api/admin/product-cloud/products/[id]/evidence/[evidenceId]/review/route.ts"
      ),
      "utf8"
    )
    const queue = readFileSync(
      join(root, "src/api/admin/product-cloud/compliance/evidence/route.ts"),
      "utf8"
    )
    const middlewares = readFileSync(join(root, "src/api/middlewares.ts"), "utf8")
    const adminPage = readFileSync(
      join(root, "..", "..", "apps/admin/app/(shell)/product-cloud/compliance/page.tsx"),
      "utf8"
    )
    const wizard = readFileSync(
      join(root, "..", "..", "apps/admin/components/product-cloud/admin-wizard-shell.tsx"),
      "utf8"
    )
    expect(route).toContain("planEvidenceReview")
    expect(route).toContain("createProductFieldChanges")
    expect(route).not.toContain("updateProductOrigins")
    expect(queue).toContain('status === "pending"')
    expect(queue).toContain('status === "needs_info"')
    expect(middlewares).toContain(
      'matcher: "/admin/product-cloud/products/:id/evidence/:evidenceId/review"'
    )
    expect(middlewares).toContain("adminAuth")
    expect(adminPage).toContain("reviewComplianceEvidence")
    expect(adminPage).toContain("needs_info")
    expect(wizard).toContain("reviewComplianceEvidence")
    expect(wizard).toContain("Aanvullend bewijs")
  })
})
