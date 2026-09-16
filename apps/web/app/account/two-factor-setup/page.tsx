"use client"

import { useEffect, useState, type FormEvent, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button, Checkbox, CodeInput, Notice } from "@europmade/ui"
import { AuthCard } from "../../(auth)/_components/auth-card"
import {
  confirmMfa,
  enrollMfa,
  getMfaStatus,
  MedusaAuthError,
} from "../../(auth)/_lib/medusa-auth"
import { useStorefrontLocale } from "../../_lib/i18n/use-storefront-locale"
import { t } from "../../_lib/i18n/messages"

type Step =
  | { name: "loading" }
  | {
      name: "enroll"
      manualKey: string
      qrDataUrl: string | null
    }
  | { name: "recovery"; codes: string[] }

/**
 * Tweestapsverificatie instellen — wireframe scherm #7.
 * Route verwacht door Partner Onboarding status-CTA.
 */
function TwoFactorSetupContent() {
  const router = useRouter()
  const locale = useStorefrontLocale()
  const searchParams = useSearchParams()
  const required = searchParams.get("required") === "1"
  const [step, setStep] = useState<Step>({ name: "loading" })
  const [code, setCode] = useState("")
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const status = await getMfaStatus()
        if (cancelled) return
        if (status.enabled) {
          router.replace("/seller")
          return
        }
        const enroll = await enrollMfa()
        if (cancelled) return
        setStep({
          name: "enroll",
          manualKey: enroll.manual_entry_key,
          qrDataUrl: enroll.qr_data_url ?? null,
        })
      } catch (err) {
        if (cancelled) return
        if (err instanceof MedusaAuthError && err.status === 401) {
          router.replace(
            `/login?redirect=${encodeURIComponent("/account/two-factor-setup")}`
          )
          return
        }
        setError(t("auth2faEnrollError", locale))
        setStep({ name: "enroll", manualKey: "", qrDataUrl: null })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router, locale])

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await confirmMfa(code)
      setStep({ name: "recovery", codes: result.recovery_codes })
      setCode("")
    } catch {
      setError(t("authMfaCodeError", locale))
    } finally {
      setIsSubmitting(false)
    }
  }

  function finishSetup() {
    if (!saved) return
    router.push("/seller")
    router.refresh()
  }

  if (step.name === "loading") {
    return (
      <AuthCard title={t("auth2faSetupTitle", locale)}>
        <p className="text-center text-xs text-wf-600">{t("loading", locale)}</p>
      </AuthCard>
    )
  }

  if (step.name === "recovery") {
    return (
      <AuthCard
        title={t("auth2faSetupTitle", locale)}
        subtitle={t("auth2faRecoverySubtitle", locale)}
      >
        <ul className="mb-5 grid grid-cols-1 gap-2 rounded-md border border-wf-300 bg-wf-50 p-4 font-mono text-xs text-wf-900 tablet:grid-cols-2">
          {step.codes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Checkbox
          label={t("auth2faSavedCodes", locale)}
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
        />
        <Button
          type="button"
          className="mt-4 w-full"
          disabled={!saved}
          onClick={finishSetup}
        >
          {t("auth2faFinish", locale)}
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={t("auth2faSetupTitle", locale)}
      subtitle={
        required
          ? t("auth2faSetupRequiredSubtitle", locale)
          : t("auth2faSetupSubtitle", locale)
      }
    >
      <form onSubmit={handleConfirm}>
        {error ? (
          <Notice variant="warning" className="mb-4">
            {error}
          </Notice>
        ) : null}

        {step.qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={step.qrDataUrl}
            alt={t("auth2faQrAlt", locale)}
            className="mx-auto mb-4 h-[200px] w-[200px] border border-wf-300 bg-white p-2"
          />
        ) : (
          <div className="mx-auto mb-4 flex h-[200px] w-[200px] items-center justify-center border border-dashed border-wf-400 bg-wf-50 text-center text-[11px] text-wf-600">
            {t("auth2faQrFallback", locale)}
          </div>
        )}

        {step.manualKey ? (
          <p className="mb-5 text-center text-xs text-wf-700">
            {t("auth2faManualLabel", locale)}{" "}
            <span className="font-mono font-semibold tracking-wide text-wf-900">
              {step.manualKey}
            </span>
          </p>
        ) : null}

        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
          {t("auth2faConfirmLabel", locale)}
        </p>
        <CodeInput value={code} onChange={setCode} autoFocus />
        <Button
          type="submit"
          className="mt-4 w-full"
          disabled={isSubmitting || code.length < 6}
        >
          {t("authConfirm", locale)}
        </Button>
      </form>
    </AuthCard>
  )
}

export default function TwoFactorSetupPage() {
  return (
    <div className="min-h-screen bg-wf-100">
      <header
        role="banner"
        className="flex items-center justify-center border-b border-wf-300 bg-white py-4"
      >
        <div
          className="h-6 w-[130px] rounded bg-wf-300"
          role="img"
          aria-label="EuropMade logo (placeholder)"
        />
      </header>
      <main className="flex justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[520px]">
          <Suspense fallback={null}>
            <TwoFactorSetupContent />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
