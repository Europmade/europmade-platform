import { createHash } from "node:crypto"
import {
  COMMERCIAL_NAV_GROUPS,
  COMMERCIAL_NAV_RANK_INTERVAL_DAYS,
  applyCommercialNavOrder,
  isCommercialNavKey,
  persistMediaReference,
  sortCommercialNavByProductCount,
  visitorRankingReady,
  type CommercialNavSortMode,
} from "@europmade/utils"
import type CmsModuleService from "../../../../modules/cms/service"

export type CommercialNavSortMeta = {
  mode: CommercialNavSortMode
  computed_at: string | null
  next_eligible_at: string | null
}

type RankRow = {
  id: string
  mode?: string
  ordered_keys?: unknown
  visitor_counts?: unknown
  featured_product_ids?: unknown
  computed_at?: Date | string | null
}

function sessionPepper(): string {
  return (
    process.env.COMMERCIAL_NAV_SESSION_PEPPER?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "europmade-dev-nav-pepper"
  )
}

export function hashCommercialNavSession(sessionId: string): string {
  return createHash("sha256")
    .update(`${sessionId.trim()}:${sessionPepper()}`)
    .digest("hex")
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.length > 0)
}

function asCountMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {}
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const n = typeof raw === "number" ? raw : Number(raw)
    if (isCommercialNavKey(key) && Number.isFinite(n)) out[key] = n
  }
  return out
}

function asFeaturedMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {}
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (isCommercialNavKey(key) && typeof raw === "string" && raw.trim()) {
      out[key] = raw.trim()
    }
  }
  return out
}

