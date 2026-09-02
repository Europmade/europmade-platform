/**
 * Centrale media-validatie (client + server).
 */

import type { MediaPlacement, MediaRequirements } from "@europmade/types"
import { getMediaRequirements } from "./requirements.ts"

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

/**
 * Valideer upload tegen MEDIA_REQUIREMENTS.
 * Foutmeldingen zijn gebruikersvriendelijk (NL-basis; admin kan lokaliseren).
 */
export function validateMedia(
  input: MediaValidationInput,
  requirements?: MediaRequirements
): MediaValidationResult {
  const req = requirements ?? getMediaRequirements(input.placement)
  const mime = input.mimeType || ""

  if (!mimeAllowed(mime, req.mimeTypes)) {
    const types = req.mimeTypes
      .map((m) => m.replace("image/", "").replace("application/", "").toUpperCase())
      .join(", ")
    return {
      ok: false,
      message: `Dit bestandstype is niet toegestaan. Toegestaan: ${types}.`,
    }
  }

  if (input.sizeBytes > req.maxBytes) {
    const mb = Math.round(req.maxBytes / (1024 * 1024))
    return {
      ok: false,
      message: `Dit bestand is te groot. Maximaal ${mb} MB.`,
    }
  }

  const w = input.width ?? null
  const h = input.height ?? null
  const hasDims = typeof w === "number" && typeof h === "number" && w > 0 && h > 0

  if (req.enforceDimensions && req.minSize && hasDims) {
    if (w! < req.minSize.width || h! < req.minSize.height) {
      return {
        ok: false,
        message: `Deze afbeelding is te klein. Minimaal ${req.minSize.width} × ${req.minSize.height} px.`,
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
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
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
  const type = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15])
  if (type !== "IHDR") return null
  const colorType = bytes[25]
  return colorType === 4 || colorType === 6
}
