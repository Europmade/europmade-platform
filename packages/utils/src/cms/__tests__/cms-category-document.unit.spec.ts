import {
  CATEGORY_CMS_BLOCK_TYPES,
  CATEGORY_CMS_PROFILE_ALLOWLIST,
  CATEGORY_CMS_PROFILE_OPTIONAL,
  categoryCmsBlockId,
  createDefaultCategoryCmsDocument,
  getUspBar,
  isUspSlotManualOverride,
  mergeUspManualOverrides,
  normalizeCategoryCmsDocument,
  proposeUspSlotUpdate,
  resolveCategoryCmsProfile,
  validateCategoryCmsDocument,
  type CategoryCmsBlockType,
  type CategoryCmsProfile,
  type CategoryTaxonomyNode,
} from "../../cms-category-document"

const tree: CategoryTaxonomyNode[] = [
  { id: "l1", slug: "elektronika", parent_id: null },
  { id: "l2", slug: "home-en-living", parent_id: "wonen" },
  { id: "wonen", slug: "wonen", parent_id: null },
  { id: "l3", slug: "vaatwassers", parent_id: "l2b" },
  { id: "l2b", slug: "inbouwapparatuur", parent_id: "huis" },
  { id: "huis", slug: "huishouden", parent_id: null },
  { id: "deep", slug: "te-diep", parent_id: "l3" },
  { id: "a", slug: "cycle", parent_id: "b" },
  { id: "b", slug: "cycle-parent", parent_id: "a" },
]

const loc = (nl: string) => ({ nl, en: "", de: "", fr: "" })

describe("category cms profile", () => {
  it("maps taxonomy depth to level 1, 2 and 3", () => {
    expect(resolveCategoryCmsProfile(tree, "elektronika")).toEqual({
      ok: true,
      profile: "level_1",
      depth: 1,
    })
    expect(resolveCategoryCmsProfile(tree, "home-en-living")).toEqual({
      ok: true,
      profile: "level_2",
      depth: 2,
    })
    expect(resolveCategoryCmsProfile(tree, "vaatwassers")).toEqual({
      ok: true,
      profile: "level_3",
      depth: 3,
    })
  })

  it("does not invent level_3 for an unknown, cyclic or deeper category", () => {
    expect(resolveCategoryCmsProfile(tree, "missing").ok).toBe(false)
    expect(resolveCategoryCmsProfile(tree, "te-diep")).toMatchObject({
      ok: false,
      code: "taxonomy_depth",
    })
    expect(resolveCategoryCmsProfile(tree, "cycle")).toMatchObject({
      ok: false,
      code: "taxonomy_cycle",
    })
  })
})

