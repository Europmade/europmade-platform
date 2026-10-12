import { commissionPercentLabel } from "../../affiliate/affiliate-profile"
import { dedupeEnrollCalls, planOccurrenceEnrollments, planScheduledEnrollments } from "../automation-dispatch"
import {
  collectOccurrences,
  expandBroadcasts,
  type AutomationSnapshot,
} from "../automation-occurrences"
import { scheduledRecipients } from "../automation-run"
import { buildCampaignDirectory, catalogLinks, filterCampaignCalls } from "../campaign-selection"
import { presentCatalogProduct } from "../catalog-search"
import { isSendableVersion } from "../communication-cms-rules"
import { planDueStep } from "../orchestrator-rules"

const now = new Date("2026-10-09T12:00:00.000Z")

const snapshot: AutomationSnapshot = {
  now,
  sellers: [
    {
      id: "seller_on",
      onboarding_status: "Goedgekeurd",
      locale: "nl",
      communication_preferences: {
        platform_updates: false,
        seller_tips: false,
        product_opportunities: true,
        seller_campaigns: true,
        europmade_news: true,
      },
    },
    {
      id: "seller_off",
      onboarding_status: "Goedgekeurd",
      locale: "nl",
      communication_preferences: {
        platform_updates: true,
        seller_tips: false,
        product_opportunities: false,
        seller_campaigns: false,
        europmade_news: false,
      },
    },
    {
      id: "seller_suppressed",
      onboarding_status: "Goedgekeurd",
      locale: "nl",
      communication_preferences: {
        platform_updates: false,
        seller_tips: false,
        product_opportunities: true,
        seller_campaigns: true,
        europmade_news: true,
      },
    },
  ],
  versions: [
    {
      id: "ver_1",
      product_id: "prod_1",
      title: "Linnen tas",
      created_by_seller_id: "seller_on",
      publication_status: "Gepubliceerd",
      created_at: "2026-08-01T00:00:00.000Z",
    },
    {
      id: "ver_2",
      product_id: "prod_2",
      title: "Mok",
      created_by_seller_id: "seller_on",
      publication_status: "Gepubliceerd",
      created_at: "2026-08-01T00:00:00.000Z",
    },
    {
      id: "ver_3",
      product_id: "prod_3",
      title: "Lamp",
      created_by_seller_id: "seller_on",
      publication_status: "Gepubliceerd",
      created_at: "2026-08-01T00:00:00.000Z",
    },
  ],
  origins: [],
  orders: [],
  consumers: [
    {
      id: "econ_in",
      customer_id: "cus_in",
      newsletter_enabled: true,
      locale: "nl",
      newsletter_topics: { news: false, brands: true, offers: true },
      created_at: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "econ_out",
      customer_id: "cus_out",
      newsletter_enabled: false,
      locale: "nl",
      newsletter_topics: { news: false, brands: false, offers: false },
      created_at: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "econ_pref",
      customer_id: "cus_pref",
      newsletter_enabled: true,
      locale: "nl",
      newsletter_topics: { news: true, brands: false, offers: false },
      created_at: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "econ_en",
      customer_id: "cus_en",
      newsletter_enabled: true,
      locale: "en",
      newsletter_topics: { news: true, brands: true, offers: true },
      created_at: "2026-06-01T00:00:00.000Z",
    },
  ],
  brands: [],
  affiliates: [
    {
      id: "aff_on",
      onboarding_status: "Goedgekeurd",
      locale: "nl",
      communication_preferences: {
        affiliate_news: false,
        new_brands_products: true,
        affiliate_campaigns: true,
        commission_updates: false,
        content_opportunities: false,
      },
    },
    {
      id: "aff_off",
      onboarding_status: "Goedgekeurd",
      locale: "nl",
      communication_preferences: {
        affiliate_news: false,
        new_brands_products: false,
        affiliate_campaigns: false,
        commission_updates: true,
        content_opportunities: true,
      },
    },
  ],
  conversions: [],
  shipments: [],
  products: [
    { id: "prod_1", brand_id: "brand_a" },
    { id: "prod_2", brand_id: "brand_b" },
    { id: "prod_3", brand_id: "brand_c" },
  ],
  product_categories: [
    { product_id: "prod_1", category_id: "cat_1" },
    { product_id: "prod_2", category_id: "cat_1" },
    { product_id: "prod_3", category_id: "cat_1" },
  ],
  prices: [
    {
      offer_id: "off_live",
      promo_price: 12,
      promo_starts_at: "2026-10-01T00:00:00.000Z",
      promo_ends_at: "2026-10-20T00:00:00.000Z",
    },
  ],
  affiliate_links: [{ affiliate_id: "aff_on", product_id: "prod_1" }],
  organizations: [{ id: "org_stop", converted_seller_id: "seller_suppressed" }],
  contacts: [{ id: "ectc_stop", organization_id: "org_stop" }],
  suppressions: [{ contact_id: "ectc_stop", category: "marketing", active: true }],
}

