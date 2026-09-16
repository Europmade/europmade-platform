import { createRequire } from "node:module"
import { join as pathJoin } from "node:path"
import {
  FASE5B_ALLOWED_MEDIA_MIME,
  FASE5B_MAX_MEDIA_BYTES,
} from "./constants"
import type { Fase5bImageRow } from "./excel-loader"

export type MediaPlanItemStatus =
  | "pending"
  | "would_upload"
  | "skipped_invalid_url"
  | "skipped_upload_protocol"
  | "duplicate_url"
  | "dead_letter"

export type MediaPlanItem = {
  em_product_id: string
  source_url: string
  media_type: "Hoofdafbeelding" | "Overige afbeelding"
  status: MediaPlanItemStatus
  error?: string
}

export type MediaPlan = {
  items: MediaPlanItem[]
  selected_count: number
  valid_https_count: number
  dead_letter_count: number
}

function isHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url.trim())
    return u.protocol === "https:"
  } catch {
    return false
  }
}

export function buildMediaPlan(
  emProductId: string,
  rows: Fase5bImageRow[]
): MediaPlan {
  const items: MediaPlanItem[] = []
  const seen = new Set<string>()
  let hoofdAssigned = false

  for (const row of rows) {
    const url = row.afbeelding_url.trim()
    if (!url) {
      items.push({
        em_product_id: emProductId,
        source_url: "",
        media_type: "Overige afbeelding",
        status: "skipped_invalid_url",
        error: "Lege Afbeelding-URL",
      })
      continue
    }

    if (url.startsWith("upload://")) {
      items.push({
        em_product_id: emProductId,
        source_url: url,
        media_type: "Overige afbeelding",
        status: "skipped_upload_protocol",
        error: "upload:// niet toegestaan",
      })
      continue
    }

    if (!isHttpsUrl(url)) {
      items.push({
        em_product_id: emProductId,
        source_url: url,
        media_type: "Overige afbeelding",
        status: "skipped_invalid_url",
        error: "Alleen https-URL toegestaan",
      })
      continue
    }

    if (seen.has(url)) {
      items.push({
        em_product_id: emProductId,
        source_url: url,
        media_type: "Overige afbeelding",
        status: "duplicate_url",
      })
      continue
    }
    seen.add(url)

    const typeLabel = row.afbeeldingstype.toLowerCase()
    const media_type: "Hoofdafbeelding" | "Overige afbeelding" =
      !hoofdAssigned && (typeLabel.includes("hoofd") || typeLabel.includes("main"))
        ? "Hoofdafbeelding"
        : !hoofdAssigned
          ? "Hoofdafbeelding"
          : "Overige afbeelding"
    if (media_type === "Hoofdafbeelding") hoofdAssigned = true

    items.push({
      em_product_id: emProductId,
      source_url: url,
      media_type,
      status: "would_upload",
    })
  }

  return {
    items,
    selected_count: rows.length,
    valid_https_count: items.filter((i) => i.status === "would_upload").length,
    dead_letter_count: items.filter((i) =>
      ["skipped_invalid_url", "skipped_upload_protocol"].includes(i.status)
    ).length,
  }
}

/** Validate downloaded buffer before upload (no network in dry-run). */
export function validateMediaBuffer(
  mime: string,
  size: number
): { ok: true } | { ok: false; error: string } {
  if (!FASE5B_ALLOWED_MEDIA_MIME.has(mime)) {
    return { ok: false, error: `MIME niet toegestaan: ${mime}` }
  }
  if (size <= 0) return { ok: false, error: "Leeg bestand" }
  if (size > FASE5B_MAX_MEDIA_BYTES) {
    return {
      ok: false,
      error: `Bestand te groot (${size} bytes, max ${FASE5B_MAX_MEDIA_BYTES})`,
    }
  }
  return { ok: true }
}

export type MediaUploadResult = {
  source_url: string
  media_type: "Hoofdafbeelding" | "Overige afbeelding"
  status: "uploaded" | "failed"
  storage_reference?: string
  media_id?: string
  error?: string
}

/**
 * Execute media upload for one product — downloads https URLs and stores via file module.
 */
export async function executeMediaUploadPlan(opts: {
  product_id: string
  version_id: string
  seller_id: string
  items: MediaPlanItem[]
  container: {
    resolve: (key: string) => unknown
  }
  fetchFn?: typeof fetch
  maxRetries?: number
}): Promise<MediaUploadResult[]> {
  const backendRequire = createRequire(
    pathJoin(__dirname, "../../../../package.json")
  )
  const { uploadFilesWorkflow } = backendRequire("@medusajs/medusa/core-flows")
  const { persistMediaReference } = backendRequire("@europmade/utils")
  const { addMediaWorkflow } = backendRequire(
    "./src/workflows/product-cloud/versions"
  )

  const fetchFn = opts.fetchFn ?? fetch
  const maxRetries = opts.maxRetries ?? 2
  const results: MediaUploadResult[] = []

  for (const item of opts.items) {
    if (item.status !== "would_upload") continue

    let lastError = ""
    let uploaded = false

    for (let attempt = 0; attempt <= maxRetries && !uploaded; attempt++) {
      try {
        const res = await fetchFn(item.source_url, {
          redirect: "follow",
          signal: AbortSignal.timeout(20_000),
        })
        if (!res.ok) {
          lastError = `HTTP ${res.status}`
          continue
        }
        const mime = (res.headers.get("content-type") || "")
          .split(";")[0]
          .trim()
          .toLowerCase()
        const buf = Buffer.from(await res.arrayBuffer())
        const size = buf.length
        const valid = validateMediaBuffer(mime, size)
        if (!valid.ok) {
          lastError = valid.error
          continue
        }

        const ext =
          mime === "image/png"
            ? "png"
            : mime === "image/webp"
              ? "webp"
              : "jpg"
        const filename = `${item.em_product_id}-${results.length + 1}.${ext}`

        const { result } = await uploadFilesWorkflow(
          opts.container as never
        ).run({
          input: {
            files: [
              {
                filename,
                mimeType: mime,
                content: buf.toString("base64"),
                access: "public",
              },
            ],
          },
        })

        const file = result?.[0] as { id?: string; url?: string } | undefined
        const stored =
          persistMediaReference(file?.url || file?.id) || file?.id || ""
        if (!stored) {
          lastError = "Geen storage reference na upload"
          continue
        }

        const { result: media } = await addMediaWorkflow(
          opts.container as never
        ).run({
          input: {
            product_id: opts.product_id,
            version_id: opts.version_id,
            seller_id: opts.seller_id,
            media_type: item.media_type,
            storage_reference: stored,
          },
        })

        results.push({
          source_url: item.source_url,
          media_type: item.media_type,
          status: "uploaded",
          storage_reference: stored,
          media_id: (media as { id?: string })?.id,
        })
        uploaded = true
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
      }
    }

    if (!uploaded) {
      results.push({
        source_url: item.source_url,
        media_type: item.media_type,
        status: "failed",
        error: lastError || "Upload mislukt",
      })
    }
  }

  return results
}
