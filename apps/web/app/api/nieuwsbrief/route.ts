import { getPageBackendOrigin } from "../../_lib/page-backend-origin"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

/** Same-origin proxy naar POST /store/engagement/newsletter. */
export async function POST(req: Request) {
  try {
    const body = await req.text()
    const origin = await getPageBackendOrigin()
    const res = await fetch(`${origin}/store/engagement/newsletter`, {
      signal: AbortSignal.timeout(15000),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
      },
      body,
    })
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch {
    return Response.json(
      { message: "Inschrijven is niet gelukt. Probeer het opnieuw." },
      { status: 502 }
    )
  }
}
