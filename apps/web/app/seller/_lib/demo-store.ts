"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import {
  listSellerMessageReads,
  markSellerMessageRead,
} from "../../_lib/order-service-api"

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

/**
 * Seller message threads: demo conversation content + server-persisted read state.
 * Server read cursors win over seed/localStorage unread flags.
 */
export function useDemoMessages(): [
  DemoMessageThread[],
  (
    updater:
      | DemoMessageThread[]
      | ((prev: DemoMessageThread[]) => DemoMessageThread[])
  ) => void,
  boolean,
  (conversationId: string) => Promise<void>,
] {
  const [stored, setStored, storageReady] = usePersistedList<DemoMessageThread>(
    KEYS.messages,
    DEMO_MESSAGE_THREADS
  )
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [readsReady, setReadsReady] = useState(false)
  const readIdsRef = useRef(readIds)
  readIdsRef.current = readIds

  useEffect(() => {
    let cancelled = false
    listSellerMessageReads()
      .then(({ reads }) => {
        if (cancelled) return
        setReadIds(new Set(reads.map((r) => r.conversation_id)))
        setReadsReady(true)
      })
      .catch(() => {
        if (cancelled) return
        // Keep seed/local unread if reads API is unavailable (e.g. mid-migrate).
        setReadsReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const threads = useMemo(
    () =>
      stored.map((thread) =>
        readIds.has(thread.id) ? { ...thread, unread: false } : thread
      ),
    [stored, readIds]
  )

  const setThreads = useCallback(
    (
      updater:
        | DemoMessageThread[]
        | ((prev: DemoMessageThread[]) => DemoMessageThread[])
    ) => {
      setStored((prev) => {
        const base = prev.map((thread) =>
          readIdsRef.current.has(thread.id)
            ? { ...thread, unread: false }
            : thread
        )
        return typeof updater === "function" ? updater(base) : updater
      })
    },
    [setStored]
  )

  const markRead = useCallback(
    async (conversationId: string) => {
      const id = conversationId.trim()
      if (!id) return
      if (readIdsRef.current.has(id)) {
        setStored((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, unread: false } : item
          )
        )
        return
      }
      try {
        await markSellerMessageRead(id)
      } catch {
        // Still update local view; next successful load reconciles from server.
      }
      setReadIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
      setStored((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, unread: false } : item
        )
      )
    },
    [setStored]
  )

  return [threads, setThreads, storageReady && readsReady, markRead]
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
