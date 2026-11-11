import {
  computeProductCompleteness,
  currentValidation,
  historicalImportNotes,
} from "../completeness"

describe("Product completeness — optional must not block publishability", () => {
  it("is publishable when basis + required + compliance + offer gates are filled, even if optional empty", () => {
    const report = computeProductCompleteness({
      basis: {
        title: "Robotmaaier X",
        brand_id: "brand_1",
        manufacturer_id: "mfr_1",
        category_names: ["Tuin"],
        identifier_value: "8720000000001",
        has_primary_image: true,
      },
      attributes: [
        {
          code: "vermogen",
          name: "Vermogen",
          tier: "category_required",
          value: "100W",
        },
        {
          code: "gpsr_manual",
          name: "GPSR handleiding",
          tier: "compliance_required",
          value: "yes",
        },
        {
          code: "color_accent",
          name: "Accentkleur",
          tier: "optional",
          value: null,
        },
        {
          code: "warranty_extra",
          name: "Extra garantie",
          tier: "recommended",
          value: null,
        },
      ],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: true,
      },
    })

    expect(report.publishable).toBe(true)
    expect(report.information_quality).toBe("sufficient")
    expect(report.missing_required).toEqual([])
    expect(
      report.sections.find((s) => s.key === "optional")?.fields.some(
        (f) => f.code === "color_accent" && !f.filled
      )
    ).toBe(true)
  })

  it("is not publishable when a required attribute is missing", () => {
    const report = computeProductCompleteness({
      basis: {
        title: "Robotmaaier X",
        brand_id: "brand_1",
        manufacturer_id: "mfr_1",
        category_names: ["Tuin"],
        identifier_value: "8720000000001",
        has_primary_image: true,
      },
      attributes: [
        {
          code: "vermogen",
          name: "Vermogen",
          tier: "category_required",
          value: null,
        },
      ],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: true,
      },
    })
    expect(report.publishable).toBe(false)
    expect(report.information_quality).toBe("insufficient")
    expect(report.missing_required.some((m) => m.code === "vermogen")).toBe(
      true
    )
  })

  it("does not block publishability when gpsr_safety_warnings is empty", () => {
    const report = computeProductCompleteness({
      basis: {
        title: "Boormachine",
        brand_id: "brand_1",
        manufacturer_id: "mfr_1",
        category_names: ["Gereedschap"],
        identifier_value: "8720000000099",
        has_primary_image: true,
      },
      attributes: [
        {
          code: "gpsr_safety_warnings",
          name: "Veiligheidswaarschuwingen",
          tier: "optional",
          value: null,
        },
        {
          code: "gpsr_manual",
          name: "GPSR handleiding",
          tier: "compliance_required",
          value: "yes",
        },
      ],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: true,
        has_shipping_profile: true,
      },
    })
    expect(report.publishable).toBe(true)
    expect(
      report.publication_blocked_reasons.some((r) =>
        r.toLowerCase().includes("veiligheid")
      )
    ).toBe(false)
  })

  it("marks complete when required + recommended + optional are filled", () => {
    const report = computeProductCompleteness({
      basis: {
        title: "Robotmaaier X",
        brand_id: "brand_1",
        manufacturer_id: "mfr_1",
        category_names: ["Tuin"],
        identifier_value: "8720000000001",
        has_primary_image: true,
      },
      attributes: [
        {
          code: "vermogen",
          name: "Vermogen",
          tier: "category_required",
          value: "100W",
        },
        {
          code: "extra",
          name: "Extra",
          tier: "optional",
          value: "yes",
        },
      ],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: true,
      },
    })
    expect(report.information_quality).toBe("complete")
    expect(report.publishable).toBe(true)
  })

  it("requires a manufacturer / verantwoordelijke fabrikant for publication", () => {
    const report = computeProductCompleteness({
      basis: {
        title: "Robotmaaier X",
        brand_id: "brand_1",
        manufacturer_id: null,
        category_names: ["Tuin"],
        identifier_value: "8720000000001",
        has_primary_image: true,
      },
      attributes: [
        {
          code: "vermogen",
          name: "Vermogen",
          tier: "category_required",
          value: "100W",
        },
      ],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: true,
      },
    })
    expect(report.publishable).toBe(false)
    expect(
      report.missing_required.some((m) => m.code === "manufacturer_id")
    ).toBe(true)
  })

  it("does not treat EU-responsible fields as missing when marked not applicable", () => {
    const report = computeProductCompleteness({
      basis: {
        title: "Robotmaaier X",
        brand_id: "brand_1",
        manufacturer_id: "mfr_1",
        category_names: ["Tuin"],
        identifier_value: "8720000000001",
        has_primary_image: true,
      },
      attributes: [
        {
          code: "ce_marking",
          name: "CE-markering",
          tier: "compliance_required",
          value: "Niet van toepassing",
        },
        {
          code: "gpsr_eu_responsible_name",
          name: "EU verantwoordelijke persoon / economic operator",
          tier: "not_applicable",
          value: null,
        },
        {
          code: "gpsr_eu_responsible_address",
          name: "EU verantwoordelijke — adres",
          tier: "not_applicable",
          value: null,
        },
      ],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: true,
      },
    })
    expect(
      report.missing_required.some((m) =>
        m.code.startsWith("gpsr_eu_responsible")
      )
    ).toBe(false)
    expect(report.publishable).toBe(true)
  })

  it("does not treat a DRAFT concept identifier or MPN as a filled EAN", () => {
    const draft = computeProductCompleteness({
      basis: {
        title: "Concept",
        brand_id: "brand_1",
        manufacturer_id: "mfr_1",
        category_names: ["Huishouden"],
        identifier_value: "DRAFT-ABCDEF",
        has_primary_image: true,
      },
      attributes: [],
    })
    expect(draft.missing_required.some((m) => m.code === "ean")).toBe(true)

    const mpnOnly = computeProductCompleteness({
      basis: {
        title: "Concept",
        brand_id: "brand_1",
        manufacturer_id: "mfr_1",
        category_names: ["Huishouden"],
        identifier_value: "SMD8TCX04E",
        has_primary_image: true,
      },
      attributes: [],
    })
    expect(mpnOnly.missing_required.some((m) => m.code === "ean")).toBe(true)
  })
})

