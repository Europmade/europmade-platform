import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { buildTrackingUrl } from "@europmade/utils"
import { ORDER_MODULE } from "../../../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../../../product-cloud/resolve-seller"
import {
  enrichOrderBundle,
  type ShipmentStatus,
} from "../../../../order-enrichment"

type RouteParams = { id: string }

/**
 * Seller fulfilment upsert — UI + external ERP/OMS sync.
 *
 * PUT|POST /store/order-service/seller/orders/:id/shipment
 * Auth: customer bearer (approved seller).
 *
 * Body (all optional; omitted fields keep previous values):
 * {
 *   carrier?,
 *   tracking_code? | tracking_number?,
 *   tracking_url?,
 *   status?: pending|shipped|in_transit|out_for_delivery|delivered|exception,
 *   shipped_at?,
 *   delivered_at?,
 *   expected_delivery_at?
 * }
 *
 * Idempotent: upserts the primary shipment row (no duplicates on repeat).
 * Status side-effects:
 *   shipped|in_transit|out_for_delivery → sets shipped_at if missing
 *   delivered → sets delivered_at (now if missing) and shipping_status=delivered
 */
const ALLOWED_STATUS: ShipmentStatus[] = [
  "pending",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "exception",
]

type ShipmentBody = {
  carrier?: string | null
  tracking_code?: string | null
  /** Alias for tracking_code (ERP-friendly). */
  tracking_number?: string | null
  tracking_url?: string | null
  status?: string | null
  expected_delivery_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
}

function parseDate(
  value: string | null | undefined
): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Ongeldige datum: ${value}`
    )
  }
  return d
}

async function upsertPrimaryShipment(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const { id } = req.params as RouteParams
  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService

  const order = await orders.retrieveEmOrder(id)
  if (order.seller_id !== seller.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Deze order hoort bij een andere seller."
    )
  }

  const body = (req.body ?? {}) as ShipmentBody
  if (body.status && !ALLOWED_STATUS.includes(body.status as ShipmentStatus)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `status moet een van: ${ALLOWED_STATUS.join(", ")}.`
    )
  }

  const existing = await orders.listShipments({ order_id: id })
  const primary = existing[0] ?? null

  const carrier =
    body.carrier !== undefined
      ? body.carrier?.trim() || null
      : (primary?.carrier ?? null)

  const trackingInput =
    body.tracking_code !== undefined
      ? body.tracking_code
      : body.tracking_number !== undefined
        ? body.tracking_number
        : undefined
  const tracking_code =
    trackingInput !== undefined
      ? trackingInput?.trim() || null
      : (primary?.tracking_code ?? null)

  const rawUrl =
    body.tracking_url !== undefined
      ? body.tracking_url?.trim() || null
      : (primary?.tracking_url ?? null)
  const tracking_url = buildTrackingUrl(carrier, tracking_code, rawUrl)

  let status: ShipmentStatus | null =
    body.status !== undefined
      ? ((body.status as ShipmentStatus) ?? null)
      : ((primary?.status as ShipmentStatus | null) ?? null)

  let delivered_at = parseDate(
    body.delivered_at !== undefined
      ? body.delivered_at
      : primary?.delivered_at
        ? new Date(primary.delivered_at).toISOString()
        : undefined
  )
  if (delivered_at === undefined) {
    delivered_at = primary?.delivered_at
      ? new Date(primary.delivered_at)
      : null
  }

  let shipped_at = parseDate(
    body.shipped_at !== undefined
      ? body.shipped_at
      : (primary as { shipped_at?: Date | string | null } | null)?.shipped_at
        ? new Date(
            (primary as { shipped_at: Date | string }).shipped_at
          ).toISOString()
        : undefined
  )
  if (shipped_at === undefined) {
    shipped_at = (primary as { shipped_at?: Date | null } | null)?.shipped_at
      ? new Date((primary as { shipped_at: Date }).shipped_at)
      : null
  }

  if (status === "delivered" || delivered_at) {
    status = "delivered"
    if (!delivered_at) {
      delivered_at = new Date()
    }
    if (!shipped_at) {
      shipped_at = delivered_at
    }
  } else if (
    status === "shipped" ||
    status === "in_transit" ||
    status === "out_for_delivery"
  ) {
    if (!shipped_at) {
      shipped_at = new Date()
    }
  } else if (!status && tracking_code) {
    status = "shipped"
    if (!shipped_at) shipped_at = new Date()
  } else if (!status) {
    status = "pending"
  }

  let expected_delivery_at: Date | null = null
  if (body.expected_delivery_at !== undefined) {
    expected_delivery_at = body.expected_delivery_at
      ? new Date(body.expected_delivery_at)
      : null
  } else if (primary?.expected_delivery_at) {
    expected_delivery_at = new Date(primary.expected_delivery_at)
  }

  const payload = {
    carrier,
    tracking_code,
    tracking_url,
    status,
    expected_delivery_at,
    shipped_at,
    delivered_at,
  }

  if (primary) {
    await orders.updateShipments({
      id: primary.id,
      ...payload,
    })
  } else {
    await orders.createShipments({
      order_id: id,
      ...payload,
    })
  }

  // Future: emit OrderShipmentUpdated event for outbound webhooks (ADR-0018).
  try {
    const { Modules } = await import("@medusajs/framework/utils")
    const eventBus = req.scope.resolve(Modules.EVENT_BUS) as {
      emit: (e: { name: string; data: Record<string, unknown> }) => Promise<unknown>
    }
    await eventBus.emit({
      name: "OrderShipmentUpdated",
      data: {
        order_id: id,
        seller_id: seller.id,
        status,
        carrier,
        tracking_code,
        tracking_url,
        shipped_at: shipped_at?.toISOString() ?? null,
        delivered_at: delivered_at?.toISOString() ?? null,
      },
    })
  } catch {
    // Event bus optional in local/dev
  }

  const bundle = await enrichOrderBundle(req.scope, orders, id)
  res.json(bundle)
}

/** PUT upsert primary shipment (idempotent). */
export async function PUT(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  return upsertPrimaryShipment(req, res)
}

/** POST upsert primary shipment (alias for ERP clients). */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  return upsertPrimaryShipment(req, res)
}
