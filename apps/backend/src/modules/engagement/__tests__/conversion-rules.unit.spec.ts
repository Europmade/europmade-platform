import { MedusaError } from "@medusajs/framework/utils"
import { assertCanActivateEnrollment } from "../participation-rules"
import {
  planConversionEnrollmentStops,
  planHumanFollowUp,
  planOrganizationConversion,
  shouldStartOnboarding,
  type EnrollmentRef,
  type OrganizationConversionState,
} from "../conversion-rules"
import {
  applyHumanFollowUp,
  applyOrganizationConversion,
  type ConversionApi,
} from "../conversion-run"
import { planDueStep } from "../orchestrator-rules"
import { processOneDueEnrollment } from "../orchestrator-run"
import type { OrchestratorApi } from "../orchestrator-run"

const now = new Date("2026-10-06T10:00:00.000Z")
const config = {
  onboarding: { program_id: "elpr_onb", sequence_id: "eseq_onb" },
}

function organization(
  patch: Partial<OrganizationConversionState> = {}
): OrganizationConversionState {
  return {
    id: "eorg_1",
    converted_customer_id: null,
    converted_seller_id: null,
    ...patch,
  }
}

function enrollment(patch: Partial<EnrollmentRef> & Pick<EnrollmentRef, "id" | "program_type" | "status">): EnrollmentRef {
  return { contact_id: "ectc_1", ...patch }
}

