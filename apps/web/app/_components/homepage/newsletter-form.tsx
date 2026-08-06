"use client"

import { FormEvent, useState } from "react"
import { Button, Notice } from "@europmade/ui"

/**
 * Nieuwsbrief UI (CMP-006-patroon uit wireframe).
 * Geen backend-endpoint in MVP Fase 1 — alleen clientvalidatie + eerlijke feedback.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setMessage("Vul een geldig e-mailadres in.")
      return
    }
    setMessage(
      "Bedankt — nieuwsbrief-inschrijving volgt zodra de notificatieservice live is."
    )
    setEmail("")
  }

  return (
    <div className="mx-auto max-w-[420px]">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-2 mobile:flex-row mobile:gap-2"
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
          placeholder="naam@voorbeeld.nl"
          className="h-[42px] flex-1 rounded-xl border border-wf-300 bg-white px-3 text-[13px] text-wf-900 placeholder:text-wf-500 focus:outline-none focus:ring-2 focus:ring-wf-900/20"
          autoComplete="email"
          required
        />
        <Button
          type="submit"
          variant="primary"
          className="h-[42px] shrink-0 px-5"
        >
          Aanmelden
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
