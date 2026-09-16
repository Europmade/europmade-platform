import {
  resolveProductActions,
  resolveWorkflowStatus,
} from "../workflow-status"

const complete = {
  publishable: true,
  information_quality: "complete" as const,
  compliance_review_status: "approved" as const,
}

const incomplete = {
  publishable: false,
  information_quality: "insufficient" as const,
  compliance_review_status: "missing" as const,
}

describe("product approval workflow status", () => {
  it("keeps pending_admin_approval distinct from evidence review", () => {
    expect(
      resolveWorkflowStatus({
        publication_status: "In review",
        completeness: {
          ...complete,
          compliance_review_status: "pending_review",
        },
      })
    ).toBe("pending_admin_approval")
    expect(
      resolveWorkflowStatus({
        publication_status: "Concept",
        completeness: {
          ...incomplete,
          compliance_review_status: "pending_review",
        },
      })
    ).toBe("pending_evidence_review")
  })

  it("does not call unpublished products published", () => {
    expect(
      resolveWorkflowStatus({
        publication_status: "Concept",
        completeness: complete,
      })
    ).toBe("complete")
    expect(
      resolveWorkflowStatus({
        publication_status: "Gepubliceerd",
        completeness: complete,
      })
    ).toBe("published")
  })

  it("stores rejection as rejected until resubmit", () => {
    expect(
      resolveWorkflowStatus({
        publication_status: "Concept",
        approval_rejection_reason: "Ontbrekende specificaties",
        completeness: complete,
      })
    ).toBe("rejected")
  })

  it("maps admin_review_outcome needs_info to needs_information", () => {
    expect(
      resolveWorkflowStatus({
        publication_status: "Concept",
        admin_review_outcome: "needs_info",
        approval_rejection_reason: "MiE aanvullen",
        completeness: {
          ...incomplete,
          compliance_review_status: "pending_review",
        },
      })
    ).toBe("needs_information")
  })
})

describe("product approval actions", () => {
  const offer = { has_offer: true, sales_status: "active" as const }

  it("lets a seller submit a publishable product, never self-publish", () => {
    const actions = resolveProductActions({
      publication_status: "Concept",
      lifecycle_status: "Actief",
      offer,
      completeness: { publishable: true },
    })
    expect(actions.submit_for_approval).toBe(true)
    expect(actions.publish).toBe(false)
  })

  it("blocks submit when the product is incomplete", () => {
    const actions = resolveProductActions({
      publication_status: "Concept",
      lifecycle_status: "Actief",
      offer,
      completeness: { publishable: false },
    })
    expect(actions.submit_for_approval).toBe(false)
    expect(actions.publish).toBe(false)
  })

  it("hides submit while already waiting for admin approval", () => {
    const actions = resolveProductActions({
      publication_status: "In review",
      lifecycle_status: "Actief",
      offer,
      completeness: { publishable: true },
    })
    expect(actions.submit_for_approval).toBe(false)
    expect(actions.publish).toBe(false)
  })
})
