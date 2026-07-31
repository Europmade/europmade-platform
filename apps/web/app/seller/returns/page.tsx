"use client"

import { useEffect, useState } from "react"
import { Badge, Button, Input, Notice } from "@europmade/ui"
import { SellerGate } from "../_components/seller-gate"
import {
  OrderServiceApiError,
  listSellerReturns,
  sellerReturnAction,
  type ReturnView,
} from "../../_lib/order-service-api"

type ListedReturn = ReturnView & {
  order_id: string
  order_number: string
  customer_id: string
  offer_id: string
}

export default function SellerReturnsPage() {
  const [returns, setReturns] = useState<ListedReturn[] | "loading" | "error">(
    "loading"
  )
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({})

  function load() {
    listSellerReturns()
      .then((res) => setReturns(res.returns))
      .catch((err: unknown) => {
        setReturns("error")
        setError(
          err instanceof OrderServiceApiError
            ? err.message
            : "Retouren laden mislukt."
        )
      })
  }

  useEffect(() => {
    load()
  }, [])

  async function act(
    id: string,
    action: "confirm" | "receive" | "approve" | "reject"
  ) {
    setBusyId(id)
    setError(null)
    try {
      await sellerReturnAction(
        id,
        action,
        action === "reject" ? rejectReasons[id] : undefined
      )
      load()
    } catch (err: unknown) {
      setError(
        err instanceof OrderServiceApiError
          ? err.message
          : "Actie mislukt."
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <SellerGate
      breadcrumb={[
        { label: "Seller Dashboard", href: "/seller" },
        { label: "Retouren" },
      ]}
    >
      <h1 className="text-[19px] font-bold text-wf-900">Retouren</h1>
      <p className="mt-1.5 text-xs text-wf-600">
        Beoordeel retouren: bevestigen → ontvangen → goedkeuren (refund) of
        afwijzen.
      </p>

      {error ? (
        <Notice variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      {returns === "loading" ? (
        <p className="mt-6 text-xs text-wf-600">Laden…</p>
      ) : returns === "error" || returns.length === 0 ? (
        <p className="mt-6 text-xs text-wf-600">Geen retouren.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {returns.map((ret) => (
            <li
              key={ret.id}
              className="rounded-md border border-wf-300 p-4 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-wf-900">
                    Order #{ret.order_number}
                  </div>
                  <div className="mt-1 text-wf-600">{ret.reason}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{ret.status}</Badge>
                    {ret.refund_status ? (
                      <span className="text-wf-600">
                        Refund: {ret.refund_status}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ret.status === "Aangevraagd" ? (
                    <Button
                      type="button"
                      disabled={busyId === ret.id}
                      onClick={() => act(ret.id, "confirm")}
                    >
                      Bevestigen
                    </Button>
                  ) : null}
                  {ret.status === "Bevestigd" ? (
                    <Button
                      type="button"
                      disabled={busyId === ret.id}
                      onClick={() => act(ret.id, "receive")}
                    >
                      Ontvangst bevestigen
                    </Button>
                  ) : null}
                  {ret.status === "Ontvangen" ? (
                    <Button
                      type="button"
                      disabled={busyId === ret.id}
                      onClick={() => act(ret.id, "approve")}
                    >
                      Goedkeuren + refund
                    </Button>
                  ) : null}
                </div>
              </div>

              {["Aangevraagd", "Bevestigd", "Ontvangen"].includes(ret.status) ? (
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-wf-200 pt-3">
                  <div className="min-w-[220px] flex-1">
                    <Input
                      label="Afwijsreden"
                      value={rejectReasons[ret.id] ?? ""}
                      onChange={(e) =>
                        setRejectReasons((prev) => ({
                          ...prev,
                          [ret.id]: e.target.value,
                        }))
                      }
                      placeholder="Min. 3 tekens"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      busyId === ret.id ||
                      (rejectReasons[ret.id] ?? "").trim().length < 3
                    }
                    onClick={() => act(ret.id, "reject")}
                  >
                    Afwijzen
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SellerGate>
  )
}
