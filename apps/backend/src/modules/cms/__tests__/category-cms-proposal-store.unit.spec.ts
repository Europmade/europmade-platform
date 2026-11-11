import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createDefaultCategoryCmsDocument, getUspBar } from "@europmade/utils"
import { buildCategoryFactPackages, type CategoryFactSource } from "../../product-cloud/category-fact-package"
import {
  categorySlugsForBrand,
  categorySlugsForProduct,
  handleCategoryFactsChanged,
} from "../category-cms-proposal-events"
import {
  acceptStoredCategoryProposal,
  MemoryCategoryProposalRepository,
  modifyStoredCategoryProposal,
  rejectStoredCategoryProposal,
  storeCategoryCmsProposals,
} from "../category-cms-proposal-store"

function source(): CategoryFactSource {
  return {
    categories: [
      { id: "el", name: "Elektronica", slug: "elektronica", parent_id: null },
      { id: "audio", name: "Audio", slug: "audio", parent_id: "el" },
      { id: "radio", name: "Radio", slug: "radio", parent_id: "audio" },
    ],
    products: [{ id: "p1", brand_id: "b1", lifecycle_status: "Actief" }],
    versions: [
      { id: "v1", product_id: "p1", version_number: 1, publication_status: "Gepubliceerd", title: "Radio" },
    ],
    links: [{ product_id: "p1", category_id: "radio" }],
    brands: [{ id: "b1", name: "Noord", logo_url: null, owner_company_country: "NL" }],
    origins: [],
    facilities: [],
    definitions: [],
    values: [],
    relations: [],
    evidence: [],
  }
}

