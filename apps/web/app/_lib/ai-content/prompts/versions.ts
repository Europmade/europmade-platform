/**
 * Prompt versions — bump when generation instructions change (forces stale → regenerate).
 */

export const AI_CONTENT_PROMPT_VERSION = "category-content-v4"

export const AI_CONTENT_REFRESH_MONTHS = 6

export const AI_CONTENT_QUALITY_RULES = [
  "Write expert-level, human-readable prose — no lorem ipsum, no keyword stuffing.",
  "Ground every claim in analysed category signals (products, brands, filters, countries).",
  "Produce unique copy per entity; never reuse a generic category blurb.",
  "Optimise for featured snippets with concise factual answers.",
  "Store all locales (NL/EN/DE/FR); never translate at page load.",
  "Never call this pipeline during storefront page load.",
] as const
