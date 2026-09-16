import {
  findManufacturerForBrandName,
  manufacturerNameMatchesBrand,
} from "../brand-manufacturer"

describe("brand manufacturer matching", () => {
  it("treats equal names as the same party, ignoring case and spaces", () => {
    expect(manufacturerNameMatchesBrand("P28 Merk", "p28 merk")).toBe(true)
    expect(manufacturerNameMatchesBrand(" P28 Merk ", "P28 Merk")).toBe(true)
  })

  it("does not treat a different manufacturer as the brand", () => {
    expect(
      manufacturerNameMatchesBrand("Andere Fabriek BV", "P28 Merk")
    ).toBe(false)
    expect(manufacturerNameMatchesBrand("", "P28 Merk")).toBe(false)
  })

  it("finds the partner manufacturer that belongs to the brand name", () => {
    const rows = [
      { id: "manu_other", name: "Andere Fabriek BV" },
      { id: "manu_brand", name: "P28 Merk" },
    ]
    expect(findManufacturerForBrandName(rows, "P28 Merk")?.id).toBe("manu_brand")
    expect(findManufacturerForBrandName(rows, "Onbekend")).toBeNull()
  })
})
