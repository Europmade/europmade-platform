"use client"

import { FormEvent, useState } from "react"
import { Button, Notice } from "@europmade/ui"

/**
 * Nieuwsbriefinschrijving. Schrijft naar de engagement-consument.
 * Geen succesmelding zonder een geslaagde backend-respons.
 */
export function NewsletterForm({
  placeholder,
  submitLabel,
  invalidEmail,
  locale = "nl",
}: {
  placeholder: string
  submitLabel: string
  invalidEmail: string
  successMessage?: string
  locale?: string
}) {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setMessage(invalidEmail)
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/nieuwsbrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, locale }),
      })
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      if (!res.ok) {
        setMessage(body?.message || "Inschrijven is niet gelukt. Probeer het opnieuw.")
        return
      }
      setMessage(body?.message || "Je bent ingeschreven voor de EuropMade-nieuwsbrief.")
      if (res.status === 201) setEmail("")
    } catch {
      setMessage("Inschrijven is niet gelukt. Probeer het opnieuw.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full max-w-xl">
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="flex flex-col gap-2 mobile:flex-row mobile:items-stretch mobile:gap-2"
        noValidate
      >
        <label htmlFor="homepage-newsletter-email" className="sr-only">
          E-mailadres
        </label>
        <input
          id="homepage-newsletter-email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setMessage(null)
          }}
          placeholder={placeholder}
          className="h-[42px] min-w-0 flex-1 rounded-xl border border-wf-300 bg-white px-3 text-[13px] text-wf-900 placeholder:text-wf-500 focus:outline-none focus:ring-2 focus:ring-wf-900/20"
          autoComplete="email"
          required
        />
        <Button type="submit" variant="primary" className="h-[42px] shrink-0 px-5" disabled={busy}>
          {submitLabel}
        </Button>
      </form>
      {message ? (
        <Notice variant="info" className="mt-3 text-left text-wf-900">
          {message}
        </Notice>
      ) : null}
    </div>
  )
}
