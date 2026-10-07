"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function UnsubscribePage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const [message, setMessage] = useState("Laden…")
  const [canConfirm, setCanConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`/api/nieuwsbrief/uitschrijven/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { message?: string; state?: string } | null
        if (cancelled) return
        setMessage(body?.message || "Deze uitschrijflink is niet geldig.")
        setCanConfirm(res.ok && body?.state === "subscribed")
      })
      .catch(() => {
        if (!cancelled) setMessage("De pagina kon niet worden geladen. Probeer het opnieuw.")
      })
    return () => {
      cancelled = true
    }
  }, [token])

  async function confirm() {
    setBusy(true)
    try {
      const res = await fetch(`/api/nieuwsbrief/uitschrijven/${encodeURIComponent(token)}`, {
        method: "POST",
      })
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      setMessage(body?.message || "Uitschrijven is niet gelukt. Probeer het opnieuw.")
      if (res.ok) setCanConfirm(false)
    } catch {
      setMessage("Uitschrijven is niet gelukt. Probeer het opnieuw.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-xl font-bold text-wf-900">Nieuwsbrief uitschrijven</h1>
      <p className="mt-3 text-sm text-wf-800">{message}</p>
      {canConfirm ? (
        <button
          type="button"
          disabled={busy}
          className="mt-4 h-10 rounded bg-wf-900 px-4 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void confirm()}
        >
          Uitschrijven
        </button>
      ) : null}
    </main>
  )
}
