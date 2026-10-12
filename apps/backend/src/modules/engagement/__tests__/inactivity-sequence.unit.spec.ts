import { COMMERCIAL_PROGRAMS } from "../commercial-library"
import { dedupeEnrollCalls, planOccurrenceEnrollments } from "../automation-dispatch"
import { collectOccurrences, type AutomationSnapshot } from "../automation-occurrences"
import {
  inactivityDelayMinutes,
  inactivityMilestoneAt,
  orderedAfterReference,
  referenceFromInactiveKey,
} from "../inactivity-sequence"
import { processOneDueEnrollment, type OrchestratorApi } from "../orchestrator-run"
import { addDelayMinutes, planDueStep, type DueEnrollmentState, type OrchestratorStep } from "../orchestrator-rules"

const reference = new Date("2026-01-01T00:00:00.000Z")
const day30 = inactivityMilestoneAt(reference, 1)
const day60 = inactivityMilestoneAt(reference, 2)
const day90 = inactivityMilestoneAt(reference, 3)

const steps: OrchestratorStep[] = [1, 2, 3].map((order) => ({
  id: `estp_${order}`,
  sequence_id: "eseq_lib_c_back30",
  step_order: order,
  delay_minutes: inactivityDelayMinutes(order),
  template_id: `ctpl_${order}`,
  variant_id: "ctvar_1",
}))

const version = {
  id: "ctver_1",
  variant_id: "ctvar_1",
  version_number: 1,
  approval_status: "approved",
  activation_status: "active",
}

function enrollment(patch: Partial<DueEnrollmentState> & { trigger_key?: string } = {}): DueEnrollmentState & { trigger_key: string } {
  return {
    id: "eenr_1",
    status: "active",
    contact_id: "ectc_1",
    consumer_id: "econ_1",
    program_id: "elpr_lib_c_back30",
    program_type: "newsletter",
    sequence_id: "eseq_lib_c_back30",
    sequence_step_id: "estp_1",
    next_step_at: day30,
    trigger_key: `consumer_inactive_30d:econ_1:${reference.toISOString()}`,
    ...patch,
  }
}

function apiFor(input: {
  row: DueEnrollmentState & { trigger_key?: string }
  orders: Array<{ created_at: string }>
  events?: Array<{ sequence_step_id: string | null; status: string }>
  suppressions?: Array<{ category: string }>
  onEvent: (event: { status: string }) => void
  onUpdate: (update: { status?: string; next_step_at?: Date | null; sequence_step_id?: string }) => void
}): OrchestratorApi {
  return {
    async retrieveEngagementEnrollment() {
      return input.row
    },
    async listEngagementSequenceSteps() {
      return steps
    },
    async retrieveCommunicationTemplateVariant() {
      return { id: "ctvar_1", template_id: input.row.sequence_step_id === "estp_1" ? "ctpl_1" : "ctpl_1" }
    },
    async listCommunicationTemplateVersions() {
      return [{ ...version, variant_id: "ctvar_1" }]
    },
    async listEngagementSuppressions() {
      return input.suppressions ?? []
    },
    async listEngagementCommunicationEvents() {
      return input.events ?? []
    },
    async retrieveEngagementLifecycleProgram() {
      return { audience: "consumers", start_trigger: "consumer_inactive_30d" }
    },
    async listConsumerOrderTimes() {
      return input.orders
    },
    async recordCommunicationEvent(event) {
      input.onEvent(event)
    },
    async updateEnrollment(update) {
      input.onUpdate(update)
    },
  } as unknown as OrchestratorApi
}

