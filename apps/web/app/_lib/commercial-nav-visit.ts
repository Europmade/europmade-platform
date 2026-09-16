"use client"

import { useEffect } from "react"
import { isCommercialNavKey } from "@europmade/utils"
import { medusaBackendUrl } from "./medusa-backend-url"

const SESSION_KEY = "em_nav_sid"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

function getSessionId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing && existing.length >= 8) return existing
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `nav-${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(SESSION_KEY, next)
    return next
  } catch {
    return null
  }
}

export function recordCommercialCategoryVisit(categoryKey: string): void {
  if (!isCommercialNavKey(categoryKey)) return
  const sessionId = getSessionId()
  if (!sessionId) return
  void fetch(`${medusaBackendUrl()}/store/catalog/commercial-nav/visit`, {
    method: "POST",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
    },
    body: JSON.stringify({
      category_key: categoryKey,
      session_id: sessionId,
    }),
    keepalive: true,
  }).catch(() => undefined)
}

export function CommercialNavVisitBeacon({
  categoryKey,
}: {
  categoryKey: string
}) {
  useEffect(() => {
    recordCommercialCategoryVisit(categoryKey)
  }, [categoryKey])
  return null
}
