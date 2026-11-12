import { createDefaultCategoryCmsDocument, validateCategoryCmsDocument } from "../cms-category-document"
import { fillEmptyCategoryEditorial } from "../category-editorial-copy"
import { consumerFaqItems, restoreGenericCategoryCopy } from "../category-consumer-copy"

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

  it("replaces a specification-led level-3 intro and keeps a written one", () => {
    const document = createDefaultCategoryCmsDocument("level_3", { slug: "wasmachines" })
    const hero = document.blocks.find((block) => block.type === "hero")
    if (hero?.type === "hero") {
      hero.intro = {
        nl: "Vulgewicht, toerental, energielabel en geluid bepalen of een wasmachine bij het huishouden en de plek past.",
        en: "",
        de: "",
        fr: "",
      }
    }
    const restored = restoreGenericCategoryCopy(document, {
      slug: "wasmachines",
      name: "Wasmachines",
      parentName: "Wassen & drogen",
      profile: "level_3",
      productCount: 8,
      brands: [],
      filterNames: ["Vulgewicht"],
      distinguishedFrom: null,
      children: [],
    })
    const next = restored.document.blocks.find((block) => block.type === "hero")
    const usp = restored.document.blocks.find((block) => block.type === "usp_bar")
    expect(next && next.type === "hero" ? next.intro.nl : "").toBe(
      "Schone was zonder dat je erbij blijft staan. Kies een machine die bij de grootte van je huishouden en bij de plek in huis past."
    )
    expect(next && next.type === "hero" ? next.primary_cta_label.nl : "").toBe("Bekijk het assortiment")
    expect(usp && usp.type === "usp_bar" ? usp.slots.map((slot) => slot.title.nl) : []).toEqual([
      "Vulgewicht",
      "Toerental",
      "Geluid in huis",
      "Energielabel",
    ])
    expect(usp && usp.type === "usp_bar" ? usp.slots : []).toHaveLength(4)

    if (hero?.type === "hero") hero.intro = { nl: "Deze intro blijft staan.", en: "", de: "", fr: "" }
    const kept = restoreGenericCategoryCopy(document, {
      slug: "wasmachines",
      name: "Wasmachines",
      parentName: "Wassen & drogen",
      profile: "level_3",
      productCount: 8,
      brands: [],
      filterNames: [],
      distinguishedFrom: null,
      children: [],
    }).document.blocks.find((block) => block.type === "hero")
    expect(kept && kept.type === "hero" ? kept.intro.nl : "").toBe("Deze intro blijft staan.")
  })

  it("fills laundry FAQs with consumer questions and leaves another category FAQ intact", () => {
    const laundry = consumerFaqItems({
      slug: "was-droog",
      name: "Wassen & drogen",
      parentName: "Huishouden",
      profile: "level_2",
      productCount: 16,
      brands: [],
      filterNames: [],
      distinguishedFrom: null,
      children: [
        { slug: "wasmachines", name: "Wasmachines" },
        { slug: "wasdrogers", name: "Wasdrogers" },
      ],
    })
    expect(laundry.map((item) => item.question)).toEqual([
      "Hoe werkt bestellen via EuropMade?",
      "Wie verzendt mijn bestelling?",
      "Hoe werkt retourneren?",
      "Wat betekent Made in Europe bij EuropMade?",
      "Welk vulgewicht past bij mijn huishouden?",
      "Wat is het verschil tussen een warmtepompdroger en een condensdroger?",
      "Kan ik een droger op mijn wasmachine plaatsen?",
      "Hoe voorkom ik dat mijn wasmachine gaat trillen?",
    ])
    expect(laundry.some((item) => item.question.startsWith("Welke groepen horen bij"))).toBe(false)
    expect(JSON.stringify(laundry)).not.toMatch(/werkdagen|gratis verzending|binnen \d+ dagen geleverd/i)

    const machines = consumerFaqItems({
      slug: "wasmachines",
      name: "Wasmachines",
      parentName: "Wassen & drogen",
      profile: "level_3",
      productCount: 8,
      brands: [],
      filterNames: [],
      distinguishedFrom: null,
      children: [],
    })
    expect(machines.map((item) => item.question)).toEqual([
      "Hoe werkt bestellen via EuropMade?",
      "Wie verzendt mijn bestelling?",
      "Hoe werkt retourneren?",
      "Wat betekent Made in Europe bij EuropMade?",
      "Hoeveel kilogram vulgewicht heb ik nodig?",
      "Wat is het verschil tussen 1400 en 1600 toeren?",
      "Wat betekent energieklasse A bij een wasmachine?",
      "Hoeveel water verbruikt een wasmachine?",
      "Hoe weet ik of een wasmachine in mijn ruimte past?",
      "Is een stoomfunctie nuttig?",
      "Hoe voorkom ik dat mijn wasmachine gaat trillen?",
      "Kan ik een droger boven op mijn wasmachine plaatsen?",
    ])
    expect(machines.some((item) => /welke groepen horen bij/i.test(item.question))).toBe(false)
    expect(JSON.stringify(machines)).not.toMatch(/binnen \d+ dagen geleverd|bespaar|jaar mee/i)

    const dryers = consumerFaqItems({ ...machinesContext("wasdrogers", "Wasdrogers") })
    const combos = consumerFaqItems({ ...machinesContext("was-droogcombinaties", "Was-droogcombinaties") })
    const builtIn = consumerFaqItems({ ...machinesContext("vaatwassers", "Vaatwassers") })
    const freestanding = consumerFaqItems({ ...machinesContext("vrijstaande-vaatwassers", "Vaatwassers") })
    for (const list of [dryers, combos, builtIn, freestanding]) {
      expect(list.length).toBeGreaterThanOrEqual(8)
      expect(list.length).toBeLessThanOrEqual(12)
      expect(list.some((item) => /welke groepen horen bij/i.test(item.question))).toBe(false)
    }
    expect(builtIn.some((item) => /droger boven/i.test(item.question))).toBe(false)
    expect(freestanding.some((item) => /droger boven/i.test(item.question))).toBe(false)
    expect(builtIn.map((item) => item.question).join()).not.toBe(freestanding.map((item) => item.question).join())
  })

  it("replaces the short generated washer FAQ and keeps a written question", () => {
    const document = createDefaultCategoryCmsDocument("level_3", { slug: "wasmachines" })
    const nl = (value: string) => ({ nl: value, en: "", de: "", fr: "" })
    document.blocks.push({
      id: "faq-oud",
      type: "faq",
      visible: true,
      title: nl("Vragen"),
      items: [
        { id: "a", question: nl("Hoeveel kilogram heb ik nodig?"), answer: nl("oud") },
        { id: "b", question: nl("Wat zegt het toerental?"), answer: nl("oud") },
        { id: "c", question: nl("Hoort een was-droogcombinatie hier ook?"), answer: nl("oud") },
      ],
    })
    const replaced = restoreGenericCategoryCopy(document, machinesContext("wasmachines", "Wasmachines")).document
    const faq = replaced.blocks.find((block) => block.type === "faq")
    const questions = faq && faq.type === "faq" ? faq.items.map((item) => item.question.nl) : []
    expect(questions).toContain("Wat betekent energieklasse A bij een wasmachine?")
    expect(questions).not.toContain("Hoeveel kilogram heb ik nodig?")

    const custom = createDefaultCategoryCmsDocument("level_3", { slug: "wasmachines" })
    custom.blocks.push({
      id: "faq-eigen",
      type: "faq",
      visible: true,
      title: nl("Vragen"),
      items: [
        { id: "a", question: nl("Hoeveel kilogram heb ik nodig?"), answer: nl("oud") },
        { id: "b", question: nl("Blijft deze vraag staan?"), answer: nl("ja") },
      ],
    })
    const kept = restoreGenericCategoryCopy(custom, machinesContext("wasmachines", "Wasmachines")).document
    const keptFaq = kept.blocks.find((block) => block.type === "faq")
    expect(keptFaq && keptFaq.type === "faq" ? keptFaq.items.map((item) => item.question.nl) : []).toEqual([
      "Blijft deze vraag staan?",
    ])
  })
})

function machinesContext(slug: string, name: string) {
  return {
    slug,
    name,
    parentName: "Wassen & drogen",
    profile: "level_3" as const,
    productCount: 8,
    brands: [],
    filterNames: [],
    distinguishedFrom: null,
    children: [],
  }
}
