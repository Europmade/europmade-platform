/**
 * Environment-safe media URLs: persist path/reference, resolve host at read time.
 * Never treat localhost vs LAN IP as stored data.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"])

function encodePathSegments(pathname: string): string {
  return pathname
    .split("/")
    .map((seg) => {
      if (!seg) return seg
      try {
        return encodeURIComponent(decodeURIComponent(seg))
      } catch {
        return encodeURIComponent(seg)
      }
    })
    .join("/")
}

/**
 * Strip machine-specific absolute backend hosts; keep /static/... or external CDNs.
 * `upload://` is an unresolved local-filename marker (no file on disk).
 */
export function normalizeMediaReference(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("upload://")) return trimmed

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed.replace(/ /g, "%20"))
      const path = `${u.pathname}${u.search}`
      if (path.startsWith("/static/") || path === "/static") {
        return u.pathname + u.search
      }
      if (LOCAL_HOSTS.has(u.hostname)) {
        return path || null
      }
      return trimmed
    } catch {
      return trimmed
    }
  }

  if (trimmed.startsWith("static/")) return `/${trimmed}`
  return trimmed
}

/** Persist host-agnostic refs (`/static/...`); keep `upload://` unchanged. */
export function persistMediaReference(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  return normalizeMediaReference(trimmed)
}

/** Backend origin for the current storefront/admin tab (port 9000, same hostname). */
export function backendOriginFromPageHost(
  pageHost: string | null | undefined,
  protocol = "http:"
): string {
  const proto = protocol.endsWith(":") ? protocol : `${protocol}:`
  if (!pageHost) return `${proto}//localhost:9000`
  const hostname = pageHost.split(",")[0]!.trim().split(":")[0]
  const host = hostname === "127.0.0.1" ? "localhost" : hostname
  return `${proto}//${host}:9000`
}

/**
 * Build a browser-loadable URL for the current environment.
 * `upload://` has no HTTP file → null (do not invent images).
 */
export function resolveMediaUrl(
  raw: string | null | undefined,
  backendOrigin: string
): string | null {
  const ref = normalizeMediaReference(raw)
  if (!ref) return null
  if (ref.startsWith("upload://")) return null
  if (/^https?:\/\//i.test(ref)) return ref

  const origin = backendOrigin.replace(/\/$/, "")
  if (ref.startsWith("/static/")) {
    const [path, query] = ref.split("?")
    const encoded = encodePathSegments(path)
    return query ? `${origin}${encoded}?${query}` : `${origin}${encoded}`
  }
  if (ref.startsWith("/")) return `${origin}${ref}`
  return ref
}

export function rewriteMediaStrings<T>(value: T, backendOrigin: string): T {
  if (typeof value === "string") {
    if (
      value.startsWith("upload://") ||
      value.includes("/static/") ||
      /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(value)
    ) {
      return (resolveMediaUrl(value, backendOrigin) ?? value) as T
    }
    return value
  }
  if (Array.isArray(value)) {
    return value.map((v) => rewriteMediaStrings(v, backendOrigin)) as T
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = rewriteMediaStrings(v, backendOrigin)
    }
    return out as T
  }
  return value
}
