import type { CategoryV2FilterFacet } from "../category-v2-listing"
import { getCategoryAdvice, resolveAdviceSelections } from "../category-advice"

describe("category advice", () => {
  const advice = getCategoryAdvice("wasmachines")

  it("publishes one washer advice page and no page for an unknown category", () => {
    expect(advice?.path).toBe("/advies/wasmachines")
    expect(advice?.referralTitle).toBe("Welk advies helpt jou bij het kiezen?")
    expect(advice?.referralCta).toBe("Bekijk de keuzehulp en het koopadvies")
    expect(getCategoryAdvice("wasdrogers")).toBeNull()
    expect(getCategoryAdvice("vaatwassers")).toBeNull()
  })

  it("links every topic to a section and every category link to an existing route", () => {
    expect(advice).not.toBeNull()
    const ids = new Set(advice!.sections.map((section) => section.id))
    expect(advice!.topics.map((topic) => topic.id)).toEqual([...ids])
    const hrefs = advice!.sections.flatMap((section) => section.links ?? []).map((link) => link.href)
    expect(hrefs).toEqual([
      "/categorie/wasmachines",
      "/categorie/wasmachines",
      "/categorie/wasmachines",
      "/categorie/wasmachines",
      "/categorie/wasdrogers",
      "/categorie/was-droogcombinaties",
      "/categorie/wasmachines-en-drogers",
    ])
    const blob = JSON.stringify(advice)
    expect(blob).not.toMatch(/coolblue/i)
    expect(blob).not.toMatch(/bespaar|binnen \d+ dagen|gaat \d+ jaar mee/i)
  })

  it("keeps a product selection only when the live facet can match it", () => {
    expect(advice).not.toBeNull()
    const facets: CategoryV2FilterFacet[] = [
      {
        attributeKey: "vulgewicht",
        label: "Vulgewicht",
        type: "range",
        options: [],
        min: 8,
        max: 11,
      },
      {
        attributeKey: "energielabel",
        label: "Energielabel",
        type: "checkbox",
        options: [{ value: "a", label: "A", count: 8 }],
        min: null,
        max: null,
      },
      {
        attributeKey: "geluidsniveau",
        label: "Geluidsniveau",
        type: "range",
        options: [],
        min: 70,
        max: 73,
      },
      {
        attributeKey: "stoom",
        label: "Soort stoomfunctie",
        type: "checkbox",
        options: [{ value: "steamcare", label: "SteamCare", count: 2 }],
        min: null,
        max: null,
      },
    ]
    const links = resolveAdviceSelections(advice!, facets)
    const labels = links.map((link) => link.label)
    expect(labels).toContain("Bekijk alle wasmachines")
    expect(labels).toContain("Bekijk wasmachines vanaf 9 kg")
    expect(labels).toContain("Bekijk wasmachines met energielabel A")
    expect(labels).toContain("Bekijk wasmachines met een lager opgegeven geluid")
    expect(labels).toContain("Bekijk wasmachines met een stoomfunctie")
    expect(labels).not.toContain("Bekijk wasmachines met automatische wasmiddeldosering")
    const steam = links.find((link) => link.label.includes("stoom"))
    expect(steam?.href).toBe("/categorie/wasmachines?f=Soort%20stoomfunctie%3ASteamCare")
    const quiet = links.find((link) => link.label.includes("geluid"))
    expect(quiet?.href).toContain("max=Geluidsniveau%3A72")
  })

  it("drops a range selection that would not narrow the assortment", () => {
    expect(advice).not.toBeNull()
    const facets: CategoryV2FilterFacet[] = [
      {
        attributeKey: "geluidsniveau",
        label: "Geluidsniveau",
        type: "range",
        options: [],
        min: 70,
        max: 72,
      },
    ]
    const labels = resolveAdviceSelections(advice!, facets).map((link) => link.label)
    expect(labels).toEqual(["Bekijk alle wasmachines"])
  })
})