function dayStamp(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function daysAgoStamp(days: number, now = new Date()): string {
  const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

export async function recordCommercialNavVisit(
  cms: CmsModuleService,
  sessionId: string,
  categoryKey: string
): Promise<{ recorded: boolean }> {
  if (!isCommercialNavKey(categoryKey)) return { recorded: false }
  const session = sessionId.trim()
  if (session.length < 8 || session.length > 128) return { recorded: false }
  const session_hash = hashCommercialNavSession(session)
  const visited_on = dayStamp()
  try {
    await cms.createCommercialNavVisits({
      session_hash,
      category_key: categoryKey,
      visited_on,
    })
    return { recorded: true }
  } catch {
    return { recorded: false }
  }
}

async function loadRank(cms: CmsModuleService): Promise<RankRow | null> {
  const service = cms as CmsModuleService & {
    listCommercialNavRanks?: Function
    listCmsCommercialNavRanks?: Function
  }
  const list =
    service.listCommercialNavRanks?.bind(cms) ??
    service.listCmsCommercialNavRanks?.bind(cms)
  if (!list) return null
  const rows = (await list({}, { take: 1, order: { created_at: "ASC" } })) as RankRow[]
  return rows[0] ?? null
}

async function visitorCounts14d(
  cms: CmsModuleService,
  now = new Date()
): Promise<Record<string, number>> {
  const since = daysAgoStamp(COMMERCIAL_NAV_RANK_INTERVAL_DAYS, now)
  const visits = (await cms.listCommercialNavVisits(
    {},
    { take: 50000 }
  )) as Array<{ session_hash?: string; category_key?: string; visited_on?: string }>
  const unique = new Map<string, Set<string>>()
  for (const visit of visits) {
    const key = visit.category_key
    const hash = visit.session_hash
    const day = visit.visited_on
    if (!key || !hash || !day || day < since) continue
    if (!isCommercialNavKey(key)) continue
    let set = unique.get(key)
    if (!set) {
      set = new Set()
      unique.set(key, set)
    }
    set.add(hash)
  }
  const counts: Record<string, number> = {}
  for (const group of COMMERCIAL_NAV_GROUPS) {
    counts[group.key] = unique.get(group.key)?.size ?? 0
  }
  return counts
}

export async function resolveCommercialNavSort<
  T extends { key: string; product_count: number },
>(
  cms: CmsModuleService | null,
  rows: T[],
  now = new Date()
): Promise<{ rows: T[]; sort: CommercialNavSortMeta; featuredProductIds: Record<string, string> }> {
  const byCount = sortCommercialNavByProductCount(rows)
  const productOrder = byCount.map((row) => row.key)
  const emptySort: CommercialNavSortMeta = {
    mode: "product_count",
    computed_at: now.toISOString(),
    next_eligible_at: null,
  }
  if (!cms) {
    return { rows: byCount, sort: emptySort, featuredProductIds: {} }
  }

  try {
    let rank = await loadRank(cms)
    const featuredProductIds = asFeaturedMap(rank?.featured_product_ids)
    const computedAt = rank?.computed_at ? new Date(rank.computed_at) : null
    const ageMs = computedAt ? now.getTime() - computedAt.getTime() : Number.POSITIVE_INFINITY
    const stale =
      !computedAt ||
      ageMs >= COMMERCIAL_NAV_RANK_INTERVAL_DAYS * 24 * 60 * 60 * 1000

    if (!stale && rank?.mode === "visitors") {
      const ordered = applyCommercialNavOrder(byCount, asStringArray(rank.ordered_keys))
      const next = new Date(
        computedAt!.getTime() +
          COMMERCIAL_NAV_RANK_INTERVAL_DAYS * 24 * 60 * 60 * 1000
      )
      return {
        rows: ordered,
        sort: {
          mode: "visitors",
          computed_at: computedAt!.toISOString(),
          next_eligible_at: next.toISOString(),
        },
        featuredProductIds,
      }
    }

    if (!stale) {
      const next = computedAt
        ? new Date(
            computedAt.getTime() +
              COMMERCIAL_NAV_RANK_INTERVAL_DAYS * 24 * 60 * 60 * 1000
          )
        : null
      return {
        rows: byCount,
        sort: {
          mode: "product_count",
          computed_at: (computedAt ?? now).toISOString(),
          next_eligible_at: next?.toISOString() ?? null,
        },
        featuredProductIds,
      }
    }

    const visitorCounts = await visitorCounts14d(cms, now)
    const useVisitors = visitorRankingReady(visitorCounts)
    const orderedKeys = useVisitors
      ? [...COMMERCIAL_NAV_GROUPS]
          .sort((a, b) => {
            const diff = (visitorCounts[b.key] ?? 0) - (visitorCounts[a.key] ?? 0)
            if (diff !== 0) return diff
            return (byCount.find((r) => r.key === b.key)?.product_count ?? 0) -
              (byCount.find((r) => r.key === a.key)?.product_count ?? 0)
          })
          .map((g) => g.key)
      : productOrder

    const payload = {
      mode: useVisitors ? "visitors" : "product_count",
      ordered_keys: orderedKeys,
      visitor_counts: visitorCounts,
      featured_product_ids: featuredProductIds,
      computed_at: now,
    }
    if (rank?.id) {
      await cms.updateCommercialNavRanks({ id: rank.id, ...payload })
    } else {
      await cms.createCommercialNavRanks(payload)
    }

    const orderedRows = useVisitors
      ? applyCommercialNavOrder(byCount, orderedKeys)
      : byCount
    const next = new Date(
      now.getTime() + COMMERCIAL_NAV_RANK_INTERVAL_DAYS * 24 * 60 * 60 * 1000
    )
    return {
      rows: orderedRows,
      sort: {
        mode: useVisitors ? "visitors" : "product_count",
        computed_at: now.toISOString(),
        next_eligible_at: next.toISOString(),
      },
      featuredProductIds,
    }
  } catch {
    return { rows: byCount, sort: emptySort, featuredProductIds: {} }
  }
}

type IconRow = {
  id?: string
  category_key?: string
  storage_reference?: string | null
}

function listIconRows(
  cms: CmsModuleService
): Promise<IconRow[]> | IconRow[] {
  const service = cms as CmsModuleService & {
    listCommercialNavIcons?: Function
    listCmsCommercialNavIcons?: Function
  }
  const list =
    service.listCommercialNavIcons?.bind(cms) ??
    service.listCmsCommercialNavIcons?.bind(cms)
  if (!list) return []
  return list({}, { take: 50 }) as Promise<IconRow[]>
}

/** Admin-managed line icons keyed by commercial nav key — never product media. */
export async function loadCommercialNavIcons(
  cms: CmsModuleService | null
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (!cms) return out
  try {
    const rows = await listIconRows(cms)
    for (const row of rows) {
      const key = typeof row.category_key === "string" ? row.category_key.trim() : ""
      const ref = persistMediaReference(row.storage_reference ?? null)
      if (!isCommercialNavKey(key) || !ref) continue
      out.set(key, ref)
    }
  } catch {
    return out
  }
  return out
}
