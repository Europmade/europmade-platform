import {
  createDefaultCategoryCmsDocument,
  planCategoryStructureDraft,
  realignCategoryCmsDocument,
  validateCategoryCmsDocument,
} from "../cms-category-document"

describe("category structure draft", () => {
  it("keeps a document that already has the taxonomy profile", () => {
    const draft = createDefaultCategoryCmsDocument("level_2", { slug: "strijken" })
    draft.blocks[0] = {
      ...draft.blocks[0],
      title: { nl: "Strijken", en: "Ironing", de: "Bügeln", fr: "Repassage" },
    } as typeof draft.blocks[0]
    const next = realignCategoryCmsDocument(draft, { slug: "strijken", profile: "level_2" })
    expect(next).toBe(draft)
  })

  it("moves Strijken to level 2 and keeps the hero text", () => {
    const source = createDefaultCategoryCmsDocument("level_3", { slug: "strijken" })
    source.blocks[0] = {
      ...source.blocks[0],
      title: { nl: "Strijken", en: "Ironing", de: "Bügeln", fr: "Repassage" },
      intro: { nl: "Bestaande tekst", en: "", de: "", fr: "" },
    } as typeof source.blocks[0]
    const next = realignCategoryCmsDocument(source, { slug: "strijken", profile: "level_2" })
    expect(next.profile).toBe("level_2")
    expect(next.blocks.map((block) => block.type)).toEqual([
      "hero",
      "usp_bar",
      "product_group_tiles",
      "choice_assistant_cta",
      "advice_compare",
      "brand_overview",
    ])
    expect(next.blocks[0]).toMatchObject({
      title: { nl: "Strijken" },
      intro: { nl: "Bestaande tekst" },
    })
    expect(next.blocks.some((block) => block.type === "product_grid")).toBe(false)
    expect(validateCategoryCmsDocument(next, { slug: "strijken", expectedProfile: "level_2" })).toEqual([])
  })

  it("does not plan a rewrite when the profile already matches", () => {
    const draft = createDefaultCategoryCmsDocument("level_1", { slug: "huishouden" })
    const plan = planCategoryStructureDraft({
      slug: "huishouden",
      profile: "level_1",
      draft,
      published: null,
      excluded: false,
    })
    expect(plan.action).toBe("skip")
  })

  it("plans an empty draft for a category without content", () => {
    const plan = planCategoryStructureDraft({
      slug: "wasmachines",
      profile: "level_3",
      draft: null,
      published: null,
      excluded: false,
    })
    expect(plan.action).toBe("write")
    expect(plan.reason).toBe("create")
    expect(plan.document?.profile).toBe("level_3")
    expect(plan.document?.blocks.some((block) => block.type === "product_grid")).toBe(true)
  })

  it("leaves excluded categories alone", () => {
    const plan = planCategoryStructureDraft({
      slug: "mode",
      profile: "level_1",
      draft: null,
      published: null,
      excluded: true,
    })
    expect(plan.action).toBe("skip")
  })
})