describe("organization conversion", () => {
  it("converts an organization to a customer soft reference", () => {
    const plan = planOrganizationConversion({
      organization: organization(),
      customer_id: "cus_1",
    })
    expect(plan).toMatchObject({
      ok: true,
      conversion_type: "customer",
      converted_customer_id: "cus_1",
      converted_seller_id: null,
      changed: true,
    })
  })

  it("converts an organization to a seller soft reference", () => {
    const plan = planOrganizationConversion({
      organization: organization(),
      seller_id: "sell_1",
    })
    expect(plan).toMatchObject({
      ok: true,
      conversion_type: "seller",
      converted_seller_id: "sell_1",
      changed: true,
    })
  })

  it("converts an organization to both soft references", () => {
    const plan = planOrganizationConversion({
      organization: organization(),
      customer_id: "cus_1",
      seller_id: "sell_1",
    })
    expect(plan).toMatchObject({
      ok: true,
      conversion_type: "both",
      converted_customer_id: "cus_1",
      converted_seller_id: "sell_1",
    })
  })

  it("is idempotent when the same conversion is repeated", () => {
    const current = organization({
      converted_customer_id: "cus_1",
      converted_seller_id: "sell_1",
    })
    const plan = planOrganizationConversion({
      organization: current,
      customer_id: "cus_1",
      seller_id: "sell_1",
    })
    expect(plan).toMatchObject({ ok: true, conversion_type: "both", changed: false })
  })

  it("does not overwrite an existing converted reference", () => {
    const plan = planOrganizationConversion({
      organization: organization({ converted_customer_id: "cus_1" }),
      customer_id: "cus_2",
      seller_id: "sell_1",
    })
    expect(plan.ok).toBe(false)
    if (!plan.ok) expect(plan.error).toMatch(/niet overschreven/)
  })

  it("rejects an unknown organization", () => {
    const plan = planOrganizationConversion({
      organization: null,
      customer_id: "cus_1",
    })
    expect(plan).toEqual({ ok: false, error: "Organization bestaat niet." })
  })

  it("plans only soft-reference fields and no customer or seller record", () => {
    const plan = planOrganizationConversion({
      organization: organization(),
      customer_id: "cus_1",
      seller_id: "sell_1",
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(Object.keys(plan).sort()).toEqual([
      "changed",
      "conversion_type",
      "converted_customer_id",
      "converted_seller_id",
      "ok",
      "organization_id",
    ])
  })
})

describe("conversion enrollments", () => {
  it("stops active acquisition and keeps the acquisition/onboarding rule", () => {
    const rows = [
      enrollment({ id: "eenr_b", program_type: "acquisition", status: "active" }),
      enrollment({ id: "eenr_a", program_type: "newsletter", status: "active" }),
      enrollment({ id: "eenr_c", program_type: "onboarding", status: "stopped" }),
    ]
    expect(() =>
      assertCanActivateEnrollment({
        programType: "onboarding",
        existingActiveProgramTypes: ["acquisition"],
      })
    ).toThrow(/acquisition/)
    const stops = planConversionEnrollmentStops(rows)
    expect(stops).toEqual([
      {
        id: "eenr_b",
        status: "stopped",
        next_step_at: null,
        reason: "conversion",
      },
    ])
    const after = rows.map((row) =>
      stops.some((stop) => stop.id === row.id) ? { ...row, status: "stopped" } : row
    )
    expect(shouldStartOnboarding(after)).toBe(true)
    expect(
      shouldStartOnboarding([
        enrollment({ id: "eenr_onb", program_type: "onboarding", status: "active" }),
      ])
    ).toBe(false)
  })

  it("stops acquisition before onboarding enroll and does not insert past an active onboarding", async () => {
    const org = organization()
    const rows = [
      enrollment({ id: "eenr_acq", program_type: "acquisition", status: "active" }),
    ]
    const calls: string[] = []
    const created: string[] = []
    const api = conversionApi({
      org,
      rows,
      calls,
      created,
      enrollmentsForContact: () => rows,
    })
    const first = await applyOrganizationConversion({
      api,
      config,
      organizationId: "eorg_1",
      customerId: "cus_1",
      sellerId: "sell_1",
      now,
      log: () => undefined,
    })
    expect(first.conversion_type).toBe("both")
    expect(first.changed).toBe(true)
    expect(first.stopped_enrollment_ids).toEqual(["eenr_acq"])
    expect(calls.indexOf("stop")).toBeLessThan(calls.indexOf("enroll"))
    expect(created).toEqual([])
    expect(rows.find((row) => row.id === "eenr_acq")?.status).toBe("stopped")

    const second = await applyOrganizationConversion({
      api,
      config,
      organizationId: "eorg_1",
      customerId: "cus_1",
      sellerId: "sell_1",
      now,
      log: () => undefined,
    })
    expect(second.changed).toBe(false)
    expect(second.stopped_enrollment_ids).toEqual([])
    expect(second.onboarding[0]?.enrolled).toBe(true)
    expect(calls.filter((call) => call === "enroll")).toHaveLength(2)
    expect(calls.filter((call) => call === "update-organization")).toHaveLength(1)
  })

  it("does not start a second onboarding enrollment", async () => {
    const rows = [
      enrollment({ id: "eenr_onb", program_type: "onboarding", status: "active" }),
    ]
    const calls: string[] = []
    const api = conversionApi({
      org: organization(),
      rows,
      calls,
      created: [],
      enrollmentsForContact: () => rows,
    })
    const result = await applyOrganizationConversion({
      api,
      config,
      organizationId: "eorg_1",
      sellerId: "sell_1",
      now,
      log: () => undefined,
    })
    expect(result.conversion_type).toBe("seller")
    expect(result.onboarding[0]?.enrolled).toBe(false)
    expect(result.onboarding[0]?.reason).toMatch(/program_type/)
    expect(rows).toHaveLength(1)
    expect(calls).toContain("enroll")
  })

  it("fails for an unknown organization and does not write", async () => {
    const calls: string[] = []
    const api = conversionApi({
      org: null,
      rows: [],
      calls,
      created: [],
      enrollmentsForContact: () => [],
    })
    await expect(
      applyOrganizationConversion({
        api,
        config,
        organizationId: "eorg_missing",
        customerId: "cus_1",
        now,
        log: () => undefined,
      })
    ).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND })
    expect(calls).toEqual([])
  })

  it("does not write when an existing reference would be overwritten", async () => {
    const calls: string[] = []
    const api = conversionApi({
      org: organization({ converted_customer_id: "cus_1" }),
      rows: [
        enrollment({ id: "eenr_acq", program_type: "acquisition", status: "active" }),
      ],
      calls,
      created: [],
      enrollmentsForContact: () => [],
    })
    await expect(
      applyOrganizationConversion({
        api,
        config,
        organizationId: "eorg_1",
        customerId: "cus_2",
        now,
        log: () => undefined,
      })
    ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
    expect(calls).toEqual([])
  })
})

describe("human follow-up", () => {
  it("moves an active acquisition enrollment to human_follow_up and clears next_step_at", async () => {
    const rows = [
      enrollment({ id: "eenr_acq", program_type: "acquisition", status: "active" }),
      enrollment({ id: "eenr_onb", program_type: "onboarding", status: "active" }),
    ]
    const updates: { id: string; status?: string; next_step_at?: Date | null }[] = []
    const events: string[] = []
    const api = followUpApi(rows, updates, events)
    const result = await applyHumanFollowUp({ api, contactId: "ectc_1" })
    expect(result.updated_enrollment_ids).toEqual(["eenr_acq"])
    expect(updates).toEqual([
      { id: "eenr_acq", status: "human_follow_up", next_step_at: null },
    ])
    expect(rows.find((row) => row.id === "eenr_onb")?.status).toBe("active")
    expect(events).toEqual([])
  })

  it("is idempotent when the contact is already in human follow-up", async () => {
    const rows = [
      enrollment({
        id: "eenr_acq",
        program_type: "acquisition",
        status: "human_follow_up",
      }),
    ]
    const updates: { id: string }[] = []
    const first = await applyHumanFollowUp({
      api: followUpApi(rows, updates, []),
      contactId: "ectc_1",
    })
    const second = await applyHumanFollowUp({
      api: followUpApi(rows, updates, []),
      contactId: "ectc_1",
    })
    expect(first.updated_enrollment_ids).toEqual([])
    expect(second.updated_enrollment_ids).toEqual([])
    expect(updates).toEqual([])
    expect(rows[0]?.status).toBe("human_follow_up")
  })

  it.each(["stopped", "completed", "suppressed"] as const)(
    "leaves a %s enrollment unchanged",
    async (status) => {
      const rows = [
        enrollment({ id: "eenr_1", program_type: "acquisition", status }),
      ]
      const updates: { id: string }[] = []
      const result = await applyHumanFollowUp({
        api: followUpApi(rows, updates, []),
        contactId: "ectc_1",
      })
      expect(result.updated_enrollment_ids).toEqual([])
      expect(rows[0]?.status).toBe(status)
      expect(planHumanFollowUp(rows)).toEqual([])
    }
  )

  it("does not let the orchestrator process human_follow_up or write a queued event", async () => {
    const events: string[] = []
    const plan = planDueStep({
      enrollment: {
        id: "eenr_1",
        status: "human_follow_up",
        contact_id: "ectc_1",
        program_id: "elpr_1",
        program_type: "acquisition",
        sequence_id: "eseq_1",
        sequence_step_id: "estp_1",
        next_step_at: now,
      },
      steps: [],
      versions: [],
      variantMatchesTemplate: true,
      suppressedCategories: [],
      priorStoppedForStep: false,
      now,
    })
    expect(plan).toEqual({ action: "skip", reason: "not-active" })
    const result = await processOneDueEnrollment(
      {
        retrieveEngagementEnrollment: async () => ({
          id: "eenr_1",
          status: "human_follow_up",
          contact_id: "ectc_1",
          program_id: "elpr_1",
          program_type: "acquisition",
          sequence_id: "eseq_1",
          sequence_step_id: "estp_1",
          next_step_at: null,
        }),
        recordCommunicationEvent: async () => {
          events.push("queued")
        },
      } as unknown as OrchestratorApi,
      "eenr_1",
      now
    )
    expect(result).toEqual({ action: "skip", reason: "not-active" })
    expect(events).toEqual([])
  })
})

function conversionApi(input: {
  org: OrganizationConversionState | null
  rows: EnrollmentRef[]
  calls: string[]
  created: string[]
  enrollmentsForContact: () => EnrollmentRef[]
}): ConversionApi {
  const enrolledKeys = new Set<string>()
  return {
    async retrieveEngagementOrganization() {
      if (!input.org) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "Organization bestaat niet.")
      }
      return input.org
    },
    async updateEngagementOrganizations(data) {
      input.calls.push("update-organization")
      if (!input.org) return
      input.org.converted_customer_id = data.converted_customer_id
      input.org.converted_seller_id = data.converted_seller_id
    },
    async listEngagementContacts() {
      return [{ id: "ectc_1" }]
    },
    async listEngagementEnrollments() {
      return input.enrollmentsForContact()
    },
    async stopEnrollmentForConversion(id) {
      input.calls.push("stop")
      const row = input.rows.find((enrollment) => enrollment.id === id)
      if (row?.status === "active" && row.program_type === "acquisition") {
        row.status = "stopped"
      }
    },
    async enrollContact(created) {
      input.calls.push("enroll")
      const key = `${created.contact_id}:${created.trigger_key}`
      if (enrolledKeys.has(key)) return { id: "eenr_existing" }
      const activeTypes = input.rows
        .filter((row) => row.status === "active")
        .map((row) => row.program_type)
      assertCanActivateEnrollment({
        programType: "onboarding",
        existingActiveProgramTypes: activeTypes,
      })
      enrolledKeys.add(key)
      input.rows.push(
        enrollment({
          id: "eenr_onb_new",
          program_type: "onboarding",
          status: "active",
          contact_id: created.contact_id,
        })
      )
      return { id: "eenr_onb_new" }
    },
    async listEngagementSequenceSteps() {
      return [
        {
          id: "estp_1",
          sequence_id: "eseq_onb",
          step_order: 1,
          delay_minutes: 0,
          template_id: "ctpl_1",
          variant_id: "ctvar_1",
        },
      ]
    },
    async retrieveEngagementContact(id) {
      return { id }
    },
    async updateEnrollment() {
      input.calls.push("update-enrollment")
    },
    async createCustomers() {
      input.created.push("customer")
    },
    async createSellers() {
      input.created.push("seller")
    },
  } as ConversionApi & {
    createCustomers: () => Promise<void>
    createSellers: () => Promise<void>
  }
}

function followUpApi(
  rows: EnrollmentRef[],
  updates: { id: string; status?: string; next_step_at?: Date | null }[],
  events: string[]
): ConversionApi {
  return {
    async retrieveEngagementContact(id) {
      if (id !== "ectc_1") {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "Contact bestaat niet.")
      }
      return { id }
    },
    async listEngagementEnrollments() {
      return rows
    },
    async updateEnrollment(update) {
      updates.push(update)
      const row = rows.find((enrollment) => enrollment.id === update.id)
      if (row && update.status) row.status = update.status
    },
    async recordCommunicationEvent() {
      events.push("queued")
    },
  } as unknown as ConversionApi
}
