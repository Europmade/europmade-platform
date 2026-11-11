import { collectCategoryCmsAssetIds, resolveCategoryCmsAssetUrls } from "../category-cms-media"
import {
  adviceItemCta,
  categoryCmsOptionalLink,
  createDefaultCategoryCmsDocument,
  getBlock,
  mergeCategoryCmsEditorWrite,
  validateCategoryCmsDocument,
  type CategoryCmsAdviceItem,
  type CategoryCmsGuideSection,
} from "../../cms-category-document"

const loc = (nl: string) => ({ nl, en: "", de: "", fr: "" })

function level2() {
  return createDefaultCategoryCmsDocument("level_2", { slug: "inbouwapparatuur" })
}

function level3() {
  return createDefaultCategoryCmsDocument("level_3", { slug: "vaatwassers" })
}

describe("advice cards and buying guide", () => {
  it("starts empty and stays valid without the new fields", () => {
    const advice = getBlock(level2(), "advice_compare")
    const guide = getBlock(level3(), "buying_guide")
    expect(advice?.items).toEqual([])
    expect(guide?.sections).toEqual([])
    expect(guide?.faq).toEqual([])
    expect(validateCategoryCmsDocument(level2(), { slug: "inbouwapparatuur" })).toEqual([])
    expect(validateCategoryCmsDocument(level3(), { slug: "vaatwassers" })).toEqual([])
  })

  it("stores, edits, reorders and removes a card without inventing a CTA", () => {
    const base = level2()
    const first: CategoryCmsAdviceItem = {
      id: "card-a",
      label: loc("Oven of combi-oven?"),
      summary: loc("Welke functies passen bij jou?"),
      body: loc("Kies op basis van bakken of stomen."),
      href: "/categorie/ovens",
      cta_label: loc("Lees het advies"),
      image: { asset_id: "cmsas_oven", url: "http://localhost:9000/static/old.png", alt: loc("Oven"), caption: loc("Inbouwoven") },
    }
    const second: CategoryCmsAdviceItem = {
      id: "card-b",
      label: loc("Vaatwasser kiezen"),
      href: "/categorie/vaatwassers",
    }
    const added = mergeCategoryCmsEditorWrite(
      base,
      { blocks: base.blocks.map((block) => (block.type === "advice_compare" ? { ...block, items: [first, second] } : block)) },
      { slug: "inbouwapparatuur", profile: "level_2" }
    )
    const stored = getBlock(added, "advice_compare")
    expect(stored?.items.map((item) => item.id)).toEqual(["card-a", "card-b"])
    expect(stored?.items[0]).toMatchObject({
      summary: loc("Welke functies passen bij jou?"),
      body: loc("Kies op basis van bakken of stomen."),
      image: { asset_id: "cmsas_oven" },
    })
    const reordered = mergeCategoryCmsEditorWrite(
      added,
      {
        blocks: added.blocks.map((block) =>
          block.type === "advice_compare" ? { ...block, items: [second, { ...first, label: loc("Oven kiezen") }] } : block
        ),
      },
      { slug: "inbouwapparatuur", profile: "level_2" }
    )
    expect(getBlock(reordered, "advice_compare")?.items.map((item) => item.label.nl)).toEqual([
      "Vaatwasser kiezen",
      "Oven kiezen",
    ])
    const removed = mergeCategoryCmsEditorWrite(
      reordered,
      {
        blocks: reordered.blocks.map((block) =>
          block.type === "advice_compare"
            ? { ...block, items: [{ ...first, image: null }] }
            : block
        ),
      },
      { slug: "inbouwapparatuur", profile: "level_2" }
    )
    expect(getBlock(removed, "advice_compare")?.items).toEqual([{ ...first, label: loc("Oven of combi-oven?"), image: null }])
    expect(adviceItemCta({ href: "", cta_label: loc("Lees") })).toBeNull()
    expect(adviceItemCta({ href: "/categorie/ovens", cta_label: loc("") })).toEqual({
      href: "/categorie/ovens",
      mode: "legacy",
    })
    expect(adviceItemCta(first)).toEqual({ href: "/categorie/ovens", mode: "label" })
  })

  it("keeps several guide sections, tips, links and FAQ order", () => {
    const base = level3()
    const sections: CategoryCmsGuideSection[] = [
      {
        id: "sec-b",
        heading: loc("Energie"),
        intro: loc("Kijk naar het jaarverbruik."),
        body: loc("De letter alleen is niet genoeg."),
        bullets: [loc("Vergelijk kWh"), loc("Let op het programma")],
        subheadings: [{ id: "sub-1", heading: loc("Eco"), body: loc("Langer, zuiniger.") }],
        tip: loc("Meet de nishoogte."),
        link_label: loc("Stille vaatwassers"),
        link_href: "/categorie/vaatwassers?geluid=stil",
        cta_label: loc(""),
        cta_href: "",
      },
      {
        id: "sec-a",
        heading: loc("Couverts"),
        body: loc("Eén couvert is een couvert."),
        bullets: [],
      },
    ]
    const saved = mergeCategoryCmsEditorWrite(
      base,
      {
        blocks: base.blocks.map((block) =>
          block.type === "buying_guide"
            ? {
                ...block,
                intro: loc("Waar je op let."),
                sections: [sections[1]!, sections[0]!],
                faq: [
                  { id: "q1", question: loc("Hoeveel couverts?"), answer: loc("Dat hangt van het huishouden af.") },
                  { id: "q2", question: loc("Wat is stil?"), answer: loc("Lager dan 42 dB in een open keuken.") },
                ],
                closing_cta_label: loc("Lees de koopgids"),
                closing_cta_href: "/koopgids/vaatwassers",
              }
            : block
        ),
      },
      { slug: "vaatwassers", profile: "level_3" }
    )
    const guide = getBlock(saved, "buying_guide")
    expect(guide?.intro?.nl).toBe("Waar je op let.")
    expect(guide?.sections.map((section) => section.id)).toEqual(["sec-a", "sec-b"])
    expect(guide?.sections[1]?.bullets.map((bullet) => bullet.nl)).toEqual(["Vergelijk kWh", "Let op het programma"])
    expect(guide?.sections[1]?.tip?.nl).toBe("Meet de nishoogte.")
    expect(guide?.faq.map((item) => item.id)).toEqual(["q1", "q2"])
    expect(categoryCmsOptionalLink(guide?.closing_cta_label, guide?.closing_cta_href)).toBe("/koopgids/vaatwassers")
    expect(categoryCmsOptionalLink(guide?.sections[1]?.cta_label, guide?.sections[1]?.cta_href)).toBeNull()
    expect(categoryCmsOptionalLink(guide?.sections[1]?.link_label, guide?.sections[1]?.link_href)).toBe(
      "/categorie/vaatwassers?geluid=stil"
    )
    expect(validateCategoryCmsDocument(saved, { slug: "vaatwassers" })).toEqual([])
    const resolved = resolveCategoryCmsAssetUrls(
      {
        blocks: [{ type: "advice_compare", items: [{ image: { asset_id: "cmsas_card", url: "http://localhost:9000/static/old.png" } }] }],
      },
      { cmsas_card: "http://localhost:9000/static/new.png" }
    )
    expect(collectCategoryCmsAssetIds(resolved)).toEqual(["cmsas_card"])
    const card = resolved.blocks[0] as { items: Array<{ image: { url: string } }> }
    expect(card.items[0]?.image.url).toBe("http://localhost:9000/static/new.png")
  })
})
