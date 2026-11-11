import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  applyBulkOfferCommerce,
  planBulkOfferCommerce,
  type BulkOfferSnapshot,
} from "../bulk-offer-commerce"

const own = (patch: Partial<BulkOfferSnapshot> = {}): BulkOfferSnapshot => ({
  offer_id: "off_1",
  seller_id: "sel_own",
  product_id: "prod_1",
  product_title: "Pan",
  identifier_value: "4242005482320",
  region_code: "NL",
  identifier_id: "idn_1",
  inventory_id: "inv_1",
  publication_status: "Gepubliceerd",
  sales_status: "active",
  base_price: 19,
  shipping_profile_id: "shp_1",
  shipping_profile_status: "active",
  shipping_profile_serves_region: true,
  current_delivery_days_max: 5,
  current_quantity_available: 4,
  ...patch,
})

describe("bulk offer delivery and stock", () => {
  it("previews several own offers and writes nothing until apply is called", async () => {
    const plan = planBulkOfferCommerce({
      actor_seller_id: "sel_own",
      offers: [
        own(),
        own({
          offer_id: "off_2",
          product_title: "Kom",
          identifier_value: "4006381333931",
          inventory_id: "inv_2",
          current_quantity_available: 1,
          current_delivery_days_max: 2,
        }),
      ],
      delivery_days_max: 3,
      quantity_available: 8,
    })
    expect(plan.selected_count).toBe(2)
    expect(plan.eligible_count).toBe(2)
    expect(plan.excluded_count).toBe(0)
    expect(plan.apply_allowed).toBe(true)
    expect(plan.rows[0]).toMatchObject({
      current_delivery_days_max: 5,
      next_delivery_days_max: 3,
      current_quantity_available: 4,
      next_quantity_available: 8,
      publication_status: "Gepubliceerd",
    })
    const writes: string[] = []
    const previewOnly = await applyBulkOfferCommerce(
      { ...plan, apply_allowed: false },
      { seller_id: "sel_own", actor_customer_id: "cus_1" },
      {
        updateDelivery: async () => {
          writes.push("delivery")
        },
        updateStock: async () => {
          writes.push("stock")
        },
        audit: async () => {
          writes.push("audit")
        },
      }
    )
    expect(previewOnly.applied_count).toBe(0)
    expect(writes).toEqual([])
  })

  it("excludes another seller and still updates the rest", async () => {
    const reserved = [{ offer_id: "off_other", quantity: 2 }]
    const plan = planBulkOfferCommerce({
      actor_seller_id: "sel_own",
      offers: [
        own(),
        own({
          offer_id: "off_other",
          seller_id: "sel_other",
          inventory_id: "inv_other",
          product_title: "Vreemd",
        }),
      ],
      quantity_available: 6,
    })
    expect(plan.eligible_count).toBe(1)
    expect(plan.excluded_count).toBe(1)
    expect(plan.rows[1].reason).toMatch(/andere seller/)
    const stockWrites: Array<{ id: string; quantity: number }> = []
    const audits: string[] = []
    const result = await applyBulkOfferCommerce(
      plan,
      { seller_id: "sel_own", actor_customer_id: "cus_1" },
      {
        updateDelivery: async () => {
          throw new Error("levertijd niet gevraagd")
        },
        updateStock: async (id, quantity) => {
          stockWrites.push({ id, quantity })
        },
        audit: async (row) => {
          audits.push(row.field_code)
        },
      }
    )
    expect(result.applied_count).toBe(1)
    expect(stockWrites).toEqual([{ id: "inv_1", quantity: 6 }])
    expect(audits).toEqual(["offer.quantity_available"])
    expect(reserved).toEqual([{ offer_id: "off_other", quantity: 2 }])
    expect(plan.rows[0].publication_status).toBe("Gepubliceerd")
  })

  it("refuses a negative stock and an invalid delivery before any write", async () => {
    const negative = planBulkOfferCommerce({
      actor_seller_id: "sel_own",
      offers: [own()],
      quantity_available: -1,
    })
    expect(negative.apply_allowed).toBe(false)
    expect(negative.field_error).toMatch(/niet negatief/)
    expect(negative.rows[0].status).toBe("excluded")
    expect(negative.rows[0].next_quantity_available).toBe(-1)

    const fractional = planBulkOfferCommerce({
      actor_seller_id: "sel_own",
      offers: [own()],
      delivery_days_max: 1.5,
    })
    expect(fractional.apply_allowed).toBe(false)
    expect(fractional.field_error).toMatch(/geheel getal/)
    expect(fractional.rows[0].next_delivery_days_max).toBe(1.5)

    const tooHigh = planBulkOfferCommerce({
      actor_seller_id: "sel_own",
      offers: [own()],
      delivery_days_max: 400,
    })
    expect(tooHigh.apply_allowed).toBe(false)
    const applied = await applyBulkOfferCommerce(
      negative,
      { seller_id: "sel_own", actor_customer_id: null },
      {
        updateDelivery: async () => {
          throw new Error("niet schrijven")
        },
        updateStock: async () => {
          throw new Error("niet schrijven")
        },
        audit: async () => {
          throw new Error("niet schrijven")
        },
      }
    )
    expect(applied.applied_count).toBe(0)
  })

  it("keeps a published product unsellable when stock becomes zero", () => {
    const plan = planBulkOfferCommerce({
      actor_seller_id: "sel_own",
      offers: [own({ current_quantity_available: 3 })],
      quantity_available: 0,
    })
    expect(plan.rows[0]).toMatchObject({
      status: "eligible",
      publication_status: "Gepubliceerd",
      sellable_before: true,
      sellable_after: false,
      next_quantity_available: 0,
    })
  })

  it("creates a stock row when the offer does not have one yet", async () => {
    const plan = planBulkOfferCommerce({
      actor_seller_id: "sel_own",
      offers: [own({ inventory_id: null, current_quantity_available: null })],
      quantity_available: 3,
    })
    expect(plan.apply_allowed).toBe(true)
    expect(plan.rows[0].status).toBe("eligible")
    const created: Array<{ id: string; quantity: number }> = []
    const result = await applyBulkOfferCommerce(
      plan,
      { seller_id: "sel_own", actor_customer_id: "cus_1" },
      {
        updateDelivery: async () => {
          throw new Error("levertijd niet gevraagd")
        },
        updateStock: async () => {
          throw new Error("geen bestaande voorraadregel")
        },
        createStock: async (id, quantity) => {
          created.push({ id, quantity })
        },
        audit: async () => {
          throw new Error("historie faalt")
        },
      }
    )
    expect(created).toEqual([{ id: "off_1", quantity: 3 }])
    expect(result.applied_count).toBe(1)
    expect(result.failed_count).toBe(0)
  })

  it("does not replace stock when only the delivery time changes", async () => {
    const plan = planBulkOfferCommerce({
      actor_seller_id: "sel_own",
      offers: [own()],
      delivery_days_max: 2,
    })
    const stockWrites: string[] = []
    await applyBulkOfferCommerce(
      plan,
      { seller_id: "sel_own", actor_customer_id: "cus_1" },
      {
        updateDelivery: async () => undefined,
        updateStock: async () => {
          stockWrites.push("stock")
        },
        audit: async () => undefined,
      }
    )
    expect(stockWrites).toEqual([])
    expect(plan.rows[0].changes_stock).toBe(false)
    expect(plan.rows[0].changes_delivery).toBe(true)
  })

  it("keeps the shipping-profile bulk route and gates confirmation", () => {
    const root = join(__dirname, "../../../..")
    const shipping = readFileSync(
      join(root, "src/api/store/product-cloud/products/bulk-shipping-profile/route.ts"),
      "utf8"
    )
    const offer = readFileSync(
      join(root, "src/api/store/product-cloud/products/bulk-offer-commerce/route.ts"),
      "utf8"
    )
    expect(shipping).toContain("syncProfileToProductOffers")
    expect(offer).toContain("if (!confirm || !plan.apply_allowed)")
    expect(offer).toContain("createProductFieldChanges")
    expect(offer).toContain("updateOfferInventories")
    expect(offer).not.toContain("updateProducts")
  })
})
