/**
 * Persist category CMS proposals outside draft and published documents.
 * A changed fingerprint only marks rows outdated. Generation requires explicit=true.
 */
import type { CategoryCmsDocumentV2 } from "@europmade/utils"
import type { CategoryFactPackage } from "../product-cloud/category-fact-package"
import {
  acceptCategoryCmsProposal,
  buildCategoryCmsProposals,
  modifyCategoryCmsProposal,
  reconcileCategoryCmsProposals,
  rejectCategoryCmsProposal,
  type CategoryCmsBlockProposal,
  type CategoryCmsProposalContent,
  type CategoryCmsProposalCost,
} from "./category-cms-proposals"

export type CategoryProposalRepository = {
  list(slug: string): Promise<CategoryCmsBlockProposal[]>
  listCosts(slug: string): Promise<CategoryCmsProposalCost[]>
  insert(proposal: CategoryCmsBlockProposal, costs: CategoryCmsProposalCost[]): Promise<"inserted" | "duplicate">
  update(proposal: CategoryCmsBlockProposal): Promise<void>
}

function proposalKey(row: CategoryCmsBlockProposal): string {
  return `${row.slug}|${row.profile}|${row.block_type}|${row.fact_fingerprint}`
}

export async function storeCategoryCmsProposals(
  repo: CategoryProposalRepository,
  pkg: CategoryFactPackage,
  opts: { explicit: boolean; now?: string }
): Promise<{
  proposals: CategoryCmsBlockProposal[]
  costs: CategoryCmsProposalCost[]
  provider_calls: number
}> {
  const existing = await repo.list(pkg.slug)
  const built = opts.explicit ? buildCategoryCmsProposals(pkg, { now: opts.now }) : null
  const reconciled = reconcileCategoryCmsProposals({
    existing,
    fingerprint: pkg.fingerprint,
    rebuilt: built?.proposals,
    explicit: opts.explicit,
  })
  const known = new Map(existing.map((row) => [row.id, row]))
  for (const row of reconciled.proposals) {
    const previous = known.get(row.id)
    if (!previous) {
      const costs = (built?.costs ?? []).filter((cost) => cost.proposal_id === row.id)
      const inserted = await repo.insert(row, costs)
      if (inserted === "duplicate") continue
      known.set(row.id, row)
      continue
    }
    if (previous.status !== row.status || previous.applied_draft_revision !== row.applied_draft_revision) {
      await repo.update(row)
    }
  }
  return {
    proposals: await repo.list(pkg.slug),
    costs: await repo.listCosts(pkg.slug),
    provider_calls: reconciled.provider_calls,
  }
}

export async function outdateCategoryCmsProposals(
  repo: CategoryProposalRepository,
  fingerprints: Record<string, string>
): Promise<{ updated: number; provider_calls: 0 }> {
  let updated = 0
  for (const [slug, fingerprint] of Object.entries(fingerprints)) {
    const existing = await repo.list(slug)
    const next = reconcileCategoryCmsProposals({
      existing,
      fingerprint,
      explicit: false,
    })
    const byId = new Map(existing.map((row) => [row.id, row]))
    for (const row of next.proposals) {
      const previous = byId.get(row.id)
      if (!previous || previous.status === row.status) continue
      await repo.update(row)
      updated += 1
    }
  }
  return { updated, provider_calls: 0 }
}

export async function acceptStoredCategoryProposal(input: {
  proposal: CategoryCmsBlockProposal
  draft: CategoryCmsDocumentV2 | null
  draftRevision: number | null
  saveDraft: (document: CategoryCmsDocumentV2) => Promise<void>
  saveProposal: (proposal: CategoryCmsBlockProposal) => Promise<void>
}): Promise<{
  proposal: CategoryCmsBlockProposal
  applied: boolean
  published: false
}> {
  if (!input.draft) {
    return { proposal: input.proposal, applied: false, published: false }
  }
  const decision = acceptCategoryCmsProposal(input.draft, input.proposal, {
    draftRevision: input.draftRevision ?? undefined,
  })
  if (decision.applied) await input.saveDraft(decision.document)
  if (decision.proposal.status !== input.proposal.status) {
    await input.saveProposal(decision.proposal)
  }
  return {
    proposal: decision.proposal,
    applied: decision.applied,
    published: false,
  }
}

export async function rejectStoredCategoryProposal(input: {
  proposal: CategoryCmsBlockProposal
  draft: CategoryCmsDocumentV2 | null
  saveDraft: (document: CategoryCmsDocumentV2) => Promise<void>
  saveProposal: (proposal: CategoryCmsBlockProposal) => Promise<void>
}): Promise<{ proposal: CategoryCmsBlockProposal; draft_changed: false; published: false }> {
  void input.saveDraft
  const decision = rejectCategoryCmsProposal(
    input.draft ?? ({ blocks: [] } as unknown as CategoryCmsDocumentV2),
    input.proposal
  )
  await input.saveProposal(decision.proposal)
  return { proposal: decision.proposal, draft_changed: false, published: false }
}

export async function modifyStoredCategoryProposal(input: {
  proposal: CategoryCmsBlockProposal
  content: CategoryCmsProposalContent
  saveProposal: (proposal: CategoryCmsBlockProposal) => Promise<void>
}): Promise<CategoryCmsBlockProposal> {
  const next = modifyCategoryCmsProposal(input.proposal, input.content)
  await input.saveProposal(next)
  return next
}

export class MemoryCategoryProposalRepository implements CategoryProposalRepository {
  readonly rows: CategoryCmsBlockProposal[] = []
  readonly costs: CategoryCmsProposalCost[] = []

  async list(slug: string): Promise<CategoryCmsBlockProposal[]> {
    return this.rows.filter((row) => row.slug === slug).map((row) => ({ ...row }))
  }

  async listCosts(slug: string): Promise<CategoryCmsProposalCost[]> {
    const ids = new Set(this.rows.filter((row) => row.slug === slug).map((row) => row.id))
    return this.costs.filter((row) => ids.has(row.proposal_id)).map((row) => ({ ...row }))
  }

  async insert(
    proposal: CategoryCmsBlockProposal,
    costs: CategoryCmsProposalCost[]
  ): Promise<"inserted" | "duplicate"> {
    if (this.rows.some((row) => proposalKey(row) === proposalKey(proposal))) return "duplicate"
    this.rows.push({ ...proposal })
    this.costs.push(...costs.map((row) => ({ ...row })))
    return "inserted"
  }

  async update(proposal: CategoryCmsBlockProposal): Promise<void> {
    const index = this.rows.findIndex((row) => row.id === proposal.id)
    if (index >= 0) this.rows[index] = { ...proposal }
  }
}
