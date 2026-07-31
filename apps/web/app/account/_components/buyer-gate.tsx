"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  OrderServiceApiError,
  listOrders,
} from "../../_lib/order-service-api"
import { BuyerShell } from "./buyer-shell"

export type BuyerGateProps = {
  breadcrumb: Array<{ label: string; href?: string }>
  children: React.ReactNode
}

/**
 * Sessie vereist voor Buyer Dashboard (S3-13-01).
 */
export function BuyerGate({ breadcrumb, children }: BuyerGateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    listOrders()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof OrderServiceApiError && err.status === 401) {
          router.replace(
            `/login?redirect=${encodeURIComponent(pathname || "/account")}`
          )
          return
        }
        // Andere fouten: shell tonen; pagina toont eigen foutmelding.
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [router, pathname])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-wf-100 text-sm text-wf-600">
        Laden…
      </div>
    )
  }

  return <BuyerShell breadcrumb={breadcrumb}>{children}</BuyerShell>
}
