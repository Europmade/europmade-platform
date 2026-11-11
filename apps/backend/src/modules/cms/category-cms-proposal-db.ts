import type CmsModuleService from "./service"
import type {
  CategoryCmsBlockProposal,
  CategoryCmsProposalCost,
} from "./category-cms-proposals"
import type { CategoryProposalRepository } from "./category-cms-proposal-store"

type ProposalRow = {
  id: string
  category_slug: string
  category_id: string
  profile: CategoryCmsBlockProposal["profile"]
  block_id: string
  block_type: CategoryCmsBlockProposal["block_type"]
  fact_fingerprint: string
  status: CategoryCmsBlockProposal["status"]
  confidence: CategoryCmsBlockProposal["confidence"]
  generation_reason: string
  used_facts: CategoryCmsBlockProposal["used_facts"]
  missing: CategoryCmsBlockProposal["missing"]
  missing_locales: CategoryCmsBlockProposal["missing_locales"]
  content: CategoryCmsBlockProposal["content"]
  provider_id: CategoryCmsBlockProposal["provider_id"]
  model_name: string | null
  prompt_version: string
  locale_source: "nl"
  generated_at: string | Date
  applied_draft_revision: number | null
}

type CostRow = {
  proposal_id: string
  category_slug: string
  block_type: CategoryCmsBlockProposal["block_type"]
  locale: CategoryCmsProposalCost["locale"]
  provider_id: CategoryCmsProposalCost["provider_id"]
  model_name: string | null
  input_tokens: number | null
  output_tokens: number | null
  currency: string | null
  amount_minor: number | null
  generated_at: string | Date
}

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value
}

export function proposalFromRow(row: ProposalRow): CategoryCmsBlockProposal {
  return {
    id: row.id,
    category_id: row.category_id,
    slug: row.category_slug,
    profile: row.profile,
    block_id: row.block_id,
    block_type: row.block_type,
    fact_fingerprint: row.fact_fingerprint,
    status: row.status,
    confidence: row.confidence,
    generation_reason: row.generation_reason,
    used_facts: row.used_facts ?? [],
    missing: row.missing ?? [],
    missing_locales: row.missing_locales ?? [],
    content: row.content ?? null,
    provider_id: row.provider_id,
    model: row.model_name,
    prompt_version: row.prompt_version,
    locale_source: row.locale_source ?? "nl",
    generated_at: iso(row.generated_at),
    applied_draft_revision: row.applied_draft_revision,
  }
}

function proposalToRow(proposal: CategoryCmsBlockProposal): ProposalRow {
  return {
    id: proposal.id,
    category_slug: proposal.slug,
    category_id: proposal.category_id,
    profile: proposal.profile,
    block_id: proposal.block_id,
    block_type: proposal.block_type,
    fact_fingerprint: proposal.fact_fingerprint,
    status: proposal.status,
    confidence: proposal.confidence,
    generation_reason: proposal.generation_reason,
    used_facts: proposal.used_facts,
    missing: proposal.missing,
    missing_locales: proposal.missing_locales,
    content: proposal.content,
    provider_id: proposal.provider_id,
    model_name: proposal.model,
    prompt_version: proposal.prompt_version,
    locale_source: proposal.locale_source,
    generated_at: proposal.generated_at,
    applied_draft_revision: proposal.applied_draft_revision,
  }
}

function isUniqueViolation(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err)
  return text.includes("23505") || text.toLowerCase().includes("unique")
}

export function cmsProposalRepository(cms: CmsModuleService): CategoryProposalRepository {
  return {
    async list(slug) {
      const rows = (await cms.listCmsCategoryProposals(
        { category_slug: slug },
        { take: 200 }
      )) as ProposalRow[]
      return rows.map(proposalFromRow)
    },
    async listCosts(slug) {
      const rows = (await cms.listCmsCategoryProposalCosts(
        { category_slug: slug },
        { take: 1000 }
      )) as CostRow[]
      return rows.map((row) => ({
        proposal_id: row.proposal_id,
        slug: row.category_slug,
        block_type: row.block_type,
        locale: row.locale,
        provider_id: row.provider_id,
        model: row.model_name,
        input_tokens: row.input_tokens ?? 0,
        output_tokens: row.output_tokens ?? 0,
        currency: row.currency ?? "EUR",
        amount_minor: row.amount_minor ?? 0,
        generated_at: iso(row.generated_at),
      }))
    },
    async insert(proposal, costs) {
      try {
        await cms.createCmsCategoryProposals(proposalToRow(proposal))
      } catch (err) {
        if (isUniqueViolation(err)) return "duplicate"
        throw err
      }
      if (costs.length) {
        await cms.createCmsCategoryProposalCosts(
          costs.map((cost) => ({
            proposal_id: cost.proposal_id,
            category_slug: cost.slug,
            block_type: cost.block_type,
            locale: cost.locale,
            provider_id: cost.provider_id,
            model_name: cost.model,
            input_tokens: cost.input_tokens,
            output_tokens: cost.output_tokens,
            currency: cost.currency,
            amount_minor: cost.amount_minor,
            generated_at: cost.generated_at,
          }))
        )
      }
      return "inserted"
    },
    async update(proposal) {
      await cms.updateCmsCategoryProposals({
        id: proposal.id,
        status: proposal.status,
        content: proposal.content,
        missing_locales: proposal.missing_locales,
        applied_draft_revision: proposal.applied_draft_revision,
      })
    },
  }
}
