"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Notice } from "@europmade/ui"
import {
  ProductApprovalAdminApiError,
  getAdminProduct,
  type AdminProductDetail,
} from "../../../../../lib/product-approval-admin-api"
import {
  AdminWizardShell,
  type WizardStep,
} from "../../../../../components/product-cloud/admin-wizard-shell"

function stepForProposalField(field: string | null | undefined): WizardStep {
  if (field === "media_note") return "media"
  return "information"
}

export default function AdminProductDetailPage() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const id = params.id
  const highlightProposalId = search.get("proposal")
  const [data, setData] = useState<AdminProductDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<WizardStep>("information")
  const [lightbox, setLightbox] = useState<{
    url: string
    kind: "image" | "pdf" | "other"
    title: string
  } | null>(null)
  const [broken, setBroken] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setError(null)
    try {
      setData(await getAdminProduct(id))
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Product laden mislukt."
      )
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!data || !highlightProposalId) return
    const row = (data.change_proposals || []).find(
      (p) => String((p as { id?: string }).id) === highlightProposalId
    ) as
      | {
          proposed_fields?: { changes?: Array<{ field?: string }> }
          proposed_title?: string | null
        }
      | undefined
    const field =
      row?.proposed_fields?.changes?.[0]?.field ||
      (row?.proposed_title ? "title" : null)
    setStep(stepForProposalField(field))
    const t = window.setTimeout(() => {
      document
        .getElementById(`proposal-${highlightProposalId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 200)
    return () => window.clearTimeout(t)
  }, [data, highlightProposalId])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightbox])

  if (loading) return <p className="text-sm text-wf-600">Laden…</p>
  if (!data?.product) {
    return <Notice variant="warning">{error ?? "Product niet gevonden."}</Notice>
  }

  return (
    <AdminWizardShell
      id={id}
      data={data}
      error={error}
      step={step}
      setStep={setStep}
      load={load}
      highlightProposalId={highlightProposalId}
      lightbox={lightbox}
      setLightbox={setLightbox}
      broken={broken}
      setBroken={setBroken}
    />
  )
}
