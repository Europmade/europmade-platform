import { createHash } from "node:crypto"
import {
  getUspBar,
  isUspSlotManualOverride,
  normalizeCategoryCmsDocument,
} from "@europmade/utils"
import { prepareCategoryCmsWrite } from "../category-cms-write"
import {
  CategoryPdError,
  computeCategoryDraftSyncState,
} from "../category-published-draft"

const loc = (nl: string) => ({ nl, en: "", de: "", fr: "" })

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

describe("category cms write path", () => {
  const slug = "elektronika"
  const profile = "level_1" as const

  it("normalizes an unchanged v1 document to a stable in-sync draft", () => {
    const published = {
      title: loc("Elektronica"),
      intro: loc("Intro"),
      usps: [{ title: loc("Stil"), body: loc("Laag") }],
      faq: [{ id: "f1", question: loc("Vraag?"), answer: loc("Antwoord") }],
    }
    const once = normalizeCategoryCmsDocument(published, { slug, profile })
    const twice = normalizeCategoryCmsDocument(once, { slug, profile })
    expect(fingerprint(once)).toBe(fingerprint(twice))
    expect(
      computeCategoryDraftSyncState({
        publishedDocument: published,
        draftDocument: once,
        publishedVersion: 1,
        slug,
        profile,
      })
    ).toBe("in_sync")
    const edited = { ...published, title: loc("Anders") }
    expect(
      computeCategoryDraftSyncState({
        publishedDocument: published,
        draftDocument: edited,
        publishedVersion: 1,
        slug,
        profile,
      })
    ).toBe("unpublished_changes")
  })

  it("uses the same normalization for an empty draft, a live copy and replace-with-live", () => {
    const live = { title: loc("Live titel"), usps: [{ title: loc("Slot"), body: loc("Tekst") }] }
    const fromCreate = prepareCategoryCmsWrite({
      raw: live,
      slug,
      profile,
      previous: live,
    })
    const fromReplace = prepareCategoryCmsWrite({
      raw: JSON.parse(JSON.stringify(live)),
      slug,
      profile,
      previous: JSON.parse(JSON.stringify(live)),
    })
    expect(JSON.stringify(fromCreate)).toBe(JSON.stringify(fromReplace))
    const empty = prepareCategoryCmsWrite({ raw: {}, slug, profile })
    expect(getUspBar(empty)?.slots).toHaveLength(4)
    expect(getUspBar(empty)?.slots.every((slot) => !slot.title.nl && !slot.body.nl)).toBe(true)
    expect(JSON.stringify(empty)).not.toContain("Gemaakt in Europa")
  })

  it("does not mutate the published document while preparing a draft publish", () => {
    const published = { title: loc("Live"), marker: "published-only" }
    const draft = { title: loc("Concept"), marker: "draft-only" }
    const snapshot = JSON.stringify(published)
    const liveCopy = prepareCategoryCmsWrite({
      raw: draft,
      slug,
      profile,
      previous: draft,
    })
    expect(JSON.stringify(published)).toBe(snapshot)
    expect(JSON.stringify(liveCopy)).toContain("Concept")
    expect(JSON.stringify(liveCopy)).not.toContain("published-only")
    expect(liveCopy).not.toBe(published)
  })

  it("marks only a changed USP slot and refuses a different profile or a forbidden block", () => {
    const previous = prepareCategoryCmsWrite({
      raw: {
        usps: [
          { title: loc("Een"), body: loc("A") },
          { title: loc("Twee"), body: loc("B") },
        ],
      },
      slug,
      profile,
    })
    const saved = prepareCategoryCmsWrite({
      raw: {
        usps: [
          { title: loc("Gewijzigd"), body: loc("A") },
          { title: loc("Twee"), body: loc("B") },
        ],
      },
      slug,
      profile,
      previous,
    })
    const usp = getUspBar(saved)!
    expect(isUspSlotManualOverride(saved.block_meta[usp.id], 0)).toBe(true)
    expect(isUspSlotManualOverride(saved.block_meta[usp.id], 1)).toBe(false)

    const wrongProfile = prepareCategoryCmsWrite({ raw: {}, slug, profile: "level_2" })
    expect(() =>
      prepareCategoryCmsWrite({
        raw: wrongProfile,
        slug,
        profile,
        previous: wrongProfile,
      })
    ).toThrow(CategoryPdError)

    const withGrid = {
      ...previous,
      blocks: [
        ...previous.blocks,
        {
          id: "grid",
          type: "product_grid",
          visible: true,
          title: loc(""),
          sort: "relevance",
          limit: 24,
        },
      ],
    }
    try {
      prepareCategoryCmsWrite({ raw: withGrid, slug, profile, previous })
      throw new Error("expected invalid document")
    } catch (err) {
      expect(err).toBeInstanceOf(CategoryPdError)
      expect((err as CategoryPdError).code).toBe("document_invalid")
    }
  })

  it("keeps unknown and unedited V2 fields when the editor omits them", () => {
    const base = prepareCategoryCmsWrite({
      raw: {
        title: loc("Elektronica"),
        usps: [{ title: loc("Stil"), body: loc("Laag"), icon_key: "quiet" }],
      },
      slug,
      profile,
    })
    const hero = base.blocks.find((block) => block.type === "hero")!
    const tiles = base.blocks.find((block) => block.type === "subcategory_tiles")!
    const stored = {
      ...base,
      editor_note: "niet in het formulier",
      blocks: base.blocks.map((block) => {
        if (block.type === "hero") return { ...block, custom_note: "bewaar mij" }
        if (block.type === "subcategory_tiles") {
          return { ...block, include_slugs: ["audio", "tv"] }
        }
        return block
      }),
    }
    const snapshot = JSON.stringify(stored)
    const patch = {
      ...stored,
      blocks: stored.blocks.map((block) => {
        if (block.type !== "hero") return block
        const { custom_note: _omitted, ...rest } = block as typeof hero & {
          custom_note?: string
        }
        return {
          ...rest,
          title: loc("Gewijzigde titel"),
        }
      }),
    }
    delete (patch as { editor_note?: string }).editor_note
    const saved = prepareCategoryCmsWrite({
      raw: patch,
      slug,
      profile,
      previous: stored,
    })
    expect(JSON.stringify(stored)).toBe(snapshot)
    const savedHero = saved.blocks.find((block) => block.type === "hero") as typeof hero & {
      custom_note?: string
    }
    const savedTiles = saved.blocks.find((block) => block.type === "subcategory_tiles") as typeof tiles & {
      include_slugs?: string[]
    }
    expect(savedHero.title.nl).toBe("Gewijzigde titel")
    expect(savedHero.custom_note).toBe("bewaar mij")
    expect(savedTiles.include_slugs).toEqual(["audio", "tv"])
    expect((saved as { editor_note?: string }).editor_note).toBe("niet in het formulier")
    expect(getUspBar(saved)?.slots).toHaveLength(4)
    expect(isUspSlotManualOverride(saved.block_meta[getUspBar(saved)!.id], 0)).toBe(false)
  })
})
