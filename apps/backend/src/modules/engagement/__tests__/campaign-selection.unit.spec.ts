import { planDueStep } from "../orchestrator-rules"
import {
  buildCampaignDirectory,
  catalogLinks,
  describeCampaignCriteria,
  filterCampaignCalls,
  matchesCampaignRecipient,
  normalizeCampaignCriteria,
  storedCampaignCriteria,
} from "../campaign-selection"

const now = new Date("2026-10-09T12:00:00.000Z")

describe("campaign selection", () => {
  const directory = buildCampaignDirectory({
    consumers: [
      { id: "econ_nl", locale: "nl-NL", newsletter_enabled: true },
      { id: "econ_en", locale: "en", newsletter_enabled: true },
      { id: "econ_out", locale: "nl", newsletter_enabled: false },
    ],
    sellers: [
      { id: "seller_nl", locale: "nl", communication_preferences: { europmade_news: true, seller_campaigns: false } },
      { id: "seller_off", locale: "nl", communication_preferences: { europmade_news: false, seller_campaigns: false } },
      { id: "seller_de", locale: "de" },
    ],
    affiliates: [
      {
        id: "aff_ok",
        locale: "nl",
        onboarding_status: "Goedgekeurd",
        communication_preferences: {
          affiliate_news: true,
          new_brands_products: true,
          affiliate_campaigns: false,
          commission_updates: true,
          content_opportunities: false,
        },
      },
      {
        id: "aff_off",
        locale: "nl",
        onboarding_status: "Goedgekeurd",
        communication_preferences: {
          affiliate_news: false,
          affiliate_campaigns: false,
          new_brands_products: false,
        },
      },
      { id: "aff_new", locale: "nl", onboarding_status: "Ingediend" },
    ],
    links: catalogLinks({
      versions: [
        { product_id: "prod_1", created_by_seller_id: "seller_nl", publication_status: "Gepubliceerd" },
        { product_id: "prod_2", created_by_seller_id: "seller_de", publication_status: "Concept" },
      ],
      products: [
        { id: "prod_1", brand_id: "brand_a" },
        { id: "prod_2", brand_id: "brand_b" },
      ],
      product_categories: [{ product_id: "prod_1", category_id: "cat_1" }],
      affiliate_links: [{ affiliate_id: "aff_ok", product_id: "prod_1" }],
    }),
    organizations: [{ id: "org_1", converted_seller_id: "seller_de" }],
    contacts: [{ id: "ectc_1", organization_id: "org_1" }],
    suppressions: [{ contact_id: "ectc_1", category: "marketing", active: true }],
  })

  it("keeps language, catalog facts and exclusions, and records the criteria", () => {
    expect(storedCampaignCriteria({ locales: ["NL", "nope"], product_ids: ["prod_1"] })).toEqual({
      locales: ["nl"],
      product_ids: ["prod_1"],
      brand_ids: [],
      category_ids: [],
    })
    expect(storedCampaignCriteria({})).toBeNull()
    expect(normalizeCampaignCriteria({ brand_ids: ["brand_a", "brand_a"] }).brand_ids).toEqual(["brand_a"])

    expect(matchesCampaignRecipient("consumers", directory.consumers.get("econ_nl"), { locales: ["nl"] })).toBe(true)
    expect(matchesCampaignRecipient("consumers", directory.consumers.get("econ_en"), { locales: ["nl"] })).toBe(false)
    expect(matchesCampaignRecipient("consumers", directory.consumers.get("econ_out"), null)).toBe(false)
    expect(
      matchesCampaignRecipient("consumers", directory.consumers.get("econ_nl"), { brand_ids: ["brand_missing"] })
    ).toBe(true)

    expect(matchesCampaignRecipient("sellers", directory.sellers.get("seller_nl"), { brand_ids: ["brand_a"] })).toBe(true)
    expect(matchesCampaignRecipient("sellers", directory.sellers.get("seller_nl"), { category_ids: ["cat_1"] })).toBe(true)
    expect(matchesCampaignRecipient("sellers", directory.sellers.get("seller_nl"), { product_ids: ["prod_2"] })).toBe(false)
    expect(matchesCampaignRecipient("sellers", directory.sellers.get("seller_off"), null)).toBe(false)
    expect(matchesCampaignRecipient("sellers", directory.sellers.get("seller_de"), null)).toBe(false)

    expect(matchesCampaignRecipient("affiliates", directory.affiliates.get("aff_ok"), { product_ids: ["prod_1"] })).toBe(true)
    expect(matchesCampaignRecipient("affiliates", directory.affiliates.get("aff_off"), null)).toBe(false)
    expect(matchesCampaignRecipient("affiliates", directory.affiliates.get("aff_new"), null)).toBe(false)
    expect(
      matchesCampaignRecipient(
        "affiliates",
        {
          id: "aff_commission",
          approved: true,
          preferences: {
            affiliate_news: false,
            new_brands_products: false,
            affiliate_campaigns: false,
            commission_updates: true,
            content_opportunities: true,
          },
        },
        null,
        "affiliate_campaigns"
      )
    ).toBe(false)
    expect(
      matchesCampaignRecipient(
        "consumers",
        { id: "econ_news", newsletter_enabled: true, topics: { news: true, brands: false, offers: false } },
        null,
        "offers"
      )
    ).toBe(false)
    expect(
      matchesCampaignRecipient(
        "sellers",
        { id: "seller_unset", preferences: null },
        null,
        "europmade_news"
      )
    ).toBe(false)

    const calls = filterCampaignCalls(
      [
        {
          id: "elpr_news",
          program_type: "newsletter",
          audience: "consumers",
          selection_criteria: { locales: ["nl"] },
        },
        { id: "elpr_seller", program_type: "onboarding", audience: "sellers" },
      ],
      [
        { program_id: "elpr_news", consumer_id: "econ_nl" },
        { program_id: "elpr_news", consumer_id: "econ_en" },
        { program_id: "elpr_news", consumer_id: "econ_out" },
        { program_id: "elpr_seller", seller_id: "seller_de" },
      ],
      directory
    )
    expect(calls.map((call) => call.consumer_id || call.seller_id)).toEqual(["econ_nl", "seller_de"])
    expect(describeCampaignCriteria("consumers", { locales: ["nl"], brand_ids: ["brand_a"] })).toMatch(
      /filteren geen consumenten/
    )
  })

  it("uses the same content gate for a planned campaign and an event automation", () => {
    const enrollment = {
      id: "eenr_1",
      status: "active",
      contact_id: null,
      consumer_id: "econ_nl",
      program_id: "elpr_news",
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
    const draft = planDueStep({
      enrollment,
      steps,
      versions: [
        {
          id: "ctv_1",
          variant_id: "ctvr_1",
          version_number: 1,
          approval_status: "draft",
          activation_status: "inactive",
        },
      ],
      variantMatchesTemplate: true,
      suppressedCategories: [],
      priorStoppedForStep: false,
      preferenceAllows: true,
      audienceMatches: true,
      now,
    })
    expect(draft.action).toBe("stopped")
    if (draft.action === "stopped") expect(draft.reason).toBe("no_sendable_version")

    const approved = planDueStep({
      enrollment: { ...enrollment, program_type: "campaign", entry_source: "scheduled" },
      steps,
      versions: [
        {
          id: "ctv_2",
          variant_id: "ctvr_1",
          version_number: 2,
          approval_status: "approved",
          activation_status: "active",
        },
      ],
      variantMatchesTemplate: true,
      suppressedCategories: ["marketing"],
      priorStoppedForStep: false,
      preferenceAllows: true,
      audienceMatches: true,
      now,
    })
    expect(approved.action).toBe("stopped")
    if (approved.action === "stopped") expect(approved.reason).toBe("suppressed")
  })
})
