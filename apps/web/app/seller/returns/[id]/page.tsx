"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { useDemoReturns } from "../../_lib/demo-store"

export default function SellerReturnDetailPage() {
  const params = useParams<{ id: string }>()
  const [returns, setReturns] = useDemoReturns()
  const ret = useMemo(
    () => returns.find((r) => r.id === params.id),
    [returns, params.id]
  )
  const [note, setNote] = useState<string | null>(null)
  const [infoRequest, setInfoRequest] = useState("")

  if (!ret) {
    return (
      <SellerGate
        breadcrumb={[
          { label: "Seller Dashboard", href: "/seller" },
          { label: "Retouren", href: "/seller/returns" },
          { label: "Onbekend" },
        ]}
      >
        <EmptyState
          title="Retour niet gevonden"
          description="Deze retour bestaat niet."
          primaryAction={{ label: "Terug", href: "/seller/returns" }}
        />
      </SellerGate>
    )
  }

  function setStatus(status: string, message: string) {
    setReturns((prev) =>
      prev.map((r) => (r.id === ret!.id ? { ...r, status } : r))
    )
    setNote(message)
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Retouren", href: "/seller/returns" },
        { label: ret.return_number },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">
            {ret.return_number}
          </h1>
          <p className="mt-1.5 text-xs text-wf-600">
            Order #{ret.order_number} · {ret.customer_name}
          </p>
        </div>
        <Badge variant="outline">{ret.status}</Badge>
      </div>

      {note ? (
        <Notice variant="info" className="mb-4">
          {note}
        </Notice>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-4 tablet:grid-cols-2">
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4 text-xs">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Retour
          </h2>
          <dl className="grid gap-2">
            <div className="flex justify-between">
              <dt className="text-wf-500">Retournummer</dt>
              <dd>{ret.return_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">Ordernummer</dt>
              <dd>
                <Link
                  href={`/seller/orders/${ret.order_id}`}
                  className="underline"
                >
                  {ret.order_number}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">Klant</dt>
              <dd>{ret.customer_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">E-mail</dt>
              <dd>{ret.customer_email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">Bedrag</dt>
              <dd>{formatEuro(ret.amount)}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4 text-xs">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Reden &amp; opmerkingen
          </h2>
          <p className="font-semibold text-wf-800">{ret.reason}</p>
          <p className="mt-2 text-wf-700">{ret.comments}</p>
          <div className="mt-4">
            <p className="mb-1 text-wf-500">Foto&apos;s</p>
            <ul className="space-y-1">
              {ret.photo_labels.map((photo) => (
                <li key={photo} className="underline">
                  {photo}
                </li>
              ))}
            </ul>
          </div>
          {ret.message_id ? (
            <p className="mt-4">
              <Link
                href={`/seller/messages/${ret.message_id}`}
                className="font-semibold underline"
              >
                Gekoppeld bericht openen
              </Link>
            </p>
          ) : null}
        </section>
      </div>

      <section className="mb-5 overflow-hidden rounded-lg border border-wf-300 bg-white">
        <h2 className="border-b border-wf-300 px-5 py-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Producten
        </h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {["Product", "SKU", "Aantal", "Prijs"].map((h) => (
                <th
                  key={h}
                  className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ret.products.map((p) => (
              <tr key={p.sku} className="border-b border-wf-200 last:border-b-0">
                <td className="px-4 py-2.5">{p.product_name}</td>
                <td className="px-4 py-2.5">{p.sku}</td>
                <td className="px-4 py-2.5">{p.quantity}</td>
                <td className="px-4 py-2.5">{formatEuro(p.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
        <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Acties
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => setStatus("Geaccepteerd", "Retour geaccepteerd.")}
          >
            Accepteren
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStatus("Afgewezen", "Retour afgewezen.")}
          >
            Afwijzen
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setStatus("In behandeling", "Status gewijzigd naar In behandeling.")
            }
          >
            Status: In behandeling
          </Button>
        </div>
        <div className="mt-4 max-w-xl">
          <Input
            label="Aanvullende informatie vragen"
            value={infoRequest}
            onChange={(e) => setInfoRequest(e.target.value)}
            placeholder="Vraag aan de klant…"
          />
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!infoRequest.trim()}
              onClick={() => {
                setStatus(
                  "Informatie gevraagd",
                  `Informatieverzoek verstuurd: “${infoRequest.trim()}”`
                )
                setInfoRequest("")
              }}
            >
              Verstuur verzoek
            </Button>
          </div>
        </div>
      </section>
    </SellerGate>
  )
}
