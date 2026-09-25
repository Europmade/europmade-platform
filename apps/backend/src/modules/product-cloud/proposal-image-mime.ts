/** Normalize Windows/browser aliases (image/jpg) and fall back to extension. */
export function normalizeProposalImageMime(
  mimetype: string | undefined,
  filename: string | undefined
): string | null {
  const raw = (mimetype || "").toLowerCase().trim()
  if (raw === "image/jpg" || raw === "image/jpeg") return "image/jpeg"
  if (raw === "image/png" || raw === "image/webp" || raw === "image/avif") {
    return raw
  }
  const name = (filename || "").toLowerCase()
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg"
  if (name.endsWith(".png")) return "image/png"
  if (name.endsWith(".webp")) return "image/webp"
  if (name.endsWith(".avif")) return "image/avif"
  return null
}
