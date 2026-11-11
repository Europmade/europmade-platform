"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

/**
 * Shows as soon as an in-app link is clicked, before the next RSC payload arrives.
 */
export function StorefrontNavProgress() {
  const pathname = usePathname()
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setPending(false)
  }, [pathname])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest("a")
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#") || /^(https?:|mailto:|tel:)/i.test(href)) return
      let next: URL
      try {
        next = new URL(href, window.location.href)
      } catch {
        return
      }
      if (next.origin !== window.location.origin) return
      if (next.pathname === window.location.pathname && next.search === window.location.search) return
      setPending(true)
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [])

  if (!pending) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80]" role="status" aria-live="polite">
      <div className="h-1 bg-[#16315c]">
        <div className="h-full w-2/5 animate-pulse bg-[#1f8a4c]" />
      </div>
      <span className="sr-only">Pagina laden</span>
    </div>
  )
}
