import {
  buildDocumentInputs,
  filePrecheck,
  summarizeEvidenceKind,
} from "../compliance-gates"
import { computeProductCompleteness } from "../completeness"

describe("compliance gates", () => {
  it("never auto-approves on upload — pending stays pending", () => {
    const doc = summarizeEvidenceKind(
      [
        {
          evidence_kind: "made_in_europe",
          verification_status: "pending",
          verification_result: "PASS",
        },
      ],
      "made_in_europe",
      true,
      "Made in Europe-bewijs"
    )
    expect(doc.status).toBe("pending_review")
    expect(doc.present).toBe(true)
  })

  it("allows multiple MiE evidence files and stays pending until one is approved", () => {
    const doc = summarizeEvidenceKind(
      [
        {
          evidence_kind: "made_in_europe",
          verification_status: "pending",
        },
        {
          evidence_kind: "made_in_europe",
          verification_status: "pending_review",
        },
      ],
      "made_in_europe",
      true,
      "Made in Europe-bewijs"
    )
    expect(doc.present).toBe(true)
    expect(doc.status).toBe("pending_review")
  })

  it("treats approved evidence as approved even when extra pending files exist", () => {
    const doc = summarizeEvidenceKind(
      [
        {
          evidence_kind: "made_in_europe",
          verification_status: "approved",
        },
        {
          evidence_kind: "made_in_europe",
          verification_status: "pending",
        },
      ],
      "made_in_europe",
      true,
      "Made in Europe-bewijs"
    )
    expect(doc.status).toBe("approved")
  })

  it("blocks publish when MiE claimed but evidence missing", () => {
    const report = computeProductCompleteness({
      basis: {
        title: "Robot",
        brand_id: "b1",
        manufacturer_id: "m1",
        category_names: ["Robotstofzuiger"],
        identifier_value: "8720000000001",
        has_primary_image: true,
      },
      attributes: [
        {
          code: "ce_marking",
          name: "CE",
          tier: "compliance_required",
          value: "Zichtbaar",
        },
      ],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: true,
        sales_status: "active",
        is_sellable: true,
      },
      rules: { mie_claimed: true, ce_required_for_category: true },
      documents: buildDocumentInputs({
        mieClaimed: true,
        ceValue: "Zichtbaar",
        collectsData: "Nee",
        ceRequiredForCategory: true,
        evidence: [],
      }),
    })
    expect(report.publishable).toBe(false)
    expect(report.sale_presentation).toBe("blocked")
    expect(report.compliance_review_status).toBe("missing")
  })

  it("blocks publish when evidence pending review", () => {
    const report = computeProductCompleteness({
      basis: {
        title: "Robot",
        brand_id: "b1",
        manufacturer_id: "m1",
        category_names: ["Robotstofzuiger"],
        identifier_value: "8720000000001",
        has_primary_image: true,
      },
      attributes: [],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: true,
      },
      rules: { mie_claimed: true },
      documents: buildDocumentInputs({
        mieClaimed: true,
        ceValue: null,
        collectsData: null,
        ceRequiredForCategory: false,
        evidence: [
          {
            evidence_kind: "made_in_europe",
            verification_status: "pending",
            verification_result: "PASS",
          },
        ],
      }),
    })
    expect(report.publishable).toBe(false)
    expect(report.compliance_review_status).toBe("pending_review")
  })

  it("allows publish when required docs approved", () => {
    const report = computeProductCompleteness({
      basis: {
        title: "Robot",
        brand_id: "b1",
        manufacturer_id: "m1",
        category_names: ["Robotstofzuiger"],
        identifier_value: "8720000000001",
        has_primary_image: true,
      },
      attributes: [
        {
          code: "ce_marking",
          name: "CE",
          tier: "compliance_required",
          value: "Niet van toepassing",
        },
      ],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: true,
        sales_status: "active",
        is_sellable: true,
      },
      rules: { mie_claimed: true, publication_status: "Gepubliceerd" },
      documents: buildDocumentInputs({
        mieClaimed: true,
        ceValue: "Niet van toepassing",
        collectsData: "Nee",
        ceRequiredForCategory: true,
        evidence: [
          {
            evidence_kind: "made_in_europe",
            verification_status: "approved",
          },
        ],
      }),
    })
    expect(report.publishable).toBe(true)
    expect(report.sale_presentation).toBe("for_sale")
  })

  it("file precheck returns PASS/WARNING/FAIL without AI", () => {
    expect(
      filePrecheck({
        storage_reference: "https://cdn.example/a.jpg",
        mime_type: "image/jpeg",
        file_size_bytes: 5000,
        kind: "ce_marking",
      }).result
    ).toBe("PASS")
    expect(
      filePrecheck({
        storage_reference: "",
        kind: "data_usage",
      }).result
    ).toBe("FAIL")
  })

  it("does not require data document when collects_data is empty", () => {
    const docs = buildDocumentInputs({
      mieClaimed: false,
      ceValue: "Niet van toepassing",
      collectsData: null,
      ceRequiredForCategory: false,
      evidence: [],
    })
    expect(docs.some((d) => d.code === "doc.data_usage")).toBe(false)
  })

  it("does not require data document when collects_data is Nee", () => {
    const docs = buildDocumentInputs({
      mieClaimed: false,
      ceValue: "Niet van toepassing",
      collectsData: "Nee",
      ceRequiredForCategory: false,
      evidence: [
        {
          evidence_kind: "data_usage",
          verification_status: "pending",
        },
      ],
    })
    expect(docs.some((d) => d.code === "doc.data_usage" && d.required)).toBe(
      false
    )
  })

  it("requires data document when collects_data is Ja", () => {
    const docs = buildDocumentInputs({
      mieClaimed: false,
      ceValue: "Niet van toepassing",
      collectsData: "Ja",
      ceRequiredForCategory: false,
      evidence: [],
    })
    const data = docs.find((d) => d.code === "doc.data_usage")
    expect(data?.required).toBe(true)
    expect(data?.status).toBe("missing")
  })

  it("does not require CE evidence when marking is Niet van toepassing", () => {
    const docs = buildDocumentInputs({
      mieClaimed: false,
      ceValue: "Niet van toepassing",
      collectsData: "Nee",
      ceRequiredForCategory: true,
      evidence: [],
    })
    expect(docs.some((d) => d.code === "doc.ce_marking" && d.required)).toBe(
      false
    )
  })

  it("requires CE evidence when marking is Zichtbaar", () => {
    const docs = buildDocumentInputs({
      mieClaimed: false,
      ceValue: "Zichtbaar",
      collectsData: "Nee",
      ceRequiredForCategory: true,
      evidence: [],
    })
    const ce = docs.find((d) => d.code === "doc.ce_marking")
    expect(ce?.required).toBe(true)
  })

  it("lets one production document cover both Made in Europe and CE", () => {
    const shared = [
      {
        evidence_kind: "made_in_europe" as const,
        verification_status: "pending",
        storage_reference: "https://example.com/label.jpg",
        mime_type: "image/jpeg",
      },
    ]
    const docs = buildDocumentInputs({
      mieClaimed: true,
      ceValue: "Zichtbaar",
      collectsData: "Nee",
      ceRequiredForCategory: true,
      evidence: shared,
    })
    expect(docs.find((d) => d.code === "doc.made_in_europe")?.present).toBe(true)
    expect(docs.find((d) => d.code === "doc.ce_marking")?.present).toBe(true)
    expect(docs.find((d) => d.code === "doc.ce_marking")?.status).toBe(
      "pending_review"
    )
  })

  it("does not treat a Made in Europe photo as a data-usage document", () => {
    const docs = buildDocumentInputs({
      mieClaimed: true,
      ceValue: "Niet van toepassing",
      collectsData: "Ja",
      ceRequiredForCategory: false,
      evidence: [
        {
          evidence_kind: "made_in_europe",
          verification_status: "pending",
          mime_type: "image/jpeg",
        },
      ],
    })
    expect(docs.find((d) => d.code === "doc.data_usage")?.present).toBe(false)
    expect(docs.find((d) => d.code === "doc.data_usage")?.status).toBe("missing")
  })
})