const step = { id: "estp_1", step_order: 1, delay_minutes: 0, template_id: "ctpl_1", variant_id: "ctvr_1" }
const sequences = [{ id: "eseq_1", steps: [step] }]

const offerProgram = {
  id: "elpr_offer",
  activation_status: "active",
  program_type: "campaign",
  start_mode: "event",
  start_trigger: "offer_published",
  audience: "consumers",
  selection_criteria: { locales: ["nl"] },
  sequences,
}
const brandProgram = {
  id: "elpr_brands",
  activation_status: "active",
  program_type: "campaign",
  start_mode: "condition",
  start_trigger: "category_three_brands",
  audience: "consumers",
  selection_criteria: { locales: ["nl"] },
  sequences,
}
const sellerDue = {
  id: "elpr_seller",
  activation_status: "active",
  program_type: "campaign",
  start_mode: "scheduled",
  audience: "sellers",
  scheduled_at: "2026-10-09T13:00",
  schedule_timezone: "Europe/Amsterdam",
  sequences,
}
const sellerEarly = {
  ...sellerDue,
  id: "elpr_seller_early",
  scheduled_at: "2026-10-09T16:00",
}
const affiliateDue = {
  id: "elpr_aff",
  activation_status: "active",
  program_type: "campaign",
  start_mode: "scheduled",
  audience: "affiliates",
  scheduled_at: "2026-10-09T13:00",
  schedule_timezone: "Europe/Amsterdam",
  sequences,
}
const concept = { ...offerProgram, id: "elpr_concept", activation_status: "concept" }

function ids(calls: Array<{ consumer_id?: string; seller_id?: string; affiliate_id?: string }>) {
  return calls.map((call) => call.consumer_id || call.seller_id || call.affiliate_id).sort()
}

