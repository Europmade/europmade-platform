import {
  categoryCmsSearchRoute,
  categoryCmsSearchVisibleIds,
} from "../category-cms-search"

const rows = [
  { id: "l1", name: "Huishouden", slug: "huishouden", parentId: null },
  { id: "l2", name: "Inbouwapparatuur", slug: "inbouwapparatuur", parentId: "l1" },
  { id: "l3", name: "Vaatwassers", slug: "vaatwassers", parentId: "l2" },
  { id: "other", name: "Elektronica", slug: "elektronica", parentId: null },
]

describe("category cms search", () => {
  it("returns the full tree for an empty query", () => {
    expect(categoryCmsSearchVisibleIds(rows, "  ")).toBeNull()
  })

  it("finds a category by name, slug and parent, and keeps the route", () => {
    const byName = categoryCmsSearchVisibleIds(rows, "Huishouden")
    expect(byName && [...byName].sort()).toEqual(["l1", "l2", "l3"])
    const bySlug = categoryCmsSearchVisibleIds(rows, "vaatwassers")
    expect(bySlug && [...bySlug].sort()).toEqual(["l1", "l2", "l3"])
    const byId = new Map(rows.map((row) => [row.id, row]))
    expect(categoryCmsSearchRoute(rows[2]!, byId)).toBe("Huishouden / Inbouwapparatuur / Vaatwassers")
  })

  it("does not include an unrelated category", () => {
    const visible = categoryCmsSearchVisibleIds(rows, "elektronica")
    expect(visible && [...visible]).toEqual(["other"])
  })
})
