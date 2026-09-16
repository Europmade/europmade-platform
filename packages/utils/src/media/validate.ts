/**
 * Centrale media-validatie (client + server).
 */

import type { MediaPlacement, MediaRequirements } from "@europmade/types"
import { formatMediaMaxBytes, getMediaRequirements } from "./requirements.ts"

export type MediaValidationInput = {
  placement: MediaPlacement
  mimeType: string
  sizeBytes: number
  /** Image pixel size when known (client FileReader / server image decode). */
  width?: number | null
  height?: number | null
  /**
   * PNG color-type with alpha (4 or 6), or true/false when known.
   * null = not checked.
   */
  hasAlpha?: boolean | null
  fileName?: string | null
}

export type MediaValidationResult =
  | { ok: true }
  | { ok: false; message: string }

const MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
  "image/x-webp": "image/webp",
  "image/x-jpeg": "image/jpeg",
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  gif: "image/gif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
}

/**
 * Normalize browser/OS MIME quirks (e.g. Windows `image/jpg`) and fall back to
 * file extension when the MIME is missing or generic (`application/octet-stream`).
 */
export function normalizeMediaMimeType(
  mimeType: string | null | undefined,
  fileName?: string | null
): string {
  const raw = (mimeType || "").toLowerCase().trim()
  if (raw && raw !== "application/octet-stream" && raw !== "binary/octet-stream") {
    return MIME_ALIASES[raw] ?? raw
  }
  const ext = (fileName || "").split(".").pop()?.toLowerCase().trim()
  if (ext && EXT_TO_MIME[ext]) return EXT_TO_MIME[ext]!
  return raw
}

function mimeAllowed(mime: string, allowed: string[]): boolean {
  const normalized = mime.toLowerCase().trim()
  return allowed.some((a) => a.toLowerCase() === normalized)
}

function ratioOk(
  width: number,
  height: number,
  expected: number,
  tolerance: number
): boolean {
  if (height <= 0) return false
  const actual = width / height
  return Math.abs(actual - expected) <= tolerance
}

/** Human-readable allowed types for upload UI / errors (e.g. "JPEG/JPG, PNG of WEBP"). */
export function formatAllowedImageTypes(mimeTypes: string[]): string {
  const labels = mimeTypes.map((m) => {
    const key = m.toLowerCase()
    if (key === "image/jpeg") return "JPEG/JPG"
    if (key === "image/png") return "PNG"
    if (key === "image/webp") return "WEBP"
    if (key === "image/avif") return "AVIF"
    if (key === "image/svg+xml") return "SVG"
    if (key === "application/pdf") return "PDF"
    if (key === "video/mp4") return "MP4"
    if (key === "video/webm") return "WebM"
    return m.replace("image/", "").replace("application/", "").toUpperCase()
  })
  if (labels.length <= 1) return labels[0] ?? ""
  if (labels.length === 2) return `${labels[0]} of ${labels[1]}`
  return `${labels.slice(0, -1).join(", ")} of ${labels[labels.length - 1]}`
}

/** HTML accept attribute aligned with MEDIA_REQUIREMENTS mime list. */
export function mediaAcceptAttribute(mimeTypes: string[]): string {
  const parts = new Set<string>()
  for (const mime of mimeTypes) {
    parts.add(mime)
    if (mime === "image/jpeg") {
      parts.add(".jpg")
      parts.add(".jpeg")
    } else if (mime === "image/png") {
      parts.add(".png")
    } else if (mime === "image/webp") {
      parts.add(".webp")
    } else if (mime === "image/avif") {
      parts.add(".avif")
    } else if (mime === "image/svg+xml") {
      parts.add(".svg")
    } else if (mime === "application/pdf") {
      parts.add(".pdf")
    } else if (mime === "video/mp4") {
      parts.add(".mp4")
    } else if (mime === "video/webm") {
      parts.add(".webm")
    }
  }
  return [...parts].join(",")
}

/**
 * Valideer upload tegen MEDIA_REQUIREMENTS.
 * Foutmeldingen zijn gebruikersvriendelijk (NL-basis; admin kan lokaliseren).
 */
