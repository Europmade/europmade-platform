import { persistMediaReference } from "@europmade/utils"
import { assessImportUrl } from "./brand-import"

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])
const PDF_MIME = "application/pdf"
const MAX_BYTES = 15 * 1024 * 1024

export type IngestedAsset = {
  source_url: string
  storage_reference: string
  mime: string
}

function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg"
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "image/png"
  }
  if (buf.length >= 5 && buf.subarray(0, 5).toString("utf8") === "%PDF-") {
    return PDF_MIME
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("utf8") === "RIFF" &&
    buf.subarray(8, 12).toString("utf8") === "WEBP"
  ) {
    return "image/webp"
  }
  return null
}

export function mimeAllowed(mime: string, role: "image" | "document"): boolean {
  if (role === "document") return mime === PDF_MIME
  return IMAGE_MIME.has(mime)
}

/**
 * Copy an external https URL into EuropMade storage.
 * A failed download must not be stored as the product media URL.
 */
export async function ingestRemoteAsset(opts: {
  url: string
  role: "image" | "document"
  fetchFn?: typeof fetch
  upload: (file: { filename: string; mimeType: string; content: string }) => Promise<string>
}): Promise<IngestedAsset> {
  const checked = assessImportUrl(opts.url)
  if (!checked.ok) throw new Error(checked.message)
  if (opts.url.startsWith("/static/")) {
    return {
      source_url: opts.url,
      storage_reference: opts.url,
      mime: opts.role === "document" ? PDF_MIME : "image/jpeg",
    }
  }
  const fetchFn = opts.fetchFn ?? fetch
  const res = await fetchFn(opts.url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Bestand niet bereikbaar (HTTP ${res.status}).`)
  const headerMime = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase()
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) throw new Error("Leeg bestand.")
  if (buf.length > MAX_BYTES) throw new Error("Bestand is groter dan 15 MB.")
  const mime = mimeAllowed(headerMime, opts.role) ? headerMime : sniffMime(buf) || ""
  if (!mimeAllowed(mime, opts.role)) {
    throw new Error(
      opts.role === "document"
        ? "Document moet een PDF zijn."
        : "Afbeelding moet JPG, PNG, WebP of AVIF zijn."
    )
  }
  const ext =
    mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === PDF_MIME ? "pdf" : "jpg"
  const stored = await opts.upload({
    filename: `brand-import-${Date.now()}.${ext}`,
    mimeType: mime,
    content: buf.toString("base64"),
  })
  const reference = persistMediaReference(stored) || stored
  if (!reference || reference === opts.url) {
    throw new Error("Het bestand is niet in de eigen opslag terechtgekomen.")
  }
  return { source_url: opts.url, storage_reference: reference, mime }
}
