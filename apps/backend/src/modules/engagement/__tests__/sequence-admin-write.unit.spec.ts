import {
  assertNoStepContent,
  assertStepDeletable,
  assertTemplateMatchesProgram,
  assertUniqueStepOrder,
  assertVariantBelongsToTemplate,
  normalizeDelayMinutes,
  normalizeProgramType,
  normalizeStepOrder,
} from "../sequence-rules"

describe("sequence admin write", () => {
  it("maakt en bewerkt alleen een toegestaan program_type", () => {
    expect(normalizeProgramType(" lifecycle ")).toBe("lifecycle")
    expect(() => normalizeProgramType("growth")).toThrow(/lifecycle/)
    expect(() => normalizeProgramType("marketing")).toThrow(/program_type/)
  })

  it("weigert een template die niet bij het program_type hoort", () => {
    expect(() =>
      assertTemplateMatchesProgram({
        program_type: "onboarding",
        communication_type: "acquisition",
      })
    ).toThrow(/program_type/)
    expect(() =>
      assertTemplateMatchesProgram({
        program_type: "onboarding",
        communication_type: "onboarding",
      })
    ).not.toThrow()
  })

  it("weigert een variant die niet bij de template hoort", () => {
    expect(() =>
      assertVariantBelongsToTemplate({
        template_id: "ctpl_a",
        variant_template_id: "ctpl_b",
      })
    ).toThrow(/TemplateVariant/)
  })

  it("weigert een dubbele step_order en een negatieve delay", () => {
    expect(normalizeStepOrder(2)).toBe(2)
    expect(() => assertUniqueStepOrder([1, 2], 2)).toThrow(/step_order 2/)
    expect(normalizeDelayMinutes(0)).toBe(0)
    expect(() => normalizeDelayMinutes(-1)).toThrow(/delay_minutes/)
  })

  it("weigert version of tekst op een SequenceStep", () => {
    expect(() => assertNoStepContent({ template_version_id: "ctver_1" })).toThrow(
      /version/
    )
    expect(() => assertNoStepContent({ body: "tekst" })).toThrow(/inhoud/)
    expect(() =>
      assertNoStepContent({ step_order: 1, template_id: "ctpl_a" })
    ).not.toThrow()
  })

  it("verwijdert een step alleen als geen enrollment ernaar verwijst", () => {
    expect(() => assertStepDeletable(false)).not.toThrow()
    expect(() => assertStepDeletable(true)).toThrow(/enrollment/)
  })
})