export function validateMedia(
  input: MediaValidationInput,
  requirements?: MediaRequirements
): MediaValidationResult {
  const req = requirements ?? getMediaRequirements(input.placement)
  const mime = normalizeMediaMimeType(input.mimeType, input.fileName)

  if (!mimeAllowed(mime, req.mimeTypes)) {
    return {
      ok: false,
      message: `Dit bestandstype is niet toegestaan. Toegestaan: ${formatAllowedImageTypes(req.mimeTypes)}.`,
    }
  }

  if (input.sizeBytes > req.maxBytes) {
    return {
      ok: false,
      message: `Dit bestand is te groot. Maximaal ${formatMediaMaxBytes(req.maxBytes)}.`,
    }
  }

  const w = input.width ?? null
  const h = input.height ?? null
  const hasDims = typeof w === "number" && typeof h === "number" && w > 0 && h > 0

  const isRasterImage =
    mime.startsWith("image/") && mime !== "image/svg+xml"

  if (req.enforceDimensions && req.maxSize && isRasterImage && !hasDims) {
    return {
      ok: false,
      message: "Dit bestand bevat geen bruikbaar beeld.",
    }
  }

  if (req.enforceDimensions && req.minSize && hasDims) {
    if (w! < req.minSize.width || h! < req.minSize.height) {
      return {
        ok: false,
        message: `Deze afbeelding is te klein. Minimaal ${req.minSize.width} × ${req.minSize.height} px.`,
      }
    }
  }

  if (req.enforceDimensions && req.maxSize && hasDims) {
    if (w! > req.maxSize.width || h! > req.maxSize.height) {
      return {
        ok: false,
        message: `Deze afbeelding is te groot. Maximaal ${req.maxSize.width} × ${req.maxSize.height} px.`,
      }
    }
  }

  if (
    req.enforceAspectRatio &&
    typeof req.aspectRatioValue === "number" &&
    hasDims
  ) {
    const tol = req.aspectRatioTolerance ?? 0.05
    if (!ratioOk(w!, h!, req.aspectRatioValue, tol)) {
      return {
        ok: false,
        message: `Deze afbeelding heeft de verkeerde verhouding. Vereist: ${req.aspectRatio ?? req.aspectRatioValue}.`,
      }
    }
  }

  if (req.transparency === "required" && hasDims) {
    if (mime === "image/jpeg") {
      return {
        ok: false,
        message:
          "Deze plaatsing vereist een transparante achtergrond. Gebruik PNG of WebP (geen JPG).",
      }
    }
    if (input.hasAlpha === false) {
      return {
        ok: false,
        message:
          "Deze plaatsing vereist een transparante achtergrond. Upload een bestand met alpha-kanaal.",
      }
    }
  }

  // capable: allow JPG without alpha; preserve alpha when present (no fake transparency)
  if (req.transparency === "capable" && hasDims && input.hasAlpha === false) {
    // JPEG and other opaque sources are accepted for primary — processed output won't fake alpha.
    return { ok: true }
  }

  return { ok: true }
}

/** Browser helper: lees breedte/hoogte van een image File. */
export function readImageDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  const mime = normalizeMediaMimeType(file.type, file.name)
  if (!mime.startsWith("image/") || mime === "image/svg+xml") {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight }
      URL.revokeObjectURL(url)
      resolve(dims)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

/**
 * Lightweight PNG IHDR alpha check (color type 4 or 6).
 * Returns null when not a PNG or parse fails.
 */
export function detectPngHasAlpha(buffer: ArrayBuffer | Buffer): boolean | null {
  const bytes =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  if (bytes.length < 25) return null
  const pngSig = [137, 80, 78, 71, 13, 10, 26, 10]
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== pngSig[i]) return null
  }
  // IHDR chunk: length(4) + "IHDR"(4) + data; color type at byte 25 (0-index: 24+1? )
  // Bytes 8-11 length, 12-15 type, 16-19 width, 20-23 height, 24 bit depth, 25 color type
  const type = String.fromCharCode(
    bytes[12] ?? 0,
    bytes[13] ?? 0,
    bytes[14] ?? 0,
    bytes[15] ?? 0
  )
  if (type !== "IHDR") return null
  const colorType = bytes[25]
  return colorType === 4 || colorType === 6
}
