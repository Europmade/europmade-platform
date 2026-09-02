/**
 * Product media metadata — variants, alpha, video embed (stored on pc_media.metadata).
 */

import type { VideoProvider } from "./video-embed.ts"
import { resolveMediaUrl } from "./public-url.ts"

export type ImageVariantWidth = "400" | "800" | "1200"

export type ImageFormatVariants = Partial<
  Record<"avif" | "webp" | "jpeg" | "png", Partial<Record<ImageVariantWidth, string>>>
>

export type ProductMediaMetadata = {
  mime_type?: string | null
  has_alpha?: boolean | null
  original_reference?: string | null
  variants?: ImageFormatVariants | null
  video?: {
    provider: VideoProvider
    video_id: string
    embed_url: string
    source_url?: string | null
    thumbnail_url?: string | null
  } | null
}

export function parseProductMediaMetadata(
  raw: unknown
): ProductMediaMetadata | null {
  if (!raw || typeof raw !== "object") return null
  return raw as ProductMediaMetadata
}

/** Preferred storefront delivery URL (optimized variant, not raw upload). */
export function resolveOptimizedImageUrl(
  storageReference: string | null | undefined,
  metadata: unknown,
  backendOrigin: string,
  opts?: { width?: ImageVariantWidth; preferTransparent?: boolean }
): string | null {
  const meta = parseProductMediaMetadata(metadata)
  const width: ImageVariantWidth = opts?.width ?? "800"
  const variants = meta?.variants

  if (variants) {
    const order: Array<keyof ImageFormatVariants> = opts?.preferTransparent
      ? ["avif", "webp", "png", "jpeg"]
      : ["avif", "webp", "jpeg", "png"]
    for (const format of order) {
      const ref = variants[format]?.[width]
      if (ref) {
        const resolved = resolveMediaUrl(ref, backendOrigin)
        if (resolved) return resolved
      }
    }
  }

  return resolveMediaUrl(storageReference, backendOrigin)
}

export function buildImageSrcSet(
  storageReference: string | null | undefined,
  metadata: unknown,
  backendOrigin: string,
  format: "webp" | "avif" | "jpeg"
): string | null {
  const meta = parseProductMediaMetadata(metadata)
  const formatVariants = meta?.variants?.[format]
  if (!formatVariants) return null

  const parts: string[] = []
  for (const [w, ref] of Object.entries(formatVariants)) {
    const url = resolveMediaUrl(ref, backendOrigin)
    if (url) parts.push(`${url} ${w}w`)
  }
  return parts.length ? parts.join(", ") : null
}
