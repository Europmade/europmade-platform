import {
  createDefaultCategoryCmsDocument,
  validateCategoryCmsDocument,
} from "../cms-category-document"
import {
  fillEmptyCategoryEditorial,
  noteCategoryAssortmentChange,
} from "../category-editorial-copy"

const context = {
  slug: "was-droog",
  name: "Wassen & drogen",
  parentName: "Huishouden",
  profile: "level_2" as const,
  productCount: 16,
  brands: ["Bosch", "Miele"],
  filterNames: [],
  distinguishedFrom: null,
  children: [
    { slug: "wasmachines", name: "Wasmachines" },
    { slug: "wasdrogers", name: "Wasdrogers" },
    { slug: "was-droogcombinaties", name: "Was-droogcombinaties" },
  ],
}

describe("category editorial copy", () => {
  it("fills an empty draft from the category tree and keeps the document valid", () => {
    const draft = createDefaultCategoryCmsDocument("level_2", { slug: "was-droog" })
    const result = fillEmptyCategoryEditorial(draft, context)
    expect(result.filled).toContain("hero.intro")
    const hero = result.document.blocks.find((block) => block.type === "hero")
    expect(hero && "intro" in hero ? hero.intro.nl : "").toContain("Was-droogcombinaties")
    expect(hero && "subtitle" in hero ? hero.subtitle.nl : "").toContain("Wassen & drogen")
    expect(hero && "subtitle" in hero ? hero.subtitle.en : "x").toBe("")
    expect(hero && "intro" in hero ? hero.intro.nl : "").not.toMatch(/certific/i)
    expect(validateCategoryCmsDocument(result.document, { slug: "was-droog", expectedProfile: "level_2" })).toEqual([])
  })

  it("does not replace an existing hero intro", () => {
    const draft = createDefaultCategoryCmsDocument("level_2", { slug: "was-droog" })
    const hero = draft.blocks[0]
    if (hero?.type === "hero") hero.intro = { nl: "Bestaande tekst", en: "Existing", de: "Bestehend", fr: "Existant" }
    const result = fillEmptyCategoryEditorial(draft, context)
    const next = result.document.blocks.find((block) => block.type === "hero")
    expect(next && "intro" in next ? next.intro.nl : "").toBe("Bestaande tekst")
    expect(result.filled).not.toContain("hero.intro")
    if (hero?.type === "hero") hero.subtitle = { nl: "Bestaande subtitel", en: "", de: "", fr: "" }
    const kept = fillEmptyCategoryEditorial(draft, context)
    const keptHero = kept.document.blocks.find((block) => block.type === "hero")
    expect(keptHero && "subtitle" in keptHero ? keptHero.subtitle.nl : "").toBe("Bestaande subtitel")
  })

  it("marks a written draft for review without changing the text", () => {
    const draft = fillEmptyCategoryEditorial(
      createDefaultCategoryCmsDocument("level_3", { slug: "wasmachines" }),
      { ...context, slug: "wasmachines", name: "Wasmachines", profile: "level_3", children: [], distinguishedFrom: "Vrijstaande apparaten" }
    ).document
    const intro = draft.blocks.find((block) => block.type === "hero")
    const marked = noteCategoryAssortmentChange(draft, "2026-11-10T12:00:00.000Z")
    expect(marked.changed).toBe(true)
    expect(marked.document.editorial_review).toEqual({
      needed: true,
      reason: "assortment_changed",
      noted_at: "2026-11-10T12:00:00.000Z",
    })
    expect(marked.document.blocks.find((block) => block.type === "hero")).toEqual(intro)
    expect(noteCategoryAssortmentChange(marked.document, "2026-11-10T13:00:00.000Z").changed).toBe(false)
  })

  it("does not mark a draft that has no text", () => {
    const draft = createDefaultCategoryCmsDocument("level_3", { slug: "wasmachines" })
    expect(noteCategoryAssortmentChange(draft, "2026-11-10T12:00:00.000Z").changed).toBe(false)
  })
})
