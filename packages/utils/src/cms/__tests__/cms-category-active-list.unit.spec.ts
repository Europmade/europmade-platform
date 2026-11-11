import { categoryCmsListExclusion } from "../../cms-category-active-list"

describe("active category cms list", () => {
  it("excludes Mode and E2E Cat and keeps canonical categories", () => {
    expect(categoryCmsListExclusion({ name: "Mode", slug: "mode" })).toBeTruthy()
    expect(categoryCmsListExclusion({ name: "E2E Cat", slug: "" })).toBeTruthy()
    expect(categoryCmsListExclusion({ name: "Huishouden", slug: "huishouden" })).toBeNull()
    expect(categoryCmsListExclusion({ name: "Algemeen", slug: "algemeen" })).toBeNull()
    expect(categoryCmsListExclusion({ name: "Duurzaam", slug: "duurzaam" })).toBeNull()
  })
})
