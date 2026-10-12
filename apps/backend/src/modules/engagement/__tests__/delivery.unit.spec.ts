import {
  applyDeliveryResult,
  assessWebhookReplay,
  beginDeliveryAttempt,
  claimFromStore,
  DELIVERY_CLAIM_SQL,
  deliverQueuedMarketing,
  deliveryWebhookSignature,
  dryRunDeliveries,
  planProviderWebhook,
  prepareMarketingEmail,
  verifyDeliveryWebhook,
  type DeliverySnapshot,
  type HistoryDeliveryRow,
  type MarketingDeliveryProvider,
} from "../delivery"

const version = {
  id: "ctver_live",
  variant_id: "ctvar_nl",
  subject: "Nieuwe Europese merken",
  approval_status: "approved",
  activation_status: "active",
}

function snapshot(events: HistoryDeliveryRow[], patch: Partial<DeliverySnapshot> = {}): DeliverySnapshot {
  return {
    events,
    programs: [
      {
        id: "elpr_camp",
        program_type: "campaign",
        audience: "consumers",
        start_trigger: "offer_published",
      },
      {
        id: "elpr_seller",
        program_type: "campaign",
        audience: "sellers",
        start_trigger: "offer_published",
      },
      {
        id: "elpr_aff",
        program_type: "campaign",
        audience: "affiliates",
        start_trigger: "offer_published",
      },
      {
        id: "elpr_onb",
        program_type: "onboarding",
        audience: null,
        start_trigger: "seller_onboarded",
      },
    ],
    versions: [
      version,
      {
        id: "ctver_draft",
        variant_id: "ctvar_nl",
        subject: "Concept",
        approval_status: "draft",
        activation_status: "inactive",
      },
    ],
    variants: [{ id: "ctvar_nl", locale: "nl", template_id: "ctpl_1" }],
    consumers: [
      { id: "econ_in", newsletter_enabled: true, newsletter_topics: { news: false, brands: false, offers: true } },
      { id: "econ_out", newsletter_enabled: false, newsletter_topics: { news: true, brands: true, offers: true } },
      { id: "econ_pref", newsletter_enabled: true, newsletter_topics: { news: true, brands: false, offers: false } },
    ],
    contacts: [
      { id: "ect_on", organization_id: "eorg_on" },
      { id: "ect_off", organization_id: "eorg_off" },
      { id: "ect_stop", organization_id: "eorg_on" },
    ],
    organizations: [
      { id: "eorg_on", converted_seller_id: "sel_on" },
      { id: "eorg_off", converted_seller_id: "sel_off" },
    ],
    sellers: [
      { id: "sel_on", communication_preferences: { seller_campaigns: true } },
      { id: "sel_off", communication_preferences: { seller_campaigns: false, europmade_news: true } },
    ],
    affiliates: [
      { id: "aff_on", communication_preferences: { affiliate_campaigns: true } },
      { id: "aff_off", communication_preferences: { commission_updates: true, content_opportunities: true } },
    ],
    suppressions: [{ contact_id: "ect_stop", category: "marketing", active: true }],
    ...patch,
  }
}

function queued(patch: Partial<HistoryDeliveryRow>): HistoryDeliveryRow {
  return {
    id: "ecev_1",
    status: "queued",
    consumer_id: "econ_in",
    program_id: "elpr_camp",
    sequence_id: "eseq_1",
    sequence_step_id: "estp_1",
    template_id: "ctpl_1",
    variant_id: "ctvar_nl",
    template_version_id: "ctver_live",
    provider_message_id: null,
    attempt_count: 0,
    delivery_claim: null,
    ...patch,
  }
}

