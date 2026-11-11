import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  categoryCmsAllowedBlockTypes,
  createDefaultCategoryCmsDocument,
  getUspBar,
  isUspSlotManualOverride,
} from "@europmade/utils"
import {
  buildCategoryFactPackages,
  type CategoryFactSource,
} from "../../product-cloud/category-fact-package"
import {
  acceptCategoryCmsProposal,
  buildCategoryCmsProposals,
  categoryCmsExternalProviderRefused,
  modifyCategoryCmsProposal,
  reconcileCategoryCmsProposals,
  rejectCategoryCmsProposal,
  type CategoryCmsProposalContent,
} from "../category-cms-proposals"

function source(patch: Partial<CategoryFactSource> = {}): CategoryFactSource {
  return {
    categories: [
      { id: "el", name: "Elektronica", slug: "elektronica", parent_id: null },
      { id: "audio", name: "Audio", slug: "audio", parent_id: "el" },
      { id: "radio", name: "Radio", slug: "radio", parent_id: "audio" },
      { id: "sport", name: "Sport", slug: "sport", parent_id: null },
      { id: "bal", name: "Ballen", slug: "ballen", parent_id: "sport" },
      { id: "duur", name: "Duurzaam", slug: "duurzaam", parent_id: null },
    ],
    products: [
      { id: "p1", brand_id: "b1", lifecycle_status: "Actief" },
      { id: "p2", brand_id: "b2", lifecycle_status: "Actief" },
      { id: "p3", brand_id: "b1", lifecycle_status: "Actief" },
    ],
    versions: [
      { id: "v1", product_id: "p1", version_number: 1, publication_status: "Gepubliceerd", title: "Radio" },
      { id: "v2", product_id: "p2", version_number: 1, publication_status: "Gepubliceerd", title: "Archief" },
      { id: "v3", product_id: "p3", version_number: 1, publication_status: "Concept", title: "Concept" },
    ],
    links: [
      { product_id: "p1", category_id: "radio" },
      { product_id: "p2", category_id: "el" },
      { product_id: "p3", category_id: "bal" },
    ],
    brands: [
      { id: "b1", name: "Noord", logo_url: "https://example.test/logo.svg", owner_company_country: "NL" },
      { id: "b2", name: "Zuid", logo_url: null, owner_company_country: "NL" },
    ],
    origins: [
      {
        product_version_id: "v1",
        production_country: "DE",
        primary_assembly_country: "DE",
        status: "Geverifieerd",
        production_facility_id: null,
        assembly_eu_band: "eu_100",
        parts_eu_level: "eu_majority",
        materials_eu_level: "eu_majority",
      },
      {
        product_version_id: "v2",
        production_country: "DUITSLAND",
        primary_assembly_country: null,
        status: null,
        production_facility_id: null,
        assembly_eu_band: null,
        parts_eu_level: null,
        materials_eu_level: null,
      },
    ],
    facilities: [],
    definitions: [
      {
        id: "d1",
        category_id: "radio",
        code: "vermogen",
        name: "Vermogen",
        is_filterable: true,
        is_comparable: true,
        is_active: true,
        requirement_tier: "optional",
      },
    ],
    values: [{ product_version_id: "v1", attribute_definition_id: "d1", value: "800" }],
    relations: [],
    evidence: [{ product_id: "p1", evidence_kind: "made_in_europe", verification_status: "approved" }],
    ...patch,
  }
}

function prose(content: CategoryCmsProposalContent | null): string {
  if (!content) return ""
  return Object.values(content)
    .flatMap((fields) => Object.values(fields))
    .join("\n")
}