describe("category cms proposal storage", () => {
  const pkg = buildCategoryFactPackages(source()).find((row) => row.slug === "elektronica")!

  it("stores proposals once, reuses the same fingerprint and records zero cost per locale", async () => {
    const repo = new MemoryCategoryProposalRepository()
    const first = await storeCategoryCmsProposals(repo, pkg, { explicit: true, now: "2026-11-06T00:00:00.000Z" })
    const second = await storeCategoryCmsProposals(repo, pkg, { explicit: true, now: "2026-11-06T00:00:00.000Z" })
    expect(first.provider_calls).toBe(1)
    expect(second.provider_calls).toBe(0)
    expect(second.proposals).toHaveLength(first.proposals.length)
    expect(repo.rows).toHaveLength(first.proposals.length)
    const locales = new Set(first.costs.map((row) => row.locale))
    expect(locales).toEqual(new Set(["nl", "en", "de", "fr"]))
    expect(first.costs.every((row) => row.amount_minor === 0)).toBe(true)
    const concurrent = await repo.insert(first.proposals[0]!, [])
    expect(concurrent).toBe("duplicate")
  })

  it("marks an old fingerprint outdated and does not generate a replacement", async () => {
    const repo = new MemoryCategoryProposalRepository()
    const stored = await storeCategoryCmsProposals(repo, pkg, { explicit: true, now: "2026-11-06T00:00:00.000Z" })
    const changed = await storeCategoryCmsProposals(
      repo,
      { ...pkg, fingerprint: "changed" },
      { explicit: false }
    )
    expect(changed.provider_calls).toBe(0)
    expect(changed.proposals.every((row) => row.status === "outdated")).toBe(true)
    expect(changed.proposals).toHaveLength(stored.proposals.length)
    const again = await handleCategoryFactsChanged({
      productId: "p1",
      repo,
      slugsForProduct: async () => ["elektronica"],
      fingerprintFor: async () => "changed",
    })
    expect(again.provider_calls).toBe(0)
    expect(again.updated).toBe(0)
  })

  it("accepts only empty draft fields, rejects without touching the draft and does not publish", async () => {
    const repo = new MemoryCategoryProposalRepository()
    const stored = await storeCategoryCmsProposals(repo, pkg, { explicit: true, now: "2026-11-06T00:00:00.000Z" })
    const hero = stored.proposals.find((row) => row.block_type === "hero")!
    const draft = createDefaultCategoryCmsDocument("level_1", { slug: "elektronica" })
    const heroBlock = draft.blocks.find((block) => block.type === "hero")
    if (heroBlock?.type === "hero") heroBlock.intro = { nl: "Eigen", en: "", de: "", fr: "" }
    draft.block_meta[heroBlock!.id] = {
      ...draft.block_meta[heroBlock!.id]!,
      locale_origins: { intro: { nl: "manual" } },
    }
    const usp = getUspBar(draft)!
    usp.slots[0] = { ...usp.slots[0]!, title: { nl: "Vast", en: "", de: "", fr: "" } }
    draft.block_meta[usp.id] = {
      ...draft.block_meta[usp.id]!,
      manual_override: { "0": true, "1": false, "2": false, "3": false },
    }
    draft.seo.h1 = { nl: "Elektronica", en: "", de: "", fr: "" }
    let published = 0
    const accepted = await acceptStoredCategoryProposal({
      proposal: hero,
      draft,
      draftRevision: 3,
      saveDraft: async (document) => {
        expect(document.seo.h1.nl).toBe("Elektronica")
        const next = document.blocks.find((block) => block.type === "hero")
        expect(next && next.type === "hero" ? next.intro.nl : "").toBe("Eigen")
        expect(next && next.type === "hero" ? next.intro.en : "").toContain("Elektronica")
      },
      saveProposal: async () => {
        published += 0
      },
    })
    expect(accepted.published).toBe(false)
    expect(accepted.applied).toBe(true)
    const saveDraft = jest.fn()
    const rejected = await rejectStoredCategoryProposal({
      proposal: hero,
      draft,
      saveDraft,
      saveProposal: async (row) => {
        expect(row.status).toBe("rejected")
      },
    })
    expect(saveDraft).not.toHaveBeenCalled()
    expect(rejected.draft_changed).toBe(false)
    expect(rejected.published).toBe(false)
    const modified = await modifyStoredCategoryProposal({
      proposal: hero,
      content: { nl: { intro: "Nieuw" }, en: { intro: "" }, de: { intro: "" }, fr: { intro: "" } },
      saveProposal: async (row) => {
        expect(row.missing_locales).toEqual(["en", "de", "fr"])
      },
    })
    expect(modified.status).toBe("modified")
    expect(published).toBe(0)
    const saveProposal = jest.fn()
    await expect(
      acceptStoredCategoryProposal({
        proposal: hero,
        draft,
        draftRevision: 3,
        saveDraft: async () => {
          throw new Error("draft_revision_conflict")
        },
        saveProposal,
      })
    ).rejects.toThrow("draft_revision_conflict")
    expect(saveProposal).not.toHaveBeenCalled()
  })

  it("limits a product change to the category and its parents", () => {
    expect(
      categorySlugsForProduct({
        productId: "p1",
        links: [{ product_id: "p1", category_id: "radio" }, { product_id: "p2", category_id: "other" }],
        categories: [
          { id: "el", slug: "elektronica", parent_id: null },
          { id: "audio", slug: "audio", parent_id: "el" },
          { id: "radio", slug: "radio", parent_id: "audio" },
          { id: "other", slug: "tuin", parent_id: null },
        ],
      })
    ).toEqual(["audio", "elektronica", "radio"])
    expect(
      categorySlugsForBrand({
        brandId: "b1",
        products: [
          { id: "p1", brand_id: "b1" },
          { id: "p2", brand_id: "b2" },
        ],
        links: [
          { product_id: "p1", category_id: "radio" },
          { product_id: "p2", category_id: "other" },
        ],
        categories: [
          { id: "el", slug: "elektronica", parent_id: null },
          { id: "audio", slug: "audio", parent_id: "el" },
          { id: "radio", slug: "radio", parent_id: "audio" },
          { id: "other", slug: "tuin", parent_id: null },
        ],
      })
    ).toEqual(["audio", "elektronica", "radio"])
  })

  it("keeps proposal routes behind admin auth and the storefront free of proposals", () => {
    const root = join(__dirname, "../../../../../..")
    const middlewares = readFileSync(join(root, "apps/backend/src/api/middlewares.ts"), "utf8")
    expect(middlewares).toContain('matcher: "/admin/cms/categories/:slug/proposals"')
    expect(middlewares).toContain('matcher: "/admin/cms/categories/:slug/proposals/generate"')
    const proposalIndex = middlewares.indexOf('matcher: "/admin/cms/categories/:slug/proposals"')
    expect(middlewares.slice(proposalIndex, proposalIndex + 180)).toContain("adminAuth")
    const page = readFileSync(join(root, "apps/web/app/categorie/[slug]/page.tsx"), "utf8")
    const subscriber = readFileSync(
      join(root, "apps/backend/src/subscribers/category-cms-proposals-outdated.ts"),
      "utf8"
    )
    expect(page).not.toContain("category-cms-proposals")
    expect(subscriber).not.toContain("buildCategoryCmsProposals")
    expect(subscriber).not.toContain("saveCategoryDraft")
    expect(subscriber).toContain("CategoryFactsChanged")
    expect(subscriber).toContain("brand_id")
    const accept = readFileSync(
      join(root, "apps/backend/src/api/admin/cms/categories/[slug]/proposals/[id]/accept/route.ts"),
      "utf8"
    )
    expect(accept).toContain("expected_draft_revision")
    expect(accept).toContain("assertDraftRevision")
    expect(accept).not.toContain("publishCategory")
    for (const file of [
      "apps/backend/src/api/store/product-cloud/products/[id]/route.ts",
      "apps/backend/src/workflows/product-cloud/versions.ts",
      "apps/backend/src/api/admin/product-cloud/products/[id]/section-reviews/route.ts",
      "apps/backend/src/api/store/product-cloud/products/[id]/made-in-europe/evidence/route.ts",
      "apps/backend/src/api/store/brands/[id]/route.ts",
      "apps/backend/src/api/admin/brand-ownership/pages/[brandId]/route.ts",
    ]) {
      expect(readFileSync(join(root, file), "utf8")).toContain("emitCategoryFactsChanged")
    }
    expect(middlewares).not.toContain('matcher: "/store/cms/categories/:slug/proposals"')
  })
})
