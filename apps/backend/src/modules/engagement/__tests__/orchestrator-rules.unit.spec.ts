import { computeProductCompleteness } from "../../product-cloud/completeness"
import { readOrchestratorConfig } from "../orchestrator-config"
import {
  enrollConfiguredContact,
  enrollSellerMilestone,
  processOneDueEnrollment,
  type OrchestratorApi,
} from "../orchestrator-run"
import {
  accountCreatedCandidates,
  addDelayMinutes,
  firstProductCandidates,
  firstSaleCandidates,
  incompleteCandidates,
  isEnrollmentDue,
  onboardingSubmittedCandidates,
  pickFirstStep,
  pickSendableVersion,
  planDueStep,
  type DueEnrollmentState,
  type OrchestratorStep,
  type OrchestratorVersion,
} from "../orchestrator-rules"

const now = new Date("2026-10-06T10:00:00.000Z")

const steps: OrchestratorStep[] = [
  {
    id: "estp_2",
    sequence_id: "eseq_1",
    step_order: 2,
    delay_minutes: 60,
    template_id: "ctpl_1",
    variant_id: "ctvar_1",
  },
  {
    id: "estp_1",
    sequence_id: "eseq_1",
    step_order: 1,
    delay_minutes: 0,
    template_id: "ctpl_1",
    variant_id: "ctvar_1",
  },
]

const versions: OrchestratorVersion[] = [
  {
    id: "ctver_1",
    variant_id: "ctvar_1",
    version_number: 1,
    approval_status: "approved",
    activation_status: "active",
  },
  {
    id: "ctver_4",
    variant_id: "ctvar_1",
    version_number: 4,
    approval_status: "draft",
    activation_status: "inactive",
  },
  {
    id: "ctver_3",
    variant_id: "ctvar_1",
    version_number: 3,
    approval_status: "approved",
    activation_status: "active",
  },
]

function enrollment(patch: Partial<DueEnrollmentState> = {}): DueEnrollmentState {
  return {
    id: "eenr_1",
    status: "active",
    contact_id: "ectc_1",
    program_id: "elpr_1",
    program_type: "onboarding",
    sequence_id: "eseq_1",
    sequence_step_id: "estp_1",
    next_step_at: now,
    ...patch,
  }
}

