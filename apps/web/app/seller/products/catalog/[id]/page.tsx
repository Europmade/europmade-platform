"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Notice } from "@europmade/ui"
import { SellerGate } from "../../../_components/seller-gate"
import {
  ProductCloudApiError,
  getProductCloudProduct,
  submitChangeProposal,
  submitProductLinkGroupProposal,
  type ChangeProposal,
  type ProductLinkGroupSummary,
} from "../../../_lib/product-cloud-api"
import { sellerOfferPath } from "../../../_lib/seller-list-actions"

/**
 * Non-owner view: read-only Product Cloud data + change proposal + link group.
 * Own offer stays on /seller/products/offer.
 */
export default function SellerCatalogProductPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [proposedTitle, setProposedTitle] = useState("")
  const [proposedDescription, setProposedDescription] = useState("")
  const [toelichting, setToelichting] = useState("")
  const [proposals, setProposals] = useState<ChangeProposal[]>([])
  const [linkGroup, setLinkGroup] = useState<ProductLinkGroupSummary | null>(
    null
  )
  const [identifierId, setIdentifierId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [linkBusy, setLinkBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await getProductCloudProduct(id)
      const currentTitle = res.product.title || res.versions[0]?.title || ""
      const currentDescription =
        res.product.description || res.versions[0]?.description || ""
      setTitle(currentTitle)
      setDescription(currentDescription)
      setProposedTitle(currentTitle)
      setProposedDescription(currentDescription)
      setProposals(res.own_change_proposals || [])
      setLinkGroup(res.product_link_group ?? null)
    } catch (err) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : "Product laden mislukt."
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    // Best-effort: offer page needs identifier; list may have set it via query later.
    const fromQuery =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("identifier_id")
        : null
    setIdentifierId(fromQuery)
  }, [])

  async function onSubmitProposal(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const titleChanged = proposedTitle.trim() !== title.trim()
      const descChanged = proposedDescription.trim() !== description.trim()
      await submitChangeProposal({
        product_id: id,
        proposed_title: titleChanged
          ? proposedTitle.trim()
          : descChanged
            ? undefined
            : proposedTitle.trim() || title.trim() || "Ongewijzigde titel",
        proposed_description: descChanged
          ? proposedDescription.trim()
          : undefined,
        toelichting: toelichting.trim(),
      })
      setNotice("Wijzigingsvoorstel ingediend. Admin beoordeelt dit.")
      setToelichting("")
      await load()
    } catch (err) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : "Voorstel indienen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  async function requestLinkDeactivate() {
    if (!linkGroup || linkGroup.status !== "active") return
    setLinkBusy(true)
    setError(null)
    setNotice(null)
    try {
      await submitProductLinkGroupProposal({
        name: `Deactivering: ${linkGroup.name}`,
        request_kind: "deactivate",
        target_group_id: linkGroup.id,
        dimensions: [],
        members: [],
        note: "Seller vraagt deactivering van actieve productkoppeling.",
      })
      setNotice(
        "Verzoek tot deactivering van de productkoppeling is ingediend."
      )
    } catch (err) {
      setError(
        err instanceof ProductCloudApiError
          ? err.message
          : "Koppelverzoek mislukt."
      )
    } finally {
      setLinkBusy(false)
    }
  }

  return (
    <SellerGate>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="mb-4 text-[11.5px] text-wf-500">
          <Link href="/seller/products" className="underline">
            Producten
          </Link>{" "}
          &gt; Centrale productinformatie
        </p>
        <h1 className="text-lg font-bold text-wf-900">
          Centrale productinformatie
        </h1>
        <p className="mt-1 text-xs text-wf-600">
          Je bent geen Product Cloud-eigenaar. Je kunt data bekijken en een
          verbetering voorstellen. Prijs, voorraad en SKU beheer je via je
          eigen aanbod.
        </p>

        {error ? (
          <Notice variant="warning" className="mt-4">
            {error}
          </Notice>
        ) : null}
        {notice ? (
          <Notice variant="info" className="mt-4">
            {notice}
          </Notice>
        ) : null}

        {loading ? (
          <p className="mt-6 text-sm text-wf-600">Laden…</p>
        ) : (
          <>
            <div className="mt-6 rounded-lg border border-wf-300 bg-white p-4">
              <h2 className="text-sm font-semibold text-wf-900">
                Huidige centrale data
              </h2>
              <p className="mt-2 text-sm font-medium text-wf-900">{title || "—"}</p>
              <p className="mt-2 whitespace-pre-wrap text-xs text-wf-700">
                {description || "Geen beschrijving."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {identifierId ? (
                  <Link
                    href={sellerOfferPath(identifierId)}
                    className="rounded bg-wf-900 px-3 py-2 text-[11px] font-semibold text-white"
                  >
                    Eigen aanbod beheren
                  </Link>
                ) : (
                  <Link
                    href="/seller/products"
                    className="rounded border border-wf-300 px-3 py-2 text-[11px] font-semibold text-wf-800"
                  >
                    Terug naar producten
                  </Link>
                )}
              </div>
            </div>

            {linkGroup ? (
              <div className="mt-4 rounded-lg border border-wf-300 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-wf-900">
                    Productkoppeling
                  </h2>
                  <Badge variant="outline">{linkGroup.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-wf-600">{linkGroup.name}</p>
                <p className="mt-2 text-xs text-wf-800">
                  Jouw waarden:{" "}
                  {Object.entries(linkGroup.own_values || {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ") || "—"}
                </p>
                <ul className="mt-3 space-y-1 text-xs text-wf-800">
                  {linkGroup.members.map((m) => (
                    <li key={m.product_id}>
                      {m.product_title || m.product_id}
                      {" — "}
                      {Object.values(m.values || {}).join(" / ")}
                    </li>
                  ))}
                </ul>
                {linkGroup.status === "active" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3"
                    disabled={linkBusy}
                    onClick={() => void requestLinkDeactivate()}
                  >
                    Deactivering aanvragen
                  </Button>
                ) : null}
              </div>
            ) : null}

            <form
              onSubmit={onSubmitProposal}
              className="mt-4 space-y-3 rounded-lg border border-wf-300 bg-white p-4"
            >
              <h2 className="text-sm font-semibold text-wf-900">
                Verbetering voorstellen
              </h2>
              <p className="text-[11px] text-wf-600">
                Alleen titel/beschrijving worden direct voorgesteld. Extra
                verbeteringen (specificaties, media) vermeld je in de
                toelichting.
              </p>
              <label className="block text-xs text-wf-600">
                Voorgestelde titel
                <input
                  className="mt-1 w-full rounded border border-wf-300 px-2 py-1.5 text-sm"
                  value={proposedTitle}
                  onChange={(e) => setProposedTitle(e.target.value)}
                />
              </label>
              <label className="block text-xs text-wf-600">
                Voorgestelde beschrijving
                <textarea
                  className="mt-1 w-full rounded border border-wf-300 px-2 py-1.5 text-sm"
                  rows={5}
                  value={proposedDescription}
                  onChange={(e) => setProposedDescription(e.target.value)}
                />
              </label>
              <label className="block text-xs text-wf-600">
                Toelichting (verplicht)
                <textarea
                  className="mt-1 w-full rounded border border-wf-300 px-2 py-1.5 text-sm"
                  rows={3}
                  required
                  value={toelichting}
                  onChange={(e) => setToelichting(e.target.value)}
                />
              </label>
              <Button type="submit" disabled={busy}>
                Voorstel indienen
              </Button>
            </form>

            {proposals.length > 0 ? (
              <div className="mt-4 rounded-lg border border-wf-200 p-4">
                <h2 className="text-sm font-semibold text-wf-900">
                  Jouw eerdere voorstellen
                </h2>
                <ul className="mt-2 space-y-2 text-xs text-wf-700">
                  {proposals.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <Badge variant="outline">{p.status}</Badge>
                      <span className="font-mono text-[10px]">{p.id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </SellerGate>
  )
}
