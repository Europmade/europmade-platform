import {
  CATEGORY_FORMER_SLUG_FIELD,
  wouldCreateParentCycle,
  type CategoryParentRow,
} from "../category-admin"

describe("Admin category taxonomy helpers (ADR-0042)", () => {
  const tree: CategoryParentRow[] = [
    { id: "a", parent_category_id: null },
    { id: "b", parent_category_id: "a" },
    { id: "c", parent_category_id: "b" },
  ]

  it("rejects a category as its own parent", () => {
    expect(wouldCreateParentCycle(tree, "a", "a")).toBe(true)
  })

  it("rejects a descendant as parent", () => {
    expect(wouldCreateParentCycle(tree, "a", "c")).toBe(true)
    expect(wouldCreateParentCycle(tree, "b", "c")).toBe(true)
  })

  it("allows moving to a sibling branch or root", () => {
    expect(wouldCreateParentCycle(tree, "c", "a")).toBe(false)
    expect(wouldCreateParentCycle(tree, "c", null)).toBe(false)
    expect(wouldCreateParentCycle(tree, "b", null)).toBe(false)
  })

  it("keeps former-slug field out of the category model", () => {
    expect(CATEGORY_FORMER_SLUG_FIELD).toBe("former_slug")
  })
})
