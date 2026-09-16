import { readFileSync, writeFileSync } from "node:fs"
import type { ProductCloudIdentifierType } from "../identifier-types"
import { FASE5B_SELECTIE_SELLER_ID } from "./constants"

export type ManifestImportStatus =
  | "pending"
  | "skipped_rejected"
  | "dry_run_ready"
  | "created"
  | "failed"
  | "media_done"
  | "validated"

export type ManifestMediaStatus =
  | "pending"
  | "planned"
  | "uploaded"
  | "failed"
  | "dead_letter"

export type Fase5bManifestProductEntry = {
  em_product_id: string
  product_cloud_id: string | null
  seller_id: string
  identifier_type: ProductCloudIdentifierType | null
  identifier_value: string | null
  verification_status: string
  category_id: string | null
  import_status: ManifestImportStatus
  media_status: ManifestMediaStatus
  publication_status?: string | null
  offer_status?: string | null
  import_batch: string
  error: string | null
  timestamp: string | null
}

export type Fase5bImportManifest = {
  schema_version: "1.0"
  import_batch: string
  seller_id: string
  source_file: string
  started_at: string | null
  completed_at: string | null
  products: Fase5bManifestProductEntry[]
  summary: {
    total: number
    pending: number
    skipped_rejected: number
    dry_run_ready: number
    created: number
    failed: number
  }
}

export function createEmptyManifest(opts: {
  import_batch: string
  source_file: string
  em_ids: string[]
}): Fase5bImportManifest {
  const now = new Date().toISOString()
  return {
    schema_version: "1.0",
    import_batch: opts.import_batch,
    seller_id: FASE5B_SELECTIE_SELLER_ID,
    source_file: opts.source_file,
    started_at: now,
    completed_at: null,
    products: opts.em_ids.map((em_product_id) => ({
      em_product_id,
      product_cloud_id: null,
      seller_id: FASE5B_SELECTIE_SELLER_ID,
      identifier_type: null,
      identifier_value: null,
      verification_status: "",
      category_id: null,
      import_status: "pending",
      media_status: "pending",
      publication_status: null,
      offer_status: null,
      import_batch: opts.import_batch,
      error: null,
      timestamp: null,
    })),
    summary: {
      total: opts.em_ids.length,
      pending: opts.em_ids.length,
      skipped_rejected: 0,
      dry_run_ready: 0,
      created: 0,
      failed: 0,
    },
  }
}

export function loadManifest(path: string): Fase5bImportManifest {
  return JSON.parse(readFileSync(path, "utf8")) as Fase5bImportManifest
}

export function saveManifest(path: string, manifest: Fase5bImportManifest): void {
  writeFileSync(path, JSON.stringify(manifest, null, 2), "utf8")
}

export function recomputeManifestSummary(
  manifest: Fase5bImportManifest
): Fase5bImportManifest {
  const summary = {
    total: manifest.products.length,
    pending: 0,
    skipped_rejected: 0,
    dry_run_ready: 0,
    created: 0,
    failed: 0,
  }
  for (const p of manifest.products) {
    switch (p.import_status) {
      case "pending":
        summary.pending += 1
        break
      case "skipped_rejected":
        summary.skipped_rejected += 1
        break
      case "dry_run_ready":
        summary.dry_run_ready += 1
        break
      case "created":
      case "media_done":
      case "validated":
        summary.created += 1
        break
      case "failed":
        summary.failed += 1
        break
      default:
        break
    }
  }
  return { ...manifest, summary }
}
