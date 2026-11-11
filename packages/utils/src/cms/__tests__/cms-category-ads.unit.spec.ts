import { filterAdCampaignsByTarget } from "../../ad-campaign-live"
import {
  categoryAdPositionsForProfile,
  createCategoryCmsOptionalBlock,
  createDefaultCategoryCmsDocument,
  getBlock,
  mergeCategoryCmsEditorWrite,
  readCategoryAdPositions,
  selectCategoryAdSource,
  validateCategoryCmsDocument,
  type CategoryCmsAdPosition,
} from "../../cms-category-document"

function withAd(slot: Record<string, unknown>) {
  const base = createDefaultCategoryCmsDocument("level_1", { slug: "huishouden" })
  const ad = createCategoryCmsOptionalBlock("level_1", "ad_slot", { slug: "huishouden" })
  return mergeCategoryCmsEditorWrite(
    base,
    { blocks: [...base.blocks, { ...ad, ...slot }] },
    { slug: "huishouden", profile: "level_1" }
  )
}

describe("category ad positions", () => {
  it("reads a known legacy slot_id as one paid position and does not require positions", () => {
    const doc = withAd({ slot_id: "below_hero" })
    expect(validateCategoryCmsDocument(doc, { slug: "huishouden" })).toEqual([])
    expect(readCategoryAdPositions(getBlock(doc, "ad_slot"))).toEqual([
      {
        id: "legacy-below_hero",
        position: "below_hero",
        label: "",
        source: "campaign",
        banner_id: null,
        sort: 0,
      },
    ])
  })

  it("maps an unknown legacy marker onto below_hero and leaves an empty marker empty", () => {
    expect(readCategoryAdPositions({ slot_id: "category" })).toEqual([
      expect.objectContaining({ position: "below_hero", source: "campaign", label: "category" }),
    ])
    expect(readCategoryAdPositions({ slot_id: "" })).toEqual([])
    expect(readCategoryAdPositions({ slot_id: "below_hero", positions: [] })).toEqual([])
  })

  it("prefers a stored positions array and keeps it across a merge that omits the key", () => {
    const positions: CategoryCmsAdPosition[] = [
      {
        id: "adpos_grid",
        position: "above_product_grid",
        label: "Boven het raster",
        source: "banner",
        banner_id: "ban_1",
        sort: 1,
      },
      {
        id: "adpos_hero",
        position: "below_hero",
        label: "Onder de hero",
        source: "campaign_or_banner",
        banner_id: "ban_2",
        sort: 0,
      },
    ]
    const stored = withAd({ slot_id: "below_hero", positions })
    expect(readCategoryAdPositions(getBlock(stored, "ad_slot")).map((row) => row.id)).toEqual([
      "adpos_hero",
      "adpos_grid",
    ])
    const again = mergeCategoryCmsEditorWrite(
      stored,
      { blocks: stored.blocks.map((block) => (block.type === "ad_slot" ? { ...block, positions: undefined } : block)) },
      { slug: "huishouden", profile: "level_1" }
    )
    expect(readCategoryAdPositions(getBlock(again, "ad_slot"))).toHaveLength(2)
  })

  it("rejects a duplicate position and a banner position without banner_id", () => {
    const duplicate = withAd({
      positions: [
        { id: "a", position: "below_hero", label: "", source: "campaign", sort: 0 },
        { id: "b", position: "below_hero", label: "", source: "campaign", sort: 1 },
      ],
    })
    expect(validateCategoryCmsDocument(duplicate, { slug: "huishouden" }).map((issue) => issue.code)).toContain(
      "ad_position_key"
    )
    const missing = withAd({
      positions: [{ id: "a", position: "between_content", label: "", source: "banner", sort: 0 }],
    })
    expect(validateCategoryCmsDocument(missing, { slug: "huishouden" }).map((issue) => issue.code)).toContain(
      "ad_position_banner"
    )
  })

  it("limits the admin choices to anchors that exist on that profile", () => {
    expect(categoryAdPositionsForProfile("level_1")).toEqual([
      "below_hero",
      "between_content",
      "above_product_grid",
      "below_product_grid",
    ])
    expect(categoryAdPositionsForProfile("level_2")).toEqual(["below_hero", "between_content"])
    expect(categoryAdPositionsForProfile("level_3")).not.toContain("between_content")
  })

  it("lets a live campaign replace the editorial banner", () => {
    const both = { source: "campaign_or_banner" as const }
    expect(selectCategoryAdSource(both, true, true)).toBe("campaign")
    expect(selectCategoryAdSource(both, false, true)).toBe("banner")
    expect(selectCategoryAdSource({ source: "banner" }, true, false)).toBeNull()
    expect(selectCategoryAdSource({ source: "campaign" }, false, true)).toBeNull()
  })
})

describe("category campaign target", () => {
  it("keeps only the requested category before winner selection", () => {
    const rows = [
      { id: "other", targetValue: "tuin" },
      { id: "match", targetValue: " Huishouden " },
      { id: "blank", targetValue: null },
    ]
    expect(filterAdCampaignsByTarget(rows, "huishouden").map((row) => row.id)).toEqual(["match"])
    expect(filterAdCampaignsByTarget(rows, "").map((row) => row.id)).toEqual([
      "other",
      "match",
      "blank",
    ])
  })

  it("keeps a campaign for the category or one of its subcategories", () => {
    const rows = [
      { id: "parent", targetValue: "huishouden" },
      { id: "child", targetValue: "vaatwassers" },
      { id: "other", targetValue: "tuin" },
    ]
    expect(filterAdCampaignsByTarget(rows, "huishouden,vaatwassers").map((row) => row.id)).toEqual([
      "parent",
      "child",
    ])
    expect(filterAdCampaignsByTarget(rows, "vaatwassers").map((row) => row.id)).toEqual(["child"])
  })
})
