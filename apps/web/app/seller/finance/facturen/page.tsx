"use client"

import { useState } from "react"
import { Badge, Button, FileUpload, Notice } from "@europmade/ui"
import { SellerGate } from "../../_components/seller-gate"
import { EmptyState } from "../../_components/empty-state"
import { formatEuro } from "../../../_components/storefront-shell"
import { DEMO_ORDERS } from "../../_lib/demo-data"
import { useDemoSellerInvoices } from "../../_lib/demo-store"

/**
 * Facturen — verkoper uploadt/koppelt eigen klantfacturen (EuropMade genereert ze niet).
 */
export default function SellerFinanceFacturenPage() {
  const [invoices, setInvoices] = useDemoSellerInvoices()
  const [orderNumber, setOrderNumber] = useState(
    DEMO_ORDERS[0]?.order_number ?? ""
  )
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState<string | null>(null)

  function uploadInvoice() {
    if (!file || !orderNumber) {
      setNote("Kies een order en upload een factuurbestand.")
      return
    }
    const order = DEMO_ORDERS.find((o) => o.order_number === orderNumber)
    setInvoices((prev) => [
      {
        id: `sinv_${Date.now()}`,
        order_number: orderNumber,
        file_name: file.name,
        uploaded_at: new Date().toISOString(),
        amount: order?.total ?? 0,
        status: "Gekoppeld",
      },
      ...prev,
    ])
    setFile(null)
    setNote("Factuur gekoppeld aan order. EuropMade genereert geen klantfacturen.")
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Financiën", href: "/seller/finance" },
        { label: "Facturen" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Facturen</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Jij bent juridisch de verkoper. Upload of koppel jouw eigen
        klantfacturen — EuropMade genereert deze niet.
      </p>

      {note ? (
        <Notice variant="info" className="mt-4">
          {note}
        </Notice>
      ) : null}

      <section className="mt-5 rounded-lg border border-wf-300 bg-white px-5 py-4">
        <h2 className="mb-3 text-[12px] uppercase tracking-[0.04em] text-wf-500">
          Factuur uploaden / koppelen
        </h2>
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-wf-500">
              Order
            </label>
            <select
              className="h-9 w-full rounded-[5px] border border-wf-400 bg-white px-3 text-xs"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            >
              {DEMO_ORDERS.map((o) => (
                <option key={o.id} value={o.order_number}>
                  {o.order_number} — {o.customer_name}
                </option>
              ))}
            </select>
          </div>
          <FileUpload
            label="Factuurbestand"
            requirementLabel="PDF, max. 10 MB"
            accept="application/pdf,.pdf"
            value={file}
            onChange={setFile}
          />
        </div>
        <div className="mt-4">
          <Button type="button" onClick={uploadInvoice}>
            Koppelen
          </Button>
        </div>
      </section>

      {invoices.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Geen facturen"
            description="Upload jouw eigen klantfacturen en koppel ze aan orders."
          />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-lg border border-wf-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {["Order", "Bestand", "Bedrag", "Geüpload", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="border-b border-wf-400 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-wf-500"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-wf-200 last:border-b-0"
                >
                  <td className="px-4 py-2.5">{inv.order_number}</td>
                  <td className="px-4 py-2.5">{inv.file_name}</td>
                  <td className="px-4 py-2.5">{formatEuro(inv.amount)}</td>
                  <td className="px-4 py-2.5">
                    {new Date(inv.uploaded_at).toLocaleDateString("nl-NL")}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">{inv.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SellerGate>
  )
}
