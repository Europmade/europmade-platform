import { orderSubcategoriesWithAggregateFirst } from "../commercial-nav"

describe("category group order", () => {
  it("places an Alles-in category first and keeps the other relative order", () => {
    const rows = [
      { name: "Wasdrogers", slug: "wasdrogers" },
      { name: "Wasmachines", slug: "wasmachines" },
      { name: "Alles in Was & Drogen", slug: "alles-in-was-en-drogen" },
      { name: "Was-droogcombinaties", slug: "was-droogcombinaties" },
      { name: "Wasmachines & drogers", slug: "wasmachines-en-drogers" },
    ]
    expect(orderSubcategoriesWithAggregateFirst(rows).map((row) => row.slug)).toEqual([
      "alles-in-was-en-drogen",
      "wasdrogers",
      "wasmachines",
      "was-droogcombinaties",
      "wasmachines-en-drogers",
    ])
  })

  it("keeps the incoming order when no Alles-in category exists", () => {
    const rows = [
      { name: "Keuken", slug: "keuken" },
      { name: "Wassen & drogen", slug: "was-droog" },
      { name: "Vrijstaande apparaten", slug: "vrijstaande-apparaten" },
    ]
    expect(orderSubcategoriesWithAggregateFirst(rows)).toEqual(rows)
  })

  it("recognizes the slug convention without a hardcoded category id", () => {
    const rows = [
      { name: "Ovens", slug: "ovens" },
      { name: "Compleet aanbod", slug: "alles-in-inbouwapparatuur" },
      { name: "Kookplaten", slug: "kookplaten" },
    ]
    expect(orderSubcategoriesWithAggregateFirst(rows).map((row) => row.name)).toEqual([
      "Compleet aanbod",
      "Ovens",
      "Kookplaten",
    ])
  })

  it("keeps several Alles-in categories in their original order at the front", () => {
    const rows = [
      { name: "Kookplaten", slug: "kookplaten" },
      { name: "Alles in Keuken", slug: "groep-keuken" },
      { name: "Ovens", slug: "ovens" },
      { name: "Alles in Inbouw", slug: "groep-inbouw" },
    ]
    expect(orderSubcategoriesWithAggregateFirst(rows).map((row) => row.slug)).toEqual([
      "groep-keuken",
      "groep-inbouw",
      "kookplaten",
      "ovens",
    ])
  })
})
