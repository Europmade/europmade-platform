"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { getOrderDetail } from "../../_lib/demo-data-details"

export default function SellerOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const order = useMemo(() => getOrderDetail(params.id), [params.id])
  const [note, setNote] = useState<string | null>(null)

  if (!order) {
    return (
      <SellerGate
        breadcrumb={[
          { label: "Seller Dashboard", href: "/seller" },
          { label: "Orders", href: "/seller/orders" },
          { label: "Onbekend" },
        ]}
      >
        <EmptyState
          title="Order niet gevonden"
          description="Deze order bestaat niet of is niet meer beschikbaar."
          primaryAction={{ label: "Terug naar orders", href: "/seller/orders" }}
        />
      </SellerGate>
    )
  }

  function download(label: string) {
    setNote(`${label} gedownload (demo).`)
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Orders", href: "/seller/orders" },
        { label: order.order_number },
      ]}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-wf-900">
            Order #{order.order_number}
          </h1>
          <p className="mt-1.5 text-xs text-wf-600">
            {new Date(order.created_at).toLocaleString("nl-NL")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => download("Factuur")}>
            Download factuur
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => download("Pakbon")}
          >
            Download pakbon
          </Button>
        </div>
      </div>

      {note ? (
        <Notice variant="info" className="mb-4">
          {note}
        </Notice>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-4 tablet:grid-cols-2">
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Order
          </h2>
          <dl className="grid gap-2 text-xs text-wf-800">
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">Ordernummer</dt>
              <dd>{order.order_number}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">Orderdatum</dt>
              <dd>{new Date(order.created_at).toLocaleDateString("nl-NL")}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">Status</dt>
              <dd>
                <Badge variant="outline">{order.status}</Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">Betaalstatus</dt>
              <dd>
                <Badge variant="outline">{order.payment_status}</Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-wf-500">Verzendstatus</dt>
              <dd>
                <Badge variant="outline">{order.shipping_status}</Badge>
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Klant
          </h2>
          <dl className="grid gap-2 text-xs text-wf-800">
            <div>
              <dt className="text-[10.5px] uppercase text-wf-500">Naam</dt>
              <dd>{order.customer.name}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] uppercase text-wf-500">E-mailadres</dt>
              <dd>{order.customer.email}</dd>
            </div>
            <div>
              <dt className="text-[10.5px] uppercase text-wf-500">Telefoonnummer</dt>
              <dd>{order.customer.phone}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 tablet:grid-cols-2">
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Factuuradres
          </h2>
          <p className="whitespace-pre-line text-xs text-wf-800">
            {order.billing_address}
          </p>
        </section>
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Verzendadres
          </h2>
          <p className="whitespace-pre-line text-xs text-wf-800">
            {order.shipping_address}
          </p>
        </section>
      </div>

      <section className="mb-5 overflow-hidden rounded-lg border border-wf-300 bg-white">
        <h2 className="border-b border-wf-300 px-5 py-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Producten
        </h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {["", "Product", "SKU", "Aantal", "Prijs", "Totaal"].map((h) => (
                <th
                  key={h || "img"}
                  className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.sku} className="border-b border-wf-200 last:border-b-0">
                <td className="px-4 py-2.5">
                  <span
                    className="inline-block h-10 w-10 rounded-sm"
                    style={{ backgroundColor: line.image_color }}
                    aria-hidden
                  />
                </td>
                <td className="px-4 py-2.5 text-wf-800">{line.product_name}</td>
                <td className="px-4 py-2.5 text-wf-600">{line.sku}</td>
                <td className="px-4 py-2.5">{line.quantity}</td>
                <td className="px-4 py-2.5">{formatEuro(line.unit_price)}</td>
                <td className="px-4 py-2.5">
                  {formatEuro(line.unit_price * line.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mb-5 grid grid-cols-1 gap-4 tablet:grid-cols-2">
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Financieel
          </h2>
          <dl className="grid gap-2 text-xs text-wf-800">
            <div className="flex justify-between">
              <dt>Subtotaal</dt>
              <dd>{formatEuro(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Verzendkosten</dt>
              <dd>{formatEuro(order.shipping_cost)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>BTW</dt>
              <dd>{formatEuro(order.vat)}</dd>
            </div>
            <div className="flex justify-between border-t border-wf-200 pt-2 font-semibold">
              <dt>Totaalbedrag</dt>
              <dd>{formatEuro(order.total)}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg border border-wf-300 bg-white px-5 py-4">
          <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
            Verzending
          </h2>
          <dl className="grid gap-2 text-xs text-wf-800">
            <div className="flex justify-between">
              <dt className="text-wf-500">Vervoerder</dt>
              <dd>{order.carrier}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-wf-500">Track &amp; trace</dt>
              <dd>{order.tracking_code ?? "Nog niet beschikbaar"}</dd>
            </div>
          </dl>
          <div className="mt-4 space-y-2 text-xs">
            <div>
              <span className="text-wf-500">Berichten: </span>
              {order.message_ids.length === 0 ? (
                "geen"
              ) : (
                order.message_ids.map((id) => (
                  <Link
                    key={id}
                    href={`/seller/messages/${id}`}
                    className="mr-2 font-semibold underline"
                  >
                    {id}
                  </Link>
                ))
              )}
            </div>
            <div>
              <span className="text-wf-500">Retouren: </span>
              {order.return_ids.length === 0 ? (
                "geen"
              ) : (
                order.return_ids.map((id) => (
                  <Link
                    key={id}
                    href={`/seller/returns/${id}`}
                    className="mr-2 font-semibold underline"
                  >
                    {id}
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </SellerGate>
  )
}
