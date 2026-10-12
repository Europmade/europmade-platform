import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { AFFILIATE_MODULE } from "../../../modules/affiliate"
import { COMMERCE_CLOUD_MODULE } from "../../../modules/commerce-cloud"
import { FINANCE_MODULE } from "../../../modules/finance"
import { ORDER_MODULE } from "../../../modules/order-service"
import { PARTNER_MODULE } from "../../../modules/partner"
import { PRODUCT_CLOUD_MODULE } from "../../../modules/product-cloud"
import { executeAttributeConversion } from "../workflows"

/**
 * In-memory stand-in for the order workflow.
 * No database, payment, or seller rows are touched.
 */
function memoryContainer() {
  const settings = new Map<string, unknown>([
    [
      "seller_a",
      { default_commission_percent: 6, product_commissions: [] },
    ],
    [
      "seller_b",
      { default_commission_percent: 4, product_commissions: [] },
    ],
  ])
  const commissions: Array<Record<string, unknown>> = []
  const payouts: Array<Record<string, unknown>> = []
  let commissionSeq = 0

  const services: Record<string, unknown> = {
    [ContainerRegistrationKeys.LOGGER]: {
      info: () => undefined,
      warn: () => undefined,
    },
    [Modules.EVENT_BUS]: { emit: async () => undefined },
    [AFFILIATE_MODULE]: {
      listConversions: async (filters: { order_id?: string }) =>
        filters.order_id ? [] : [],
      retrieveClick: async () => ({
        id: "click_1",
        affiliate_link_id: "alink_1",
        attribution_expires_at: new Date(Date.now() + 86_400_000),
      }),
      retrieveAffiliateLink: async () => ({
        id: "alink_1",
        affiliate_id: "aff_1",
        product_id: "prod_x",
        offer_id: "offr_a",
        seller_id: "seller_a",
        commission_percent_snapshot: 9,
      }),
      retrieveAffiliate: async () => ({
        id: "aff_1",
        customer_id: "cust_affiliate",
      }),
      createConversions: async (data: Record<string, unknown>) => ({
        id: "acnv_1",
        ...data,
      }),
    },
    [ORDER_MODULE]: {
      listOrderLines: async (filters: { order_id: string }) => {
        if (filters.order_id !== "ord_b" && filters.order_id !== "ord_later") {
          return []
        }
        return [
          {
            offer_id: "offr_b",
            product_variant_id: "pvar_x",
            unit_price_snapshot: 100,
            quantity: 1,
          },
        ]
      },
      retrieveEmOrder: async (orderId: string) => ({
        id: orderId,
        customer_id: "cust_buyer",
        created_at: new Date("2026-10-09T08:00:00.000Z"),
      }),
    },
    [COMMERCE_CLOUD_MODULE]: {
      listOffers: async (filters: { id: string }) =>
        filters.id === "offr_b"
          ? [{ id: "offr_b", seller_id: "seller_b", sales_status: "active" }]
          : [],
    },
    [PARTNER_MODULE]: {
      retrieveSeller: async (id: string) => ({
        id,
        affiliate_commission_settings: settings.get(id) ?? null,
      }),
    },
    [PRODUCT_CLOUD_MODULE]: {
      retrieveProductVariant: async () => ({ product_id: "prod_x" }),
    },
    [FINANCE_MODULE]: {
      createCommissions: async (data: Record<string, unknown>) => {
        commissionSeq += 1
        const row = { id: `comm_${commissionSeq}`, ...data }
        commissions.push(row)
        return row
      },
      listPayouts: async () => [],
      createPayouts: async (data: Record<string, unknown>) => {
        const row = { id: `pout_${payouts.length + 1}`, ...data }
        payouts.push(row)
        return row
      },
    },
  }

  const container = {
    resolve(key: string) {
      const service = services[key]
      if (!service) throw new Error(`missing ${key}`)
      return service
    },
  } as unknown as MedusaContainer

  return { container, settings, commissions, payouts }
}

describe("affiliate sale attribution", () => {
  it("charges the selling seller and keeps that snapshot after a later rate change", async () => {
    const { container, settings, commissions, payouts } = memoryContainer()

    const first = await executeAttributeConversion(container, {
      order_id: "ord_b",
      customer_id: "cust_buyer",
      click_id: "click_1",
    })

    expect(first.conversion_id).toBe("acnv_1")
    expect(commissions).toHaveLength(1)
    expect(commissions[0]).toMatchObject({
      id: first.commission_id,
      order_id: "ord_b",
      seller_id: "seller_b",
      offer_id: "offr_b",
      percentage: 0.07,
      amount: 7,
      status: "Toegekend",
    })
    expect(commissions.some((row) => row.seller_id === "seller_a")).toBe(false)
    expect(payouts).toEqual([
      expect.objectContaining({
        recipient_type: "Affiliate",
        affiliate_id: "aff_1",
        order_id: "ord_b",
        amount: 7,
        status: "Gepland",
        stripe_transfer_id: null,
      }),
    ])

    settings.set("seller_b", {
      default_commission_percent: 6,
      product_commissions: [],
    })

    expect(commissions[0]).toMatchObject({
      percentage: 0.07,
      amount: 7,
      seller_id: "seller_b",
    })

    const later = await executeAttributeConversion(container, {
      order_id: "ord_later",
      customer_id: "cust_buyer",
      click_id: "click_1",
    })

    expect(later.commission_id).toBe("comm_2")
    expect(commissions[0]).toMatchObject({ percentage: 0.07, amount: 7 })
    expect(commissions[1]).toMatchObject({
      order_id: "ord_later",
      seller_id: "seller_b",
      percentage: 0.09,
      amount: 9,
    })
  })
})
