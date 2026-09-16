import {
  resolveMediaUrl,
  resolveOptimizedImageUrl,
} from "@europmade/utils"
import { medusaBackendUrl } from "./medusa-backend-url"

/**
 * Browser-loadable media URL for Admin (same rules as seller).
 * Prefer optimized variants when metadata is present.
 */
export function displayMediaUrl(
  raw: string | null | undefined,
  metadata?: unknown
): string | null {
  const origin = medusaBackendUrl()
  if (metadata != null) {
    return resolveOptimizedImageUrl(raw, metadata, origin)
  }
  return resolveMediaUrl(raw, origin)
}

export function isLikelyPdf(opts: {
  mime?: string | null
  ref?: string | null
  fileName?: string | null
  documentType?: string | null
}): boolean {
  const mime = (opts.mime || "").toLowerCase()
  if (mime === "application/pdf" || mime.includes("pdf")) return true
  if ((opts.documentType || "").toLowerCase() === "pdf") return true
  const name = `${opts.fileName || ""} ${opts.ref || ""}`.toLowerCase()
  return /\.pdf(\?|$)/i.test(name)
}

export function isVideoMedia(
  mediaType: string | null | undefined,
  ref: string | null | undefined,
  mime?: string | null,
  metadata?: Record<string, unknown> | null
): boolean {
  const videoMeta = metadata?.video as { embed_url?: string } | undefined
  if (videoMeta?.embed_url) return true
  const m = (mime || "").toLowerCase()
  if (m.startsWith("video/")) return true
  if (mediaType === "Video") return true
  return /\.(mp4|webm)(\?|$)/i.test(ref || "")
}

/** True when the ref is unlikely to be a raster image (e.g. product HTML pages). */
export function isLikelyRasterImage(opts: {
  mime?: string | null
  ref?: string | null
  mediaType?: string | null
}): boolean {
  if (isVideoMedia(opts.mediaType, opts.ref, opts.mime)) return false
  if (isLikelyPdf({ mime: opts.mime, ref: opts.ref })) return false
  const mime = (opts.mime || "").toLowerCase()
  if (mime.startsWith("image/")) return true
  const ref = opts.ref || ""
  if (/\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(ref)) return true
  if (ref.startsWith("/static/")) return true
  // External URL without image extension → open as link, not <img>
  if (/^https?:\/\//i.test(ref)) return false
  return !!ref
}

export function videoEmbedUrl(
  metadata?: Record<string, unknown> | null
): string | null {
  const video = metadata?.video as { embed_url?: string } | undefined
  return video?.embed_url ?? null
}
