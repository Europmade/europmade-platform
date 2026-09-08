"use client"

import { useEffect, useRef, useState } from "react"
import {
  DEFAULT_STOREFRONT_LOCALE,
  type StorefrontLocale,
} from "../../_lib/i18n/locales"
import { t, type StorefrontMessageKey } from "../../_lib/i18n/messages"
import type { CmsProductEditorial } from "../../_lib/cms/product-editorial"

const TRUST_ITEMS: Array<{
  key: StorefrontMessageKey
  flag: keyof CmsProductEditorial["trust"]
}> = [
  { key: "trustSafePayment", flag: "showSafePayment" },
  { key: "trust30DayReturn", flag: "show30DayReturn" },
  { key: "trustMadeInEurope", flag: "showMadeInEurope" },
  { key: "trustVerifiedInfo", flag: "showVerifiedInfo" },
]

const DEFAULT_TRUST: CmsProductEditorial["trust"] = {
  showSafePayment: true,
  show30DayReturn: true,
  showMadeInEurope: true,
  showVerifiedInfo: true,
}

export function TrustStrip({
  locale = DEFAULT_STOREFRONT_LOCALE,
  trust = DEFAULT_TRUST,
}: {
  locale?: StorefrontLocale
  trust?: CmsProductEditorial["trust"]
}) {
  const items = TRUST_ITEMS.filter((item) => trust[item.flag] !== false)
  const scrollerRef = useRef<HTMLUListElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [userPaused, setUserPaused] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    function sync() {
      setReducedMotion(mq.matches)
    }
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    if (reducedMotion || userPaused || items.length <= 1) return
    const el = scrollerRef.current
    if (!el) return

    let frame = 0
    let last = performance.now()
    const speedPxPerSec = 18

    function tick(now: number) {
      const dt = Math.min(32, now - last) / 1000
      last = now
      if (!el) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 4) return
      let next = el.scrollLeft + speedPxPerSec * dt
      if (next >= max - 1) next = 0
      el.scrollLeft = next
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [items.length, reducedMotion, userPaused])

  if (items.length === 0) return null

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <ul
        ref={scrollerRef}
        className="flex max-w-full min-w-0 gap-2.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={t("trustAria", locale)}
        onPointerDown={() => setUserPaused(true)}
        onPointerUp={() => setUserPaused(false)}
        onPointerCancel={() => setUserPaused(false)}
        onPointerLeave={() => setUserPaused(false)}
        onTouchStart={() => setUserPaused(true)}
        onTouchEnd={() => setUserPaused(false)}
      >
        {items.map((item) => (
          <li
            key={item.key}
            className="flex w-[min(72vw,240px)] shrink-0 items-center gap-2.5 rounded-xl border border-wf-200 bg-white px-3 py-2 shadow-sm tablet:w-[min(40vw,220px)] desktop:w-[calc(25%-0.5rem)] desktop:min-w-[180px]"
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wf-900 text-xs font-bold text-white"
              aria-hidden
            >
              ✓
            </span>
            <span className="text-[12px] font-semibold leading-snug text-wf-800">
              {t(item.key, locale)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
