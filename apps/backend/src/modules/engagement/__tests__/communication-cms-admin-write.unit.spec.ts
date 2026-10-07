import {
  approvalAudit,
  assertCreatedVersionStatus,
  assertVariantNameAvailable,
  isSendableVersion,
  normalizeTemplateIdentity,
  normalizeVariantIdentity,
  planVersionActivation,
  planVersionApproval,
  planVersionDeactivation,
  refuseVersionContentChange,
} from "../communication-cms-rules"
import { assertVariantBelongsToTemplate } from "../sequence-rules"

const draft = {
  used_at: null,
  approval_status: "draft",
  activation_status: "inactive",
  approved_at: null,
  approved_by: null,
}

describe("communication CMS admin write", () => {
  it("maakt een template met een toegestaan communication_type", () => {
    expect(
      normalizeTemplateIdentity({
        name: "  Welkom  ",
        communication_type: "onboarding",
      })
    ).toEqual({ name: "Welkom", communication_type: "onboarding" })
  })

  it("weigert een ongeldig communication_type", () => {
    expect(() =>
      normalizeTemplateIdentity({ name: "Welkom", communication_type: "growth" })
    ).toThrow(/Onbekend communication_type/)
    expect(() =>
      normalizeTemplateIdentity({ name: "Welkom", communication_type: "DTC" })
    ).toThrow(/Onbekend communication_type/)
  })

  it("maakt een variant bij een template en bewaakt de unieke naam", () => {
    expect(
      normalizeVariantIdentity({ name: " Kort ", locale: "NL" })
    ).toEqual({ name: "Kort", locale: "nl" })
    expect(() => assertVariantNameAvailable(["Kort"], "Kort")).toThrow(
      /bestaat al/
    )
    expect(() => assertVariantNameAvailable(["Lang"], "Kort")).not.toThrow()
  })

  it("valideert dat een variant bij de gekozen template hoort", () => {
    expect(() =>
      assertVariantBelongsToTemplate({
        template_id: "ctpl_a",
        variant_template_id: "ctpl_b",
      })
    ).toThrow(/hoort niet bij/)
    expect(() =>
      assertVariantBelongsToTemplate({
        template_id: "ctpl_a",
        variant_template_id: "ctpl_a",
      })
    ).not.toThrow()
  })

  it("maakt een version altijd als draft en inactive", () => {
    expect(assertCreatedVersionStatus({})).toEqual({
      approval_status: "draft",
      activation_status: "inactive",
    })
    expect(() =>
      assertCreatedVersionStatus({
        approval_status: "approved",
        activation_status: "active",
      })
    ).toThrow(/draft en inactive/)
  })

  it("activeert alleen een approved version", () => {
    expect(
      planVersionActivation({
        ...draft,
        approval_status: "approved",
      })
    ).toEqual({
      approval_status: "approved",
      activation_status: "active",
    })
    expect(
      isSendableVersion(
        planVersionActivation({ ...draft, approval_status: "approved" })
      )
    ).toBe(true)
  })

  it("weigert een draft te activeren", () => {
    expect(() => planVersionActivation(draft)).toThrow(/approved/)
  })

  it("keurt een draft goed en zet approved_at en approved_by", () => {
    const next = planVersionApproval(draft)
    const now = new Date("2026-10-06T12:00:00.000Z")
    expect(next.approval_status).toBe("approved")
    expect(next.activation_status).toBe("inactive")
    expect(approvalAudit(draft, next, " user_1 ", now)).toEqual({
      approved_at: now,
      approved_by: "user_1",
    })
  })

  it("zet een actieve version weer inactive zonder de approval te wissen", () => {
    const current = {
      ...draft,
      approval_status: "approved",
      activation_status: "active",
      approved_at: "2026-10-01T00:00:00.000Z",
      approved_by: "user_1",
    }
    const next = planVersionDeactivation(current)
    expect(next).toEqual({
      approval_status: "approved",
      activation_status: "inactive",
    })
    expect(
      approvalAudit(current, next, "user_2", new Date()).approved_by
    ).toBe("user_1")
  })

  it("weigert inhoud en status van een gebruikte version", () => {
    const used = { ...draft, used_at: "2026-10-02T00:00:00.000Z" }
    expect(() => refuseVersionContentChange(used, { subject: "Nieuw" })).toThrow(
      /onwijzigbaar/
    )
    expect(() => planVersionDeactivation(used)).toThrow(/onwijzigbaar/)
  })

  it("staat een inhoudswijziging toe op een ongebruikt concept", () => {
    expect(() =>
      refuseVersionContentChange(draft, { body: "Andere tekst" })
    ).not.toThrow()
  })

  it("weigert een inhoudswijziging van een goedgekeurde of actieve versie", () => {
    expect(() =>
      refuseVersionContentChange(
        { ...draft, approval_status: "approved" },
        { body: "Andere tekst" }
      )
    ).toThrow(/kan niet worden gewijzigd/)
    expect(() =>
      refuseVersionContentChange(
        {
          ...draft,
          approval_status: "approved",
          activation_status: "active",
        },
        { subject: "Nieuw" }
      )
    ).toThrow(/kan niet worden gewijzigd/)
  })

  it("laat bestaande sendable-regel gelden: alleen approved en active", () => {
    expect(
      isSendableVersion({
        approval_status: "approved",
        activation_status: "active",
      })
    ).toBe(true)
    expect(
      isSendableVersion({
        approval_status: "approved",
        activation_status: "inactive",
      })
    ).toBe(false)
  })
})
