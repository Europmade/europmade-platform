import { NextResponse, type NextRequest } from "next/server"
import { isEuMarketCode, normalizeMarketCode } from "@europmade/types"

const MARKET_COOKIE = "em_storefront_market"

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const fromQuery = normalizeMarketCode(
    request.nextUrl.searchParams.get("market") ?? ""
  )
  const fromCookie = normalizeMarketCode(
    request.cookies.get(MARKET_COOKIE)?.value ?? ""
  )
  const geo = normalizeMarketCode(
    request.headers.get("x-em-geo-country") ||
      request.headers.get("cf-ipcountry") ||
      ""
  )
  const storedSuggestion = normalizeMarketCode(
    request.cookies.get("em_storefront_market_suggestion")?.value ?? ""
  )
  const suggestion = geo || storedSuggestion

  if (fromQuery && isEuMarketCode(fromQuery)) {
    requestHeaders.set("x-em-storefront-market", fromQuery)
  } else if (suggestion && !fromCookie) {
    requestHeaders.set("x-em-storefront-market-suggestion", suggestion)
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  if (fromQuery) {
    response.cookies.set(MARKET_COOKIE, fromQuery, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    })
    response.cookies.set("em_storefront_market_suggestion", "", {
      path: "/",
      maxAge: 0,
    })
  } else if (geo && !fromCookie) {
    response.cookies.set("em_storefront_market_suggestion", geo, {
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
    })
  }
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
}
