"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import {
  OrderAdminApiError,
  getAdminOrder,
  listAdminOrderMessages,
  resolveOrderException,
  shippingStatusLabel,
  type AdminOrderDetail,
} from "../../../../lib/order-admin-api"

function formatEuro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Niet beschikbaar"
  return new Date(iso).toLocaleString("nl-NL")
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="mt-6 rounded-lg border border-wf-300 bg-white">
      <h2 className="border-b border-wf-200 px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.04em] text-wf-700">
        {title}
      </h2>
      <div className="px-4 py-3 text-xs text-wf-800">{children}</div>
    </section>
  )
}

export default function OrderManagementDetailPage() {
  const params = useParams<{ id: string }>()
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null)
  const [messages, setMessages] = useState<
    Awaited<ReturnType<typeof listAdminOrderMessages>>["messages"] | null
  >(null)
  const [msgError, setMsgError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAdminOrder(params.id)
      .then((res) => {
        if (!cancelled) setDetail(res)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof OrderAdminApiError
            ? err.message
            : "Order laden mislukt."
        )
      })
    return () => {
      cancelled = true
    }
  }, [params.id])

  useEffect(() => {
    if (!detail) return
    const escalated = detail.returns.some((r) => r.status === "Geëscaleerd")
    if (!escalated) {
      setMessages(null)
      return
    }
    listAdminOrderMessages(params.id)
      .then((res) => setMessages(res.messages))
      .catch((err: unknown) => {
        setMsgError(
          err instanceof OrderAdminApiError
            ? err.message
            : "Berichten laden mislukt."
        )
      })
  }, [detail, params.id])

  async function onResolve() {
    setBusy(true)
    setError(null)
    try {
      await resolveOrderException(params.id, reason)
      setReason("")
      setDetail(await getAdminOrder(params.id))
    } catch (err: unknown) {
      setError(
        err instanceof OrderAdminApiError
          ? err.message
          : "Afhandelen mislukt."
      )
    } finally {
      setBusy(false)
    }
  }

  if (!detail && !error) {
    return <p className="text-xs text-wf-600">Laden…</p>
  }

  const o = detail?.order
  const shipment = detail?.shipments?.[0]

  return (
    <div>
      <Link href="/orders" className="text-xs font-semibold underline">
        ← Terug naar overzicht
      </Link>
      <h1 className="mt-3 text-[19px] font-bold text-wf-900">
        Order {o?.order_number ?? params.id}
      </h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Admin orderdetail — zelfde enrichment als Seller Order detail
        (platform scope, read-only behalve uitzonderingen).
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {detail && o ? (
        <>
          <Section title="Orderoverzicht">
            <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
              <div>
                <div className="text-wf-500">Ordernummer</div>
                <div className="mt-0.5 font-semibold">{o.order_number}</div>
              </div>
              <div>
                <div className="text-wf-500">Datum</div>
                <div className="mt-0.5">{formatDate(o.created_at)}</div>
              </div>
              <div>
                <div className="text-wf-500">Betaling</div>
                <div className="mt-0.5">
                  <Badge variant="outline">{o.payment_status}</Badge>
                </div>
              </div>
              <div>
                <div className="text-wf-500">Totaal</div>
                <div className="mt-0.5 font-semibold">
                  {formatEuro(detail.totals?.total ?? 0)}
                </div>
              </div>
            </div>
            {o.exception_status ? (
              <p className="mt-3">
                Uitzondering: <Badge variant="solid">{o.exception_status}</Badge>
              </p>
            ) : null}
          </Section>

          <Section title="Klant">
            <div className="grid gap-3 tablet:grid-cols-2">
              <div>
                <div className="text-wf-500">Naam</div>
                <div className="mt-0.5">{o.customer_name || "Niet beschikbaar"}</div>
                <div className="mt-2 text-wf-500">E-mail</div>
                <div className="mt-0.5">{o.customer_email || "Niet beschikbaar"}</div>
                <div className="mt-2 text-wf-500">Klant-ID</div>
                <div className="mt-0.5 font-mono text-[11px]">{o.customer_id}</div>
              </div>
              <div>
                <div className="font-semibold">Afleveradres</div>
                <p className="mt-1 whitespace-pre-wrap text-wf-700">
                  {o.shipping_address || "Niet beschikbaar"}
                </p>
                <div className="mt-3 font-semibold">Factuuradres</div>
                <p className="mt-1 whitespace-pre-wrap text-wf-700">
                  {o.billing_address || "Niet beschikbaar"}
                </p>
              </div>
            </div>
          </Section>

          <Section title="Seller">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <div className="text-wf-500">Bedrijfsnaam</div>
                <div className="mt-0.5 font-semibold">{detail.seller.name}</div>
              </div>
              <div>
                <div className="text-wf-500">Seller ID</div>
                <div className="mt-0.5 font-mono text-[11px]">{detail.seller.id}</div>
              </div>
              <div>
                <div className="text-wf-500">Status</div>
                <div className="mt-0.5">
                  {detail.seller.onboarding_status || "—"}
                </div>
              </div>
              <Link
                href={`/partners/${detail.seller.id}`}
                className="ml-auto font-semibold underline"
              >
                Open Seller Review Center →
              </Link>
            </div>
          </Section>

          <Section title="Producten / orderregels">
            <ul className="divide-y divide-wf-200">
              {detail.lines.map((line) => (
                <li key={line.id} className="flex flex-wrap gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    {line.product_id ? (
                      <Link
                        href={`/product-cloud/products/${line.product_id}`}
                        className="font-semibold underline"
                      >
                        {line.product_name}
                      </Link>
                    ) : (
                      <div className="font-semibold">{line.product_name}</div>
                    )}
                    {line.variant_name ? (
                      <div className="mt-0.5 text-wf-500">{line.variant_name}</div>
                    ) : null}
                    <div className="mt-0.5 text-wf-500">
                      SKU/EAN: {line.sku || "Niet beschikbaar"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>
                      {line.quantity} × {formatEuro(line.unit_price)}
                    </div>
                    <div className="font-semibold">
                      {formatEuro(line.line_total)}
                    </div>
                    {line.vat_amount != null ? (
                      <div className="text-wf-500">
                        BTW {formatEuro(line.vat_amount)}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Verzending">
            {shipment || o.tracking_code || o.shipping_status ? (
              <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
                <div>
                  <div className="text-wf-500">Status</div>
                  <div className="mt-0.5">
                    {shippingStatusLabel(
                      shipment?.status ?? o.shipping_status
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-wf-500">Vervoerder</div>
                  <div className="mt-0.5">
                    {shipment?.carrier ?? o.carrier ?? "Niet beschikbaar"}
                  </div>
                </div>
                <div>
                  <div className="text-wf-500">Tracking</div>
                  <div className="mt-0.5">
                    {shipment?.tracking_code ||
                    o.tracking_code ? (
                      shipment?.tracking_url || o.tracking_url ? (
                        <a
                          href={
                            (shipment?.tracking_url || o.tracking_url) as string
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          {shipment?.tracking_code || o.tracking_code}
                        </a>
                      ) : (
                        shipment?.tracking_code || o.tracking_code
                      )
                    ) : (
                      "Niet beschikbaar"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-wf-500">Verzenddatum</div>
                  <div className="mt-0.5">
                    {formatDate(shipment?.shipped_at ?? o.shipped_at)}
                  </div>
                </div>
                <div>
                  <div className="text-wf-500">Afleverdatum</div>
                  <div className="mt-0.5">
                    {formatDate(shipment?.delivered_at ?? o.delivered_at)}
                  </div>
                </div>
                <div>
                  <div className="text-wf-500">Verwachte levering</div>
                  <div className="mt-0.5">
                    {formatDate(shipment?.expected_delivery_at)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-wf-600">Niet beschikbaar</p>
            )}
          </Section>

          <Section title="Financieel">
            {detail.finance ? (
              <div className="space-y-3">
                <div>
                  Orderwaarde:{" "}
                  <strong>{formatEuro(detail.totals?.total ?? 0)}</strong>
                </div>
                {detail.finance.commissions.length === 0 ? (
                  <p className="text-wf-600">Geen commissies gekoppeld.</p>
                ) : (
                  detail.finance.commissions.map((c) => (
                    <div key={c.id}>
                      Commissie {c.recipient_type}: {formatEuro(c.amount)} (
                      {c.percentage}%) — {c.status}
                    </div>
                  ))
                )}
                {detail.finance.payouts.length === 0 ? (
                  <p className="text-wf-600">Geen payouts gekoppeld.</p>
                ) : (
                  detail.finance.payouts.map((p) => (
                    <div key={p.id}>
                      Payout {p.recipient_type}: {formatEuro(p.amount)} —{" "}
                      {p.status}
                    </div>
                  ))
                )}
                <Link href="/finance" className="inline-block underline">
                  Naar Finance →
                </Link>
              </div>
            ) : (
              <p className="text-wf-600">
                Financiële gegevens niet beschikbaar via Finance-module.
              </p>
            )}
          </Section>

          <Section title="Retour">
            {detail.returns.length === 0 ? (
              <p className="text-wf-600">Geen retour geregistreerd.</p>
            ) : (
              <ul className="divide-y divide-wf-200">
                {detail.returns.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <div className="font-semibold">{r.status}</div>
                      <div className="text-wf-500">
                        {r.product_name || r.id}
                        {r.reason ? ` · ${r.reason}` : ""}
                      </div>
                      {r.refund_status ? (
                        <div className="text-wf-500">
                          Refund: {r.refund_status}
                        </div>
                      ) : null}
                    </div>
                    <Link
                      href={`/returns/${r.id}`}
                      className="font-semibold underline"
                    >
                      Bekijken
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Tijdlijn">
            <ol className="space-y-2">
              <li>Order geplaatst — {formatDate(o.created_at)}</li>
              {o.payment_status === "Betaald" ? (
                <li>Betaald</li>
              ) : (
                <li>Betaling: {o.payment_status}</li>
              )}
              {(shipment?.shipped_at || o.shipped_at) && (
                <li>
                  Verzonden — {formatDate(shipment?.shipped_at ?? o.shipped_at)}
                </li>
              )}
              {(shipment?.delivered_at || o.delivered_at) && (
                <li>
                  Afgeleverd —{" "}
                  {formatDate(shipment?.delivered_at ?? o.delivered_at)}
                </li>
              )}
              {detail.returns.map((r) => (
                <li key={`tl-${r.id}`}>
                  Retour {r.status}
                  {r.created_at ? ` — ${formatDate(r.created_at)}` : ""}
                </li>
              ))}
              {detail.returns.some((r) =>
                ["processed", "forced"].includes(String(r.refund_status))
              ) ? (
                <li>Terugbetaald</li>
              ) : null}
            </ol>
          </Section>

          {o.exception_status === "Mislukte ordersplitsing" ? (
            <div className="mt-6 max-w-lg rounded-md border border-wf-400 p-4">
              <h2 className="text-sm font-bold">Uitzondering afhandelen</h2>
              <p className="mt-1 text-xs text-wf-600">
                Enige write-scope in OMC (bestaande workflow).
              </p>
              <div className="mt-3">
                <Input
                  label="Reden"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button
                type="button"
                disabled={busy || reason.trim().length < 3}
                onClick={onResolve}
              >
                Markeer als Afgehandeld
              </Button>
            </div>
          ) : null}

          {msgError ? (
            <Notice variant="warning" className="mt-4">
              {msgError}
            </Notice>
          ) : null}

          {messages ? (
            <Section title="Meegelezen berichten (geëscaleerd)">
              <ul className="space-y-2">
                {messages.length === 0 ? (
                  <li className="text-wf-600">Geen berichten.</li>
                ) : (
                  messages.map((m) => (
                    <li
                      key={m.id}
                      className="rounded border border-wf-200 bg-wf-50 px-2 py-1.5"
                    >
                      <div className="text-wf-500">
                        {m.sender_customer_id.slice(0, 12)}… ·{" "}
                        {formatDate(m.created_at)}
                      </div>
                      <div className="mt-0.5 whitespace-pre-wrap">{m.body}</div>
                    </li>
                  ))
                )}
              </ul>
            </Section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