describe("communication chain", () => {
  const directory = buildCampaignDirectory({
    consumers: snapshot.consumers,
    sellers: snapshot.sellers,
    affiliates: snapshot.affiliates,
    links: catalogLinks(snapshot),
    organizations: snapshot.organizations,
    contacts: snapshot.contacts,
    suppressions: snapshot.suppressions,
  })
  const active = [offerProgram, brandProgram, sellerDue, sellerEarly, affiliateDue].filter(
    (program) => program.activation_status === "active"
  )

  it("selects the subscribed audience and keeps the others out", () => {
    const offers = expandBroadcasts(collectOccurrences(snapshot, ["offer_published"]), snapshot)
    const offerCalls = dedupeEnrollCalls(
      filterCampaignCalls(
        [...active, concept],
        planOccurrenceEnrollments({
          programs: [...active, concept],
          occurrences: [...offers, ...offers],
          now,
        }),
        directory
      )
    )
    expect(ids(offerCalls)).toEqual(["econ_in"])
    expect(offerCalls).toHaveLength(1)
    expect(offerCalls[0].entry_source).toBe("offer_published")

    const brands = expandBroadcasts(collectOccurrences(snapshot, ["category_three_brands"]), snapshot)
    const brandCalls = filterCampaignCalls(
      active,
      planOccurrenceEnrollments({ programs: active, occurrences: brands, now }),
      directory
    )
    expect(ids(brandCalls)).toEqual(["econ_in"])

    const scheduled = dedupeEnrollCalls(
      filterCampaignCalls(
        active,
        planScheduledEnrollments({
          programs: active,
          recipients: scheduledRecipients(snapshot),
          now,
        }),
        directory
      )
    )
    expect(ids(scheduled.filter((call) => call.program_id === "elpr_seller"))).toEqual(["seller_on"])
    expect(scheduled.some((call) => call.program_id === "elpr_seller_early")).toBe(false)
    expect(ids(scheduled.filter((call) => call.program_id === "elpr_aff"))).toEqual(["aff_on"])
    expect(scheduled.some((call) => call.consumer_id === "econ_out" || call.seller_id === "seller_off")).toBe(
      false
    )
    expect(scheduled.some((call) => call.affiliate_id === "aff_off" || call.seller_id === "seller_suppressed")).toBe(
      false
    )
  })

  it("queues only an approved active version and records a stopped history otherwise", () => {
    const enrollment = {
      id: "eenr_1",
      status: "active",
      contact_id: null,
      consumer_id: "econ_in",
      program_id: "elpr_offer",
      program_type: "campaign",
      sequence_id: "eseq_1",
      sequence_step_id: "estp_1",
      next_step_at: now,
    }
    const draft = {
      id: "ctv_draft",
      variant_id: "ctvr_1",
      version_number: 1,
      approval_status: "draft",
      activation_status: "inactive",
    }
    const approved = {
      id: "ctv_live",
      variant_id: "ctvr_1",
      version_number: 2,
      approval_status: "approved",
      activation_status: "active",
    }
    expect(isSendableVersion(draft)).toBe(false)
    expect(isSendableVersion(approved)).toBe(true)

    const blocked = planDueStep({
      enrollment,
      steps: [step],
      versions: [draft],
      variantMatchesTemplate: true,
      suppressedCategories: [],
      priorStoppedForStep: false,
      preferenceAllows: true,
      audienceMatches: true,
      now,
    })
    expect(blocked.action).toBe("stopped")
    if (blocked.action === "stopped") {
      expect(blocked.reason).toBe("no_sendable_version")
      expect(blocked.event.status).toBe("stopped")
      expect(blocked.event.template_version_id).toBeNull()
    }

    const queued = planDueStep({
      enrollment,
      steps: [step],
      versions: [draft, approved],
      variantMatchesTemplate: true,
      suppressedCategories: [],
      priorStoppedForStep: false,
      preferenceAllows: true,
      audienceMatches: true,
      now,
    })
    expect(queued.action).toBe("queued")
    if (queued.action === "queued") {
      expect(queued.event.status).toBe("queued")
      expect(queued.event.template_version_id).toBe("ctv_live")
      expect(queued.event.consumer_id).toBe("econ_in")
    }

    const suppressed = planDueStep({
      enrollment: { ...enrollment, id: "eenr_stop", contact_id: "ectc_stop", consumer_id: null },
      steps: [step],
      versions: [approved],
      variantMatchesTemplate: true,
      suppressedCategories: ["marketing"],
      priorStoppedForStep: false,
      preferenceAllows: true,
      audienceMatches: true,
      now,
    })
    expect(suppressed.action).toBe("stopped")
    if (suppressed.action === "stopped") {
      expect(suppressed.reason).toBe("suppressed")
      expect(suppressed.event.status).toBe("stopped")
    }
  })

  it("builds the product block from the catalog image, path and commission", () => {
    const block = presentCatalogProduct({
      product_id: "prod_1",
      title: "Linnen tas",
      description: "Een tas van Europees linnen. Gemaakt in Portugal.",
      media_items: [
        { media_type: "Galerij", storage_reference: "https://cdn.example/gallery.jpg" },
        { media_type: "Hoofdafbeelding", storage_reference: "https://cdn.example/main.jpg" },
      ],
    })
    expect(block).toEqual({
      id: "prod_1",
      title: "Linnen tas",
      description: "Een tas van Europees linnen. Gemaakt in Portugal.",
      image_url: "https://cdn.example/main.jpg",
      href: "/product/prod_1",
    })
    expect(commissionPercentLabel(11)).toBe("11%")
    expect(presentCatalogProduct({ product_id: "prod_1", title: "Linnen tas", media_items: [{ storage_reference: "not a url" }] })?.image_url).toBe("")
  })
})