describe("engagement orchestrator", () => {
  it("selects the lowest step order and applies delay_minutes", () => {
    expect(pickFirstStep(steps)?.id).toBe("estp_1")
    expect(addDelayMinutes(now, 0).toISOString()).toBe(now.toISOString())
    expect(addDelayMinutes(now, 90).toISOString()).toBe("2026-10-06T11:30:00.000Z")
    expect(
      isEnrollmentDue({ status: "active", next_step_at: now, now })
    ).toBe(true)
    expect(
      isEnrollmentDue({
        status: "active",
        next_step_at: addDelayMinutes(now, 90),
        now,
      })
    ).toBe(false)
  })

  it("does not process an enrollment that is not active or not due", () => {
    expect(
      planDueStep({
        enrollment: enrollment({ status: "human_follow_up" }),
        steps,
        versions,
        variantMatchesTemplate: true,
        suppressedCategories: [],
        priorStoppedForStep: false,
        now,
      }).action
    ).toBe("skip")
    const later = planDueStep({
      enrollment: enrollment({ next_step_at: addDelayMinutes(now, 90) }),
      steps,
      versions,
      variantMatchesTemplate: true,
      suppressedCategories: [],
      priorStoppedForStep: false,
      now,
    })
    expect(later).toEqual({ action: "skip", reason: "not-due" })
  })

  it("queues the highest approved and active version id", () => {
    expect(pickSendableVersion(versions, "ctvar_1")?.id).toBe("ctver_3")
    const plan = planDueStep({
      enrollment: enrollment(),
      steps,
      versions,
      variantMatchesTemplate: true,
      suppressedCategories: [],
      priorStoppedForStep: false,
      now,
    })
    expect(plan.action).toBe("queued")
    if (plan.action !== "queued") return
    expect(plan.event.status).toBe("queued")
    expect(plan.event.template_version_id).toBe("ctver_3")
    expect(plan.enrollment_update.sequence_step_id).toBe("estp_2")
    expect(plan.enrollment_update.next_step_at?.toISOString()).toBe(
      "2026-10-06T11:00:00.000Z"
    )
  })

  it("stops without another version when none is sendable", () => {
    const plan = planDueStep({
      enrollment: enrollment(),
      steps,
      versions: [versions[1]],
      variantMatchesTemplate: true,
      suppressedCategories: [],
      priorStoppedForStep: false,
      now,
    })
    expect(plan.action).toBe("stopped")
    if (plan.action !== "stopped") return
    expect(plan.reason).toBe("no_sendable_version")
    expect(plan.event.template_version_id).toBeNull()
    expect(plan.enrollment_update).toBeNull()
  })

  it("stops on suppression for the onboarding preference category and does not queue", () => {
    const plan = planDueStep({
      enrollment: enrollment(),
      steps,
      versions,
      variantMatchesTemplate: true,
      suppressedCategories: ["operational"],
      priorStoppedForStep: false,
      now,
    })
    expect(plan.action).toBe("stopped")
    if (plan.action !== "stopped") return
    expect(plan.reason).toBe("suppressed")
    expect(plan.event.status).toBe("stopped")
    expect(plan.enrollment_update?.status).toBe("suppressed")
  })

  it("completes the enrollment on the last step", () => {
    const plan = planDueStep({
      enrollment: enrollment({ sequence_step_id: "estp_2", next_step_at: now }),
      steps,
      versions,
      variantMatchesTemplate: true,
      suppressedCategories: [],
      priorStoppedForStep: false,
      now,
    })
    expect(plan.action).toBe("queued")
    if (plan.action !== "queued") return
    expect(plan.enrollment_update.status).toBe("completed")
    expect(plan.enrollment_update.next_step_at).toBeNull()
  })

  it("enrolls SellerOnboarded on the first step and skips a missing contact", async () => {
    const calls: { trigger_key: string; sequence_step_id: string; next_step_at?: Date | null }[] = []
    const api = {
      async enrollContact(input: {
        trigger_key: string
        sequence_step_id: string
        next_step_at?: Date | null
      }) {
        calls.push(input)
        return { id: "eenr_1" }
      },
      async listEngagementSequenceSteps() {
        return steps
      },
    } as unknown as OrchestratorApi
    const config = {
      onboarding: { program_id: "elpr_1", sequence_id: "eseq_1" },
    }
    const logs: string[] = []
    const enrolled = await enrollSellerMilestone({
      api,
      config,
      candidate: {
        seller_id: "sell_1",
        trigger_key: "seller_onboarded:sell_1",
        entry_source: "seller_onboarded",
        program_type: "onboarding",
      },
      seller: { id: "sell_1", customer_id: "cus_1" },
      organizations: [{ id: "eorg_1", converted_seller_id: "sell_1" }],
      contacts: [{ id: "ectc_1", organization_id: "eorg_1" }],
      now,
      log: (message) => logs.push(message),
    })
    expect(enrolled.enrolled).toBe(1)
    expect(calls[0].trigger_key).toBe("seller_onboarded:sell_1")
    expect(calls[0].sequence_step_id).toBe("estp_1")
    expect(calls[0].next_step_at?.toISOString()).toBe(now.toISOString())

    calls.length = 0
    const missing = await enrollSellerMilestone({
      api,
      config,
      candidate: {
        seller_id: "sell_1",
        trigger_key: "seller_onboarded:sell_1",
        entry_source: "seller_onboarded",
        program_type: "onboarding",
      },
      seller: { id: "sell_1", customer_id: "cus_1" },
      organizations: [{ id: "eorg_1", converted_seller_id: "sell_1" }],
      contacts: [],
      now,
      log: (message) => logs.push(message),
    })
    expect(missing.enrolled).toBe(0)
    expect(calls).toHaveLength(0)
    expect(logs.some((line) => line.includes("geen contact"))).toBe(true)
  })

  it("does not create a second enrollment for the same trigger or a second active onboarding", async () => {
    const rows: { id: string; contact_id: string; trigger_key: string }[] = []
    const api = {
      async enrollContact(input: { contact_id: string; trigger_key: string }) {
        const existing = rows.find(
          (row) =>
            row.contact_id === input.contact_id && row.trigger_key === input.trigger_key
        )
        if (existing) return existing
        if (rows.some((row) => row.contact_id === input.contact_id)) {
          throw new Error(
            "Een contact heeft maximaal één active enrollment per program_type."
          )
        }
        const created = { id: `eenr_${rows.length + 1}`, ...input }
        rows.push(created)
        return created
      },
      async listEngagementSequenceSteps() {
        return steps
      },
    } as unknown as OrchestratorApi
    const config = { onboarding: { program_id: "elpr_1", sequence_id: "eseq_1" } }
    const base = {
      api,
      config,
      seller: { id: "sell_1", customer_id: "cus_1" },
      organizations: [{ id: "eorg_1", converted_seller_id: "sell_1" }],
      contacts: [{ id: "ectc_1", organization_id: "eorg_1" }],
      now,
      log: () => undefined,
    }
    await enrollSellerMilestone({
      ...base,
      candidate: {
        seller_id: "sell_1",
        trigger_key: "seller_onboarded:sell_1",
        entry_source: "seller_onboarded",
        program_type: "onboarding",
      },
    })
    await enrollSellerMilestone({
      ...base,
      candidate: {
        seller_id: "sell_1",
        trigger_key: "seller_onboarded:sell_1",
        entry_source: "seller_onboarded",
        program_type: "onboarding",
      },
    })
    expect(rows).toHaveLength(1)
    const second = await enrollConfiguredContact({
      api,
      config,
      contactId: "ectc_1",
      programType: "onboarding",
      triggerKey: "onboarding_approved:sell_1",
      entrySource: "onboarding_approved",
      now,
      log: () => undefined,
    })
    expect(second.enrolled).toBe(false)
    expect(rows).toHaveLength(1)
  })

  it("does not enroll when the program configuration is missing", async () => {
    let called = false
    const api = {
      async enrollContact() {
        called = true
        return { id: "eenr_1" }
      },
    } as unknown as OrchestratorApi
    const result = await enrollConfiguredContact({
      api,
      config: readOrchestratorConfig({}),
      contactId: "ectc_1",
      programType: "onboarding",
      triggerKey: "account_created:sell_1",
      entrySource: "account_created",
      now,
      log: () => undefined,
    })
    expect(result.enrolled).toBe(false)
    expect(called).toBe(false)
  })

  it("derives first sale from seller orders and ignores rows without seller_id", () => {
    const sales = firstSaleCandidates([
      { id: "set_1", created_at: "2026-10-01T00:00:00.000Z" },
      {
        id: "mord_2",
        seller_id: "sell_1",
        created_at: "2026-10-03T00:00:00.000Z",
      },
      {
        id: "mord_1",
        seller_id: "sell_1",
        created_at: "2026-10-02T00:00:00.000Z",
      },
    ])
    expect(sales).toEqual([
      {
        seller_id: "sell_1",
        trigger_key: "first_sale:sell_1",
        entry_source: "first_sale",
        program_type: "onboarding",
      },
    ])
    expect(
      firstProductCandidates([
        {
          id: "pver_2",
          created_by_seller_id: "sell_1",
          created_at: "2026-10-02T00:00:00.000Z",
        },
        {
          id: "pver_1",
          created_by_seller_id: "sell_1",
          created_at: "2026-10-01T00:00:00.000Z",
        },
      ])
    ).toHaveLength(1)
  })

  it("keeps milestone triggers idempotent across a second job run", () => {
    const sellers = [{ id: "sell_1", onboarding_status: "Concept" }]
    const first = accountCreatedCandidates(sellers)
    const second = accountCreatedCandidates(sellers)
    expect(first.map((row) => row.trigger_key)).toEqual(second.map((row) => row.trigger_key))
    expect(onboardingSubmittedCandidates([
      { id: "sell_1", onboarding_status: "Ingediend" },
      { id: "sell_2", onboarding_status: "Goedgekeurd" },
    ])).toHaveLength(1)
  })

  it("marks only an insufficient completeness result as a product milestone", () => {
    const insufficient = computeProductCompleteness({
      basis: {
        title: "",
        brand_id: null,
        manufacturer_id: null,
        category_names: [],
        identifier_value: null,
        has_primary_image: false,
      },
      attributes: [],
    })
    const sufficient = computeProductCompleteness({
      basis: {
        title: "Robotmaaier X",
        brand_id: "brand_1",
        manufacturer_id: "mfr_1",
        category_names: ["Tuin"],
        identifier_value: "8720000000001",
        has_primary_image: true,
      },
      attributes: [],
    })
    expect(insufficient.information_quality).toBe("insufficient")
    expect(sufficient.information_quality).not.toBe("insufficient")
    expect(
      incompleteCandidates([
        {
          id: "pver_1",
          created_by_seller_id: "sell_1",
          information_quality: insufficient.information_quality,
        },
        {
          id: "pver_2",
          created_by_seller_id: "sell_1",
          information_quality: sufficient.information_quality,
        },
      ]).map((row) => row.trigger_key)
    ).toEqual(["product_incomplete:pver_1"])
  })

  it("records a queued history row with the chosen version and does not send", async () => {
    const events: { status: string; template_version_id?: string | null }[] = []
    const updates: { status?: string; next_step_at?: Date | null }[] = []
    const api = {
      async retrieveEngagementEnrollment() {
        return enrollment()
      },
      async listEngagementSequenceSteps() {
        return steps
      },
      async retrieveCommunicationTemplateVariant() {
        return { id: "ctvar_1", template_id: "ctpl_1" }
      },
      async listCommunicationTemplateVersions() {
        return versions
      },
      async listEngagementSuppressions() {
        return []
      },
      async listEngagementCommunicationEvents() {
        return []
      },
      async recordCommunicationEvent(input: {
        status: string
        template_version_id?: string | null
      }) {
        events.push(input)
      },
      async updateEnrollment(input: { status?: string; next_step_at?: Date | null }) {
        updates.push(input)
      },
    } as unknown as OrchestratorApi
    const result = await processOneDueEnrollment(api, "eenr_1", now)
    expect(result.action).toBe("queued")
    expect(events).toEqual([
      expect.objectContaining({ status: "queued", template_version_id: "ctver_3" }),
    ])
    expect(events.some((event) => event.status === "sent")).toBe(false)
    expect(updates[0].status).toBe("active")
  })

  it("queues the locale variant and stores that language", async () => {
    const events: { variant_id?: string; template_version_id?: string | null; locale?: string | null; status: string }[] = []
    const api = {
      async retrieveEngagementEnrollment() {
        return enrollment()
      },
      async listEngagementSequenceSteps() {
        return steps
      },
      async listCommunicationTemplateVariants() {
        return [
          { id: "ctvar_1", locale: "nl", template_id: "ctpl_1" },
          { id: "ctvar_en", locale: "en", template_id: "ctpl_1" },
        ]
      },
      async retrieveCommunicationTemplateVariant(id: string) {
        return { id, template_id: "ctpl_1" }
      },
      async listCommunicationTemplateVersions(filters: { variant_id: string }) {
        if (filters.variant_id === "ctvar_en") {
          return [
            {
              id: "ctver_en",
              variant_id: "ctvar_en",
              version_number: 1,
              approval_status: "approved",
              activation_status: "active",
            },
          ]
        }
        return versions
      },
      async listEngagementSuppressions() {
        return []
      },
      async listEngagementCommunicationEvents() {
        return []
      },
      async recordCommunicationEvent(input: {
        variant_id?: string
        template_version_id?: string | null
        locale?: string | null
        status: string
      }) {
        events.push(input)
      },
      async updateEnrollment() {
        return undefined
      },
    } as unknown as OrchestratorApi
    const result = await processOneDueEnrollment(api, "eenr_1", now, "en")
    expect(result.action).toBe("queued")
    expect(events[0]).toEqual(
      expect.objectContaining({
        status: "queued",
        variant_id: "ctvar_en",
        template_version_id: "ctver_en",
        locale: "en",
      })
    )
  })
})