describe("category cms document v2", () => {
  const profiles: CategoryCmsProfile[] = ["level_1", "level_2", "level_3"]
  const expectedAllow: Record<CategoryCmsProfile, CategoryCmsBlockType[]> = {
    level_1: [
      "hero",
      "usp_bar",
      "subcategory_tiles",
      "product_carousel",
      "brand_overview",
      "why_europmade",
    ],
    level_2: [
      "hero",
      "usp_bar",
      "product_group_tiles",
      "choice_assistant_cta",
      "advice_compare",
    ],
    level_3: [
      "hero",
      "usp_bar",
      "filters",
      "product_grid",
      "product_comparison",
      "buying_guide",
    ],
  }
  const expectedOptional: Record<CategoryCmsProfile, CategoryCmsBlockType[]> = {
    level_1: ["intro", "seo_content", "ad_slot", "faq", "inspiration"],
    level_2: [
      "intro",
      "seo_content",
      "ad_slot",
      "brand_overview",
      "faq",
      "phase_navigation",
      "shortcuts",
      "brand_story",
      "why_europmade",
    ],
    level_3: [
      "intro",
      "faq",
      "spec_explain",
      "related_products",
      "seo_content",
      "ad_slot",
      "brand_overview",
      "choice_assistant_cta",
      "shortcuts",
      "featured_product",
      "maintenance",
      "why_europmade",
    ],
  }

  it("pins every profile allowlist and rejects every block outside it", () => {
    expect(CATEGORY_CMS_PROFILE_ALLOWLIST).toEqual(expectedAllow)
    expect(CATEGORY_CMS_PROFILE_OPTIONAL).toEqual(expectedOptional)
    for (const profile of profiles) {
      const allowed = new Set<CategoryCmsBlockType>([
        ...expectedAllow[profile],
        ...expectedOptional[profile],
      ])
      for (const type of CATEGORY_CMS_BLOCK_TYPES) {
        if (allowed.has(type)) continue
        const doc = createDefaultCategoryCmsDocument(profile, { slug: "demo" })
        doc.blocks.push({ id: "bad", type, visible: true } as never)
        doc.block_meta.bad = doc.block_meta[doc.blocks[0]!.id]!
        expect(
          validateCategoryCmsDocument(doc, { slug: "demo" }).some(
            (issue) => issue.code === "block_not_allowed"
          )
        ).toBe(true)
      }
    }
  })

  it("builds a valid allowlist document with four empty USP slots and stable ids", () => {
    for (const profile of profiles) {
      const first = createDefaultCategoryCmsDocument(profile, { slug: "Demo" })
      const second = createDefaultCategoryCmsDocument(profile, { slug: "demo" })
      expect(JSON.stringify(first)).toBe(JSON.stringify(second))
      expect(getUspBar(first)?.slots).toHaveLength(4)
      expect(getUspBar(first)?.slots.every((slot) => slot.title.nl === "" && slot.body.nl === "")).toBe(true)
      expect(JSON.stringify(first)).not.toContain("Gemaakt in Europa")
      expect(
        first.blocks.some((block) =>
          [
            "inspiration",
            "phase_navigation",
            "shortcuts",
            "featured_product",
            "maintenance",
            "brand_story",
          ].includes(block.type)
        )
      ).toBe(false)
      expect(validateCategoryCmsDocument(first, { expectedProfile: profile, slug: "demo" })).toEqual([])
      for (const type of CATEGORY_CMS_PROFILE_ALLOWLIST[profile]) {
        expect(first.blocks.some((block) => block.type === type)).toBe(true)
        expect(first.blocks.find((block) => block.type === type)?.id).toBe(
          categoryCmsBlockId("demo", profile, type)
        )
      }
    }
  })

  it("rejects blocks outside the allowlist and a broken required order", () => {
    for (const profile of profiles) {
      const allowed = new Set<CategoryCmsBlockType>([
        ...CATEGORY_CMS_PROFILE_ALLOWLIST[profile],
        ...CATEGORY_CMS_PROFILE_OPTIONAL[profile],
      ])
      const doc = createDefaultCategoryCmsDocument(profile, { slug: "demo" })
      const outsider = (["brand_story", "product_grid", "filters", "buying_guide"] as const).find(
        (type) => !allowed.has(type)
      )
      expect(outsider).toBeTruthy()
      doc.blocks.push({
        id: "bad",
        type: outsider!,
        visible: true,
        title: loc(""),
        body: loc(""),
        brand_slug: null,
      } as never)
      doc.block_meta.bad = doc.block_meta[doc.blocks[0]!.id]!
      const codes = validateCategoryCmsDocument(doc, { slug: "demo" }).map((issue) => issue.code)
      expect(codes).toContain("block_not_allowed")

      const swapped = createDefaultCategoryCmsDocument(profile, { slug: "demo" })
      const [first, secondBlock] = swapped.blocks
      swapped.blocks[0] = secondBlock!
      swapped.blocks[1] = first!
      expect(
        validateCategoryCmsDocument(swapped, { slug: "demo" }).some((issue) => issue.code === "block_order")
      ).toBe(true)
    }
  })

  it("upgrades v1 content without dropping faq on level 1 or sample USP copy", () => {
    const v1 = {
      title: loc("Elektronica"),
      intro: loc("Intro"),
      madeInEurope: loc("Echt Europa"),
      usps: [{ id: "old", title: loc("Stil"), body: loc("Laag"), icon_key: "quiet" }],
      faq: [{ id: "f1", question: loc("Vraag?"), answer: loc("Antwoord") }],
    }
    const doc = normalizeCategoryCmsDocument(v1, { slug: "elektronika", profile: "level_1" })
    expect(doc.profile).toBe("level_1")
    expect(doc.blocks.some((block) => block.type === "buying_guide")).toBe(false)
    expect(getUspBar(doc)?.slots[0]?.title.nl).toBe("Stil")
    expect(getUspBar(doc)?.slots[1]?.title.nl).toBe("")
    expect(doc.legacy && (doc.legacy as { faq?: Array<{ question?: { nl?: string } }> }).faq?.[0]?.question?.nl).toBe(
      "Vraag?"
    )
    expect(validateCategoryCmsDocument(doc, { expectedProfile: "level_1", slug: "elektronika" })).toEqual([])
    const again = normalizeCategoryCmsDocument(doc, { slug: "elektronika", profile: "level_1" })
    expect(JSON.stringify(again)).toBe(JSON.stringify(doc))
  })

  it("keeps an existing v2 profile when it disagrees with the requested profile", () => {
    const doc = createDefaultCategoryCmsDocument("level_1", { slug: "elektronika" })
    const kept = normalizeCategoryCmsDocument(doc, { slug: "elektronika", profile: "level_3" })
    expect(kept.profile).toBe("level_1")
  })

  it("marks only the USP slot that actually changed and blocks AI replacement", () => {
    const slug = "elektronika"
    const profile = "level_1" as const
    const previous = normalizeCategoryCmsDocument(
      { usps: [{ title: loc("Een"), body: loc("A") }, { title: loc("Twee"), body: loc("B") }] },
      { slug, profile }
    )
    const next = normalizeCategoryCmsDocument(
      { usps: [{ title: loc("Gewijzigd"), body: loc("A") }, { title: loc("Twee"), body: loc("B") }] },
      { slug, profile }
    )
    const merged = mergeUspManualOverrides(previous, next)
    const usp = getUspBar(merged)!
    expect(isUspSlotManualOverride(merged.block_meta[usp.id], 0)).toBe(true)
    expect(isUspSlotManualOverride(merged.block_meta[usp.id], 1)).toBe(false)
    expect(isUspSlotManualOverride(merged.block_meta[usp.id], 2)).toBe(false)
    expect(
      proposeUspSlotUpdate(merged, 0, { title: loc("AI") }, { force: false })
    ).toBeNull()
    const open = proposeUspSlotUpdate(merged, 1, { title: loc("AI") }, { force: false })
    expect(open && getUspBar(open)?.slots[1]?.title.nl).toBe("AI")
  })
})
