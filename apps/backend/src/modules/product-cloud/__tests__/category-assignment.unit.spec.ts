import {
  normalizeCategoryAssignment,
  resolveCategorySelection,
  sellerChildCategoryOptions,
  sellerParentCategoryOptions,
} from "@europmade/utils"

const CATS = [
  { id: "wonen", name: "Wonen", slug: "wonen", parent_id: null },
  { id: "slaap", name: "Slaapkamer", slug: "slaapkamer", parent_id: "wonen" },
  { id: "huis", name: "Huishouden", slug: "huishouden", parent_id: null },
  { id: "keuken", name: "Keuken", slug: "keuken", parent_id: "huis" },
  { id: "mode", name: "Mode", slug: "mode", parent_id: null },
  { id: "kleding", name: "Kleding", slug: "kleding", parent_id: null },
  { id: "heren", name: "Heren", slug: "heren", parent_id: "kleding" },
]

describe("category assignment", () => {
  it("resolves parent from child-only selection", () => {
    const resolved = resolveCategorySelection(CATS, ["keuken"])
    expect(resolved.parentId).toBe("huis")
    expect(resolved.childId).toBe("keuken")
    expect(resolved.l3Id).toBe("")
    expect(resolved.categoryIds).toEqual(["huis", "keuken"])
  })

  it("keeps parent-only selection", () => {
    const resolved = resolveCategorySelection(CATS, ["huis"])
    expect(resolved.parentId).toBe("huis")
    expect(resolved.childId).toBe("")
    expect(resolved.l3Id).toBe("")
    expect(resolved.categoryIds).toEqual(["huis"])
  })

  it("rejects child under wrong parent", () => {
    const result = normalizeCategoryAssignment(CATS, {
      parentId: "wonen",
      childId: "keuken",
    })
    expect(result.ok).toBe(false)
  })

  it("rejects mismatched category_ids pair", () => {
    const result = normalizeCategoryAssignment(CATS, {
      categoryIds: ["wonen", "keuken"],
    })
    expect(result.ok).toBe(false)
  })

  it("accepts matching parent and child", () => {
    const result = normalizeCategoryAssignment(CATS, {
      parentId: "wonen",
      childId: "slaap",
    })
    expect(result).toEqual({
      ok: true,
      parentId: "wonen",
      childId: "slaap",
      l3Id: "",
      categoryIds: ["wonen", "slaap"],
    })
  })

  it("hides Mode unless selected", () => {
    const parents = sellerParentCategoryOptions(CATS)
    expect(parents.some((row) => row.id === "mode")).toBe(false)
    expect(
      sellerParentCategoryOptions(CATS, ["mode"]).some((row) => row.id === "mode")
    ).toBe(true)
  })

  it("dedupes synonym root names to one option", () => {
    const withDupes = [
      ...CATS,
      {
        id: "klus-short",
        name: "Klus & Gereedschap",
        slug: "klus-gereedschap",
        parent_id: null,
        link_count: 0,
      },
      {
        id: "klus-full",
        name: "Klus & Gereedschap",
        slug: "klus-en-gereedschap",
        parent_id: null,
        link_count: 4,
      },
    ]
    const parents = sellerParentCategoryOptions(withDupes)
    expect(parents.filter((row) => row.name === "Klus & Gereedschap")).toHaveLength(1)
    expect(parents.find((row) => row.name === "Klus & Gereedschap")?.id).toBe(
      "klus-full"
    )
  })

  it("lists children for a parent only", () => {
    expect(sellerChildCategoryOptions(CATS, "wonen").map((r) => r.slug)).toEqual([
      "slaapkamer",
    ])
    expect(sellerChildCategoryOptions(CATS, "huis").map((r) => r.slug)).toEqual([
      "keuken",
    ])
  })
})
