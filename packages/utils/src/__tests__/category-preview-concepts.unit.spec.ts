import { buildCategoryV2Facets } from "../category-v2-listing"
import { choiceAssistantMatches, planChoiceAssistant } from "../category-v2-choice"
import {
  conceptPreviewPriceCents,
  conceptPreviewSpecs,
  conceptProductBelongsInPreview,
  isCmsPreviewAdminOrigin,
  mergeDraftPreviewProducts,
} from "../category-preview-concepts"

const dishwasher = {
  slug: "prod_concept_dish",
  title: "Miele G 5132 SC",
  priceCents: 0,
  offerCount: 0,
  specs: [{ code: "energielabel", value: "D" }],
}

describe("category draft preview concepts", () => {
  it("includes an existing concept product in the draft list", () => {
    const merged = mergeDraftPreviewProducts(
      [{ slug: "prod_published", title: "Bosch" }],
      [{ slug: dishwasher.slug, title: dishwasher.title }]
    )
    expect(merged.map((product) => product.slug)).toEqual([
      "prod_published",
      dishwasher.slug,
    ])
  })

  it("does not replace a published product with a concept copy", () => {
    const merged = mergeDraftPreviewProducts(
      [{ slug: "prod_published", title: "Bosch live" }],
      [{ slug: "prod_published", title: "Bosch concept" }]
    )
    expect(merged).toEqual([{ slug: "prod_published", title: "Bosch live" }])
  })

  it("keeps a concept unsellable even when a real price exists", () => {
    expect(conceptPreviewPriceCents(899)).toBe(89900)
    expect(conceptPreviewPriceCents(null)).toBe(0)
    expect(conceptPreviewPriceCents(0)).toBe(0)
    const card = {
      ...dishwasher,
      priceCents: conceptPreviewPriceCents(899),
      offerCount: 0,
    }
    expect(card.offerCount).toBe(0)
    expect(card.priceCents).toBeGreaterThan(0)
  })

  it("drops empty specifications and does not invent filter values", () => {
    expect(
      conceptPreviewSpecs([
        { code: "energielabel", value: "D" },
        { code: "kleur", value: "  " },
        { code: "", value: "White" },
      ])
    ).toEqual([{ code: "energielabel", value: "D" }])
    const facets = buildCategoryV2Facets(
      [
        { code: "energielabel", name: "Energielabel", dataType: "Keuzelijst" },
        { code: "droogtechniek", name: "Droogtechniek", dataType: "Keuzelijst" },
      ],
      [{ specs: conceptPreviewSpecs([{ code: "energielabel", value: "D" }, { code: "droogtechniek", value: "" }]) }],
      []
    )
    expect(facets.map((facet) => facet.attributeKey)).toEqual(["energielabel"])
  })

  it("does not let concept products satisfy the choice assistant", () => {
    const plan = planChoiceAssistant({
      products: [
        dishwasher,
        {
          slug: "prod_concept_2",
          title: "Miele G 7040",
          priceCents: conceptPreviewPriceCents(999),
          offerCount: 0,
          specs: [{ code: "energielabel", value: "C" }],
        },
        {
          slug: "prod_published",
          title: "Bosch",
          priceCents: 175395,
          offerCount: 1,
          specs: [],
        },
      ],
      attributes: [
        { code: "energielabel", name: "Energielabel", dataType: "Keuzelijst", comparable: true },
      ],
    })
    expect(plan.ready).toBe(false)
    expect(plan.questions).toEqual([])
    expect(plan.source).toBeNull()
  })

  it("uses stored concept specifications in preview catalog mode without treating them as sellable", () => {
    const products = [
      dishwasher,
      {
        slug: "prod_concept_2",
        title: "Miele G 7040",
        priceCents: 0,
        offerCount: 0,
        previewStatus: "concept" as const,
        specs: [{ code: "energielabel", value: "C" }],
      },
    ]
    const attributes = [
      { code: "energielabel", name: "Energielabel", dataType: "Keuzelijst", comparable: true },
    ]
    const storefront = planChoiceAssistant({ products, attributes })
    const preview = planChoiceAssistant({ products, attributes, mode: "preview_catalog" })
    expect(storefront.ready).toBe(false)
    expect(preview.ready).toBe(true)
    expect(preview.source).toBe("preview_catalog")
    expect(preview.questions.map((question) => question.code)).toEqual(["energielabel"])
    expect(choiceAssistantMatches(products, { energielabel: "d" })).toEqual([])
    expect(choiceAssistantMatches(products, { energielabel: "d" }, "preview_catalog").map((product) => product.slug)).toEqual([
      dishwasher.slug,
    ])
  })

  it("rejects archived products, other publication statuses, and other categories", () => {
    const base = {
      title: "Miele",
      lifecycleStatus: "Concept gecontroleerd",
      publicationStatus: "Concept",
      categorySlugs: ["vaatwassers"],
      categoryFilter: "vaatwassers",
    }
    expect(conceptProductBelongsInPreview(base)).toBe(true)
    expect(conceptProductBelongsInPreview({ ...base, publicationStatus: "Gepubliceerd" })).toBe(false)
    expect(conceptProductBelongsInPreview({ ...base, lifecycleStatus: "Gearchiveerd" })).toBe(false)
    expect(conceptProductBelongsInPreview({ ...base, categorySlugs: ["was-droog"] })).toBe(false)
    expect(conceptProductBelongsInPreview({ ...base, categoryFilter: "" })).toBe(false)
  })

  it("accepts concept products only from the admin preview origin", () => {
    expect(isCmsPreviewAdminOrigin("http://localhost:3001")).toBe(true)
    expect(isCmsPreviewAdminOrigin("http://localhost:3000")).toBe(false)
    expect(isCmsPreviewAdminOrigin("https://example.com")).toBe(false)
  })
})
