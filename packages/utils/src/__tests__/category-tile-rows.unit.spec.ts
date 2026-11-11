import { level1CategoryTileRows } from "../category-tile-rows"

describe("level 1 category tile rows", () => {
  it("keeps a short list on one row", () => {
    expect(level1CategoryTileRows(0)).toEqual([])
    expect(level1CategoryTileRows(4)).toEqual([4])
    expect(level1CategoryTileRows(5)).toEqual([5])
  })

  it("splits Huishouden into five and four", () => {
    expect(level1CategoryTileRows(9)).toEqual([5, 4])
  })

  it("uses four, five or six on the second row", () => {
    expect(level1CategoryTileRows(10)).toEqual([5, 5])
    expect(level1CategoryTileRows(11)).toEqual([5, 6])
  })

  it("adds another row instead of a single leftover", () => {
    expect(level1CategoryTileRows(12)).toEqual([5, 4, 3])
    expect(level1CategoryTileRows(14)).toEqual([5, 5, 4])
  })
})