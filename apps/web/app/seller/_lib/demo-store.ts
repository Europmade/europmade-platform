"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DEMO_PRODUCTS,
  type DemoProduct,
} from "./demo-data"
import {
  DEMO_MESSAGE_THREADS,
  DEMO_RETURN_DETAILS,
  DEMO_SELLER_INVOICES,
  DEMO_SPONSORED_CAMPAIGNS,
  type DemoMessageThread,
  type DemoReturnDetail,
  type DemoSellerInvoice,
  type DemoSponsoredCampaign,
} from "./demo-data-details"

const KEYS = {
  products: "em-seller-mvp-products",
  messages: "em-seller-mvp-messages",
  returns: "em-seller-mvp-returns",
  sponsored: "em-seller-mvp-sponsored",
  invoices: "em-seller-mvp-invoices",
} as const

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function usePersistedList<T>(
  key: string,
  seed: T[]
): [T[], (updater: T[] | ((prev: T[]) => T[])) => void, boolean] {
  const [items, setItems] = useState<T[]>(seed)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setItems(read(key, seed))
    setReady(true)
    // seed is constant module data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const update = useCallback(
    (updater: T[] | ((prev: T[]) => T[])) => {
      setItems((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        write(key, next)
        return next
      })
    },
    [key]
  )

  return [items, update, ready]
}

export function useDemoProducts() {
  return usePersistedList<DemoProduct>(KEYS.products, DEMO_PRODUCTS)
}

export function useDemoMessages() {
  return usePersistedList<DemoMessageThread>(
    KEYS.messages,
    DEMO_MESSAGE_THREADS
  )
}

export function useDemoReturns() {
  return usePersistedList<DemoReturnDetail>(KEYS.returns, DEMO_RETURN_DETAILS)
}

export function useDemoSponsored() {
  return usePersistedList<DemoSponsoredCampaign>(
    KEYS.sponsored,
    DEMO_SPONSORED_CAMPAIGNS
  )
}

export function useDemoSellerInvoices() {
  return usePersistedList<DemoSellerInvoice>(
    KEYS.invoices,
    DEMO_SELLER_INVOICES
  )
}
