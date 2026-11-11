import { choiceAssistantMatches, planChoiceAssistant } from "../category-v2-choice"

const products = [
  {
    slug: "a",
    title: "Vaatwasser A",
    priceCents: 89900,
    offerCount: 1,
    specs: [
      { code: "breedte", value: "60 cm" },
      { code: "geluid", value: "42 dB" },
    ],
  },
  {
    slug: "b",
    title: "Vaatwasser B",
    priceCents: 64900,
    offerCount: 2,
    specs: [
      { code: "breedte", value: "45 cm" },
      { code: "geluid", value: "46 dB" },
    ],
  },
  {
    slug: "empty",
    title: "Zonder aanbod",
    priceCents: 100,
    offerCount: 0,
    specs: [{ code: "breedte", value: "60 cm" }],
  },
]

const attributes = [
  { code: "breedte", name: "Breedte", dataType: "Keuze", comparable: true },
  { code: "geluid", name: "Geluidsniveau", dataType: "Keuze", comparable: true },
  { code: "nishoogte", name: "Nishoogte", dataType: "Numeriek", comparable: true },
]

describe("category choice assistant", () => {
  it("builds questions only from specs shared by two sellable products", () => {
    const plan = planChoiceAssistant({ products, attributes })
    expect(plan.ready).toBe(true)
    expect(plan.questions.map((question) => question.code)).toEqual(["breedte", "geluid"])
    expect(plan.questions[0]?.options.map((option) => option.label)).toEqual(["45 cm", "60 cm"])
    expect(plan.questions[0]?.options.find((option) => option.label === "60 cm")?.count).toBe(1)
  })

  it("stays a message when the assortment has no shared specs", () => {
    const plan = planChoiceAssistant({
      products: [products[0]!],
      attributes,
    })
    expect(plan.ready).toBe(false)
    expect(plan.questions).toEqual([])
    expect(plan.message).toMatch(/geen advies/)
    expect(JSON.stringify(plan)).not.toContain("volledig integreerbaar")
  })

  it("uses the stored attribute codes and ignores codes that are not in Product Cloud", () => {
    const plan = planChoiceAssistant({
      products,
      attributes,
      questionCodes: ["onbekend", "breedte"],
    })
    expect(plan.questions.map((question) => question.code)).toEqual(["breedte"])
  })

  it("filters the current assortment and leaves unsellable products out", () => {
    const matches = choiceAssistantMatches(products, { breedte: "60 cm" })
    expect(matches.map((product) => product.slug)).toEqual(["a"])
  })
})
