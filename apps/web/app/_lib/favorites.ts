const STORAGE_KEY = "em_favorites_v1"

function readAll(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : []
  } catch {
    return []
  }
}

function writeAll(slugs: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  } catch {
    /* ignore quota */
  }
}

export function isFavorite(slug: string): boolean {
  return readAll().includes(slug)
}

export function toggleFavorite(slug: string): boolean {
  const prev = readAll()
  const next = prev.includes(slug)
    ? prev.filter((s) => s !== slug)
    : [slug, ...prev]
  writeAll(next)
  return next.includes(slug)
}

export function readFavorites(): string[] {
  return readAll()
}
