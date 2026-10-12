import {
  dedupeEnrollCalls,
  planOccurrenceEnrollments,
  planScheduledEnrollments,
} from "../automation-dispatch"
import {
  availableTriggersMissingCollector,
  collectOccurrences,
  expandBroadcasts,
  type AutomationSnapshot,
} from "../automation-occurrences"
import { planDueStep } from "../orchestrator-rules"

const now = new Date("2026-10-09T12:00:00.000Z")

function snapshot(patch: Partial<AutomationSnapshot> = {}): AutomationSnapshot {
  return {
    now,
    sellers: [],
    versions: [],
    origins: [],
    orders: [],
    consumers: [],
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
    ...patch,
  }
}

const program = {
  id: "elpr_1",
  activation_status: "active",
  start_mode: "condition",
  start_trigger: "consumer_inactive_30d",
  sequences: [{ id: "eseq_1", steps: [{ id: "estp_1", step_order: 1, delay_minutes: 0 }] }],
}

describe("automation dispatch", () => {
  it("gives every available trigger a collector except the seller event", () => {
    expect(availableTriggersMissingCollector()).toEqual([])
  })

  it("charges the selling path and keeps later orders distinct", () => {
    const rows = collectOccurrences(
      snapshot({
        sellers: [
          { id: "seller_a", onboarding_status: "Concept" },
          { id: "seller_b", onboarding_status: "Goedgekeurd" },
        ],
        consumers: [
          {
            id: "econ_1",
            customer_id: "cus_1",
            newsletter_enabled: true,
            created_at: "2026-06-01T00:00:00.000Z",
          },
        ],
        orders: [
          {
            id: "ord_1",
            seller_id: "seller_b",
            customer_id: "cus_1",
            created_at: "2026-08-01T00:00:00.000Z",
          },
          {
            id: "ord_2",
            seller_id: "seller_b",
            customer_id: "cus_1",
            created_at: "2026-09-01T00:00:00.000Z",
          },
        ],
        affiliates: [
          { id: "aff_new", onboarding_status: "Ingediend" },
          { id: "aff_ok", onboarding_status: "Goedgekeurd" },
        ],
        conversions: [
          { id: "acnv_1", affiliate_id: "aff_ok", created_at: "2026-09-02T00:00:00.000Z" },
        ],
        brands: [{ id: "brand_1", public_page_status: "published" }],
      }),
      [
        "account_created",
        "onboarding_approved",
        "consumer_first_order",
        "consumer_order_placed",
        "consumer_repeat_order",
        "consumer_inactive_30d",
        "consumer_inactive_90d",
        "affiliate_created",
        "affiliate_approved",
        "affiliate_first_sale",
        "brand_published",
        "consumer_cart_abandoned",
      ]
    )
    expect(rows.find((row) => row.trigger === "account_created")?.seller_id).toBe("seller_a")
    expect(rows.some((row) => row.trigger === "onboarding_approved" && row.seller_id === "seller_b")).toBe(
      true
    )
    expect(rows.filter((row) => row.trigger === "consumer_order_placed")).toHaveLength(2)
    expect(rows.filter((row) => row.trigger === "consumer_first_order")).toHaveLength(1)
    expect(rows.some((row) => row.trigger === "consumer_repeat_order")).toBe(true)
    expect(rows.some((row) => row.trigger === "consumer_inactive_30d")).toBe(true)
    expect(rows.some((row) => row.trigger === "consumer_inactive_90d")).toBe(false)
    expect(rows.find((row) => row.trigger === "affiliate_created")?.affiliate_id).toBe("aff_new")
    expect(rows.find((row) => row.trigger === "affiliate_approved")?.affiliate_id).toBe("aff_ok")
    expect(rows.find((row) => row.trigger === "affiliate_first_sale")?.affiliate_id).toBe("aff_ok")
    expect(rows.some((row) => row.trigger === "consumer_cart_abandoned")).toBe(false)
    const expanded = expandBroadcasts(
      rows.filter((row) => row.trigger === "brand_published"),
      snapshot({
        consumers: [
          {
            id: "econ_1",
            newsletter_enabled: true,
            created_at: "2026-06-01T00:00:00.000Z",
          },
          {
            id: "econ_2",
            newsletter_enabled: false,
            created_at: "2026-06-01T00:00:00.000Z",
          },
        ],
      })
    )
    expect(expanded).toHaveLength(1)
    expect(expanded[0].consumer_id).toBe("econ_1")
  })

  it("does not enroll a concept program and does not enroll a scheduled program twice", () => {
    const occurrences = collectOccurrences(
      snapshot({
        consumers: [
          {
            id: "econ_1",
            customer_id: null,
            newsletter_enabled: false,
            created_at: "2026-08-01T00:00:00.000Z",
          },
        ],
      }),
      ["consumer_inactive_30d"]
    )
    expect(
      planOccurrenceEnrollments({
        programs: [{ ...program, activation_status: "concept" }],
        occurrences,
        now,
      })
    ).toHaveLength(0)
    const active = planOccurrenceEnrollments({
      programs: [program],
      occurrences,
      now,
    })
    expect(active).toHaveLength(1)
    expect(dedupeEnrollCalls([...active, ...active])).toHaveLength(1)

    const scheduled = planScheduledEnrollments({
      programs: [
        {
          id: "elpr_plan",
          activation_status: "active",
          start_mode: "scheduled",
          audience: "consumers",
          scheduled_at: "2026-10-09T13:00",
          schedule_timezone: "Europe/Amsterdam",
          sequences: program.sequences,
        },
      ],
      recipients: [{ audience: "consumers", consumer_id: "econ_1" }],
      now,
    })
    expect(scheduled).toHaveLength(1)
    expect(scheduled[0].trigger_key).toBe("scheduled:elpr_plan:econ_1")
    const early = planScheduledEnrollments({
      programs: [
        {
          id: "elpr_plan",
          activation_status: "active",
          start_mode: "scheduled",
          audience: "consumers",
          scheduled_at: "2026-10-09T16:00",
          schedule_timezone: "Europe/Amsterdam",
          sequences: program.sequences,
        },
      ],
      recipients: [{ audience: "consumers", consumer_id: "econ_1" }],
      now,
    })
    expect(early).toHaveLength(0)
  })

  it("stops on a preference and does not queue the same step twice", () => {
    const enrollment = {
      id: "eenr_1",
      status: "active",
      contact_id: "ectc_1",
      program_id: "elpr_1",
      program_type: "newsletter",
      sequence_id: "eseq_1",
      sequence_step_id: "estp_1",
      next_step_at: now,
    }
    const steps = [
      {
        id: "estp_1",
        sequence_id: "eseq_1",
        step_order: 1,
        delay_minutes: 0,
        template_id: "ctpl_1",
        variant_id: "ctvr_1",
      },
    ]
    const stopped = planDueStep({
      enrollment,
      steps,
      versions: [],
      variantMatchesTemplate: true,
      suppressedCategories: [],
      priorStoppedForStep: false,
      preferenceAllows: false,
      now,
    })
    expect(stopped.action).toBe("stopped")
    if (stopped.action === "stopped") expect(stopped.reason).toBe("preference")

    const again = planDueStep({
      enrollment,
      steps,
      versions: [
        {
          id: "ctv_1",
          variant_id: "ctvr_1",
          version_number: 1,
          approval_status: "approved",
          activation_status: "active",
        },
      ],
      variantMatchesTemplate: true,
      suppressedCategories: [],
      priorStoppedForStep: false,
      priorQueuedForStep: true,
      now,
    })
    expect(again.action).toBe("resume")
  })

  it("starts the first delivery, a live promo and a three-brand category once", () => {
    const base = snapshot({
      consumers: [
        {
          id: "econ_1",
          customer_id: "cus_1",
          newsletter_enabled: true,
          created_at: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "econ_2",
          customer_id: "cus_2",
          newsletter_enabled: false,
          created_at: "2026-06-01T00:00:00.000Z",
        },
      ],
      orders: [
        { id: "ord_1", customer_id: "cus_1", created_at: "2026-09-01T00:00:00.000Z" },
        { id: "ord_2", customer_id: "cus_2", created_at: "2026-09-02T00:00:00.000Z" },
      ],
      shipments: [
        { id: "shp_1", order_id: "ord_1", status: "shipped", delivered_at: null },
        {
          id: "shp_2",
          order_id: "ord_1",
          status: "delivered",
          delivered_at: "2026-09-03T00:00:00.000Z",
        },
        {
          id: "shp_3",
          order_id: "ord_1",
          status: "delivered",
          delivered_at: "2026-09-10T00:00:00.000Z",
        },
        {
          id: "shp_4",
          order_id: "ord_2",
          status: "delivered",
          delivered_at: "2026-09-04T00:00:00.000Z",
        },
      ],
      prices: [
        {
          offer_id: "off_live",
          promo_price: 12,
          promo_starts_at: "2026-10-01T00:00:00.000Z",
          promo_ends_at: "2026-10-20T00:00:00.000Z",
        },
        {
          offer_id: "off_future",
          promo_price: 9,
          promo_starts_at: "2026-11-01T00:00:00.000Z",
          promo_ends_at: "2026-11-20T00:00:00.000Z",
        },
        {
          offer_id: "off_ended",
          promo_price: 8,
          promo_starts_at: "2026-08-01T00:00:00.000Z",
          promo_ends_at: "2026-09-01T00:00:00.000Z",
        },
        {
          offer_id: "off_empty",
          promo_price: 0,
          promo_starts_at: "2026-10-01T00:00:00.000Z",
          promo_ends_at: null,
        },
      ],
      versions: [
        { id: "ver_1", product_id: "prod_1", created_by_seller_id: "seller_a", publication_status: "Gepubliceerd", created_at: "2026-08-01T00:00:00.000Z" },
        { id: "ver_2", product_id: "prod_2", created_by_seller_id: "seller_a", publication_status: "Gepubliceerd", created_at: "2026-08-01T00:00:00.000Z" },
        { id: "ver_3", product_id: "prod_3", created_by_seller_id: "seller_a", publication_status: "Gepubliceerd", created_at: "2026-08-01T00:00:00.000Z" },
        { id: "ver_4", product_id: "prod_4", created_by_seller_id: "seller_a", publication_status: "Concept", created_at: "2026-08-01T00:00:00.000Z" },
        { id: "ver_5", product_id: "prod_5", created_by_seller_id: "seller_a", publication_status: "Gepubliceerd", created_at: "2026-08-01T00:00:00.000Z" },
      ],
      products: [
        { id: "prod_1", brand_id: "brand_a" },
        { id: "prod_2", brand_id: "brand_b" },
        { id: "prod_3", brand_id: "brand_c" },
        { id: "prod_4", brand_id: "brand_d" },
        { id: "prod_5", brand_id: "brand_a" },
      ],
      product_categories: [
        { product_id: "prod_1", category_id: "cat_ready" },
        { product_id: "prod_2", category_id: "cat_ready" },
        { product_id: "prod_3", category_id: "cat_ready" },
        { product_id: "prod_4", category_id: "cat_ready" },
        { product_id: "prod_1", category_id: "cat_short" },
        { product_id: "prod_5", category_id: "cat_short" },
      ],
    })

    const received = collectOccurrences(base, ["consumer_first_order_received"])
    expect(received.map((row) => row.occurrence_key).sort()).toEqual([
      "consumer_first_order_received:econ_1",
      "consumer_first_order_received:econ_2",
    ])
    expect(dedupeEnrollCalls(
      planOccurrenceEnrollments({
        programs: [{ ...program, start_mode: "event", start_trigger: "consumer_first_order_received" }],
        occurrences: [...received, ...received],
        now,
      }).map((call) => call)
    )).toHaveLength(2)

    const concept = planOccurrenceEnrollments({
      programs: [
        {
          ...program,
          activation_status: "concept",
          start_mode: "event",
          start_trigger: "consumer_first_order_received",
        },
      ],
      occurrences: received,
      now,
    })
    expect(concept).toHaveLength(0)

    const promos = collectOccurrences(base, ["offer_published"])
    expect(promos.map((row) => row.occurrence_key)).toEqual(["offer_published:off_live"])
    const promoAudience = expandBroadcasts(promos, base)
    expect(promoAudience.map((row) => row.consumer_id)).toEqual(["econ_1"])

    const categories = collectOccurrences(base, ["category_three_brands"])
    expect(categories.map((row) => row.occurrence_key)).toEqual(["category_three_brands:cat_ready"])
    const categoryAudience = expandBroadcasts(categories, base)
    expect(categoryAudience).toHaveLength(1)
    expect(categoryAudience[0].occurrence_key).toBe("category_three_brands:cat_ready:econ_1")

    const again = collectOccurrences(base, ["category_three_brands", "offer_published"])
    expect(again.map((row) => row.occurrence_key).sort()).toEqual(
      categories.concat(promos).map((row) => row.occurrence_key).sort()
    )
  })
})
