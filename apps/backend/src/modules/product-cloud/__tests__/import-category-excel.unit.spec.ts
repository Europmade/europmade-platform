import {
  buildCategoryExcelLists,
  filterCategoriesForSellerImportTemplate,
} from "../import-category-excel"

describe("filterCategoriesForSellerImportTemplate", () => {
  const rows = [
    { id: "e2e", name: "E2E Cat", slug: "e2e-cat", parent_id: null },
    { id: "mode", name: "Mode", slug: "mode", parent_id: null },
    { id: "duurzaam", name: "Duurzaam", slug: "duurzaam", parent_id: null },
    { id: "huis", name: "Huishouden", slug: "huishouden", parent_id: null },
    { id: "schoon", name: "Schoonmaak", slug: "schoonmaak", parent_id: "huis" },
    {
      id: "robot",
      name: "Robotstofzuiger",
      slug: "robotstofzuiger",
      parent_id: "huis",
    },
    { id: "tuin", name: "Tuin", slug: "tuin", parent_id: null },
    {
      id: "gras",
      name: "Grasmaaiers & Robots",
      slug: "grasmaaiers-robots",
      parent_id: "tuin",
    },
  ]

  it("hides E2E/Mode/Duurzaam roots but keeps Robotstofzuiger from definitive tree", () => {
    const filtered = filterCategoriesForSellerImportTemplate(rows)
    const names = filtered.map((r) => r.name)
    expect(names).not.toContain("E2E Cat")
    expect(names).not.toContain("Mode")
    expect(names).not.toContain("Duurzaam")
    expect(names).toContain("Robotstofzuiger")
    expect(names).toContain("Huishouden")
    expect(names).toContain("Schoonmaak")
    expect(names).toContain("Tuin")
    expect(names).toContain("Grasmaaiers & Robots")
  })

  it("builds CatDeps without hidden roots; keeps Robotstofzuiger under Huishouden", () => {
    const lists = buildCategoryExcelLists(rows)
    expect(lists.roots.map((r) => r.name)).toEqual(["Huishouden", "Tuin"])
    expect(lists.childrenByRootName.get("Huishouden")).toEqual([
      "Robotstofzuiger",
      "Schoonmaak",
    ])
    expect(lists.childrenByRootName.get("Tuin")).toEqual([
      "Grasmaaiers & Robots",
    ])
  })
})
