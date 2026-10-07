import {
  assertCanActivateEnrollment,
  assertEnrollmentGraph,
  assertHistoryVersion,
  assertNotSuppressed,
  isActiveEnrollmentStatus,
  isSendBlocked,
  matchExistingTrigger,
  normalizePreferenceEnabled,
  programTypeToPreferenceCategory,
} from "../participation-rules"

const graph = {
  program_id: "elpr_1",
  sequence_program_id: "elpr_1",
  sequence_id: "eseq_1",
  step_sequence_id: "eseq_1",
  contact_organization_id: "eorg_1",
  organization_id: "eorg_1",
}

describe("participation rules", () => {
  it("accepts an enrollment whose contact, program, sequence and step belong together", () => {
    expect(() => assertEnrollmentGraph(graph)).not.toThrow()
    expect(() =>
      assertEnrollmentGraph({ ...graph, step_sequence_id: "eseq_other" })
    ).toThrow(/SequenceStep/)
  })

  it("allows one active enrollment per contact and program type", () => {
    expect(() =>
      assertCanActivateEnrollment({
        programType: "newsletter",
        existingActiveProgramTypes: ["acquisition"],
      })
    ).not.toThrow()
    expect(() =>
      assertCanActivateEnrollment({
        programType: "acquisition",
        existingActiveProgramTypes: ["acquisition"],
      })
    ).toThrow(/program_type/)
  })

  it("rejects an active acquisition enrollment next to an active onboarding enrollment", () => {
    expect(() =>
      assertCanActivateEnrollment({
        programType: "onboarding",
        existingActiveProgramTypes: ["acquisition"],
      })
    ).toThrow(/acquisition/)
    expect(() =>
      assertCanActivateEnrollment({
        programType: "lifecycle",
        existingActiveProgramTypes: ["acquisition"],
      })
    ).not.toThrow()
  })

  it("does not treat human_follow_up, stopped, completed or suppressed as active", () => {
    for (const status of [
      "human_follow_up",
      "stopped",
      "completed",
      "suppressed",
    ]) {
      expect(isActiveEnrollmentStatus(status)).toBe(false)
    }
    expect(isActiveEnrollmentStatus("active")).toBe(true)
    expect(() =>
      assertCanActivateEnrollment({
        programType: "onboarding",
        existingActiveProgramTypes: [],
      })
    ).not.toThrow()
  })

  it("blocks participation and later sending when the category is suppressed", () => {
    expect(isSendBlocked(["acquisition"], "acquisition")).toBe(true)
    expect(isSendBlocked(["operational"], "acquisition")).toBe(false)
    expect(() =>
      assertNotSuppressed({
        category: "marketing",
        activeSuppressionCategories: ["marketing"],
      })
    ).toThrow(/Suppression/)
    expect(programTypeToPreferenceCategory("newsletter")).toBe("marketing")
    expect(programTypeToPreferenceCategory("onboarding")).toBe("operational")
  })

  it("enables and disables a preference without a separate unsubscribe table", () => {
    expect(normalizePreferenceEnabled(true)).toBe(true)
    expect(normalizePreferenceEnabled(false)).toBe(false)
    expect(() =>
      normalizePreferenceEnabled(undefined as unknown as boolean)
    ).toThrow(/enabled/)
  })

  it("stores the used template version on history and not on the step", () => {
    expect(
      assertHistoryVersion({
        status: "queued",
        template_version_id: "ctver_9",
        stepDefinesVersion: false,
      })
    ).toEqual({ status: "queued", template_version_id: "ctver_9" })
    expect(() =>
      assertHistoryVersion({
        status: "stopped",
        template_version_id: "ctver_9",
        stepDefinesVersion: true,
      })
    ).toThrow(/SequenceStep/)
  })

  it("returns the existing enrollment for the same trigger key", () => {
    const existing = [{ id: "eenr_1", trigger_key: "seller_onboarded:sel_1" }]
    expect(matchExistingTrigger(existing, "seller_onboarded:sel_1")).toEqual(
      existing[0]
    )
    expect(matchExistingTrigger(existing, "seller_onboarded:sel_2")).toBeNull()
    expect(() => matchExistingTrigger(existing, "  ")).toThrow(/trigger_key/)
  })
})
