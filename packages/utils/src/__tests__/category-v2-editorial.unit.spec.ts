import { createDefaultCategoryCmsDocument, type CategoryCmsDocumentV2 } from "../cms-category-document"
import {
  categoryFaqAllowed,
  categoryV2PreviewDocument,
  categoryV2StorefrontDocument,
  explainCategorySpecs,
  orderedFaqItems,
  selectRelatedCategoryProducts,
  visibleFaqItems,
} from "../category-v2-editorial"

const loc = (nl: string) => ({ nl, en: "", de: "", fr: "" })

describe("category v2 editorial blocks", () => {
  it("renders FAQ on level 1, 2 and 3 and keeps the stored order", () => {
    expect(categoryFaqAllowed("level_1")).toBe(true)
    expect(categoryFaqAllowed("level_2")).toBe(true)
    expect(categoryFaqAllowed("level_3")).toBe(true)
    const items = visibleFaqItems(
      [
        { id: "b", question: loc("Tweede?"), answer: loc("Twee") },
        { id: "a", question: loc("Eerste?"), answer: loc("Een") },
      ],
      "nl"
    )
    expect(items.map((item) => item.id)).toEqual(["b", "a"])
    expect(orderedFaqItems(items).map((item) => item.question)).toEqual(["Tweede?", "Eerste?"])
  })

  it("hides an FAQ without a question and does not add questions", () => {
    expect(
      visibleFaqItems(
        [
          { id: "empty", question: loc("  "), answer: loc("Antwoord") },
          { id: "kept", question: loc("Blijft?"), answer: loc("") },
        ],
        "nl"
      ).map((item) => item.id)
    ).toEqual(["kept"])
    expect(visibleFaqItems([], "en")).toEqual([])
  })

  it("uses the locale and falls back to Dutch", () => {
    const items = visibleFaqItems(
      [{ id: "q", question: { nl: "Nederlands?", en: "English?", de: "", fr: "" }, answer: loc("Ja") }],
      "en"
    )
    expect(items[0]?.question).toBe("English?")
    const fallback = visibleFaqItems(
      [{ id: "q", question: loc("Nederlands?"), answer: loc("Ja") }],
      "de"
    )
    expect(fallback[0]?.question).toBe("Nederlands?")
  })

  it("renders a level 3 explanation and recognizes a stored attribute code", () => {
    const views = explainCategorySpecs(
      [
        {
          id: "sound",
          specCode: "geluidsniveau",
          title: "Geluidsniveau",
          body: "Lager is stiller.",
        },
      ],
      [
        {
          code: "geluidsniveau",
          name: "Geluidsniveau",
          dataType: "Numeriek",
          unit: "dB",
          optionValues: null,
        },
      ]
    )
    expect(views).toEqual([
      {
        id: "sound",
        title: "Geluidsniveau",
        body: "Lager is stiller.",
        recognized: true,
        label: "Geluidsniveau",
        dataType: "Numeriek",
        unit: "dB",
        optionValues: [],
      },
    ])
  })

  it("keeps the editorial text when product values are absent and hides a missing scale", () => {
    const views = explainCategorySpecs(
      [{ id: "energy", specCode: "energielabel", title: "", body: "De letter staat op het label." }],
      [{ code: "energielabel", name: "Energielabel", dataType: "Keuzelijst", unit: "-", optionValues: "geen json" }]
    )
    expect(views[0]?.body).toBe("De letter staat op het label.")
    expect(views[0]?.optionValues).toEqual([])
    expect(views[0]).not.toHaveProperty("scale")
    expect(JSON.stringify(views)).not.toMatch(/[0-9]+\s*%/)
  })

  it("shows stored choice values and drops an unknown code's scale", () => {
    const views = explainCategorySpecs(
      [
        { id: "known", specCode: "kleur", title: "Kleur", body: "De kastkleur." },
        { id: "unknown", specCode: "verzonnen", title: "Overig", body: "Alleen deze tekst." },
      ],
      [{ code: "kleur", name: "Kleur", dataType: "Keuzelijst", optionValues: '["Wit","Zwart","Wit"]' }]
    )
    expect(views[0]?.optionValues).toEqual(["Wit", "Zwart"])
    expect(views[1]).toMatchObject({ recognized: false, optionValues: [], label: null })
  })

  it("selects only stored relations and keeps one card per product", () => {
    const cards = selectRelatedCategoryProducts(
      ["prod_a"],
      [
        { from_product_id: "prod_a", to_product_id: "prod_salt", relation_type: "Accessoire" },
        { from_product_id: "prod_a", to_product_id: "prod_salt", relation_type: "Gerelateerd" },
        { from_product_id: "prod_a", to_product_id: "prod_a", relation_type: "Gerelateerd" },
        { from_product_id: "other", to_product_id: "prod_other", relation_type: "Gerelateerd" },
        { from_product_id: "prod_a", to_product_id: "prod_guess", relation_type: "Onbekend" },
      ],
      [
        { id: "prod_salt", title: "Zout" },
        { id: "prod_same", title: "Zelfde categorie" },
        { id: "prod_other", title: "Niet gekoppeld" },
      ],
      8
    )
    expect(cards.map((card) => card.id)).toEqual(["prod_salt"])
  })

  it("returns no related cards when no relation can be resolved", () => {
    expect(
      selectRelatedCategoryProducts(
        ["prod_a"],
        [],
        [{ id: "prod_same", title: "Zelfde categorie" }],
        8
      )
    ).toEqual([])
  })

  it("uses the draft document in preview and only the published document on the storefront", () => {
    const published = createDefaultCategoryCmsDocument("level_3", { slug: "vaatwassers" })
    const draft: CategoryCmsDocumentV2 = {
      ...published,
      blocks: [
        ...published.blocks,
        {
          id: "blk_vaatwassers_level_3_faq",
          type: "faq",
          visible: true,
          title: loc("Vragen"),
          items: [{ id: "q", question: loc("Past hij?"), answer: loc("Meet de nis.") }],
        },
      ],
    }
    expect(categoryV2PreviewDocument(draft)?.blocks.some((block) => block.type === "faq")).toBe(true)
    expect(categoryV2PreviewDocument(published)?.blocks.some((block) => block.type === "faq")).toBe(false)
    const storefront = categoryV2StorefrontDocument(published, "level_3", "vaatwassers")
    expect(storefront.blocks.some((block) => block.type === "faq")).toBe(false)
    expect(storefront.blocks.map((block) => block.type)).toEqual(published.blocks.map((block) => block.type))
  })

  it("keeps the required blocks of every profile", () => {
    expect(createDefaultCategoryCmsDocument("level_1", { slug: "huishouden" }).blocks.map((block) => block.type)).toEqual([
      "hero",
      "usp_bar",
      "subcategory_tiles",
      "product_carousel",
      "brand_overview",
      "why_europmade",
    ])
    expect(createDefaultCategoryCmsDocument("level_2", { slug: "inbouwapparatuur" }).blocks.map((block) => block.type)).toEqual([
      "hero",
      "usp_bar",
      "product_group_tiles",
      "choice_assistant_cta",
      "advice_compare",
      "brand_overview",
    ])
    expect(createDefaultCategoryCmsDocument("level_3", { slug: "vaatwassers" }).blocks.map((block) => block.type)).toEqual([
      "hero",
      "usp_bar",
      "filters",
      "product_grid",
      "product_comparison",
      "buying_guide",
    ])
  })
})
