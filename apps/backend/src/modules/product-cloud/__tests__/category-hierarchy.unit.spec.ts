import {
  normalizeCategoryAssignment,
  resolveCategorySelection,
  sellerChildCategoryOptions,
  sellerParentCategoryOptions,
} from "@europmade/utils"

type Node = { id: string; name: string; slug: string; parent_id: string | null }

function node(slug: string, parent: string | null = null): Node {
  return {
    id: parent ? `c_${slug}` : `p_${slug}`,
    name: slug,
    slug,
    parent_id: parent ? `p_${parent}` : null,
  }
}

/** Contract of the full EuropMade hierarchy (parent slug → child slugs). */
const EXPECTED: Record<string, string[]> = {
  elektronica: [
    "audio-headphones",
    "computers-laptops",
    "phones-tablets",
    "tv-video",
    "smart-home",
    "networking",
    "wearables",
  ],
  huishouden: [
    "keuken",
    "robotstofzuiger",
    "schoonmaak",
    "was-droog",
    "inbouwapparatuur",
    "kleine-keukenapparaten",
  ],
  wonen: [
    "badkamer",
    "home-en-living",
    "slaapkamer",
    "verlichting",
    "woonkamer",
    "opslag-organisatie",
    "woonaccessoires",
    "woontextiel",
    "kaarsen-geur",
  ],
  kleding: ["baby-kleding", "dames", "heren", "kinderkleding", "onderkleding"],
  sport: [
    "outdoor",
    "fitness-training",
    "fietsen",
    "hardlopen",
    "zwem-watersport",
    "teamsport",
  ],
  tuin: [
    "heggenscharen",
    "grasmaaiers-robots",
    "tuinmeubelen",
    "irrigatie-kweek",
    "tuinhandgereedschap",
    "barbecue-buitenkeuken",
  ],
  "klus-en-gereedschap": [
    "handgereedschap",
    "elektrisch-gereedschap",
    "werkplaats-opslag",
  ],
  kantoor: ["schrijfwaren", "bureau-organisatie", "print-papier"],
  "boeken-media": ["boeken", "media-entertainment"],
  ambacht: ["keramiek-glas", "textiel-wol", "hout-leer"],
  "beauty-en-verzorging": ["huidverzorging", "haarverzorging", "make-up-geur"],
  "baby-en-kind": ["speelgoed", "babyverzorging", "kinderkamer"],
  schoenen: ["herenschoenen", "damesschoenen", "kinderschoenen", "sandalen"],
  "tassen-en-accessoires": [
    "rugzakken",
    "handtassen",
    "reisaccessoires",
    "portemonnees",
    "riemen-accessoires",
  ],
  dieren: ["hond", "kat", "overige-dieren"],
  "auto-motor": ["auto-accessoires", "motor-scooter"],
  "juwelen-horloges": ["sieraden", "horloges"],
  voeding: ["dranken", "levensmiddelen"],
  gezondheid: ["vitaminen-supplements", "persoonlijke-verzorging"],
  "plant-en-bloem": ["planten", "bloemen-vazen"],
  "feest-seizoen": ["feestdagen", "seizoensdecoratie"],
  cadeaus: ["cadeausets", "persoonlijke-cadeaus"],
}

function buildTree(): Node[] {
  const rows: Node[] = []
  for (const [parent, kids] of Object.entries(EXPECTED)) {
    rows.push(node(parent))
    for (const kid of kids) {
      rows.push({
        id: `c_${kid}`,
        name: kid,
        slug: kid,
        parent_id: `p_${parent}`,
      })
    }
  }
  // Second level under outdoor
  rows.push(
    { id: "c_kamperen", name: "kamperen", slug: "kamperen", parent_id: "c_outdoor" },
    {
      id: "c_wandelen-outdoor",
      name: "wandelen-outdoor",
      slug: "wandelen-outdoor",
      parent_id: "c_outdoor",
    }
  )
  return rows
}

describe("full EuropMade category hierarchy contract", () => {
  const tree = buildTree()

  it("gives every major hoofdcatégorie a child set", () => {
    expect(Object.keys(EXPECTED).length).toBeGreaterThanOrEqual(20)
    for (const [parent, kids] of Object.entries(EXPECTED)) {
      const childSlugs = sellerChildCategoryOptions(tree, `p_${parent}`).map(
        (r) => r.slug
      )
      for (const kid of kids) {
        expect(childSlugs).toContain(kid)
      }
    }
  })

  it("rejects cross-parent subcategory assignment", () => {
    const result = normalizeCategoryAssignment(tree, {
      parentId: "p_elektronica",
      childId: "c_keuken",
    })
    expect(result.ok).toBe(false)
  })

  it("resolves reused keuken under huishouden", () => {
    const resolved = resolveCategorySelection(tree, ["c_keuken"])
    expect(resolved.parentId).toBe("p_huishouden")
    expect(resolved.childId).toBe("c_keuken")
  })

  it("does not list nested categories as parents", () => {
    const parents = sellerParentCategoryOptions(tree).map((r) => r.slug)
    expect(parents).toContain("elektronica")
    expect(parents).toContain("huishouden")
    expect(parents).toContain("sport")
    expect(parents).not.toContain("keuken")
    expect(parents).not.toContain("robotstofzuiger")
    expect(parents).not.toContain("outdoor")
    expect(parents).not.toContain("heggenscharen")
  })

  it("keeps kleding five-child structure intact", () => {
    expect(EXPECTED.kleding).toEqual([
      "baby-kleding",
      "dames",
      "heren",
      "kinderkleding",
      "onderkleding",
    ])
  })
})
