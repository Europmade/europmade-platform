import { COMMUNICATION_TYPES } from "../communication-cms-rules"
import {
  PROGRAM_TYPES,
  assertStepOrderSet,
  assertTemplateMatchesProgram,
  assertUniqueStepOrder,
  assertVariantBelongsToTemplate,
  normalizeDelayMinutes,
  normalizeProgramType,
  normalizeStepOrder,
} from "../sequence-rules"

describe("sequence definition rules", () => {
  it("uses the locked program types and treats growth as lifecycle", () => {
    expect(PROGRAM_TYPES).toEqual(COMMUNICATION_TYPES)
    expect(normalizeProgramType("lifecycle")).toBe("lifecycle")
    expect(normalizeProgramType(" operational ")).toBe("operational")
    expect(() => normalizeProgramType("growth")).toThrow(/lifecycle/)
    expect(() => normalizeProgramType("marketing")).toThrow(/program_type/)
  })

  it("requires a positive integer step order and a non-negative delay", () => {
    expect(normalizeStepOrder(1)).toBe(1)
    expect(normalizeDelayMinutes(0)).toBe(0)
    expect(normalizeDelayMinutes(1440)).toBe(1440)
    expect(() => normalizeStepOrder(0)).toThrow(/step_order/)
    expect(() => normalizeStepOrder(1.5)).toThrow(/step_order/)
    expect(() => normalizeDelayMinutes(-1)).toThrow(/delay_minutes/)
  })

  it("rejects a duplicate step order in the same sequence", () => {
    expect(() => assertUniqueStepOrder([1, 3], 2)).not.toThrow()
    expect(() => assertUniqueStepOrder([1, 2], 2)).toThrow(/step_order 2/)
    expect(() => assertStepOrderSet([2, 1, 3])).not.toThrow()
    expect(() => assertStepOrderSet([1, 1])).toThrow(/dubbel/)
  })

  it("requires the variant to belong to the chosen template", () => {
    expect(() =>
      assertVariantBelongsToTemplate({
        template_id: "ctpl_a",
        variant_template_id: "ctpl_a",
      })
    ).not.toThrow()
    expect(() =>
      assertVariantBelongsToTemplate({
        template_id: "ctpl_a",
        variant_template_id: "ctpl_b",
      })
    ).toThrow(/TemplateVariant/)
  })

  it("requires the template program type to match the lifecycle program", () => {
    expect(() =>
      assertTemplateMatchesProgram({
        program_type: "acquisition",
        communication_type: "acquisition",
      })
    ).not.toThrow()
    expect(() =>
      assertTemplateMatchesProgram({
        program_type: "onboarding",
        communication_type: "acquisition",
      })
    ).toThrow(/program_type/)
  })
})
