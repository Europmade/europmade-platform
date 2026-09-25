"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge, Button, Notice } from "@europmade/ui"
import {
  LIFECYCLE_STATUS_FILTERS,
  PUBLICATION_STATUS_FILTERS,
  ProductApprovalAdminApiError,
  bulkAssignAdminProductManager,
  dryRunBulkProductManager,
  previewBulkProductManager,
  previewBulkBrand,
  dryRunBulkBrand,
  applyBulkBrand,
  previewBulkInformation,
  dryRunBulkInformation,
  applyBulkInformation,
  listAdminProducts,
  type ApprovalProductRow,
  type BulkPmCandidate,
  type BulkPmPreviewResponse,
  type BulkPmValidationRow,
  type BulkGenericRow,
} from "../../../../lib/product-approval-admin-api"
import { displayMediaUrl } from "../../../../lib/media-url"

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const PAGE_SIZE = 100

function candidateKey(c: BulkPmCandidate): string {
  return `${c.kind}:${c.seller_id || ""}`
}

type BulkAction = "" | "product_manager" | "brand" | "eu_compliance"

/**
 * Admin Product Management overzicht (P2.20) + atomic bulk Productbeheerder.
 */
export default function AdminProductsPage() {
  const [rows, setRows] = useState<ApprovalProductRow[] | "loading">("loading")
  const [count, setCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [search, setSearch] = useState("")
  const [publicationStatus, setPublicationStatus] = useState("")
  const [lifecycleStatus, setLifecycleStatus] = useState("")
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<BulkAction>("")
  const [bulkBusy, setBulkBusy] = useState(false)
  const [pmDialogOpen, setPmDialogOpen] = useState(false)
  const [preview, setPreview] = useState<BulkPmPreviewResponse | null>(null)
  const [candidates, setCandidates] = useState<BulkPmCandidate[]>([])
  const [candidateKeySel, setCandidateKeySel] = useState("none:")
  const [invalidRows, setInvalidRows] = useState<BulkPmValidationRow[]>([])
  const [confirmRows, setConfirmRows] = useState<BulkPmValidationRow[] | null>(
    null
  )
  const [confirmChoice, setConfirmChoice] = useState<BulkPmCandidate | null>(
    null
  )
  const [brandDialogOpen, setBrandDialogOpen] = useState(false)
  const [brandPreview, setBrandPreview] = useState<{
    products: BulkGenericRow[]
    available_brands: Array<{ id: string; name: string }>
  } | null>(null)
  const [brandIdSel, setBrandIdSel] = useState("")
  const [brandConfirm, setBrandConfirm] = useState<BulkGenericRow[] | null>(null)
  const [euDialogOpen, setEuDialogOpen] = useState(false)
  const [euPreview, setEuPreview] = useState<{
    products: BulkGenericRow[]
    allowed_codes: Array<{ code: string; label: string }>
  } | null>(null)
  const [euForm, setEuForm] = useState<Record<string, string>>({})
  const [euConfirm, setEuConfirm] = useState<BulkGenericRow[] | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setRows("loading")
    try {
      const res = await listAdminProducts({
        q: search || undefined,
        publication_status: publicationStatus || undefined,
        lifecycle_status: lifecycleStatus || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
      setRows(res.products)
      setCount(res.count)
      setSelectedIds(new Set())
      setBulkAction("")
      setPmDialogOpen(false)
      setPreview(null)
      setCandidates([])
      setCandidateKeySel("none:")
      setConfirmRows(null)
      setConfirmChoice(null)
      setInvalidRows([])
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Producten laden mislukt."
      )
      setRows([])
      setCount(0)
    }
  }, [search, publicationStatus, lifecycleStatus, page])

  useEffect(() => {
    void load()
  }, [load])

  const selectedList = useMemo(() => [...selectedIds], [selectedIds])

  function closePmDialog() {
    setPmDialogOpen(false)
    setPreview(null)
    setCandidates([])
    setCandidateKeySel("none:")
    setConfirmRows(null)
    setConfirmChoice(null)
    setInvalidRows([])
  }

  function closeBrandDialog() {
    setBrandDialogOpen(false)
    setBrandPreview(null)
    setBrandIdSel("")
    setBrandConfirm(null)
    setInvalidRows([])
  }

  function closeEuDialog() {
    setEuDialogOpen(false)
    setEuPreview(null)
    setEuForm({})
    setEuConfirm(null)
    setInvalidRows([])
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setBulkAction("")
    closePmDialog()
    closeBrandDialog()
    closeEuDialog()
  }

  function toggleOne(id: string) {
    setSelectedIds((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllOnPage() {
    if (rows === "loading" || rows.length === 0) return
    setSelectedIds((cur) => {
      const allSelected = rows.every((r) => cur.has(r.id))
      if (allSelected) return new Set()
      return new Set(rows.map((r) => r.id))
    })
  }

  async function openProductManagerDialog() {
    if (selectedList.length === 0) return
    setBulkBusy(true)
    setError(null)
    setNotice(null)
    setInvalidRows([])
    setConfirmRows(null)
    setConfirmChoice(null)
    try {
      const res = await previewBulkProductManager(selectedList)
      setPreview(res)
      const list = res.shared_candidates || []
      setCandidates(list)
      setCandidateKeySel(list[0] ? candidateKey(list[0]) : "none:")
      setPmDialogOpen(true)
    } catch (err) {
      setBulkAction("")
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Bulk Productbeheerder openen mislukt."
      )
    } finally {
      setBulkBusy(false)
    }
  }

  async function openBrandDialog() {
    if (selectedList.length === 0) return
    setBulkBusy(true)
    setError(null)
    try {
      const res = await previewBulkBrand(selectedList)
      setBrandPreview({
        products: res.products,
        available_brands: res.available_brands || [],
      })
      setBrandIdSel(res.available_brands?.[0]?.id || "")
      setBrandDialogOpen(true)
    } catch (err) {
      setBulkAction("")
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Bulk merk openen mislukt."
      )
    } finally {
      setBulkBusy(false)
    }
  }

  async function openEuDialog() {
    if (selectedList.length === 0) return
    setBulkBusy(true)
    setError(null)
    try {
      const res = await previewBulkInformation(selectedList)
      setEuPreview({
        products: res.products,
        allowed_codes: res.allowed_codes || [],
      })
      const initial: Record<string, string> = {}
      for (const c of res.allowed_codes || []) initial[c.code] = ""
      setEuForm(initial)
      setEuDialogOpen(true)
    } catch (err) {
      setBulkAction("")
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Bulk EU Compliance openen mislukt."
      )
    } finally {
      setBulkBusy(false)
    }
  }

  function onBulkActionChange(value: string) {
    const next = value as BulkAction
    setBulkAction(next)
    setInvalidRows([])
    setConfirmRows(null)
    setConfirmChoice(null)
    setBrandConfirm(null)
    setEuConfirm(null)
    if (next === "product_manager") {
      closeBrandDialog()
      closeEuDialog()
      void openProductManagerDialog()
    } else if (next === "brand") {
      closePmDialog()
      closeEuDialog()
      void openBrandDialog()
    } else if (next === "eu_compliance") {
      closePmDialog()
      closeBrandDialog()
      void openEuDialog()
    } else {
      closePmDialog()
      closeBrandDialog()
      closeEuDialog()
    }
  }

  async function runControleren() {
    const selected = candidates.find((c) => candidateKey(c) === candidateKeySel)
    if (!selected || selectedList.length === 0) return
    setBulkBusy(true)
    setError(null)
    setNotice(null)
    setInvalidRows([])
    setConfirmRows(null)
    setConfirmChoice(null)
    try {
      const res = await dryRunBulkProductManager({
        product_ids: selectedList,
        kind: selected.kind,
        seller_id: selected.seller_id,
      })
      if (!res.all_valid) {
        setInvalidRows(res.invalid_products || [])
        return
      }
      setConfirmChoice(selected)
      setConfirmRows(res.products)
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Validatie van bulktoewijzing mislukt."
      )
    } finally {
      setBulkBusy(false)
    }
  }

  async function applyBulkAssign() {
    if (!confirmChoice || !confirmRows?.length) return
    setBulkBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await bulkAssignAdminProductManager({
        product_ids: confirmRows.map((r) => r.product_id),
        kind: confirmChoice.kind,
        seller_id: confirmChoice.seller_id,
        transfer_reason: `Bulk Productbeheerder: ${confirmChoice.label}`,
      })
      setNotice(
        `${res.updated_count} product(en) bijgewerkt met Productbeheerder: ${confirmChoice.label}.`
      )
      setBulkAction("")
      closePmDialog()
      await load()
    } catch (err) {
      if (err instanceof ProductApprovalAdminApiError && err.payload) {
        const payload = err.payload as {
          invalid_products?: BulkPmValidationRow[]
        }
        if (payload.invalid_products?.length) {
          setInvalidRows(payload.invalid_products)
          setConfirmRows(null)
          setConfirmChoice(null)
        }
      }
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Bulk Productbeheerder mislukt."
      )
    } finally {
      setBulkBusy(false)
    }
  }

  async function runBrandControleren() {
    if (!brandIdSel || selectedList.length === 0) return
    setBulkBusy(true)
    setInvalidRows([])
    setBrandConfirm(null)
    try {
      const res = await dryRunBulkBrand({
        product_ids: selectedList,
        brand_id: brandIdSel,
      })
      if (!res.all_valid) {
        setInvalidRows(
          (res.invalid_products || []).map((r) => ({
            product_id: r.product_id,
            title: r.title,
            current_display: r.current_display,
            current_type: "",
            new_display: r.new_display || "",
            new_type: "",
            valid: false,
            error: r.error || "Ongeldig",
          }))
        )
        return
      }
      setBrandConfirm(res.products)
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Merk-validatie mislukt."
      )
    } finally {
      setBulkBusy(false)
    }
  }

  async function applyBrand() {
    if (!brandIdSel || !brandConfirm?.length) return
    setBulkBusy(true)
    try {
      const res = await applyBulkBrand({
        product_ids: brandConfirm.map((r) => r.product_id),
        brand_id: brandIdSel,
      })
      setNotice(res.message || `${res.updated_count} product(en) bijgewerkt.`)
      setBulkAction("")
      closeBrandDialog()
      await load()
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Bulk merk mislukt."
      )
    } finally {
      setBulkBusy(false)
    }
  }

  async function runEuControleren() {
    const attributes = Object.entries(euForm)
      .filter(([, v]) => v.trim())
      .map(([code, value]) => ({ code, value: value.trim() }))
    if (!attributes.length) {
      setError("Vul minimaal één EU Compliance-veld in.")
      return
    }
    setBulkBusy(true)
    setInvalidRows([])
    setEuConfirm(null)
    try {
      const res = await dryRunBulkInformation({
        product_ids: selectedList,
        attributes,
      })
      if (!res.all_valid) {
        setInvalidRows(
          (res.invalid_products || []).map((r) => ({
            product_id: r.product_id,
            title: r.title,
            current_display: r.current_display,
            current_type: "",
            new_display: r.new_display || "",
            new_type: "",
            valid: false,
            error: r.error || "Ongeldig",
          }))
        )
        return
      }
      setEuConfirm(res.products)
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "EU Compliance-validatie mislukt."
      )
    } finally {
      setBulkBusy(false)
    }
  }

  async function applyEu() {
    const attributes = Object.entries(euForm)
      .filter(([, v]) => v.trim())
      .map(([code, value]) => ({ code, value: value.trim() }))
    if (!euConfirm?.length || !attributes.length) return
    setBulkBusy(true)
    try {
      const res = await applyBulkInformation({
        product_ids: euConfirm.map((r) => r.product_id),
        attributes,
      })
      setNotice(res.message || `${res.updated_count} product(en) bijgewerkt.`)
      setBulkAction("")
      closeEuDialog()
      await load()
    } catch (err) {
      setError(
        err instanceof ProductApprovalAdminApiError
          ? err.message
          : "Bulk EU Compliance mislukt."
      )
    } finally {
      setBulkBusy(false)
    }
  }

  const allOnPageSelected =
    rows !== "loading" &&
    rows.length > 0 &&
    rows.every((r) => selectedIds.has(r.id))

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Producten &gt;{" "}
        <b className="font-semibold text-wf-800">Product Management</b>
      </p>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-wf-900">Product Management</h1>
          <p className="mt-1.5 text-xs text-wf-600">
            Zoek, filter en selecteer producten voor beoordeling of bulk
            Productbeheerder-toewijzing. Detailpagina blijft de primaire plek
            voor inhoudelijk beheer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/product-cloud/product-links"
            className="rounded border border-wf-300 bg-white px-3 py-2 text-[11px] font-semibold text-wf-800"
          >
            Productkoppelingen
          </Link>
          <Link
            href="/product-cloud/products/approvals"
            className="rounded bg-wf-900 px-3 py-2 text-[11px] font-semibold text-white"
          >
            Productgoedkeuringen
          </Link>
        </div>
      </div>

      {error ? (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      ) : null}
      {notice ? (
        <Notice variant="info" className="mb-4">
          {notice}
        </Notice>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <form
          className="flex min-w-[200px] flex-1 flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(q.trim())
            setPage(1)
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                setSearch(q.trim())
                setPage(1)
              }
            }}
            placeholder="Zoek op naam, SKU, EAN, seller, merk…"
            className="h-9 min-w-[200px] flex-1 rounded-[5px] border border-wf-400 px-3 text-xs text-wf-800"
          />
          <Button type="submit" size="sm" variant="secondary">
            Zoeken
          </Button>
        </form>
        <select
          value={publicationStatus}
          onChange={(e) => {
            setPublicationStatus(e.target.value)
            setPage(1)
          }}
          className="h-9 rounded-[5px] border border-wf-400 px-2 text-xs text-wf-800"
        >
          {PUBLICATION_STATUS_FILTERS.map((f) => (
            <option key={f.key || "all-pub"} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={lifecycleStatus}
          onChange={(e) => {
            setLifecycleStatus(e.target.value)
            setPage(1)
          }}
          className="h-9 rounded-[5px] border border-wf-400 px-2 text-xs text-wf-800"
        >
          {LIFECYCLE_STATUS_FILTERS.map((f) => (
            <option key={f.key || "all-life"} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {selectedList.length > 0 ? (
        <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-wf-400 bg-white px-3 py-2 shadow-sm">
          <span className="text-xs font-semibold text-wf-900">
            {selectedList.length} product(en) geselecteerd
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-wf-700 underline-offset-2 hover:underline"
            onClick={clearSelection}
          >
            Selectie wissen
          </button>
          <label className="flex items-center gap-2 text-xs text-wf-700">
            <span className="font-semibold">Bulk actie</span>
            <select
              className="h-8 rounded-[5px] border border-wf-400 bg-white px-2 text-xs"
              value={bulkAction}
              onChange={(e) => onBulkActionChange(e.target.value)}
              disabled={bulkBusy}
            >
              <option value="">Kies actie…</option>
              <option value="product_manager">Productbeheerder toewijzen</option>
              <option value="brand">Merk koppelen</option>
              <option value="eu_compliance">EU Compliance</option>
            </select>
          </label>
        </div>
      ) : null}

      {pmDialogOpen && preview ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-pm-title"
          onClick={() => {
            if (!bulkBusy) {
              setBulkAction("")
              closePmDialog()
            }
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-wf-300 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="bulk-pm-title" className="text-sm font-bold text-wf-900">
              Productbeheerder toewijzen
            </h2>
            <p className="mt-1 text-[11px] text-wf-600">
              Controleer de selectie, kies één Productbeheerder die voor alle
              producten geldig is, en wijs pas toe na bevestiging.
            </p>

            <div className="mt-3 max-h-48 overflow-auto rounded border border-wf-200">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    {["Product", "Product Cloud ID", "Huidige Productbeheerder"].map(
                      (h) => (
                        <th
                          key={h}
                          className="border-b border-wf-300 bg-wf-50 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preview.products.map((row) => (
                    <tr key={row.product_id}>
                      <td className="border-b border-wf-100 px-2 py-1.5 font-medium text-wf-800">
                        {row.title || "—"}
                      </td>
                      <td className="border-b border-wf-100 px-2 py-1.5 font-mono text-[10px] text-wf-600">
                        {row.product_id}
                      </td>
                      <td className="border-b border-wf-100 px-2 py-1.5 text-wf-700">
                        {row.current_display}
                        <span className="ml-1 text-[10px] text-wf-500">
                          ({row.current_type})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!confirmRows ? (
              <>
                <label className="mt-4 block text-[11px] font-semibold text-wf-700">
                  Nieuwe Productbeheerder
                  <select
                    className="mt-1 h-9 w-full rounded border border-wf-400 bg-white px-2 text-xs"
                    value={candidateKeySel}
                    onChange={(e) => {
                      setCandidateKeySel(e.target.value)
                      setInvalidRows([])
                    }}
                    disabled={bulkBusy || candidates.length === 0}
                  >
                    {candidates.length === 0 ? (
                      <option value="none:">Geen gedeelde kandidaten</option>
                    ) : (
                      candidates.map((c) => (
                        <option key={candidateKey(c)} value={candidateKey(c)}>
                          {c.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <p className="mt-1 text-[10px] text-wf-500">
                  Alleen kandidaten die voor alle {preview.count} producten
                  geldig zijn (intersectie).
                </p>

                {invalidRows.length > 0 ? (
                  <div className="mt-3 rounded border border-amber-400 bg-amber-50 p-3">
                    <p className="text-[11px] font-semibold text-amber-900">
                      Niet geldig voor {invalidRows.length} product(en) — niets
                      gewijzigd
                    </p>
                    <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-[11px] text-amber-950">
                      {invalidRows.map((row) => (
                        <li key={row.product_id}>
                          <span className="font-medium">
                            {row.title || "Zonder titel"}
                          </span>{" "}
                          <span className="font-mono text-[10px] text-amber-800">
                            ({row.product_id})
                          </span>
                          : {row.error || "Ongeldige kandidaat"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={bulkBusy}
                    onClick={() => {
                      setBulkAction("")
                      closePmDialog()
                    }}
                  >
                    Annuleren
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={bulkBusy || candidates.length === 0}
                    onClick={() => void runControleren()}
                  >
                    {bulkBusy ? "Controleren…" : "Controleren"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-4 text-[12px] font-semibold text-wf-900">
                  Deze wijziging wordt toegepast op {confirmRows.length}{" "}
                  producten.
                </p>
                <div className="mt-2 max-h-56 overflow-auto rounded border border-wf-200">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        {[
                          "Product",
                          "Product ID",
                          "Huidige beheerder",
                          "Nieuwe beheerder",
                        ].map((h) => (
                          <th
                            key={h}
                            className="border-b border-wf-300 bg-wf-50 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {confirmRows.map((row) => (
                        <tr key={row.product_id}>
                          <td className="border-b border-wf-100 px-2 py-1.5 font-medium text-wf-800">
                            {row.title || "—"}
                          </td>
                          <td className="border-b border-wf-100 px-2 py-1.5 font-mono text-[10px] text-wf-600">
                            {row.product_id}
                          </td>
                          <td className="border-b border-wf-100 px-2 py-1.5 text-wf-700">
                            {row.current_display}
                          </td>
                          <td className="border-b border-wf-100 px-2 py-1.5 text-wf-900">
                            {row.new_display}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={bulkBusy}
                    onClick={() => {
                      setConfirmRows(null)
                      setConfirmChoice(null)
                    }}
                  >
                    Annuleren
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={bulkBusy}
                    onClick={() => void applyBulkAssign()}
                  >
                    {bulkBusy ? "Toewijzen…" : "Definitief toewijzen"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {brandDialogOpen && brandPreview ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!bulkBusy) {
              setBulkAction("")
              closeBrandDialog()
            }
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-wf-300 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-bold text-wf-900">Merk koppelen</h2>
            <div className="mt-3 max-h-40 overflow-auto rounded border border-wf-200">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    {["Product", "Product ID", "Huidig merk"].map((h) => (
                      <th
                        key={h}
                        className="border-b border-wf-300 bg-wf-50 px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-wf-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {brandPreview.products.map((row) => (
                    <tr key={row.product_id}>
                      <td className="border-b border-wf-100 px-2 py-1.5">
                        {row.title || "—"}
                      </td>
                      <td className="border-b border-wf-100 px-2 py-1.5 font-mono text-[10px]">
                        {row.product_id}
                      </td>
                      <td className="border-b border-wf-100 px-2 py-1.5">
                        {row.current_display}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!brandConfirm ? (
              <>
                <label className="mt-3 block text-[11px] font-semibold text-wf-700">
                  Nieuw merk
                  <select
                    className="mt-1 h-9 w-full rounded border border-wf-400 px-2 text-xs"
                    value={brandIdSel}
                    onChange={(e) => {
                      setBrandIdSel(e.target.value)
                      setInvalidRows([])
                    }}
                    disabled={bulkBusy}
                  >
                    {brandPreview.available_brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                {invalidRows.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-[11px] text-amber-900">
                    {invalidRows.map((r) => (
                      <li key={r.product_id}>
                        {r.title || r.product_id}: {r.error}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={bulkBusy}
                    onClick={() => {
                      setBulkAction("")
                      closeBrandDialog()
                    }}
                  >
                    Annuleren
                  </Button>
                  <Button
                    size="sm"
                    disabled={bulkBusy || !brandIdSel}
                    onClick={() => void runBrandControleren()}
                  >
                    Controleren
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-[12px] font-semibold">
                  Deze wijziging wordt toegepast op {brandConfirm.length}{" "}
                  producten.
                </p>
                <div className="mt-2 max-h-48 overflow-auto rounded border">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr>
                        {["Product", "Product ID", "Huidige waarde", "Nieuwe waarde"].map(
                          (h) => (
                            <th
                              key={h}
                              className="border-b px-2 py-1 text-left text-[10px] uppercase text-wf-500"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {brandConfirm.map((row) => (
                        <tr key={row.product_id}>
                          <td className="border-b px-2 py-1">{row.title || "—"}</td>
                          <td className="border-b px-2 py-1 font-mono text-[10px]">
                            {row.product_id}
                          </td>
                          <td className="border-b px-2 py-1">{row.current_display}</td>
                          <td className="border-b px-2 py-1">{row.new_display}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={bulkBusy}
                    onClick={() => setBrandConfirm(null)}
                  >
                    Annuleren
                  </Button>
                  <Button
                    size="sm"
                    disabled={bulkBusy}
                    onClick={() => void applyBrand()}
                  >
                    Definitief toepassen
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {euDialogOpen && euPreview ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!bulkBusy) {
              setBulkAction("")
              closeEuDialog()
            }
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-wf-300 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-bold text-wf-900">EU Compliance</h2>
            <p className="mt-1 text-[11px] text-wf-600">
              {euPreview.products.length} product(en) geselecteerd. Vul GPSR-velden
              in; lege velden worden overgeslagen.
            </p>
            {!euConfirm ? (
              <>
                <div className="mt-3 grid gap-2 tablet:grid-cols-2">
                  {euPreview.allowed_codes.slice(0, 6).map((c) => (
                    <label key={c.code} className="block text-[11px] text-wf-700">
                      {c.label}
                      <input
                        className="mt-1 h-8 w-full rounded border border-wf-400 px-2 text-xs"
                        value={euForm[c.code] || ""}
                        onChange={(e) =>
                          setEuForm((cur) => ({
                            ...cur,
                            [c.code]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
                {invalidRows.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-[11px] text-amber-900">
                    {invalidRows.map((r) => (
                      <li key={r.product_id}>
                        {r.title || r.product_id}: {r.error}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={bulkBusy}
                    onClick={() => {
                      setBulkAction("")
                      closeEuDialog()
                    }}
                  >
                    Annuleren
                  </Button>
                  <Button
                    size="sm"
                    disabled={bulkBusy}
                    onClick={() => void runEuControleren()}
                  >
                    Controleren
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-[12px] font-semibold">
                  Deze wijziging wordt toegepast op {euConfirm.length} producten.
                </p>
                <div className="mt-2 max-h-48 overflow-auto rounded border">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr>
                        {["Product", "Product ID", "Huidige waarde", "Nieuwe waarde"].map(
                          (h) => (
                            <th
                              key={h}
                              className="border-b px-2 py-1 text-left text-[10px] uppercase text-wf-500"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {euConfirm.map((row) => (
                        <tr key={row.product_id}>
                          <td className="border-b px-2 py-1">{row.title || "—"}</td>
                          <td className="border-b px-2 py-1 font-mono text-[10px]">
                            {row.product_id}
                          </td>
                          <td className="border-b px-2 py-1">{row.current_display}</td>
                          <td className="border-b px-2 py-1">{row.new_display}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={bulkBusy}
                    onClick={() => setEuConfirm(null)}
                  >
                    Annuleren
                  </Button>
                  <Button
                    size="sm"
                    disabled={bulkBusy}
                    onClick={() => void applyEu()}
                  >
                    Definitief toepassen
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {rows === "loading" ? (
        <p className="py-10 text-center text-sm text-wf-600">Laden…</p>
      ) : rows.length === 0 ? (
        <div className="py-14 text-center text-wf-600">
          <p className="mb-1.5 text-sm font-bold text-wf-800">Geen producten</p>
          <p className="text-xs">Geen resultaten voor deze filter.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border-b border-wf-400 px-3 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                      aria-label="Alles selecteren"
                    />
                  </th>
                  {[
                    "Product",
                    "Seller",
                    "SKU",
                    "EAN/GTIN",
                    "Categorie",
                    "Merk",
                    "Made in Europe",
                    "Approval",
                    "Compliance",
                    "Aangemaakt",
                    "Gewijzigd",
                    "",
                  ].map((h) => (
                    <th
                      key={h || "actie"}
                      className="border-b border-wf-400 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-wf-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-wf-100">
                    <td className="border-b border-wf-200 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`Selecteer ${row.title || row.id}`}
                      />
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 font-medium text-wf-800">
                      <div className="flex items-center gap-2.5">
                        {row.primary_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={displayMediaUrl(row.primary_image_url) || ""}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-wf-100 text-[10px] text-wf-400">
                            —
                          </div>
                        )}
                        <span>{row.title || row.id.slice(-10)}</span>
                      </div>
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {row.seller_id ? (
                        <Link
                          href={`/partners/${row.seller_id}`}
                          className="underline"
                        >
                          {row.seller_name || row.seller_id.slice(-10)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 font-mono text-[10px] text-wf-600">
                      {row.sku_hint || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 font-mono text-[10px] text-wf-600">
                      {row.identifier_value || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {(row.category_names || []).join(", ") || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {row.brand_name || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {row.made_in_europe_status || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5">
                      <Badge
                        variant={
                          row.publication_status === "In review"
                            ? "solid"
                            : "outline"
                        }
                      >
                        {row.publication_status || "—"}
                      </Badge>
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {row.completeness?.compliance_review_status || "—"}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5 text-wf-700">
                      {formatDate(row.updated_at)}
                    </td>
                    <td className="border-b border-wf-200 px-3 py-2.5">
                      <Link
                        href={`/product-cloud/products/${row.id}`}
                        className="text-[11px] text-wf-800 underline"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 px-3 py-3.5 text-[11px] text-wf-600 tablet:flex-row tablet:flex-wrap tablet:items-center tablet:justify-between">
            <p>
              {count === 0
                ? "0 van 0 producten"
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, count)} van ${count} producten`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={page <= 1 ? "disabled" : "secondary"}
                disabled={page <= 1 || rows === "loading"}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Vorige
              </Button>
              <span className="px-1 font-semibold text-wf-800">
                Pagina {page} van {Math.max(1, Math.ceil(count / PAGE_SIZE))}
              </span>
              <Button
                type="button"
                size="sm"
                variant={
                  page >= Math.max(1, Math.ceil(count / PAGE_SIZE))
                    ? "disabled"
                    : "secondary"
                }
                disabled={
                  page >= Math.max(1, Math.ceil(count / PAGE_SIZE)) ||
                  rows === "loading"
                }
                onClick={() =>
                  setPage((p) =>
                    Math.min(Math.max(1, Math.ceil(count / PAGE_SIZE)), p + 1)
                  )
                }
              >
                Volgende
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
