import { getPageBackendOrigin } from "../../../../_lib/page-backend-origin"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

function allowedToken(token: string): boolean {
  return token === "voorbeeld" || /^[A-Za-z0-9_-]{20,128}$/.test(token)
}

async function forward(token: string, method: "GET" | "POST") {
  if (!allowedToken(token)) {
    return Response.json({ message: "Deze uitschrijflink is niet geldig." }, { status: 404 })
  }
  const origin = await getPageBackendOrigin()
  const res = await fetch(
    `${origin}/store/engagement/newsletter/unsubscribe/${encodeURIComponent(token)}`,
    {
      method,
      signal: AbortSignal.timeout(15000),
      headers: PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {},
    }
  )
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  return forward(token, "GET")
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  return forward(token, "POST")
}
