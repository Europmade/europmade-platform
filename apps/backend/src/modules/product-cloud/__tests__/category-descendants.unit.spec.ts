import {
  COMMERCIAL_NAV_GROUPS,
  expandCategorySlugsWithDescendants,
  isAggregateAllInCategory,
} from "@europmade/utils"

describe("kleding category hierarchy", () => {
  it("keeps Kleding as the clothing root and does not list Mode beside it", () => {
    const kleding = COMMERCIAL_NAV_GROUPS.find((group) => group.key === "kleding")
    expect(kleding?.pcSlugs).toEqual(["kleding"])
  })

  it("adds descendant slugs to a parent listing filter and leaves other roots out", () => {
    const filter = expandCategorySlugsWithDescendants("kleding", [
      { id: "parent", slug: "kleding", parent_category_id: null },
      { id: "heren", slug: "heren", parent_category_id: "parent" },
      { id: "dames", slug: "dames", parent_category_id: "parent" },
      { id: "tuin", slug: "tuin", parent_category_id: null },
    ])
    expect(filter.split(",").sort()).toEqual(["dames", "heren", "kleding"])
  })

  it("expands Alles-in aggregate to parent L2 and sibling L3s without duplicates", () => {
    expect(
      isAggregateAllInCategory({
        name: "Alles in Hout & Leer",
        slug: "alles-in-hout-en-leer",
      })
    ).toBe(true)
    const filter = expandCategorySlugsWithDescendants("alles-in-hout-en-leer", [
      { id: "l1", slug: "ambacht", name: "Ambacht", parent_category_id: null },
      {
        id: "l2",
        slug: "hout-en-leer",
        name: "Hout & Leer",
        parent_category_id: "l1",
      },
      {
        id: "alles",
        slug: "alles-in-hout-en-leer",
        name: "Alles in Hout & Leer",
        parent_category_id: "l2",
      },
      {
        id: "planken",
        slug: "planken-en-panelen",
        name: "Planken & panelen",
        parent_category_id: "l2",
      },
      {
        id: "other",
        slug: "keramiek-en-glas",
        name: "Keramiek & Glas",
        parent_category_id: "l1",
      },
    ])
    const parts = filter.split(",").sort()
    expect(parts).toEqual([
      "alles-in-hout-en-leer",
      "hout-en-leer",
      "planken-en-panelen",
    ])
    expect(parts.filter((p) => p === "alles-in-hout-en-leer")).toHaveLength(1)
  })
})
