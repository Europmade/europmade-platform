import { computeNetSettlement } from "../serialize-settlement"

describe("G3 settlement formula", () => {
  it("nets services invoice against sales credit", () => {
    expect(computeNetSettlement(9500, 1149.5)).toBe(8350.5)
  })

  it("allows a negative net without inventing payout", () => {
    expect(computeNetSettlement(100, 250)).toBe(-150)
  })
})
