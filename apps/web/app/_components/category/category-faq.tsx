"use client"

import { useEffect, useState } from "react"
import type { StorefrontLocale } from "../../_lib/i18n/locales"

type FaqItem = { id: string; question: string; answer: string }

type CategoryFaqProps = {
  title: string
  items: FaqItem[]
  categorySlug: string
  categoryLabel: string
  locale: StorefrontLocale
  guideFaq?: FaqItem[]
  openId?: string | null
  onOpenId?: (id: string | null) => void
}

/**
 * Category FAQ — only published CMS items. No specialist/ultimate-guide mock when CMS is empty.
 */
export function CategoryFaq({
  title,
  items,
  openId: controlledOpen,
  onOpenId,
}: CategoryFaqProps) {
  const faqs = items.filter((f) => f.question.trim() || f.answer.trim())
  const [localOpen, setLocalOpen] = useState<string | null>(null)
  const openId = controlledOpen !== undefined ? controlledOpen : localOpen
  const setOpenId = onOpenId ?? setLocalOpen

  useEffect(() => {
    if (!controlledOpen) return
    if (faqs.some((f) => f.id === controlledOpen)) {
      document
        .getElementById("category-faq")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [controlledOpen, faqs])

  if (faqs.length === 0) return null

  return (
    <section
      id="category-faq"
      className="scroll-mt-4 border-t border-wf-100 px-4 py-5 tablet:px-8 tablet:py-6"
    >
      <h2 className="mb-3.5 text-[20px] font-bold tracking-tight text-wf-900 tablet:text-[24px]">
        {title}
      </h2>
      <ul className="space-y-1.5">
        {faqs.map((item) => {
          const open = openId === item.id
          return (
            <li
              key={item.id}
              className="overflow-hidden rounded-xl border border-wf-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition duration-200 hover:border-wf-300 hover:shadow-md"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition hover:bg-wf-50/80 tablet:px-4"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : item.id)}
              >
                <span className="text-[13px] font-bold leading-snug text-wf-900 tablet:text-[14px]">
                  {item.question}
                </span>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-wf-200 text-wf-600 transition-transform duration-200 ${
                    open
                      ? "rotate-180 border-wf-900 bg-wf-900 text-white"
                      : "bg-white"
                  }`}
                  aria-hidden
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 4.25L6 7.75L9.5 4.25"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="border-t border-wf-100 px-3.5 pb-3 pt-2.5 text-[12.5px] leading-snug text-wf-600 tablet:px-4">
                    {item.answer}
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
