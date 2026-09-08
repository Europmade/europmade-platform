const BACKEND =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export async function fetchStoreCmsTheme(): Promise<{
  theme: {
    document: unknown
    published: boolean
  } | null
} | null> {
  try {
    const res = await fetch(`${BACKEND}/store/cms/theme`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : {}),
      },
    })
    if (!res.ok) return null
    return (await res.json()) as {
      theme: { document: unknown; published: boolean } | null
    }
  } catch {
    return null
  }
}
