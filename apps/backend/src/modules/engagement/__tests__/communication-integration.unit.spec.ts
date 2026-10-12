import { isScheduleDue, programActivationErrors } from "../automation-start"
import { planDueStep } from "../orchestrator-rules"
import { processOneDueEnrollment, type OrchestratorApi } from "../orchestrator-run"
import {
  claimFromStore,
  deliverQueuedMarketing,
  deliveryStopNote,
  planProviderWebhook,
  prepareMarketingEmail,
  type MarketingDeliveryProvider,
} from "../delivery"

const now = new Date("2026-10-09T12:00:00.000Z")

describe("marketing integration", () => {
  it("blocks activation until the message is approved and active", () => {
    const draft = programActivationErrors({
      name: "Nieuwsbrief",
      programType: "newsletter",
      start_mode: "scheduled",
      scheduled_at: "2026-10-09T13:00",
      schedule_timezone: "Europe/Amsterdam",
      audience: "consumers",
      steps: [{ template_name: "Welkom", sendable: false, type_matches: true }],
    })
    expect(draft.join(" ")).toMatch(/niet actief/)
    const ready = programActivationErrors({
      name: "Nieuwsbrief",
      programType: "newsletter",
      start_mode: "scheduled",
      scheduled_at: "2026-10-09T13:00",
      schedule_timezone: "Europe/Amsterdam",
      audience: "consumers",
      steps: [{ template_name: "Welkom", sendable: true, type_matches: true }],
    })
    expect(ready).toEqual([])
    expect(isScheduleDue("2026-10-09T16:00", "Europe/Amsterdam", now)).toBe(false)
    expect(isScheduleDue("2026-10-09T13:00", "Europe/Amsterdam", now)).toBe(true)
  })

  it("records a skip reason and renders only an allowed approved version", async () => {
    const events: Array<{ status: string; delivery_error?: string | null }> = []
    const api = {
      async retrieveEngagementEnrollment() {
        return {
          id: "eenr_1",
          status: "active",
          contact_id: "ectc_1",
          program_id: "elpr_1",
          program_type: "campaign",
          sequence_id: "eseq_1",
          sequence_step_id: "estp_1",
          next_step_at: now,
        }
      },
      async listEngagementSequenceSteps() {
        return [
          {
            id: "estp_1",
            sequence_id: "eseq_1",
            step_order: 1,
            delay_minutes: 0,
            template_id: "ctpl_1",
            variant_id: "ctvar_nl",
          },
        ]
      },
      async retrieveCommunicationTemplateVariant() {
        return { id: "ctvar_nl", template_id: "ctpl_1" }
      },
      async listCommunicationTemplateVersions() {
        return [
          {
            id: "ctver_live",
            variant_id: "ctvar_nl",
            version_number: 1,
            approval_status: "approved",
            activation_status: "active",
          },
        ]
      },
      async listEngagementSuppressions() {
        return []
      },
      async listEngagementCommunicationEvents() {
        return []
      },
      async recordCommunicationEvent(input: { status: string; delivery_error?: string | null }) {
        events.push(input)
      },
      async updateEnrollment() {
        return undefined
      },
    } as unknown as OrchestratorApi
    const stopped = await processOneDueEnrollment(api, "eenr_1", now, "nl", false)
    expect(stopped).toEqual({ action: "stopped", reason: "preference" })
    expect(events[0]).toEqual(
      expect.objectContaining({
        status: "stopped",
        delivery_error: deliveryStopNote("preference"),
      })
    )
    expect(events.some((event) => event.status === "sent")).toBe(false)

    const planned = planDueStep({
      enrollment: {
        id: "eenr_2",
        status: "active",
        contact_id: null,
        consumer_id: "econ_in",
        program_id: "elpr_1",
        program_type: "campaign",
        sequence_id: "eseq_1",
        sequence_step_id: "estp_1",
        next_step_at: now,
      },
      steps: [
        {
          id: "estp_1",
          sequence_id: "eseq_1",
          step_order: 1,
          delay_minutes: 0,
          template_id: "ctpl_1",
          variant_id: "ctvar_nl",
        },
      ],
      versions: [
        {
          id: "ctver_live",
          variant_id: "ctvar_nl",
          version_number: 2,
          approval_status: "approved",
          activation_status: "active",
        },
      ],
      variantMatchesTemplate: true,
      suppressedCategories: [],
      priorStoppedForStep: false,
      preferenceAllows: true,
      audienceMatches: true,
      now,
    })
    expect(planned.action).toBe("queued")

    const body = [
      "<!--em-block:product-->",
      '<img src="https://cdn.example/main.jpg" alt="Boor" data-em-product="prod_1" />',
      "<h3>Bosch boor</h3>",
      "<p>Compacte boor.</p>",
      '<p><a href="/product/prod_1">Bekijk product</a></p>',
    ].join("")
    const payload = prepareMarketingEmail(
      {
        events: [
          {
            id: "ecev_in",
            status: "queued",
            consumer_id: "econ_in",
            program_id: "elpr_1",
            sequence_id: "eseq_1",
            sequence_step_id: "estp_1",
            template_id: "ctpl_1",
            variant_id: "ctvar_nl",
            template_version_id: "ctver_live",
            locale: "nl",
            attempt_count: 0,
            delivery_claim: null,
            provider_message_id: null,
          },
          {
            id: "ecev_out",
            status: "queued",
            consumer_id: "econ_out",
            program_id: "elpr_1",
            sequence_id: "eseq_1",
            sequence_step_id: "estp_1",
            template_id: "ctpl_1",
            variant_id: "ctvar_nl",
            template_version_id: "ctver_live",
            locale: "nl",
            attempt_count: 0,
            delivery_claim: null,
            provider_message_id: null,
          },
        ],
        programs: [
          {
            id: "elpr_1",
            program_type: "campaign",
            audience: "consumers",
            start_trigger: "offer_published",
          },
        ],
        versions: [
          {
            id: "ctver_live",
            variant_id: "ctvar_nl",
            subject: "Nieuwe merken",
            preheader: "Nieuw",
            body,
            cta_label: "Bekijk",
            cta_url: "https://europmade.eu",
            approval_status: "approved",
            activation_status: "active",
          },
        ],
        variants: [{ id: "ctvar_nl", locale: "nl", template_id: "ctpl_1" }],
        consumers: [
          {
            id: "econ_in",
            newsletter_enabled: true,
            newsletter_topics: { news: false, brands: false, offers: true },
          },
          { id: "econ_out", newsletter_enabled: false },
        ],
        contacts: [],
        organizations: [],
        sellers: [],
        affiliates: [],
        suppressions: [],
      },
      "ecev_in"
    )
    expect(payload.ok).toBe(true)
    if (payload.ok) {
      expect(payload.payload.locale).toBe("nl")
      expect(payload.payload.products[0]?.link_url).toBe("/product/prod_1")
    }
    expect(prepareMarketingEmail(
      {
        events: [
          {
            id: "ecev_out",
            status: "queued",
            consumer_id: "econ_out",
            program_id: "elpr_1",
            template_version_id: "ctver_live",
            variant_id: "ctvar_nl",
            locale: "nl",
          },
        ],
        programs: [
          { id: "elpr_1", program_type: "campaign", audience: "consumers", start_trigger: "offer_published" },
        ],
        versions: [
          {
            id: "ctver_live",
            variant_id: "ctvar_nl",
            subject: "Nieuwe merken",
            approval_status: "approved",
            activation_status: "active",
          },
        ],
        variants: [{ id: "ctvar_nl", locale: "nl", template_id: "ctpl_1" }],
        consumers: [{ id: "econ_out", newsletter_enabled: false }],
        contacts: [],
        organizations: [],
        sellers: [],
        affiliates: [],
        suppressions: [],
      },
      "ecev_out"
    )).toEqual({ ok: false, reason: "preference" })
  })

  it("claims once, ignores a repeated bounce and refuses live delivery", () => {
    const store = {
      row: {
        id: "ecev_1",
        status: "queued",
        locale: "nl",
        attempt_count: 0,
        delivery_claim: null,
        provider_message_id: null,
      },
    }
    const first = claimFromStore(store, "ecev_1")
    const second = claimFromStore(store, "ecev_1")
    expect(first.ok).toBe(true)
    expect(second).toEqual({ ok: false, reason: "in_flight" })
    const sent = {
      ...store.row,
      status: "sent",
      provider_message_id: "msg_1",
      delivery_claim: null,
      attempt_count: 1,
    }
    const bounce = planProviderWebhook(sent, {
      type: "bounced",
      event_id: "ecev_1",
      provider_message_id: "msg_1",
      error: "mailbox onbekend",
    })
    expect(bounce.action).toBe("update")
    expect(
      planProviderWebhook(
        { ...sent, status: "bounced" },
        { type: "bounced", event_id: "ecev_1", provider_message_id: "msg_1" }
      )
    ).toEqual({ action: "ignore", reason: "duplicate" })
    const provider: MarketingDeliveryProvider = {
      key: "dry-run",
      deliver: jest.fn(async () => ({ outcome: "sent" as const, provider_message_id: "msg_x" })),
    }
    expect(() =>
      deliverQueuedMarketing({
        mode: "live",
        snapshot: {
          events: [],
          programs: [],
          versions: [],
          variants: [],
          consumers: [],
          contacts: [],
          organizations: [],
          sellers: [],
          affiliates: [],
          suppressions: [],
        },
        provider,
      })
    ).toThrow(/niet aangesloten/)
    expect(provider.deliver).not.toHaveBeenCalled()
  })
})
