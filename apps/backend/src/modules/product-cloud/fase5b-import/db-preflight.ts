import type { DbPreflightSnapshot } from "./preflight"
import {
  FASE5B_LEGACY_SELLER_ID,
  FASE5B_SELECTIE_SELLER_ID,
} from "./constants"
import type { Fase5bWorkbook } from "./excel-loader"
import { resolveFase5bIdentifier } from "./identifier-resolve"
import { decideFase5bImport } from "./verification-rules"

export type DbPreflightClient = {
  listCategories(): Promise<Array<{ id: string; slug: string | null }>>
  sellerExists(sellerId: string): Promise<boolean>
  countProductsBySeller(sellerId: string): Promise<number>
  listIdentifierConflicts(input: {
    identifier_type: "GTIN" | "MPN" | "IMPORT_REF"
    identifier_value: string
    country_scope: string | null
  }): Promise<boolean>
}

/**
 * Build read-only DB snapshot for preflight (no writes).
 */
export async function buildDbPreflightSnapshot(
  client: DbPreflightClient,
  workbook: Fase5bWorkbook
): Promise<DbPreflightSnapshot> {
  const [selectieExists, legacyExists, legacyCount, categories] =
    await Promise.all([
      client.sellerExists(FASE5B_SELECTIE_SELLER_ID),
      client.sellerExists(FASE5B_LEGACY_SELLER_ID),
      client.countProductsBySeller(FASE5B_LEGACY_SELLER_ID),
      client.listCategories(),
    ])

  const category_ids_present = categories.map((c) => c.id)

  const conflicting_gtins: string[] = []
  const conflicting_mpns: string[] = []
  const conflicting_import_refs: string[] = []
  const checked = new Set<string>()

  for (const row of workbook.products) {
    const decision = decideFase5bImport(row.verification_status)
    if (!decision.import) continue

    const id = resolveFase5bIdentifier({
      em_product_id: row.em_product_id,
      ean_gtin: row.ean_gtin,
      mpn: row.mpn,
    })

    const key =
      id.identifier_type === "IMPORT_REF"
        ? `IMPORT_REF:${id.identifier_value}:${id.country_scope}`
        : `${id.identifier_type}:${id.identifier_value}`

    if (checked.has(key)) continue
    checked.add(key)

    const conflict = await client.listIdentifierConflicts({
      identifier_type: id.identifier_type,
      identifier_value: id.identifier_value,
      country_scope: id.country_scope,
    })

    if (!conflict) continue

    if (id.identifier_type === "GTIN") {
      conflicting_gtins.push(id.identifier_value)
    } else if (id.identifier_type === "MPN") {
      conflicting_mpns.push(id.identifier_value)
    } else {
      conflicting_import_refs.push(id.identifier_value)
    }
  }

  return {
    selectie_seller_exists: selectieExists,
    legacy_seller_exists: legacyExists,
    legacy_product_count: legacyCount,
    category_ids_present,
    conflicting_gtins: [...new Set(conflicting_gtins)],
    conflicting_mpns: [...new Set(conflicting_mpns)],
    conflicting_import_refs: [...new Set(conflicting_import_refs)],
  }
}

export function createHttpDbPreflightClient(opts: {
  backendUrl: string
  adminEmail: string
  adminPassword: string
}): DbPreflightClient {
  let token: string | null = null

  async function api(path: string, init?: RequestInit) {
    const res = await fetch(`${opts.backendUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    })
    const body = await res.json().catch(() => null)
    return { status: res.status, body }
  }

  async function ensureLogin() {
    if (token) return
    const login = await api("/auth/user/emailpass", {
      method: "POST",
      body: JSON.stringify({
        email: opts.adminEmail,
        password: opts.adminPassword,
      }),
    })
    token = login.body?.token ?? null
    if (!token) {
      throw new Error(`Admin login mislukt: ${login.status}`)
    }
  }

  return {
    async listCategories() {
      await ensureLogin()
      const res = await api("/admin/product-cloud/categories?limit=200")
      const rows = res.body?.categories ?? []
      return rows.map((c: { id: string; slug?: string | null }) => ({
        id: c.id,
        slug: c.slug ?? null,
      }))
    },
    async sellerExists(sellerId) {
      await ensureLogin()
      const res = await api(`/admin/partners/${sellerId}`)
      return res.status === 200
    },
    async countProductsBySeller(sellerId) {
      await ensureLogin()
      const res = await api(
        `/admin/product-cloud/products?seller_id=${encodeURIComponent(sellerId)}&limit=1`
      )
      const count = res.body?.count
      if (typeof count === "number") return count
      const products = res.body?.products
      return Array.isArray(products) ? products.length : 0
    },
    async listIdentifierConflicts(input) {
      await ensureLogin()
      const res = await api(
        `/admin/product-cloud/products?q=${encodeURIComponent(input.identifier_value)}&limit=50`
      )
      const products = res.body?.products ?? []
      if (!Array.isArray(products) || products.length === 0) return false
      return products.some(
        (p: { identifier_value?: string | null }) =>
          (p.identifier_value || "").trim() === input.identifier_value
      )
    },
  }
}