describe("marketing delivery dry-run", () => {
  it("plans the allowed audiences and skips consent, drafts and duplicates", () => {
    const items = dryRunDeliveries(
      snapshot([
        queued({ id: "ecev_consumer" }),
        queued({ id: "ecev_consumer_dup", consumer_id: "econ_in" }),
        queued({ id: "ecev_unsub", consumer_id: "econ_out" }),
        queued({ id: "ecev_pref", consumer_id: "econ_pref" }),
        queued({
          id: "ecev_seller",
          consumer_id: null,
          contact_id: "ect_on",
          program_id: "elpr_seller",
        }),
        queued({
          id: "ecev_seller_off",
          consumer_id: null,
          contact_id: "ect_off",
          program_id: "elpr_seller",
        }),
        queued({
          id: "ecev_seller_stop",
          consumer_id: null,
          contact_id: "ect_stop",
          program_id: "elpr_seller",
        }),
        queued({
          id: "ecev_aff",
          consumer_id: null,
          affiliate_id: "aff_on",
          program_id: "elpr_aff",
        }),
        queued({
          id: "ecev_aff_off",
          consumer_id: null,
          affiliate_id: "aff_off",
          program_id: "elpr_aff",
        }),
        queued({ id: "ecev_draft", template_version_id: "ctver_draft" }),
        queued({
          id: "ecev_onboarding",
          consumer_id: null,
          contact_id: "ect_off",
          program_id: "elpr_onb",
        }),
        queued({
          id: "ecev_sent",
          status: "sent",
          provider_message_id: "msg_1",
          sequence_step_id: "estp_done",
        }),
        queued({ id: "ecev_again", sequence_step_id: "estp_done" }),
      ])
    )
    const deliver = items.filter((item) => item.action === "would_deliver")
    expect(deliver.map((item) => item.message.event_id)).toEqual([
      "ecev_aff",
      "ecev_consumer",
      "ecev_onboarding",
      "ecev_seller",
    ])
    expect(deliver.find((item) => item.message.event_id === "ecev_consumer")?.message).toEqual(
      expect.objectContaining({
        recipient_kind: "consumer",
        recipient_id: "econ_in",
        locale: "nl",
        program_id: "elpr_camp",
        template_version_id: "ctver_live",
        subject: "Nieuwe Europese merken",
      })
    )
    const reason = (id: string) => items.find((item) => item.action === "skip" && item.event_id === id)
    expect(reason("ecev_consumer_dup")).toEqual({ action: "skip", event_id: "ecev_consumer_dup", reason: "duplicate" })
    expect(reason("ecev_unsub")?.reason).toBe("preference")
    expect(reason("ecev_pref")?.reason).toBe("preference")
    expect(reason("ecev_seller_off")?.reason).toBe("preference")
    expect(reason("ecev_seller_stop")?.reason).toBe("suppressed")
    expect(reason("ecev_aff_off")?.reason).toBe("preference")
    expect(reason("ecev_draft")?.reason).toBe("no_sendable_version")
    expect(reason("ecev_again")?.reason).toBe("duplicate")
    expect(items.some((item) => item.action === "skip" && item.event_id === "ecev_sent")).toBe(false)
  })

  it("does not call a provider in dry-run and refuses live mode", () => {
    const provider: MarketingDeliveryProvider = {
      key: "dry-run",
      deliver: jest.fn(async () => ({ outcome: "sent" as const, provider_message_id: "msg_x" })),
    }
    const planned = deliverQueuedMarketing({
      snapshot: snapshot([queued({ id: "ecev_consumer" })]),
      provider,
    })
    expect(planned).toHaveLength(1)
    expect(provider.deliver).not.toHaveBeenCalled()
    expect(() =>
      deliverQueuedMarketing({
        mode: "live",
        snapshot: snapshot([queued({ id: "ecev_consumer" })]),
        provider,
      })
    ).toThrow(/niet aangesloten/)
    expect(provider.deliver).not.toHaveBeenCalled()
  })

  it("retries a failure once and then refuses a second send", () => {
    const row = queued({ id: "ecev_retry" })
    const first = beginDeliveryAttempt(row)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const claimed = { ...row, delivery_claim: first.claim_token }
    expect(beginDeliveryAttempt(claimed).ok).toBe(false)

    const failed = applyDeliveryResult({
      row: claimed,
      claim_token: first.claim_token,
      locale: "nl",
      result: { outcome: "failed", error: "timeout", retryable: true },
    })
    expect(failed.ok).toBe(true)
    if (!failed.ok) return
    expect(failed.patch).toEqual(
      expect.objectContaining({
        status: "queued",
        attempt_count: 1,
        delivery_claim: null,
        provider_message_id: null,
        delivery_error: "timeout",
        locale: "nl",
      })
    )

    const second = beginDeliveryAttempt({ ...row, ...failed.patch })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.claim_token).toBe("ecev_retry:2")
    const sent = applyDeliveryResult({
      row: { ...row, ...failed.patch, delivery_claim: second.claim_token },
      claim_token: second.claim_token,
      locale: "nl-NL",
      result: { outcome: "sent", provider_message_id: "msg_1" },
    })
    expect(sent.ok).toBe(true)
    if (!sent.ok) return
    expect(sent.patch.status).toBe("sent")
    expect(sent.patch.provider_message_id).toBe("msg_1")
    expect(beginDeliveryAttempt({ ...row, ...sent.patch }).ok).toBe(false)

    const stale = applyDeliveryResult({
      row: { ...row, delivery_claim: "ecev_retry:1" },
      claim_token: "ecev_retry:9",
      locale: "nl",
      result: { outcome: "sent", provider_message_id: "msg_2" },
    })
    expect(stale).toEqual({ ok: false, reason: "stale_claim" })
  })

  it("records bounce and stops after the last retry", () => {
    const bounced = applyDeliveryResult({
      row: queued({ id: "ecev_bounce", delivery_claim: "ecev_bounce:1" }),
      claim_token: "ecev_bounce:1",
      locale: "nl",
      result: { outcome: "bounced", error: "mailbox onbekend", provider_message_id: "msg_b" },
    })
    expect(bounced.ok).toBe(true)
    if (!bounced.ok) return
    expect(bounced.patch.status).toBe("bounced")
    expect(bounced.patch.bounced).toBe(true)
    expect(beginDeliveryAttempt({ ...queued({ id: "ecev_bounce" }), ...bounced.patch }).ok).toBe(false)

    const exhausted = applyDeliveryResult({
      row: queued({ id: "ecev_last", delivery_claim: "ecev_last:3", attempt_count: 2 }),
      claim_token: "ecev_last:3",
      locale: "nl",
      result: { outcome: "failed", error: "weg", retryable: true },
    })
    expect(exhausted.ok).toBe(true)
    if (!exhausted.ok) return
    expect(exhausted.patch.status).toBe("failed")
    expect(exhausted.patch.attempt_count).toBe(3)
    expect(
      dryRunDeliveries(
        snapshot([
          queued({
            id: "ecev_last",
            status: "failed",
            attempt_count: 3,
            delivery_error: "weg",
          }),
          queued({ id: "ecev_flight", delivery_claim: "ecev_flight:1" }),
        ])
      ).map((item) => (item.action === "skip" ? item.reason : item.action))
    ).toEqual(["in_flight", "attempts_exhausted"])
  })

  it("gives one atomic claim to concurrent workers", async () => {
    const store = { row: queued({ id: "ecev_race" }) }
    const results = await Promise.all([
      Promise.resolve().then(() => claimFromStore(store, "ecev_race")),
      Promise.resolve().then(() => claimFromStore(store, "ecev_race")),
    ])
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect(store.row?.delivery_claim).toBe("ecev_race:1")
    expect(claimFromStore(store, "ecev_race")).toEqual({ ok: false, reason: "in_flight" })
    expect(DELIVERY_CLAIM_SQL).toContain(`"delivery_claim" IS NULL`)
    expect(DELIVERY_CLAIM_SQL).toContain("RETURNING")
  })

  it("renders the approved language variant and blocks consent gaps", () => {
    const body = [
      "<!--em-block:product-->",
      '<img src="https://cdn.example/main.jpg" alt="Boor" data-em-product="prod_1" />',
      "<h3>Bosch boor</h3>",
      "<p>Compacte boor.</p>",
      '<p data-em-commission="1">Commissie: 11%</p>',
      '<p><a href="/product/prod_1">Bekijk product</a></p>',
    ].join("")
    const live = {
      id: "ctver_live",
      variant_id: "ctvar_nl",
      subject: "Nieuwe Europese merken",
      preheader: "Nieuw in de catalogus",
      body,
      cta_label: "Naar EuropMade",
      cta_url: "https://europmade.eu",
      approval_status: "approved",
      activation_status: "active",
    }
    const english = {
      ...live,
      id: "ctver_en",
      variant_id: "ctvar_en",
      subject: "New European brands",
      preheader: "New in the catalogue",
    }
    const base = snapshot([queued({ id: "ecev_consumer", locale: "nl" })], {
      versions: [live, { ...live, id: "ctver_draft", approval_status: "draft", activation_status: "inactive" }],
    })
    const payload = prepareMarketingEmail(base, "ecev_consumer")
    expect(payload.ok).toBe(true)
    if (!payload.ok) return
    expect(payload.payload).toEqual(
      expect.objectContaining({
        locale: "nl",
        subject: "Nieuwe Europese merken",
        preheader: "Nieuw in de catalogus",
        cta_label: "Naar EuropMade",
        cta_url: "https://europmade.eu",
        template_version_id: "ctver_live",
      })
    )
    expect(payload.payload.html).toContain("Nieuw in de catalogus")
    expect(payload.payload.products).toEqual([
      expect.objectContaining({
        product_id: "prod_1",
        name: "Bosch boor",
        text: "Compacte boor.",
        image_url: "https://cdn.example/main.jpg",
        link_url: "/product/prod_1",
        link_label: "Bekijk product",
        commission_label: "11%",
      }),
    ])
    const englishPayload = prepareMarketingEmail(
      snapshot([queued({ id: "ecev_en", locale: "en", variant_id: "ctvar_en", template_version_id: "ctver_en" })], {
        versions: [english],
        variants: [{ id: "ctvar_en", locale: "en", template_id: "ctpl_1" }],
      }),
      "ecev_en"
    )
    expect(englishPayload.ok).toBe(true)
    if (englishPayload.ok) expect(englishPayload.payload.locale).toBe("en")
    expect(
      prepareMarketingEmail(snapshot([queued({ id: "ecev_bad", locale: "de" })]), "ecev_bad").ok
    ).toBe(false)
    expect(prepareMarketingEmail(base, "ecev_unsub")).toEqual({ ok: false, reason: "missing" })
    expect(
      prepareMarketingEmail(
        snapshot([queued({ id: "ecev_unsub", consumer_id: "econ_out" })]),
        "ecev_unsub"
      )
    ).toEqual({ ok: false, reason: "preference" })
    expect(
      prepareMarketingEmail(
        snapshot([
          queued({
            id: "ecev_stop",
            consumer_id: null,
            contact_id: "ect_stop",
            program_id: "elpr_seller",
          }),
        ]),
        "ecev_stop"
      )
    ).toEqual({ ok: false, reason: "suppressed" })
    expect(
      prepareMarketingEmail(
        snapshot([queued({ id: "ecev_draft", template_version_id: "ctver_draft" })]),
        "ecev_draft"
      )
    ).toEqual({ ok: false, reason: "no_sendable_version" })
  })

  it("links a bounce once and does not deliver again", () => {
    const claimed = queued({ id: "ecev_hook", locale: "nl", delivery_claim: "ecev_hook:1" })
    expect(
      planProviderWebhook(claimed, {
        type: "delivered",
        event_id: "ecev_hook",
        claim_token: "ecev_hook:1",
        provider_message_id: "msg_9",
      })
    ).toEqual({ action: "reject", reason: "webhook_cannot_send" })
    const sentRow = {
      ...claimed,
      status: "sent" as const,
      provider_message_id: "msg_9",
      delivery_claim: null,
      attempt_count: 1,
    }
    expect(
      planProviderWebhook(sentRow, {
        type: "delivered",
        event_id: "ecev_hook",
        provider_message_id: "msg_9",
      })
    ).toEqual({ action: "ignore", reason: "duplicate" })
    const bounce = planProviderWebhook(sentRow, {
      type: "bounced",
      event_id: "ecev_hook",
      provider_message_id: "msg_9",
      error: "mailbox onbekend",
    })
    expect(bounce.action).toBe("update")
    if (bounce.action !== "update") return
    expect(bounce.patch).toEqual(
      expect.objectContaining({
        status: "bounced",
        bounced: true,
        provider_message_id: "msg_9",
        attempt_count: 1,
      })
    )
    expect(
      planProviderWebhook(
        { ...sentRow, status: "bounced" },
        { type: "bounced", event_id: "ecev_hook", provider_message_id: "msg_9" }
      )
    ).toEqual({ action: "ignore", reason: "duplicate" })
    expect(
      planProviderWebhook(claimed, {
        type: "delivered",
        event_id: "ecev_hook",
        claim_token: "other",
        provider_message_id: "msg_x",
      }).action
    ).toBe("reject")
  })

  it("rejects an unsigned, stale or replayed webhook and never marks it sent", () => {
    const now = new Date("2026-10-12T08:00:00.000Z")
    const timestamp = String(Math.floor(now.getTime() / 1000))
    const nonce = "nonce_delivery_test_1"
    const rawBody = JSON.stringify({ type: "delivered", event_id: "ecev_1" })
    expect(
      verifyDeliveryWebhook({
        secret: "",
        rawBody,
        signature: "ab",
        timestamp,
        nonce,
        now,
      })
    ).toEqual({ ok: false, reason: "unconfigured" })
    const secret = "test-only-not-stored"
    const signature = deliveryWebhookSignature(secret, timestamp, nonce, rawBody)
    const accepted = verifyDeliveryWebhook({
      secret,
      rawBody,
      signature,
      timestamp,
      nonce,
      now,
    })
    expect(accepted.ok).toBe(true)
    expect(
      verifyDeliveryWebhook({
        secret,
        rawBody,
        signature: deliveryWebhookSignature(secret, timestamp, nonce, rawBody + " "),
        timestamp,
        nonce,
        now,
      })
    ).toEqual({ ok: false, reason: "signature" })
    expect(
      verifyDeliveryWebhook({
        secret,
        rawBody,
        signature,
        timestamp: String(Math.floor(now.getTime() / 1000) - 600),
        nonce,
        now,
      }).ok
    ).toBe(false)
    if (!accepted.ok) return
    expect(assessWebhookReplay({ bodyHash: accepted.bodyHash, previousBodyHash: null })).toEqual({
      ok: true,
      duplicate: false,
    })
    expect(
      assessWebhookReplay({ bodyHash: accepted.bodyHash, previousBodyHash: accepted.bodyHash })
    ).toEqual({ ok: true, duplicate: true })
    expect(
      assessWebhookReplay({ bodyHash: accepted.bodyHash, previousBodyHash: "andere-hash" })
    ).toEqual({ ok: false, reason: "replay" })
    const queuedRow = queued({ id: "ecev_1", locale: "nl", delivery_claim: "ecev_1:1" })
    expect(planProviderWebhook(queuedRow, { type: "delivered", event_id: "ecev_1" }).action).toBe(
      "reject"
    )
    expect(queuedRow.status).toBe("queued")
  })

  it("renders a visual newsletter from the triggering product and blocks a missing catalog", () => {
    const visual = {
      ...version,
      preheader: "Nieuw product",
      body: "<!--em-layout:newsletter--><h2>Nieuw product</h2><p>De kaart komt uit de catalogus.</p><!--em-bind:product-->",
      cta_label: "Open",
      cta_url: "/",
    }
    const event = queued({
      id: "ecev_visual",
      locale: "nl",
      entry_source: "consumer_product_published",
      trigger_key: "consumer_product_published:ver_9",
    })
    const blocked = prepareMarketingEmail(
      snapshot([event], { versions: [visual] }),
      "ecev_visual"
    )
    expect(blocked).toEqual({ ok: false, reason: "newsletter_catalog" })
    const rendered = prepareMarketingEmail(
      snapshot([event], {
        versions: [visual],
        newsletter: {
          unsubscribeUrl: "http://127.0.0.1:3000/nieuwsbrief/uitschrijven/voorbeeld",
          versionProducts: { ver_9: "prod_kleding" },
          catalog: {
            products: [
              {
                id: "prod_kleding",
                name: "Katoenen shirt",
                brand: "Merk A",
                categories: ["Kleding"],
                text: "Korte omschrijving.",
                imageUrl: "http://127.0.0.1:9000/static/shirt.jpg",
                href: "http://127.0.0.1:3000/product/prod_kleding",
                priceLabel: "",
                commissionLabel: "",
                promoLabel: "",
                promoText: "",
              },
              {
                id: "prod_ander",
                name: "Ander product",
                brand: "Merk B",
                categories: ["Outdoor"],
                text: "",
                imageUrl: "http://127.0.0.1:9000/static/other.jpg",
                href: "http://127.0.0.1:3000/product/prod_ander",
                priceLabel: "",
                commissionLabel: "",
                promoLabel: "",
                promoText: "",
              },
            ],
            brands: [],
          },
        },
      }),
      "ecev_visual"
    )
    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return
    expect(rendered.payload.html).toContain("Katoenen shirt")
    expect(rendered.payload.html).not.toContain("Ander product")
    expect(rendered.payload.html).not.toContain("em-bind:")
    expect(rendered.payload.html).toContain("/nieuwsbrief/uitschrijven/voorbeeld")
  })
})
