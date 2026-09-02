/**
 * Server-side product image processing — generates optimized web variants.
 * Preserves alpha when present; never fakes transparency on opaque sources.
 */

import type { ImageFormatVariants, ProductMediaMetadata } from "@europmade/utils"
import { detectPngHasAlpha } from "@europmade/utils"

const WIDTHS = [400, 800, 1200] as const

export type ProcessedImageFile = {
  filename: string
  mimeType: string
  content: string
}

export type ProcessedImageResult = {
  files: ProcessedImageFile[]
  metadata: ProductMediaMetadata
  /** Best reference for catalog/listing (webp 800 or original). */
  display_reference: string
}

function variantFilename(base: string, width: number, ext: string): string {
  const dot = base.lastIndexOf(".")
  const stem = dot > 0 ? base.slice(0, dot) : base
  return `${stem}-${width}.${ext}`
}

export async function processProductImageBuffer(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  mediaType: "Hoofdafbeelding" | "Overige afbeelding"
): Promise<ProcessedImageResult> {
  const sharp = (await import("sharp")).default
  const image = sharp(buffer, { failOn: "none" })
  const meta = await image.metadata()
  const hasAlphaFromMeta = meta.hasAlpha === true
  const hasAlphaFromPng =
    mimeType === "image/png" ? detectPngHasAlpha(buffer) === true : false
  const has_alpha = hasAlphaFromMeta || hasAlphaFromPng

  const variants: ImageFormatVariants = { webp: {}, avif: {}, jpeg: {} }
  const files: ProcessedImageFile[] = []
  let display_reference = ""

  for (const width of WIDTHS) {
    const resized = image.clone().resize(width, width, {
      fit: "inside",
      withoutEnlargement: true,
    })

    const webpBuf = await resized
      .clone()
      .webp({ quality: 82, alphaQuality: 90, effort: 4 })
      .toBuffer()
    const webpName = variantFilename(originalFilename, width, "webp")
    variants.webp![String(width) as "400" | "800" | "1200"] = `/static/${webpName}`
    files.push({
      filename: webpName,
      mimeType: "image/webp",
      content: webpBuf.toString("base64"),
    })
    if (width === 800) display_reference = `/static/${webpName}`

    const avifBuf = await resized
      .clone()
      .avif({ quality: 62, effort: 4 })
      .toBuffer()
    const avifName = variantFilename(originalFilename, width, "avif")
    variants.avif![String(width) as "400" | "800" | "1200"] = `/static/${avifName}`
    files.push({
      filename: avifName,
      mimeType: "image/avif",
      content: avifBuf.toString("base64"),
    })

    const jpegPipeline = resized.clone()
    if (!has_alpha) {
      jpegPipeline.flatten({ background: { r: 255, g: 255, b: 255 } })
    }
    const jpegBuf = await jpegPipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer()
    const jpegName = variantFilename(originalFilename, width, "jpg")
    variants.jpeg![String(width) as "400" | "800" | "1200"] = `/static/${jpegName}`
    files.push({
      filename: jpegName,
      mimeType: "image/jpeg",
      content: jpegBuf.toString("base64"),
    })
  }

  if (has_alpha && mediaType === "Hoofdafbeelding") {
    const pngBuf = await image
      .clone()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer()
    const pngName = variantFilename(originalFilename, 1200, "png")
    variants.png = { "1200": `/static/${pngName}` }
    files.push({
      filename: pngName,
      mimeType: "image/png",
      content: pngBuf.toString("base64"),
    })
  }

  const originalName = originalFilename.replace(/[^\w.\-() ]+/g, "_")
  files.unshift({
    filename: originalName,
    mimeType,
    content: buffer.toString("base64"),
  })
  const original_reference = `/static/${originalName}`
  if (!display_reference) display_reference = original_reference

  return {
    files,
    display_reference,
    metadata: {
      mime_type: mimeType,
      has_alpha,
      original_reference,
      variants,
    },
  }
}