describe("category cms proposals", () => {
  const packages = buildCategoryFactPackages(source())
  const elektronica = packages.find((row) => row.slug === "elektronica")!
  const sport = packages.find((row) => row.slug === "sport")!
  const duurzaam = packages.find((row) => row.slug === "duurzaam")!
  const radio = packages.find((row) => row.slug === "radio")!

  it("builds one proposal per allowed block and stays inside the profile", () => {
    for (const pkg of [elektronica, sport, duurzaam, radio]) {
      const { proposals, costs, provider_calls } = buildCategoryCmsProposals(pkg, { now: "2026-11-06T00:00:00.000Z" })
      const allowed = categoryCmsAllowedBlockTypes(pkg.profile)
      expect(provider_calls).toBe(1)
      expect(proposals.map((row) => row.block_type).sort()).toEqual([...allowed].sort())
      expect(costs.every((row) => row.amount_minor === 0)).toBe(true)
      expect(new Set(costs.map((row) => row.locale))).toEqual(new Set(["nl", "en", "de", "fr"]))
      for (const proposal of proposals) {
        expect(proposal.fact_fingerprint).toBe(pkg.fingerprint)
        expect(proposal.status).toBe("proposed")
        expect(proposal.applied_draft_revision).toBeNull()
        if (proposal.content) {
          expect(Object.keys(proposal.content).sort()).toEqual(["de", "en", "fr", "nl"])
          expect(proposal.missing_locales).toEqual([])
          expect(proposal.used_facts.length).toBeGreaterThan(0)
        } else {
          expect(proposal.confidence).toBe("blocked")
        }
      }
    }
  })

  it("uses only package facts and does not invent origin, price or popularity", () => {
    const built = buildCategoryCmsProposals(elektronica, { now: "2026-11-06T00:00:00.000Z" })
    const why = built.proposals.find((row) => row.block_type === "why_europmade")!
    const text = prose(why.content)
    expect(why.confidence).toBe("factual")
    expect(text).toContain("DE")
    expect(text).toContain("Made in Europe-score: 1")
    expect(text).not.toContain("DUITSLAND")
    expect(text).not.toContain("NL")
    expect(text).not.toContain("€")
    expect(text.toLowerCase()).not.toContain("populair")
    const carousel = built.proposals.find((row) => row.block_type === "product_carousel")!
    expect(prose(carousel.content)).toContain("Radio")
    expect(prose(carousel.content)).toContain("Archief")
    expect(prose(carousel.content)).not.toContain("Concept")
    const joined = built.proposals.map((row) => prose(row.content)).join("\n")
    expect(joined).not.toContain("Europese makers")
    expect(joined).not.toContain("€")
  })

  it("blocks empty assortment claims for Duurzaam and keeps Sport thinner", () => {
    const empty = buildCategoryCmsProposals(duurzaam, { now: "2026-11-06T00:00:00.000Z" })
    expect(empty.proposals.find((row) => row.block_type === "product_carousel")!.confidence).toBe("blocked")
    expect(empty.proposals.find((row) => row.block_type === "why_europmade")!.content).toBeNull()
    expect(empty.proposals.find((row) => row.block_type === "seo_content")!.confidence).toBe("blocked")
    expect(prose(empty.proposals.find((row) => row.block_type === "hero")!.content)).toBe(
      ["Duurzaam", "Duurzaam", "Duurzaam", "Duurzaam"].join("\n")
    )
    const thin = buildCategoryCmsProposals(sport, { now: "2026-11-06T00:00:00.000Z" })
    expect(thin.proposals.find((row) => row.block_type === "why_europmade")!.confidence).toBe("blocked")
    expect(prose(thin.proposals.find((row) => row.block_type === "hero")!.content)).not.toContain("Radio")
    expect(prose(thin.proposals.find((row) => row.block_type === "hero")!.content)).toContain("Ballen")
  })

  it("keeps the draft unchanged on reject and does not publish an acceptance", () => {
    const draft = createDefaultCategoryCmsDocument("level_1", { slug: "elektronica" })
    const before = JSON.stringify(draft)
    const proposal = buildCategoryCmsProposals(elektronica, { now: "2026-11-06T00:00:00.000Z" }).proposals.find(
      (row) => row.block_type === "hero"
    )!
    const rejected = rejectCategoryCmsProposal(draft, proposal)
    expect(JSON.stringify(rejected.document)).toBe(before)
    expect(rejected.proposal.status).toBe("rejected")
    expect(rejected.published).toBe(false)
    const accepted = acceptCategoryCmsProposal(draft, proposal, { draftRevision: 4 })
    expect(accepted.published).toBe(false)
    expect(accepted.proposal.status).toBe("accepted")
    expect(accepted.proposal.applied_draft_revision).toBe(4)
    expect(accepted.document.seo.h1.nl).toBe("")
    expect(JSON.stringify(draft)).toBe(before)
  })

  it("fills empty USP slots and leaves manual slots and manual locales alone", () => {
    const draft = createDefaultCategoryCmsDocument("level_1", { slug: "elektronica" })
    const usp = getUspBar(draft)!
    usp.slots[0] = {
      ...usp.slots[0]!,
      title: { nl: "Handmatig", en: "", de: "", fr: "" },
    }
    draft.block_meta[usp.id] = {
      ...draft.block_meta[usp.id]!,
      manual_override: { "0": true, "1": false, "2": false, "3": false },
    }
    const hero = draft.blocks.find((block) => block.type === "hero")!
    if (hero.type === "hero") {
      hero.intro = { nl: "Eigen tekst", en: "", de: "", fr: "" }
      draft.block_meta[hero.id] = {
        ...draft.block_meta[hero.id]!,
        locale_origins: { intro: { nl: "manual" } },
      }
    }
    const proposals = buildCategoryCmsProposals(elektronica, { now: "2026-11-06T00:00:00.000Z" }).proposals
    const acceptedUsp = acceptCategoryCmsProposal(draft, proposals.find((row) => row.block_type === "usp_bar")!)
    const nextUsp = getUspBar(acceptedUsp.document)!
    expect(nextUsp.slots[0]!.title.nl).toBe("Handmatig")
    expect(isUspSlotManualOverride(acceptedUsp.document.block_meta[nextUsp.id], 0)).toBe(true)
    expect(isUspSlotManualOverride(acceptedUsp.document.block_meta[nextUsp.id], 1)).toBe(false)
    expect(nextUsp.slots[1]!.title.nl).toContain("1")
    const acceptedHero = acceptCategoryCmsProposal(draft, proposals.find((row) => row.block_type === "hero")!)
    const nextHero = acceptedHero.document.blocks.find((block) => block.type === "hero")
    expect(nextHero && nextHero.type === "hero" ? nextHero.intro.nl : "").toBe("Eigen tekst")
    expect(nextHero && nextHero.type === "hero" ? nextHero.intro.en : "").toContain("Elektronica")
  })

  it("does not replace a rejected proposal with the same text and does not regenerate without a request", () => {
    const first = buildCategoryCmsProposals(elektronica, { now: "2026-11-06T00:00:00.000Z" })
    const same = reconcileCategoryCmsProposals({
      existing: first.proposals,
      fingerprint: elektronica.fingerprint,
      rebuilt: first.proposals,
      explicit: true,
    })
    expect(same.provider_calls).toBe(0)
    expect(same.proposals).toHaveLength(first.proposals.length)
    const stale = reconcileCategoryCmsProposals({
      existing: first.proposals,
      fingerprint: "other",
      rebuilt: first.proposals,
      explicit: false,
    })
    expect(stale.provider_calls).toBe(0)
    expect(stale.proposals.every((row) => row.status === "outdated")).toBe(true)
    expect(stale.proposals).toHaveLength(first.proposals.length)
    const rejected = first.proposals.map((row) => ({ ...row, status: "rejected" as const }))
    const again = reconcileCategoryCmsProposals({
      existing: rejected,
      fingerprint: "other",
      rebuilt: first.proposals,
      explicit: true,
    })
    expect(again.proposals.filter((row) => row.status === "proposed")).toHaveLength(0)
    const changed = modifyCategoryCmsProposal(first.proposals[0]!, {
      nl: { intro: "Aangepast" },
      en: { intro: "" },
      de: { intro: "" },
      fr: { intro: "" },
    })
    expect(changed.status).toBe("modified")
    expect(changed.missing_locales).toEqual(["en", "de", "fr"])
    expect(categoryCmsExternalProviderRefused("openai")).toBe(true)
    expect(categoryCmsExternalProviderRefused("offline-analyzer")).toBe(false)
  })

  it("is not imported by the storefront category page", () => {
    const root = join(__dirname, "../../../../../..")
    const page = readFileSync(join(root, "apps/web/app/categorie/[slug]/page.tsx"), "utf8")
    const renderer = readFileSync(
      join(root, "apps/web/app/_components/category/category-v2-page.tsx"),
      "utf8"
    )
    expect(page).not.toContain("category-cms-proposals")
    expect(renderer).not.toContain("buildCategoryCmsProposals")
    expect(renderer).not.toContain("category-cms-proposals")
  })
})
