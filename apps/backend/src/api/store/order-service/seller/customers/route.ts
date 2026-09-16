import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import { ORDER_MODULE } from "../../../../../modules/order-service"
import type OrderServiceModuleService from "../../../../../modules/order-service/service"
import { resolveApprovedSeller } from "../../../product-cloud/resolve-seller"

const RESULT_LIMIT = 25

function matchesQuery(
  haystack: string,
  q: string
): boolean {
  if (!q) return true
  const hay = haystack.toLowerCase()
  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (tokens.length === 0) return true
  return tokens.every((token) => hay.includes(token))
}

/**
 * GET /store/order-service/seller/customers?q=
 * Distinct customers from this seller's orders + conversations
 * (search by name, email, customer id, order number).
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const seller = await resolveApprovedSeller(
    req.scope,
    req.auth_context.actor_id
  )
  const q =
    typeof req.query?.q === "string" ? req.query.q.trim() : ""

  const orders = req.scope.resolve(ORDER_MODULE) as OrderServiceModuleService
  const list = await orders.listEmOrders({ seller_id: seller.id })
  const conversations = await orders.listEmConversations({
    seller_id: seller.id,
  })

  const byCustomer = new Map<
    string,
    { customer_id: string; order_ids: string[]; order_numbers: string[] }
  >()

  for (const order of list) {
    const entry = byCustomer.get(order.customer_id) ?? {
      customer_id: order.customer_id,
      order_ids: [],
      order_numbers: [],
    }
    if (!entry.order_ids.includes(order.id)) {
      entry.order_ids.push(order.id)
      entry.order_numbers.push(order.order_number)
    }
    byCustomer.set(order.customer_id, entry)
  }

  for (const conversation of conversations) {
    if (byCustomer.has(conversation.customer_id)) continue
    byCustomer.set(conversation.customer_id, {
      customer_id: conversation.customer_id,
      order_ids: [],
      order_numbers: [],
    })
  }

  const customersModule = req.scope.resolve(
    Modules.CUSTOMER
  ) as ICustomerModuleService

  const customers = []
  for (const entry of byCustomer.values()) {
    let email = ""
    let name = ""
    try {
      const customer = await customersModule.retrieveCustomer(entry.customer_id)
      email = customer.email ?? ""
      name = [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(" ")
        .trim()
    } catch {
      // skip enrich
    }

    const hay = [
      email,
      name,
      entry.customer_id,
      ...entry.order_numbers,
    ].join(" ")
    if (!matchesQuery(hay, q)) continue

    customers.push({
      customer_id: entry.customer_id,
      email,
      name: name || email || entry.customer_id,
      order_ids: entry.order_ids,
      order_numbers: entry.order_numbers,
    })
    if (customers.length >= RESULT_LIMIT) break
  }

  customers.sort((a, b) => a.name.localeCompare(b.name))
  res.json({ customers, count: customers.length })
}
