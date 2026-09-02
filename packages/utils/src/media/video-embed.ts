/**
 * External video embed helpers (YouTube / Vimeo) — no hosting/transcoding.
 */

export type VideoProvider = "youtube" | "vimeo"

export type ParsedVideoEmbed = {
  provider: VideoProvider
  video_id: string
  embed_url: string
  source_url: string
  thumbnail_url?: string | null
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
])

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"])

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "")
}

export function parseVideoEmbedUrl(
  raw: string | null | undefined
): ParsedVideoEmbed | null {
  if (!raw?.trim()) return null
  const trimmed = raw.trim()

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (!["http:", "https:"].includes(url.protocol)) return null
  const host = normalizeHost(url.hostname)

  if (YOUTUBE_HOSTS.has(host) || host === "youtu.be") {
    let videoId: string | null = null
    if (host === "youtu.be") {
      videoId = url.pathname.replace(/^\//, "").split("/")[0] || null
    } else if (url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.split("/")[2] || null
    } else if (url.pathname.startsWith("/shorts/")) {
      videoId = url.pathname.split("/")[2] || null
    } else {
      videoId = url.searchParams.get("v")
    }
    if (!videoId || !/^[\w-]{6,}$/.test(videoId)) return null
    const embed_url = `https://www.youtube.com/embed/${videoId}`
    return {
      provider: "youtube",
      video_id: videoId,
      embed_url,
      source_url: trimmed,
      thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    }
  }

  if (VIMEO_HOSTS.has(host)) {
    const parts = url.pathname.split("/").filter(Boolean)
    const videoId = parts.find((p) => /^\d+$/.test(p))
    if (!videoId) return null
    const embed_url = `https://player.vimeo.com/video/${videoId}`
    return {
      provider: "vimeo",
      video_id: videoId,
      embed_url,
      source_url: trimmed,
      thumbnail_url: null,
    }
  }

  return null
}

export function isVideoEmbedReference(ref: string | null | undefined): boolean {
  return parseVideoEmbedUrl(ref) !== null
}
