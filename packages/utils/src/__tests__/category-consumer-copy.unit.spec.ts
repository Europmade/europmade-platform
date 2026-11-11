import { createDefaultCategoryCmsDocument, validateCategoryCmsDocument } from "../cms-category-document"
import { fillEmptyCategoryEditorial } from "../category-editorial-copy"
import { restoreGenericCategoryCopy } from "../category-consumer-copy"

const context = {
  slug: "wasmachines",
  name: "Wasmachines",
  parentName: "Wassen & drogen",
  profile: "level_3" as const,
  productCount: 8,
  brands: ["Bosch", "Miele"],
  filterNames: ["Vulgewicht", "Energielabel", "Geluidsniveau", "Toerental"],
  distinguishedFrom: null,
  children: [],
}

describe("category consumer copy", () => {
  it("links empty level-2 advice cards to the real child slug", () => {
    const document = createDefaultCategoryCmsDocument("level_2", { slug: "was-droog" })
    const restored = restoreGenericCategoryCopy(document, {
      slug: "was-droog",
      name: "Wassen & drogen",
      parentName: "Huishouden",
      profile: "level_2",
      productCount: 16,
      brands: ["Bosch"],
      filterNames: [],
      distinguishedFrom: null,
      children: [
        { slug: "wasmachines", name: "Wasmachines" },
        { slug: "wasdrogers", name: "Wasdrogers" },
      ],
    })
    const advice = restored.document.blocks.find((block) => block.type === "advice_compare")
    expect(advice && advice.type === "advice_compare" ? advice.items.map((item) => item.href) : []).toEqual([
      "/categorie/wasmachines",
      "/categorie/wasdrogers",
    ])
  })

  it("replaces generated USP and buying-guide text and keeps a manual slot", () => {
    const filled = fillEmptyCategoryEditorial(
      createDefaultCategoryCmsDocument("level_3", { slug: "wasmachines" }),
      context
    ).document
    const usp = filled.blocks.find((block) => block.type === "usp_bar")
    if (usp?.type === "usp_bar") {
      usp.slots[0]!.title = { nl: "Handmatige titel", en: "", de: "", fr: "" }
      filled.block_meta[usp.id] = {
        ...(filled.block_meta[usp.id] ?? {
          source: "cms",
          dynamic: false,
          ai_may_propose: false,
          approval_required: true,
          content_version: "v2",
        }),
        manual_override: { "0": true },
      }
    }
    const restored = restoreGenericCategoryCopy(filled, context)
    const next = restored.document.blocks.find((block) => block.type === "usp_bar")
    expect(next && next.type === "usp_bar" ? next.slots[0]?.title.nl : "").toBe("Handmatige titel")
    expect(next && next.type === "usp_bar" ? next.slots[1]?.title.nl : "").toBe("Toerental")
    const guide = restored.document.blocks.find((block) => block.type === "buying_guide")
    expect(guide && guide.type === "buying_guide" ? guide.sections.map((section) => section.heading.nl) : []).toEqual([
      "Vulgewicht",
      "Toerental",
      "Energie en geluid",
      "Plaatsing",
    ])
    expect(JSON.stringify(guide)).not.toMatch(/winkelwagen/i)
    expect(validateCategoryCmsDocument(restored.document, { slug: "wasmachines", expectedProfile: "level_3" })).toEqual([])
  })

  it("replaces the earlier template USP titles on a hub", () => {
    const document = createDefaultCategoryCmsDocument("level_1", { slug: "huishouden" })
    const usp = document.blocks.find((block) => block.type === "usp_bar")
    if (usp?.type !== "usp_bar") throw new Error("usp missing")
    const titles = ["Europese merken", "Betrouwbare merken", "Duidelijke aanbiedingen", "Service en garantie"]
    titles.forEach((title, index) => {
      usp.slots[index]!.title = { nl: title, en: "", de: "", fr: "" }
    })
    document.block_meta[usp.id] = {
      ...(document.block_meta[usp.id] ?? {
        source: "cms",
        dynamic: false,
        ai_may_propose: true,
        approval_required: true,
        content_version: "v2",
      }),
      manual_override: { "0": true, "1": true, "2": true, "3": true },
    }
    const restored = restoreGenericCategoryCopy(document, {
      slug: "huishouden",
      name: "Huishouden",
      parentName: null,
      profile: "level_1",
      productCount: 12,
      brands: ["Bosch"],
      filterNames: [],
      distinguishedFrom: null,
      children: [{ slug: "was-droog", name: "Wassen & drogen" }],
    })
    const next = restored.document.blocks.find((block) => block.type === "usp_bar")
    expect(next && next.type === "usp_bar" ? next.slots.map((slot) => slot.title.nl) : []).toEqual([
      "Eerst de taak",
      "Inbouw of vrijstaand",
      "Energie en geluid",
      "Capaciteit van het huishouden",
    ])
  })

  it("fills an empty hub hero and why band and keeps a written intro", () => {
    const document = createDefaultCategoryCmsDocument("level_1", { slug: "huishouden" })
    const hero = document.blocks.find((block) => block.type === "hero")
    if (hero?.type === "hero") hero.intro = { nl: "Blijft staan", en: "", de: "", fr: "" }
    const restored = restoreGenericCategoryCopy(document, {
      slug: "huishouden",
      name: "Huishouden",
      parentName: null,
      profile: "level_1",
      productCount: 12,
      brands: ["Bosch"],
      filterNames: [],
      distinguishedFrom: null,
      children: [{ slug: "was-droog", name: "Wassen & drogen" }],
    })
    const nextHero = restored.document.blocks.find((block) => block.type === "hero")
    const why = restored.document.blocks.find((block) => block.type === "why_europmade")
    expect(nextHero && nextHero.type === "hero" ? nextHero.intro.nl : "").toBe("Blijft staan")
    expect(nextHero && nextHero.type === "hero" ? nextHero.primary_cta_href : "").toBe(
      "#blk_huishouden_level_1_subcategory_tiles"
    )
    expect(nextHero && nextHero.type === "hero" ? nextHero.secondary_cta_href : "").toBe(
      "#blk_huishouden_level_1_why_europmade"
    )
    expect(why && why.type === "why_europmade" ? why.body.nl : "").toMatch(/geen herkomst/)
    expect(JSON.stringify(restored.document)).not.toMatch(/Gemaakt in Europa/i)
    expect(validateCategoryCmsDocument(restored.document, { slug: "huishouden", expectedProfile: "level_1" })).toEqual([])
  })
})