describe("inactivity sequence", () => {
  it("keeps 30, 60 and 90 days from the last order without stacking the waits", () => {
    expect(inactivityDelayMinutes(1)).toBe(0)
    expect(inactivityDelayMinutes(2)).toBe(30 * 24 * 60)
    expect(inactivityDelayMinutes(3)).toBe(30 * 24 * 60)
    expect(inactivityDelayMinutes(2)).not.toBe(60 * 24 * 60)
    expect(inactivityDelayMinutes(3)).not.toBe(90 * 24 * 60)

    let at = addDelayMinutes(day30, inactivityDelayMinutes(1))
    expect(at.toISOString()).toBe(day30.toISOString())
    at = addDelayMinutes(at, inactivityDelayMinutes(2))
    expect(at.toISOString()).toBe(day60.toISOString())
    at = addDelayMinutes(at, inactivityDelayMinutes(3))
    expect(at.toISOString()).toBe(day90.toISOString())

    const stacked = addDelayMinutes(
      addDelayMinutes(addDelayMinutes(day30, 30 * 24 * 60), 60 * 24 * 60),
      90 * 24 * 60
    )
    expect(stacked.getTime()).toBeGreaterThan(day90.getTime())

    const program = COMMERCIAL_PROGRAMS.find((item) => item.id === "elpr_lib_c_back30")
    expect(program?.steps.map((step) => step.delay_minutes)).toEqual([
      inactivityDelayMinutes(1),
      inactivityDelayMinutes(2),
      inactivityDelayMinutes(3),
    ])
    expect(program?.steps.map((step) => step.template_id)).toEqual([
      "ctpl_lib_c_back30",
      "ctpl_lib_c_back60",
      "ctpl_lib_c_back90",
    ])
    expect(COMMERCIAL_PROGRAMS.some((item) => item.id === "elpr_lib_c_back60" || item.id === "elpr_lib_c_back90")).toBe(
      false
    )
  })

  it("schedules the next message from the reference even when the first step runs late", async () => {
    const late = new Date(reference.getTime() + 40 * 24 * 60 * 60 * 1000)
    const updates: Array<{ next_step_at?: Date | null; status?: string }> = []
    const events: Array<{ status: string }> = []
    const result = await processOneDueEnrollment(
      apiFor({
        row: enrollment({ next_step_at: late }),
        orders: [{ created_at: reference.toISOString() }],
        onEvent: (event) => events.push(event),
        onUpdate: (update) => updates.push(update),
      }),
      "eenr_1",
      late
    )
    expect(result.action).toBe("queued")
    expect(events).toEqual([expect.objectContaining({ status: "queued" })])
    expect(events.some((event) => event.status === "sent")).toBe(false)
    expect(updates[0]?.next_step_at?.toISOString()).toBe(day60.toISOString())
  })

  it("stops before the next step when an order arrives, and also on unsubscribe or suppression", async () => {
    expect(referenceFromInactiveKey(`consumer_inactive_30d:econ_1:${reference.toISOString()}`)).toBe(
      reference.toISOString()
    )
    expect(orderedAfterReference([{ created_at: reference.toISOString() }], reference.toISOString())).toBe(false)
    expect(
      orderedAfterReference(
        [{ created_at: new Date(day60.getTime() + 60_000).toISOString() }],
        reference.toISOString()
      )
    ).toBe(true)

    const events: Array<{ status: string }> = []
    const updates: Array<{ status?: string }> = []
    const ordered = await processOneDueEnrollment(
      apiFor({
        row: enrollment({ sequence_step_id: "estp_2", next_step_at: day60 }),
        orders: [{ created_at: new Date(day30.getTime() + 60_000).toISOString() }],
        onEvent: (event) => events.push(event),
        onUpdate: (update) => updates.push(update),
      }),
      "eenr_1",
      day60
    )
    expect(ordered).toEqual({ action: "stopped", reason: "ordered" })
    expect(events).toEqual([expect.objectContaining({ status: "stopped" })])
    expect(updates[0]?.status).toBe("stopped")

    const unsubscribed = planDueStep({
      enrollment: enrollment({ sequence_step_id: "estp_2", next_step_at: day60 }),
      steps,
      versions: [version],
      variantMatchesTemplate: true,
      suppressedCategories: [],
      priorStoppedForStep: false,
      preferenceAllows: false,
      now: day60,
    })
    expect(unsubscribed.action).toBe("stopped")
    if (unsubscribed.action === "stopped") expect(unsubscribed.reason).toBe("preference")

    const suppressed = planDueStep({
      enrollment: enrollment({ sequence_step_id: "estp_3", next_step_at: day90 }),
      steps,
      versions: [version],
      variantMatchesTemplate: true,
      suppressedCategories: ["marketing"],
      priorStoppedForStep: false,
      preferenceAllows: true,
      now: day90,
    })
    expect(suppressed.action).toBe("stopped")
    if (suppressed.action === "stopped") expect(suppressed.reason).toBe("suppressed")
  })

  it("does not queue the same step twice and does not enroll a concept or a duplicate", async () => {
    const events: Array<{ status: string }> = []
    const first = await processOneDueEnrollment(
      apiFor({
        row: enrollment(),
        orders: [{ created_at: reference.toISOString() }],
        onEvent: (event) => events.push(event),
        onUpdate: () => undefined,
      }),
      "eenr_1",
      day30
    )
    expect(first.action).toBe("queued")
    const second = await processOneDueEnrollment(
      apiFor({
        row: enrollment(),
        orders: [{ created_at: reference.toISOString() }],
        events: [{ sequence_step_id: "estp_1", status: "queued" }],
        onEvent: (event) => events.push(event),
        onUpdate: () => undefined,
      }),
      "eenr_1",
      day30
    )
    expect(second.action).toBe("resume")
    expect(events.filter((event) => event.status === "queued")).toHaveLength(1)
    expect(events.some((event) => event.status === "sent")).toBe(false)

    const snapshot: AutomationSnapshot = {
      now: day30,
      sellers: [],
      versions: [],
      origins: [],
      orders: [],
      consumers: [
        {
          id: "econ_1",
          customer_id: null,
          newsletter_enabled: true,
          created_at: reference.toISOString(),
        },
      ],
      brands: [],
      affiliates: [],
      conversions: [],
      shipments: [],
      products: [],
      product_categories: [],
      prices: [],
      affiliate_links: [],
      organizations: [],
      contacts: [],
      suppressions: [],
    }
    const occurrences = collectOccurrences(snapshot, ["consumer_inactive_30d"])
    const program = {
      id: "elpr_lib_c_back30",
      activation_status: "concept",
      start_mode: "condition" as const,
      start_trigger: "consumer_inactive_30d",
      sequences: [{ id: "eseq_lib_c_back30", steps }],
    }
    expect(planOccurrenceEnrollments({ programs: [program], occurrences, now: day30 })).toHaveLength(0)
    const active = planOccurrenceEnrollments({
      programs: [{ ...program, activation_status: "active" }],
      occurrences,
      now: day30,
    })
    expect(dedupeEnrollCalls([...active, ...active])).toHaveLength(1)
    expect(active[0]?.next_step_at.toISOString()).toBe(day30.toISOString())
  })
})