describe("central product validation", () => {
  const basis = {
    title: "Robotmaaier X",
    brand_id: "brand_1",
    manufacturer_id: "mfr_1",
    category_names: ["Tuin"],
    identifier_value: "DRAFT-ABCDEF",
    has_primary_image: true,
  }

  it("shows GTIN, delivery time and shipping profile together", () => {
    const report = computeProductCompleteness({
      basis,
      attributes: [],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: false,
        has_shipping_profile: false,
      },
    })
    const codes = report.findings.map((finding) => finding.code)
    expect(codes).toEqual(expect.arrayContaining(["ean", "delivery", "shipping_profile"]))
    const ean = report.findings.find((finding) => finding.code === "ean")
    const delivery = report.findings.find((finding) => finding.code === "delivery")
    expect(ean?.blocks).toEqual(["submission", "approval", "publication"])
    expect(ean?.action).toContain("EAN/GTIN")
    expect(delivery?.blocks).toEqual(["sale"])
    expect(delivery?.category).toBe("sale")
    expect(report.findings.find((finding) => finding.code === "shipping_profile")?.blocks).toEqual([
      "sale",
    ])
    expect(report.publication_blocked_reasons).not.toContain("Verzendprofiel koppelen")
    expect(report.sale_blocked_reasons).toContain("Verzendprofiel koppelen")
  })

  it("stays publishable without a shipping profile or manual language", () => {
    const report = computeProductCompleteness({
      basis: { ...basis, identifier_value: "8720000000001" },
      attributes: [
        {
          code: "manual_languages",
          name: "Taal handleiding",
          tier: "optional",
          value: null,
        },
      ],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: true,
        has_shipping_profile: false,
      },
    })
    expect(report.publishable).toBe(true)
    expect(report.publication_blocked_reasons).not.toContain("Verzendprofiel koppelen")
    expect(report.missing_required.some((field) => field.code === "manual_languages")).toBe(
      false
    )
    expect(report.findings.find((finding) => finding.code === "shipping_profile")?.blocks).toEqual([
      "sale",
    ])
  })

  it("removes only the solved finding and keeps the import note as history", () => {
    const notes = historicalImportNotes([
      {
        id: "note_ean",
        field_code: "import.issue.ean",
        field_label: "EAN",
        new_value: "geen",
        reason: "missing | EAN ontbreekt",
      },
    ])
    const open = computeProductCompleteness({
      basis,
      attributes: [],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: false,
        has_shipping_profile: false,
      },
    })
    const fixed = computeProductCompleteness({
      basis: { ...basis, identifier_value: "8720000000001" },
      attributes: [],
      offer: {
        has_offer: true,
        has_price: true,
        has_stock_configured: true,
        has_delivery: false,
        has_shipping_profile: false,
      },
    })
    const current = currentValidation(fixed.findings, notes)
    expect(open.findings.some((finding) => finding.code === "ean")).toBe(true)
    expect(current.current.some((finding) => finding.code === "ean")).toBe(false)
    expect(current.current.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["delivery", "shipping_profile"])
    )
    expect(current.history).toEqual(notes)
    expect(current.history).toHaveLength(1)
    expect(current.current.some((finding) => finding.code.startsWith("import.issue."))).toBe(
      false
    )
  })

  it("does not turn a sale gap into an approval or publication blocker", () => {
    const report = computeProductCompleteness({
      basis: { ...basis, identifier_value: "8720000000001" },
      attributes: [],
      offer: {
        has_offer: false,
        has_price: false,
        has_stock_configured: false,
        has_delivery: false,
      },
      rules: { publication_status: "Gepubliceerd" },
    })
    expect(report.product_gate_status).toBe("published")
    expect(report.findings.every((finding) => finding.category === "sale")).toBe(true)
    expect(
      report.findings.some((finding) =>
        finding.blocks.some((gate) => gate === "approval" || gate === "publication")
      )
    ).toBe(false)
  })
})
